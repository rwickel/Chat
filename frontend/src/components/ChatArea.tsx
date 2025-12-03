// frontend/src/components/ChatArea.tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import InputArea from "./InputArea";
import DocumentViewer from "./DocumentViewer";
import type { UploadedFile } from "../types";
import { useChat } from "../hooks/useChat";

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
}) => {
  const [input, setInput] = useState("");
  const [chatWidth, setChatWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Chat handling through useChat
  const { messages, isLoading, sendMessage, setMessages } = useChat({
    contextDocIds,
  });

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const docViewerRef = useRef<HTMLDivElement>(null);

  const startXRef = useRef(0);
  const startChatWidthRef = useRef(0);
  const currentChatWidthRef = useRef(chatWidth);

  const selectedFile = files.find((f) => f.remoteId === selectedFileRemoteId);
  const shouldShowDocViewer = Boolean(selectedFile);

  const handleCloseViewer = () => setSelectedFileRemoteId(null);

  // ----------------------
  // EDIT MESSAGE HANDLING
  // ----------------------
 const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;
    
    // Find the index of the message being edited
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) return;
    
    // Remove all messages UP TO (and including) the edited one
    // This means we keep only messages before the edited message
    const messagesBefore = messages.slice(0, messageIndex);
    
    // Set the state to only messages before the edited one
    // This completely removes the edited message and everything after it
    setMessages(messagesBefore);
    
    // Now send the edited content as a brand new message
    await sendMessage(newContent.trim());
  }, [messages, sendMessage, setMessages]);

  const handleAbortEdit = useCallback(() => {
    // Simply exit edit mode, no state changes needed
    console.log('Edit aborted');
  }, []);
  
  
  // ----------------------
  // SEND MESSAGE
  // ----------------------
  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  // ---------------------------------------------------------------------------
  // Resizer Logic
  // ---------------------------------------------------------------------------

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startChatWidthRef.current = chatWidth;
    currentChatWidthRef.current = chatWidth;
  };

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setChatWidth(currentChatWidthRef.current);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (
        !isResizing ||
        !containerRef.current ||
        !chatAreaRef.current ||
        !docViewerRef.current
      )
        return;

      const container = containerRef.current;
      const diff = e.clientX - startXRef.current;
      const percentage = (diff / container.offsetWidth) * 100;

      let newWidth = startChatWidthRef.current + percentage;
      newWidth = Math.min(Math.max(newWidth, 20), 80);

      currentChatWidthRef.current = newWidth;
      chatAreaRef.current.style.width = `${newWidth}%`;
      docViewerRef.current.style.width = `${100 - newWidth}%`;
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full bg-white"
      style={{ minHeight: "500px" }}
    >
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* CHAT AREA ----------------------------------------------------------- */}
        <div
          ref={chatAreaRef}
          className={`flex flex-col ${
            shouldShowDocViewer ? "flex-none" : "flex-1"
          } min-w-0 bg-gray-50 transition-all duration-300`}
          style={{
            width: shouldShowDocViewer ? `${chatWidth}%` : "100%",
          }}
        >
          <ChatHeader
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
          />

          <MessageList
            messages={messages}
            isLoading={isLoading}
            onCitationClick={(docId) => setSelectedFileRemoteId(docId)}
            onEditMessage={handleEditMessage}
            onAbortEdit={handleAbortEdit}
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

        {/* RESIZER HANDLE ------------------------------------------------------ */}
        {shouldShowDocViewer && (
          <div
            className="w-2 bg-gray-300 cursor-col-resize hover:bg-blue-500 transition-colors"
            onMouseDown={startResizing}
          >
            <div className="w-1 h-8 bg-gray-400 rounded-full mx-auto"></div>
          </div>
        )}

        {/* DOCUMENT VIEWER ----------------------------------------------------- */}
        {shouldShowDocViewer && (
          <div
            ref={docViewerRef}
            className="flex flex-col flex-none min-w-0 bg-white border-l border-gray-200"
            style={{
              width: `${100 - chatWidth}%`,
            }}
          >
            <DocumentViewer
              remoteId={selectedFileRemoteId!}
              onClose={handleCloseViewer}
              searchResults={searchResults}
              onSearchResultsChange={setSearchResults}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
