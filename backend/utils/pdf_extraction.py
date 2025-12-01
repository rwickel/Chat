# backend/utils/pdf_extraction.py

from typing import List, Tuple, Dict, Any
from pypdf import PdfReader
import re
import os
import io 

def extract_pdf_text_and_images(file_path: str) -> Tuple[
    List[Tuple[int, str]],  # [(page_num, text), ...]
    List[Dict[str, Any]]    # [{'data': bytes, ...}, ...]
]:
    # ... (your existing implementation — unchanged) ...
    reader = PdfReader(file_path)
    pages_text: List[Tuple[int, str]] = []
    images_data: List[Dict[str, Any]] = []

    for i, page in enumerate(reader.pages):
        page_num = i + 1
        
        # Text
        raw_text = page.extract_text() or ""
        cleaned_text = re.sub(r'\n\s*\n', '\n\n', raw_text.strip())
        if cleaned_text:
            pages_text.append((page_num, cleaned_text))

        # Images
        for img_obj in page.images:
            try:
                image_data = img_obj.data
                # Open just to get size (safe, in-memory)
                from PIL import Image
                with Image.open(io.BytesIO(image_data)) as img:
                    width, height = img.size
                images_data.append({
                    "data": image_data,
                    "name": getattr(img_obj, 'name', 'image'),
                    "width": width,
                    "height": height,
                    "page": page_num,
                })
            except Exception as e:
                print(f"[PDF] Warning: Skipped image on page {page_num}: {e}")

    return pages_text, images_data

def extract_pdf_content(file_path: str) -> str:
    """
    Extract all text from PDF and return as a single string.
    Used by file_processing.py → extract_text().
    """
    pages_text, _ = extract_pdf_text_and_images(file_path)
    # Join pages with double newline as separator
    full_text = "\n\n".join(text for _, text in pages_text)
    return full_text


def extract_text(file_path: str, mime_type: str) -> str:
    """Extract text from file (PDF or plain text)."""
    try:
        if mime_type == "application/pdf" or file_path.lower().endswith(".pdf"):
            return extract_pdf_content(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        # Final fallback: binary read + loose decode
        with open(file_path, "rb") as f:
            return f.read().decode("utf-8", errors="replace")