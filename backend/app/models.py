import uuid
from datetime import datetime, timezone
from sqlalchemy import String, BigInteger, ForeignKey, Text, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    conversions: Mapped[list["Conversion"]] = relationship(back_populates="user")


class Conversion(Base):
    __tablename__ = "conversions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    pdf_r2_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    docx_r2_key: Mapped[str | None] = mapped_column(String(1024))
    status: Mapped[str] = mapped_column(String(20), default="processing")
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="conversions")
