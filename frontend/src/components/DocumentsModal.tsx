//frontend\src\components\DocumentsModal.tsx
import React, { useState, useRef } from "react";
import {
  FolderOpen,
  X,
  UploadCloud,
  File,
  FileText,
  Loader2,
  Trash2,
  StopCircle,
} from "lucide-react";
import axios from "axios";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress?: number;
  remoteId?: string; // id returned by server
}

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  onDelete: (id: string) => void;
  onFileClick?: (file: UploadedFile) => void;
}

const API_URL = "http://localhost:8000/api";

const DocumentsModal: React.FC<DocumentsModalProps> = ({
  isOpen,
  onClose,
  files,
  setFiles,
  onDelete,
  onFileClick
}) => {
  // store active XHRs so we can abort
  const xhrMapRef = useRef<Record<string, XMLHttpRequest | null>>({});

  if (!isOpen) return null;

  const getUserHeader = () => {
    // demo: store user email in localStorage
    const token = localStorage.getItem("token") || "";
    return token;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);

    // Add files to state as uploading
    const newLocalFiles: UploadedFile[] = filesArray.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      status: "uploading",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newLocalFiles]);

    filesArray.forEach(async (file, idx) => {
      const localId = newLocalFiles[idx].id;
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/upload`);
      // set demo auth header (backend accepts Bearer user:<email> or x-user)
      const token = getUserHeader();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === localId ? { ...f, progress: percent } : f
            )
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const res = JSON.parse(xhr.responseText);
            // server returns remote id and metadata
            setFiles((prev) =>
              prev.map((f) =>
                f.id === localId
                  ? {
                      ...f,
                      status: "ready",
                      progress: 100,
                      remoteId: res.id,
                      name: res.original_name || f.name,
                      size:
                        typeof res.size === "number"
                          ? `${(res.size / 1024).toFixed(2)} KB`
                          : f.size,
                    }
                  : f
              )
            );
          } catch (err) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === localId ? { ...f, status: "processing" } : f
              )
            );
            console.error("Failed to parse upload response", err);
          }
        } else {
          console.error("Upload failed:", xhr.responseText);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === localId ? { ...f, status: "error", progress: 0 } : f
            )
          );
        }
        // cleanup xhr
        xhrMapRef.current[localId] = null;
      };

      xhr.onerror = () => {
        console.error("Upload error");
        setFiles((prev) =>
          prev.map((f) =>
            f.id === localId ? { ...f, status: "error", progress: 0 } : f
          )
        );
        xhrMapRef.current[localId] = null;
      };

      // expose abort function
      xhrMapRef.current[localId] = xhr;
      try {
        xhr.send(formData);
      } catch (err) {
        console.error(err);
      }
    });

    // Reset input value so user can re-upload same file if needed
    e.target.value = "";
  };

  const handleAbort = (localId: string) => {
    const xhr = xhrMapRef.current[localId];
    if (xhr) {
      xhr.abort();
      xhrMapRef.current[localId] = null;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === localId ? { ...f, status: "error", progress: 0 } : f
        )
      );
    }
  };

  const handleRemoteDelete = async (file: UploadedFile) => {
    // If it's uploaded to backend, remoteId exists
    if (file.remoteId) {
      try {
        const token = getUserHeader();
        await axios.delete(`${API_URL}/files/delete/${file.remoteId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } catch (err) {
        console.error("Failed to delete on server", err);
      }
    }
    // Remove locally
    onDelete(file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-[80%] h-[80%] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-800">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-lg">Document Library</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Upload Zone */}
          <div className="mb-8">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white hover:bg-blue-50 hover:border-blue-400 transition-all group shadow-sm">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="p-2 bg-gray-100 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
                  <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                </div>
                <p className="mb-1 text-sm text-gray-600 group-hover:text-blue-600 font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400">PDF, TXT, DOCX (Max 50MB)</p>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>

          {/* File List Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">
                Uploaded Files
              </h3>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                {files.length} documents
              </span>
            </div>

            <table className="w-full text-left text-md">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Document Name</th>
                  <th className="px-6 py-3">Size</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-400 text-md"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <File className="w-8 h-8 opacity-20" />
                        <p>No documents uploaded yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50/80 transition-colors "
                      onClick={() => file.status === 'ready' && onFileClick?.(file)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded text-blue-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span
                            className="truncate max-w-[200px] "
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-md">
                        {file.size}
                      </td>
                      <td className="px-6 py-4">
                        {file.status === "ready" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-md font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ready
                          </span>
                        )}
                        {file.status === "uploading" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-md font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <Loader2 className="w-3 h-3 animate-spin" />{" "}
                            {file.progress ?? 0}%
                          </span>
                        )}
                        {file.status === "processing" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-md font-medium bg-amber-50 text-amber-700 border border-amber-100">
                            <Loader2 className="w-3 h-3 animate-spin" /> Processing
                          </span>
                        )}
                        {file.status === "error" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-md font-medium bg-red-50 text-red-700 border border-red-100">
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {file.status === "uploading" && (
                          <button
                            onClick={() => handleAbort(file.id)}
                            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all mr-2"
                            title="Abort upload"
                          >
                            <StopCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoteDelete(file)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsModal;
