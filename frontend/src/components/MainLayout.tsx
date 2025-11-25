//frontend\src\components\MainLayout.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import ConfigModal from "./ConfigModal";
import DocumentsModal from "./DocumentsModal";
import { UploadedFile } from "../types";

const API_URL = "http://localhost:8000/api"; // your backend URL

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [config, setConfig] = useState({ llmProvider: "openai", apiKey: "" });
  const [contextDocIds, setContextDocIds] = useState<string[]>([]); // server-side ids
  const [selectedFileRemoteId, setSelectedFileRemoteId] = useState<string | null>(null);
 

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch files from backend (server-side metadata)
  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files/list`, {
        headers: getAuthHeaders(),
      });
      // server returns id,name,size,status,mime_type
      const serverFiles: UploadedFile[] = res.data.map((f: any) => ({
        id: f.id, // use server id for selection
        name: f.name,
        size: f.size,
        status: f.status || "ready",
        progress: 100,
        remoteId: f.id
      }));
      setFiles(serverFiles);
      // pre-select first ready doc if nothing selected
      if (serverFiles.length > 0 && !selectedFileRemoteId) {
        setSelectedFileRemoteId(serverFiles[0].id);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
    // poll once at mount; you can call fetchFiles more often if needed
  }, []);

  // When files list changes and nothing selected, pick first ready
  useEffect(() => {
    if (files.length > 0 && !selectedFileRemoteId) {
      const firstReady = files.find((f) => f.status === "ready")?.id;
      if (firstReady) setSelectedFileRemoteId(firstReady);
    }
  }, [files]);

  const handleDelete = async (id: string) => {
    try {
      // id here might be local id; we expect remote id (server id) stored in file.id
      const token = localStorage.getItem("token") || "";
      await axios.delete(`${API_URL}/files/delete/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (selectedFileRemoteId === id) setSelectedFileRemoteId(null);
    } catch (err) {
      console.error("Failed to delete file", err);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isConfigOpen={isConfigOpen}
        setIsConfigOpen={setIsConfigOpen}
        config={config}
        setConfig={setConfig}
        isDocsModalOpen={isDocsModalOpen}
        setIsDocsModalOpen={setIsDocsModalOpen}
        isSidebarOpen={sidebarOpen}
        files={files}
        onSelect={(fileId: string) => setSelectedFileRemoteId(fileId)}
        selectedFileRemoteId={selectedFileRemoteId}
      />

      <ChatArea
        sidebarOpen={sidebarOpen}
        files={files}
        contextDocIds={contextDocIds}
        setContextDocIds={setContextDocIds}
        setIsDocsModalOpen={setIsDocsModalOpen}
        selectedFileRemoteId={selectedFileRemoteId}
        setSelectedFileRemoteId={setSelectedFileRemoteId}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={setConfig}
      />

      <DocumentsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        files={files}
        setFiles={setFiles}
        onDelete={handleDelete}
        onFileClick={(file) => {
          setSelectedFileRemoteId(file.remoteId || null); // update viewer
          setIsDocsModalOpen(false);
        }}
      />
    </div>
  );
};

export default MainLayout;
