import axios, { AxiosInstance, AxiosRequestConfig, AxiosProgressEvent } from "axios";
import { UploadedFile, Message, ChatResponse } from "../types";

// --- Configuration ---
const API_URL = "http://localhost:8000/api";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: DEFAULT_TIMEOUT,
});

// --- Interceptors ---
// Automatically attach token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- FileService ---
export const FileService = {
  listFiles: async (): Promise<UploadedFile[]> => {
    const response = await apiClient.get("/files/list", {
      timeout: 10000, // 10 seconds for file listing
    });
    if (response.status !== 200) throw new Error(`Failed to list files: ${response.statusText}`);
    const files: any[] = response.data;
    return files.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      status: f.status,
      mimeType: f.mime_type,
      remoteId: f.id,
      progress: 0,
    }));
  },

  uploadFile: async (file: File, onProgress: (progress: number) => void, signal?: AbortSignal): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);

    const config: AxiosRequestConfig = {
      headers: { "Content-Type": "multipart/form-data" },
      signal,
      timeout: 60000, // 60 seconds for file upload
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(percent);
        }
      },
    };

    const response = await apiClient.post("/files/upload", formData, config);
    return response.data;
  },

  deleteFile: async (remoteId: string): Promise<void> => {
    await apiClient.delete(`/files/delete/${remoteId}`, {
      timeout: 15000, // 15 seconds for delete
    });
  },
};

// --- ChatService ---
export const ChatService = {
  /**
   * Send chat messages and context documents to backend
   */
  sendMessage: async (
    messages: Message[],
    contextDocIds: string[]
  ): Promise<ChatResponse> => {
    const response = await apiClient.post("/chat", {
      messages,
      contextDocIds,
    }, {
      timeout: 10000, // 10 seconds for chat responses
    });
    return response.data as ChatResponse;
  },
};

export default apiClient;