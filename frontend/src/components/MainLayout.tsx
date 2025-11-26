// frontend/src/components/MainLayout.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import ConfigModal from "./ConfigModal";
import DocumentsModal from "./DocumentsModal";
import InputArea from "./InputArea";
import { UploadedFile } from "../types";

const API_URL = "http://localhost:8000/api"; // your backend URL

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [config, setConfig] = useState({
    llmProvider: "openai",
    apiKey: "",
    model: "",
    chunkSize: 1000,
    chunkOverlap: 200,
    docLinkUrl: "",
    temperature: 0.1,
  });
  const [contextDocIds, setContextDocIds] = useState<string[]>([]); // server-side ids
  const [selectedFileRemoteId, setSelectedFileRemoteId] = useState<string | null>(null);
  const [isSelectingDocs, setIsSelectingDocs] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  // ===== Wrapper for safely updating selectedFileRemoteId =====
  const updateSelectedFileRemoteId = (id: string | null) => {
    console.log("updateSelectedFileRemoteId called with:", id);
    
    if (!id || typeof id !== "string") {
      setSelectedFileRemoteId(null);
      return;
    }

    const trimmed = id.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "null" || trimmed === "undefined") {
      setSelectedFileRemoteId(null);
      return;
    }

    setSelectedFileRemoteId(trimmed);
  };

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

      const serverFiles: UploadedFile[] = res.data.map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        status: f.status || "ready",
        progress: 100,
        remoteId: f.id,
      }));

      setFiles(serverFiles);

      // pre-select first ready doc if nothing selected
      if (serverFiles.length > 0 && !selectedFileRemoteId) {
        updateSelectedFileRemoteId(serverFiles[0].id);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // When files list changes and nothing selected, pick first ready
  useEffect(() => {
    if (files.length > 0 && !selectedFileRemoteId) {
      const firstReady = files.find((f) => f.status === "ready")?.id;
      if (firstReady) updateSelectedFileRemoteId(firstReady);
    }
  }, [files]);

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token") || "";
      await axios.delete(`${API_URL}/files/delete/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      setFiles((prev) => prev.filter((f) => f.id !== id));

      if (selectedFileRemoteId === id) updateSelectedFileRemoteId(null);
    } catch (err) {
      console.error("Failed to delete file", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setIsLoading(true);

    try {
      // Your send logic here
      console.log("Sending message:", input);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsLoading(false);
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
        onSelect={updateSelectedFileRemoteId}
        selectedFileRemoteId={selectedFileRemoteId}
      />

      <ChatArea
        sidebarOpen={sidebarOpen}
        files={files}
        contextDocIds={contextDocIds}
        setContextDocIds={setContextDocIds}
        isContextOpen={isContextOpen}       
        setIsContextOpen={setIsContextOpen} 
        setIsSelectingDocs={setIsSelectingDocs} 
        isSelectingDocs={isSelectingDocs}        
        setIsDocsModalOpen={setIsDocsModalOpen}
        selectedFileRemoteId={selectedFileRemoteId}
        setSelectedFileRemoteId={updateSelectedFileRemoteId}
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
          updateSelectedFileRemoteId(file.remoteId || null);
          setIsDocsModalOpen(false);
        }}
      />

     
    </div>
  );
};

export default MainLayout;
