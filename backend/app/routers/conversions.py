import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models import Conversion, User
from app.rate_limit import upload_rate_limit, download_rate_limit
from app.schemas import ConversionResponse, DownloadResponse
from app.services import storage, converter

router = APIRouter(prefix="/api/conversions", tags=["conversions"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.post("/upload", response_model=ConversionResponse, status_code=201)
async def upload_and_convert(
    file: UploadFile,
    user: User = Depends(upload_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_FILE_SIZE:
        settings = get_settings()
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {settings.max_file_size_mb} MB limit",
        )

    conversion_id = uuid.uuid4()
    pdf_key = f"{user.id}/{conversion_id}/original.pdf"
    docx_key = f"{user.id}/{conversion_id}/converted.docx"

    record = Conversion(
        id=conversion_id,
        user_id=user.id,
        original_filename=file.filename,
        pdf_r2_key=pdf_key,
        file_size_bytes=len(pdf_bytes),
        status="processing",
    )
    db.add(record)
    await db.flush()

    try:
        storage.upload_file(pdf_key, pdf_bytes, content_type="application/pdf")
        docx_bytes = converter.convert_pdf_to_docx(pdf_bytes)
        storage.upload_file(
            docx_key,
            docx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        record.docx_r2_key = docx_key
        record.status = "completed"
        record.completed_at = datetime.now(timezone.utc)
    except Exception as e:
        record.status = "failed"
        record.error_message = str(e)[:500]

    return record


@router.get("/quota")
async def get_quota(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    from app.rate_limit import _count_hits
    used = await _count_hits(db, user.email, "upload", timedelta(hours=24))
    return {"used": used, "limit": 10}


@router.get("", response_model=list[ConversionResponse])
async def list_conversions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversion)
        .where(Conversion.user_id == user.id)
        .order_by(Conversion.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{conversion_id}", status_code=204)
async def delete_conversion(
    conversion_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversion).where(
            Conversion.id == conversion_id,
            Conversion.user_id == user.id,
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Conversion not found")

    for key in [record.pdf_r2_key, record.docx_r2_key]:
        if key:
            try:
                storage.delete_file(key)
            except Exception:
                pass

    await db.delete(record)


@router.get("/{conversion_id}/download/{file_type}", response_model=DownloadResponse)
async def download_file(
    conversion_id: uuid.UUID,
    file_type: str,
    user: User = Depends(download_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    if file_type not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="file_type must be 'pdf' or 'docx'")

    result = await db.execute(
        select(Conversion).where(
            Conversion.id == conversion_id,
            Conversion.user_id == user.id,
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Conversion not found")

    if record.status != "completed":
        raise HTTPException(status_code=400, detail="Conversion is not completed")

    if file_type == "pdf":
        key = record.pdf_r2_key
        filename = record.original_filename
    else:
        if not record.docx_r2_key:
            raise HTTPException(status_code=400, detail="DOCX file not available")
        key = record.docx_r2_key
        base = record.original_filename.rsplit(".", 1)[0]
        filename = f"{base}.docx"

    url = storage.generate_presigned_url(key, filename=filename)
    return DownloadResponse(url=url, filename=filename)
