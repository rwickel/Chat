import sys
import pytest
from pathlib import Path
from utils.helpers import sanitize_filename, get_user_from_request, human_size

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

def test_sanitize_filename():
    """Test filename sanitization"""
    assert sanitize_filename("test.pdf") == "test.pdf"
    assert sanitize_filename("bad<name>.pdf") == "bad_name.pdf"
    assert sanitize_filename("../../../secret.txt") == "secret.txt"
    assert sanitize_filename("") == "unnamed_file"

def test_get_user_from_request():
    """Test user extraction from request"""
    from fastapi import Request
    from unittest.mock import Mock
    
    # Test x-user header
    mock_request = Mock(spec=Request)
    mock_request.headers = {"x-user": "test@example.com"}
    mock_request.query_params = {}
    assert get_user_from_request(mock_request) == "test@example.com"
    
    # Test query param
    mock_request.headers = {}
    mock_request.query_params = {"token": "test@example.com"}
    assert get_user_from_request(mock_request) == "test@example.com"
    
    # Test fallback
    mock_request.headers = {}
    mock_request.query_params = {}
    assert get_user_from_request(mock_request) == "anonymous"

def test_human_size():
    """Test human-readable size conversion"""
    assert human_size(0) == "0.0 B"
    assert human_size(1024) == "1.0 KB"
    assert human_size(1024*1024) == "1.0 MB"
    assert human_size(1024*1024*50) == "50.0 MB"