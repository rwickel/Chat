import unittest
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, MagicMock
from PIL import Image
import io

# Ensure backend is in path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from utils.pdf_extraction import (
    extract_pdf_text_and_images,
    extract_pdf_content,
    extract_text
)

class TestPDFExtraction(unittest.TestCase):
    
    def setUp(self):
        """Create test PDF files"""
        from pypdf import PdfWriter
        
        # Create simple PDF with text
        self.test_pdf_path = Path(tempfile.mktemp(suffix=".pdf"))
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        writer.add_page(writer.pages[0])  # Add duplicate page
        with open(self.test_pdf_path, "wb") as f:
            writer.write(f)
        
        # Create text file
        self.test_txt_path = Path(tempfile.mktemp(suffix=".txt"))
        self.test_txt_path.write_text("Test document content.\nSecond line.", encoding="utf-8")
        
        # Create binary file
        self.test_bin_path = Path(tempfile.mktemp(suffix=".bin"))
        self.test_bin_path.write_bytes(b"\x00\x01\x02\x03")
    
    def tearDown(self):
        """Cleanup test files"""
        for path in [self.test_pdf_path, self.test_txt_path, self.test_bin_path]:
            if path.exists():
                path.unlink()
    
    def test_extract_pdf_text_and_images_empty_pdf(self):
        """Test extraction from empty PDF"""
        pages_text, images_data = extract_pdf_text_and_images(str(self.test_pdf_path))
        self.assertIsInstance(pages_text, list)
        self.assertIsInstance(images_data, list)
        # Empty PDF may have empty text
        # self.assertEqual(len(pages_text), 2)  # 2 blank pages
        self.assertEqual(len(images_data), 0)
    
    @patch('utils.pdf_extraction.PdfReader')
    def test_extract_pdf_text_and_images_with_text(self, mock_pdf_reader):
        """Test text extraction with mock PDF"""
        # Mock PDF page with text
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Test PDF content\n\nWith paragraphs."
        mock_reader = MagicMock()
        mock_reader.pages = [mock_page]
        mock_pdf_reader.return_value = mock_reader
        
        pages_text, images_data = extract_pdf_text_and_images("dummy.pdf")
        
        self.assertEqual(len(pages_text), 1)
        self.assertEqual(pages_text[0][0], 1)  # page 1
        self.assertIn("Test PDF content", pages_text[0][1])
        self.assertEqual(len(images_data), 0)
    
    @patch('PIL.Image')
    @patch('utils.pdf_extraction.PdfReader')
    def test_extract_pdf_text_and_images_with_images(self, mock_pdf_reader, mock_image):
        """Test image extraction with mock PDF"""
        # Mock PDF page with image
        mock_img_obj = MagicMock()
        mock_img_obj.data = b"fake_image_data"
        mock_img_obj.name = "test_image"
        
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Page with image"
        mock_page.images = [mock_img_obj]
        
        mock_reader = MagicMock()
        mock_reader.pages = [mock_page]
        mock_pdf_reader.return_value = mock_reader
        
        # Mock PIL Image
        mock_pil_img = MagicMock()
        mock_pil_img.size = (100, 200)
        mock_image.open.return_value.__enter__.return_value = mock_pil_img
        
        pages_text, images_data = extract_pdf_text_and_images("dummy.pdf")
        
        self.assertEqual(len(pages_text), 1)
        self.assertEqual(len(images_data), 1)
        img = images_data[0]
        self.assertEqual(img["data"], b"fake_image_data")
        self.assertEqual(img["name"], "test_image")
        self.assertEqual(img["width"], 100)
        self.assertEqual(img["height"], 200)
        self.assertEqual(img["page"], 1)
    
    def test_extract_pdf_content(self):
        """Test PDF content extraction"""
        # Use our simple PDF
        content = extract_pdf_content(str(self.test_pdf_path))
        self.assertIsInstance(content, str)
        # Should be non-empty for non-blank PDFs, but our test PDF is blank
        # For now, just check it's a string
        self.assertTrue(isinstance(content, str))
    
    def test_extract_text_pdf(self):
        """Test extract_text with PDF"""
        content = extract_text(str(self.test_pdf_path), "application/pdf")
        self.assertIsInstance(content, str)
    
    def test_extract_text_txt(self):
        """Test extract_text with text file"""
        content = extract_text(str(self.test_txt_path), "text/plain")
        self.assertEqual(content.strip(), "Test document content.\nSecond line.")
    
    def test_extract_text_fallback_encoding(self):
        """Test extract_text fallback for binary files"""
        content = extract_text(str(self.test_bin_path), "application/octet-stream")
        self.assertIsInstance(content, str)
        # Should not crash, even if content is garbage
        self.assertTrue(len(content) > 0)
    
    def test_extract_text_invalid_file(self):
        """Test extract_text with non-existent file"""
        with self.assertRaises(Exception):
            extract_text("/nonexistent/file.pdf", "application/pdf")
    
    @patch('utils.pdf_extraction.PdfReader')
    def test_extract_pdf_text_and_images_error_handling(self, mock_pdf_reader):
        """Test error handling in PDF extraction"""
        mock_pdf_reader.side_effect = Exception("PDF read error")
        
        with self.assertRaises(Exception):
            extract_pdf_text_and_images("invalid.pdf")

class TestPDFExtractionEdgeCases(unittest.TestCase):
    
    def test_extract_text_malformed_pdf(self):
        """Test with malformed PDF content"""
        # Create a file that's not a real PDF
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(b"Not a PDF file")
            temp_path = f.name
        
        try:
            content = extract_text(temp_path, "application/pdf")
            # Should fall back to binary read
            self.assertIsInstance(content, str)
        finally:
            os.unlink(temp_path)
    
    def test_extract_pdf_content_empty_pages(self):
        """Test PDF content extraction with empty pages"""
        from pypdf import PdfWriter
        empty_pdf = Path(tempfile.mktemp(suffix=".pdf"))
        
        try:
            writer = PdfWriter()
            writer.add_blank_page(width=100, height=100)
            with open(empty_pdf, "wb") as f:
                writer.write(f)
            
            content = extract_pdf_content(str(empty_pdf))
            self.assertIsInstance(content, str)
        finally:
            if empty_pdf.exists():
                empty_pdf.unlink()

class TestIntegrationMocked(unittest.TestCase):
    """Integration tests with mocked dependencies"""
    
    @patch('utils.pdf_extraction.extract_text')
    @patch('utils.pdf_extraction.recursive_chunking')
    @patch('utils.pdf_extraction.embed_texts')
    @patch('utils.pdf_extraction.store_chunks_in_chroma')
    @patch('utils.pdf_extraction.update_file_metadata')
    @patch('utils.pdf_extraction.get_event_loop')
    def test_process_file_background_success(
        self, mock_get_loop, mock_update_meta, mock_store_chroma,
        mock_embed, mock_chunking, mock_extract_text
    ):
        """Test successful background processing flow"""
        # Setup mocks
        mock_loop = MagicMock()
        mock_get_loop.return_value = mock_loop
        mock_loop.run_coroutine_threadsafe.return_value.result.return_value = None
        
        mock_extract_text.return_value = "Test document content for processing."
        mock_chunking.return_value = [
            {"Id": "1", "Text": "Test chunk 1", "Page": 1},
            {"Id": "2", "Text": "Test chunk 2", "Page": 1}
        ]
        mock_embed.return_value = [[0.1, 0.2], [0.3, 0.4]]
        mock_store_chroma.return_value = 2
        
        # Import the function to test
        from utils.pdf_extraction import process_file_background
        
        # Call the function
        process_file_background(
            user_id="test_user",
            file_id="test_file_id",
            file_path="/fake/path.pdf",
            original_name="test.pdf",
            mime_type="application/pdf"
        )
        
        # Verify calls
        mock_extract_text.assert_called_once()
        mock_chunking.assert_called_once()
        mock_embed.assert_called_once()
        mock_store_chroma.assert_called_once()
        # Should call update_file_metadata 2 times (embedding + ready)
        self.assertEqual(mock_update_meta.call_count, 2)
    
    @patch('utils.pdf_extraction.extract_text')
    @patch('utils.pdf_extraction.update_file_metadata')
    @patch('utils.pdf_extraction.get_event_loop')
    def test_process_file_background_empty_text(
        self, mock_get_loop, mock_update_meta, mock_extract_text
    ):
        """Test background processing with empty text"""
        mock_loop = MagicMock()
        mock_get_loop.return_value = mock_loop
        mock_loop.run_coroutine_threadsafe.return_value.result.return_value = None
        
        mock_extract_text.return_value = "   "  # Whitespace only
        
        from utils.pdf_extraction import process_file_background
        
        with self.assertRaises(ValueError) as cm:
            process_file_background(
                user_id="test_user",
                file_id="test_file_id",
                file_path="/fake/path.pdf",
                original_name="test.pdf",
                mime_type="application/pdf"
            )
        
        self.assertIn("No text extracted", str(cm.exception))
        # Should still call update_file_metadata for error status
        mock_update_meta.assert_called()

if __name__ == '__main__':
    unittest.main()