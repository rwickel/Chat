// src/components/ChatArea.tsx
import React, { useState, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import InputArea from './InputArea';
import DocumentViewerPanel from './DocumentViewerPanel';
import MobileDocumentOverlay from './MobileDocumentOverlay';
import { UploadedFile, Message } from '../types';

interface ChatAreaProps {
  sidebarOpen: boolean;
  files: UploadedFile[];
  contextDocIds: string[];
  setContextDocIds: (ids: string[]) => void;
  setIsDocsModalOpen: (open: boolean) => void;
  selectedFileRemoteId: string | null;
  setSelectedFileRemoteId: (id: string | null) => void;
  toggleSidebar: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  sidebarOpen,
  files,
  contextDocIds,
  setContextDocIds,
  setIsDocsModalOpen,
  selectedFileRemoteId,
  setSelectedFileRemoteId,
  toggleSidebar,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isSelectingDocs, setIsSelectingDocs] = useState(false);

  // Find selected file safely
  const selectedFile = files.find((f) => f.remoteId === selectedFileRemoteId);
  const shouldShowDocViewer = Boolean(selectedFileRemoteId && selectedFile);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Mock AI response
    setTimeout(() => {
      const docs = files.filter((f) => contextDocIds.includes(f.id));
      const citation = docs.length > 0 ? docs[0].remoteId : 'doc-1';

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `
<think>
Checking ${contextDocIds.length} context documents.
Found relevant financial data in Q3 Report.
Summarizing key performance indicators.
</think>Based on the uploaded documents, the Q3 revenue grew by 15% compared to the previous quarter. The primary driver was the new enterprise subscription tier. You can find more details in the [${citation}|12].
        `,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1500);
  }, [input, isLoading, files, contextDocIds]);

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Chat */}
        <div
          className={`flex flex-col flex-1 min-w-0 bg-gray-50 transition-all duration-300 ${
            shouldShowDocViewer ? 'w-full md:w-1/2 border-r border-gray-200' : 'w-full'
          }`}
        >
          <ChatHeader sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
          <MessageList
            messages={messages}
            isLoading={isLoading}
            onCitationClick={setSelectedFileRemoteId}
          />
          <InputArea
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            handleSend={handleSend}
            contextDocIds={contextDocIds}
            files={files}
            isContextOpen={isContextOpen}
            isSelectingDocs={isSelectingDocs}
            setIsContextOpen={setIsContextOpen}
            setIsSelectingDocs={setIsSelectingDocs}
            setContextDocIds={setContextDocIds}
            setIsDocsModalOpen={setIsDocsModalOpen}
          />
        </div>

        {/* Desktop Doc Viewer */}
        {shouldShowDocViewer && (
          <DocumentViewerPanel
            remoteId={selectedFileRemoteId}
            fileName={selectedFile.name}
            onClose={() => setSelectedFileRemoteId(null)}
          />
        )}
      </div>

      {/* Mobile Doc Overlay */}
      {shouldShowDocViewer && (
        <MobileDocumentOverlay
          remoteId={selectedFileRemoteId}
          fileName={selectedFile.name}
          onClose={() => setSelectedFileRemoteId(null)}
        />
      )}
    </div>
  );
};

export default ChatArea;