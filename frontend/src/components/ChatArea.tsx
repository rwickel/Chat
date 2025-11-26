// frontend/src/components/ChatArea.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import InputArea from './InputArea';
import DocumentViewerContent from './DocumentViewerContent';
import type { UploadedFile, Message } from "../types";

interface ChatAreaProps {
  sidebarOpen: boolean;
  files: UploadedFile[];
  contextDocIds: string[];
  isContextOpen: boolean;
  isSelectingDocs: boolean;
  setIsContextOpen: (isOpen: boolean) => void;
  setIsSelectingDocs: (isSelecting: boolean) => void;
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
  isContextOpen,
  isSelectingDocs,
  setIsContextOpen,
  setIsSelectingDocs,
  setContextDocIds,
  setIsDocsModalOpen,
  selectedFileRemoteId,
  setSelectedFileRemoteId,
  toggleSidebar,
}: ChatAreaProps) => {

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatWidth, setChatWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);

  // REFS for DOM access and drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);       // Ref for the Chat Area
  const docViewerRef = useRef<HTMLDivElement>(null);      // NEW: Ref for the Document Viewer
  const startXRef = useRef(0);
  const startChatWidthRef = useRef(0);
  const currentChatWidthRef = useRef(chatWidth); 
  

  const selectedFile = files.find((f) => f.remoteId === selectedFileRemoteId);
  const shouldShowDocViewer = Boolean(selectedFileRemoteId && selectedFile);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const docs = files.filter((f) => contextDocIds.includes(f.id));
      const citation = docs.length > 0 ? docs[0].remoteId : 'doc-1';

      const aiMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `
Checking ${contextDocIds.length} context documents.
Found relevant financial data in Q3 Report.
Summarizing key performance indicators.
Based on the uploaded documents, the Q3 revenue grew by 15% compared to the previous quarter. The primary driver was the new enterprise subscription tier. You can find more details in the [${citation}|12].`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1500);
  }, [input, isLoading, files, contextDocIds]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startChatWidthRef.current = chatWidth;
    currentChatWidthRef.current = chatWidth;
  };

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    // Update the state only when dragging stops to persist the size
    setChatWidth(currentChatWidthRef.current);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    // Check all necessary refs before proceeding
    if (!isResizing || !containerRef.current || !chatAreaRef.current || !docViewerRef.current) return;
    
    const container = containerRef.current;
    const chatArea = chatAreaRef.current;
    const docViewerArea = docViewerRef.current;
    
    const containerRect = container.getBoundingClientRect();
    const diff = e.clientX - startXRef.current;
    const percentage = (diff / containerRect.width) * 100;
    
    let newWidth = startChatWidthRef.current + percentage;
    // Clamp the width to bounds (20% - 80%)
    newWidth = Math.min(Math.max(newWidth, 20), 80);
    
    const newDocViewerWidth = 100 - newWidth;
    
    // FIX: Update the DOM style for BOTH areas directly for smooth resizing
    chatArea.style.width = `${newWidth}%`;
    docViewerArea.style.width = `${newDocViewerWidth}%`;
    
    // Update the ref to track the current width
    currentChatWidthRef.current = newWidth;
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full bg-white"
      style={{ minHeight: '500px' }}
    >
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Chat Area */}
        <div
          ref={chatAreaRef} 
          className={`flex flex-col ${
            shouldShowDocViewer ? 'flex-none' : 'flex-1'
          } min-w-0 bg-gray-50 transition-all duration-300`}
          style={{
            // Set initial width from state. This value is used until dragging starts.
            width: shouldShowDocViewer ? `${chatWidth}%` : '100%',
          }}
        >
          <ChatHeader sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
          <MessageList
            messages={messages}
            isLoading={isLoading}
            onCitationClick={(docId) => setSelectedFileRemoteId(docId)}
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
            setIsContextOpen={setIsContextOpen} // Add this line
            setIsSelectingDocs={setIsSelectingDocs}
            setContextDocIds={setContextDocIds}
            setIsDocsModalOpen={setIsDocsModalOpen}
          />
        </div>

        {/* Resizer Handle */}
        {shouldShowDocViewer && (
          <div
            className="w-2 bg-gray-300 cursor-col-resize hover:bg-blue-500 transition-colors flex items-center justify-center relative"
            onMouseDown={startResizing}
            style={{ minHeight: '500px' }}
          >
            <div className="w-1 h-8 bg-gray-400 rounded-full"></div>
          </div>
        )}

        {/* Document Viewer */}
        {shouldShowDocViewer && (
          <div
            ref={docViewerRef} 
            className={`flex flex-col ${
              shouldShowDocViewer ? 'flex-none' : 'flex-1'
            } min-w-0 bg-white border-l border-gray-200`}
            style={{
              // Set initial width from state. This value is used until dragging starts.
              width: shouldShowDocViewer ? `${100 - chatWidth}%` : '100%',
            }}
          >
            <DocumentViewerContent
              remoteId={selectedFileRemoteId!}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;