import axios from "axios";

const API_URL = "http://localhost:8000/api";

export interface UploadResponse {
  id: string;
  original_name?: string;
  size?: number;
  mime_type?: string;
  status?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: string;
  status: string;
  mime_type: string;
}

export interface UploadProgressCallback {
  (percent: number): void;
}

// Internal helper to get auth headers
const getAuthHeaders = (token: string): Record<string, string> => {
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Main file upload service - using FormData with fetch for progress tracking
export const uploadFile = (
  file: File,
  onProgress: UploadProgressCallback,
  token: string
): Promise<UploadResponse> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    
    xhr.open("POST", `${API_URL}/upload`);

    // Set auth headers
    const headers = getAuthHeaders(token);
    if (headers.Authorization) {
      xhr.setRequestHeader("Authorization", headers.Authorization);
    }

    // Progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText) as UploadResponse;
          resolve(response);
        } catch (error) {
          reject(new Error("Failed to parse server response"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timeout"));
    };

    xhr.send(formData);
  });
};

// File deletion service
export const deleteFile = async (fileId: string, token: string): Promise<void> => {
  try {
    const headers = getAuthHeaders(token);
    await axios.delete(`${API_URL}/files/delete/${fileId}`, {
      headers,
    });
  } catch (error) {
    console.error("Failed to delete file on server", error);
    throw new Error("Failed to delete file from server");
  }
};

// List files service
export const listFiles = async (token: string): Promise<FileMetadata[]> => {
  try {
    const headers = getAuthHeaders(token);
    const response = await axios.get(`${API_URL}/files/list`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch files list", error);
    throw new Error("Failed to fetch files list");
  }
};

// Get file content service
export const getFileContent = async (fileId: string, token: string): Promise<any> => {
  try {
    const headers = getAuthHeaders(token);
    const response = await axios.get(`${API_URL}/content/${fileId}`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch file content", error);
    throw new Error("Failed to fetch file content");
  }
};

// Abort upload service
export const abortUpload = (xhr: XMLHttpRequest | null): void => {
  if (xhr) {
    xhr.abort();
  }
};