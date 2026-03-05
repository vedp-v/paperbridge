import uuid
from datetime import datetime
from pydantic import BaseModel


class ConversionResponse(BaseModel):
    id: uuid.UUID
    original_filename: str
    status: str
    file_size_bytes: int | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class DownloadResponse(BaseModel):
    url: str
    filename: str
