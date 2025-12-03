import React, { useState } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import ConfigModal from "./ConfigModal";
import DocumentsModal from "./DocumentsModal";

// Hooks
import { useFiles } from "../hooks/useFiles";
import { useConfig } from "../hooks/useConfig";
import { useFileSelection } from "../hooks/useFileSelection";

const MainLayout: React.FC = () => {
  // 1. UI State for Layout
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 2. Logic Hooks
  const { 
    files, 
    uploadFiles, 
    deleteFile, 
    cancelUpload 
  } = useFiles();

  const {
    selectedFileRemoteId,
    updateSelectedFileRemoteId,
    contextDocIds,
    setContextDocIds,
    isSelectingDocs,
    setIsSelectingDocs,
    isContextOpen,
    setIsContextOpen,
    isDocsModalOpen,
    setIsDocsModalOpen
  } = useFileSelection(files);

  const { 
    config, 
    updateConfig, 
    isConfigOpen, 
    setIsConfigOpen 
  } = useConfig();

  // Helper to toggle sidebar
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        isConfigOpen={isConfigOpen}
        setIsConfigOpen={setIsConfigOpen}
        config={config}
        setConfig={updateConfig} // Adapting hook to component prop
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
        toggleSidebar={toggleSidebar}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={updateConfig} // Adapting hook to component prop
      />

      <DocumentsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        files={files}
        onUpload={uploadFiles} // Pass the hook function directly
        onAbort={cancelUpload} // Pass the hook function directly
        onDelete={deleteFile}  // Pass the hook function directly
        onFileClick={(file) => {
          if (file.status === "ready" && file.remoteId) {
            updateSelectedFileRemoteId(file.remoteId);
            setIsDocsModalOpen(false);
          }
        }}
      />
    </div>
  );
};

export default MainLayout;