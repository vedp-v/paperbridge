import boto3
from botocore.config import Config
from app.config import get_settings


def _get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_file(key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    settings = get_settings()
    client = _get_s3_client()
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def download_file(key: str) -> bytes:
    settings = get_settings()
    client = _get_s3_client()
    response = client.get_object(Bucket=settings.r2_bucket_name, Key=key)
    return response["Body"].read()


def generate_presigned_url(key: str, expires_in: int = 3600, filename: str | None = None) -> str:
    settings = get_settings()
    client = _get_s3_client()
    params = {"Bucket": settings.r2_bucket_name, "Key": key}
    if filename:
        params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
    return client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )


def delete_file(key: str) -> None:
    settings = get_settings()
    client = _get_s3_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=key)
