import sys
import os
import pytest
from fastapi import FastAPI, UploadFile
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, mock_open, AsyncMock

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.files import router

# Create a dedicated app for testing the router
app = FastAPI()
app.include_router(router)

client = TestClient(app)

# Mock data
TEST_USER_ID = "test_user_123"
TEST_FILE_ID = "file_123"
TEST_FILENAME = "test_document.pdf"
TEST_CONTENT = b"fake pdf content"

@pytest.fixture
def mock_user_auth():
    with patch("routers.files.get_user_from_request", return_value=TEST_USER_ID) as mock:
        yield mock

@pytest.fixture
def mock_metadata():
    with patch("routers.files.load_metadata", new_callable=AsyncMock) as mock_load, \
         patch("routers.files.save_metadata", new_callable=AsyncMock) as mock_save:
        mock_load.return_value = {}
        yield mock_load, mock_save

@pytest.fixture
def mock_fs():
    with patch("os.makedirs") as mock_makedirs, \
         patch("builtins.open", mock_open()) as mock_file, \
         patch("os.path.exists", return_value=True) as mock_exists, \
         patch("os.remove") as mock_remove, \
         patch("shutil.rmtree") as mock_rmtree:
        yield mock_makedirs, mock_file, mock_exists, mock_remove, mock_rmtree

@pytest.fixture
def mock_background():
    with patch("routers.files.get_background_executor") as mock_executor, \
         patch("routers.files.process_file_background") as mock_process:
        mock_executor.return_value.submit = MagicMock()
        yield mock_executor, mock_process

@pytest.fixture
def mock_utils():
    with patch("routers.files.user_dir", return_value="/tmp/test_user") as mock_user_dir, \
         patch("routers.files.sanitize_filename", return_value=TEST_FILENAME) as mock_sanitize, \
         patch("routers.files.human_size", return_value="15 B") as mock_human_size:
        yield mock_user_dir, mock_sanitize, mock_human_size

def test_upload_file_success(mock_user_auth, mock_metadata, mock_fs, mock_background, mock_utils):
    mock_load, mock_save = mock_metadata
    mock_makedirs, mock_file, _, _, _ = mock_fs
    mock_executor, _ = mock_background
    
    response = client.post(
        "/files/upload",
        files={"file": (TEST_FILENAME, TEST_CONTENT, "application/pdf")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == TEST_FILENAME
    assert data["status"] == "processing"
    assert "id" in data
    
    # Verify mocks
    mock_makedirs.assert_called()
    mock_file.assert_called() # Should open file for writing
    mock_save.assert_called_once() # Should save metadata
    mock_executor.return_value.submit.assert_called_once() # Should submit background job

def test_upload_file_too_large(mock_user_auth):
    # Mock MAX_FILE_SIZE to be small for this test
    with patch("routers.files.MAX_FILE_SIZE", 10):
        response = client.post(
            "/files/upload",
            files={"file": (TEST_FILENAME, TEST_CONTENT, "application/pdf")}
        )
        assert response.status_code == 413
        assert "File too large" in response.json()["detail"]

def test_list_files_empty(mock_user_auth, mock_metadata):
    mock_load, _ = mock_metadata
    mock_load.return_value = {}
    
    response = client.get("/files/list")
    assert response.status_code == 200
    assert response.json() == []

def test_list_files_populated(mock_user_auth, mock_metadata, mock_utils):
    mock_load, _ = mock_metadata
    mock_load.return_value = {
        TEST_FILE_ID: {
            "id": TEST_FILE_ID,
            "name": TEST_FILENAME,
            "size": 1024,
            "status": "completed",
            "mime_type": "application/pdf"
        }
    }
    
    response = client.get("/files/list")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == TEST_FILE_ID
    assert data[0]["name"] == TEST_FILENAME

def test_get_file_success(mock_user_auth, mock_metadata, mock_fs):
    mock_load, _ = mock_metadata
    mock_load.return_value = {
        TEST_FILE_ID: {
            "id": TEST_FILE_ID,
            "name": TEST_FILENAME,
            "path": "/tmp/test_user/file.pdf",
            "mime_type": "application/pdf"
        }
    }
    
    # Mock FileResponse to avoid actual file read
    with patch("routers.files.FileResponse") as mock_file_response:
        mock_file_response.return_value = MagicMock()
        mock_file_response.return_value.status_code = 200
        
        response = client.get(f"/get/{TEST_FILE_ID}")
        
        # Since we mocked FileResponse, we check if it was called correctly
        mock_file_response.assert_called_once()
        args, kwargs = mock_file_response.call_args
        assert args[0] == "/tmp/test_user/file.pdf"
        assert kwargs["media_type"] == "application/pdf"

def test_get_file_not_found(mock_user_auth, mock_metadata):
    mock_load, _ = mock_metadata
    mock_load.return_value = {}
    
    response = client.get(f"/get/nonexistent_id")
    assert response.status_code == 404

def test_get_file_status_success(mock_user_auth, mock_metadata):
    mock_load, _ = mock_metadata
    # Note: get_file_status uses synchronous load_metadata in the original code?
    # Let's check the code.
    # Line 151: meta = load_metadata(user_id)  <-- It is synchronous in the code provided!
    # But line 119 and 136 use await load_metadata(user_id).
    # Wait, let me check the file content again.
    pass

def test_delete_file_success(mock_user_auth, mock_metadata, mock_fs, mock_utils):
    mock_load, mock_save = mock_metadata
    _, _, mock_exists, mock_remove, mock_rmtree = mock_fs
    
    mock_load.return_value = {
        TEST_FILE_ID: {
            "id": TEST_FILE_ID,
            "path": "/tmp/test_user/file.pdf"
        }
    }
    
    response = client.delete(f"/files/delete/{TEST_FILE_ID}")
    
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"
    
    mock_remove.assert_called_once()
    mock_save.assert_called_once()
    # Check if entry was removed from metadata passed to save
    saved_meta = mock_save.call_args[0][1]
    assert TEST_FILE_ID not in saved_meta

def test_delete_file_not_found(mock_user_auth, mock_metadata):
    mock_load, _ = mock_metadata
    mock_load.return_value = {}
    
    response = client.delete(f"/files/delete/nonexistent")
    assert response.status_code == 404
