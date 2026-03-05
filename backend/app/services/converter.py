import os
import tempfile
from abc import ABC, abstractmethod


class BaseConverter(ABC):
    @abstractmethod
    def convert(self, pdf_path: str, docx_path: str) -> None:
        ...

    @abstractmethod
    def supports_scanned(self) -> bool:
        ...


class NativeConverter(BaseConverter):
    """Handles text-based PDFs using pdf2docx."""

    def convert(self, pdf_path: str, docx_path: str) -> None:
        from pdf2docx import Converter

        cv = Converter(pdf_path)
        cv.convert(docx_path)
        cv.close()

    def supports_scanned(self) -> bool:
        return False


class OCRConverter(BaseConverter):
    """Placeholder for v2: handles scanned/image-based PDFs via OCR."""

    def convert(self, pdf_path: str, docx_path: str) -> None:
        raise NotImplementedError("OCR conversion is not yet implemented (v2)")

    def supports_scanned(self) -> bool:
        return True


def get_converter(use_ocr: bool = False) -> BaseConverter:
    if use_ocr:
        return OCRConverter()
    return NativeConverter()


def convert_pdf_to_docx(pdf_bytes: bytes) -> bytes:
    """Convert PDF bytes to DOCX bytes using the native converter."""
    converter = get_converter(use_ocr=False)

    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = os.path.join(tmp_dir, "input.pdf")
        docx_path = os.path.join(tmp_dir, "output.docx")

        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        converter.convert(pdf_path, docx_path)

        with open(docx_path, "rb") as f:
            return f.read()
