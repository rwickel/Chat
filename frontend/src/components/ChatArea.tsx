// src\components\ChatArea.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  User,
  Bot,
  X,
  CheckSquare,
  FileStack,
  FileText,
  UploadCloud,
  Paperclip,
  ChevronRight,
  Menu,
} from 'lucide-react';
import DocumentSelector from './DocumentSelector';
import SimpleTextRenderer from './SimpleTextRenderer';
import DocumentViewerContent from './DocumentViewerContent';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Reset textarea height
  const resetTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px';
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    resetTextareaHeight(); // Reset *before* async op to avoid flicker

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
  }, [input, isLoading, files, contextDocIds, resetTextareaHeight]);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 200);
    el.style.height = `${newHeight}px`;
    setInput(el.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleContextMenu = useCallback(() => {
    setIsSelectingDocs(false);
    setIsContextOpen((prev) => !prev);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        isContextOpen &&
        !target.closest('.context-menu') &&
        !target.closest('[aria-controls="context-menu"]')
      ) {
        setIsContextOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isContextOpen]);

  // Safely get context files
  const selectedContextFiles = files.filter((f) => contextDocIds.includes(f.id));
  const contextSummary =
    contextDocIds.length === 0
      ? 'No context'
      : `${contextDocIds.length} file${contextDocIds.length !== 1 ? 's' : ''}`;

  // Memoize chips to avoid re-render flicker
  const contextChips = React.useMemo(() => {
    return [...new Set(contextDocIds)]
      .map((id) => files.find((f) => f.id === id))
      .filter(Boolean) as UploadedFile[];
  }, [contextDocIds, files]);

  // Get file by remoteId (safe)
  const findFileByRemoteId = (remoteId: string | null) => {
    if (!remoteId) return null;
    return files.find((f) => f.remoteId === remoteId) || null;
  };

  const selectedFile = findFileByRemoteId(selectedFileRemoteId);
  const shouldShowDocViewer = Boolean(selectedFileRemoteId && selectedFile);

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Main Content Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Chat Area */}
        <div
          className={`flex flex-col flex-1 min-w-0 bg-gray-50 transition-all duration-300 ${
            shouldShowDocViewer ? 'w-full md:w-1/2 border-r border-gray-200' : 'w-full'
          }`}
        >
          {/* Header */}
          <header className="h-14 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={toggleSidebar}
                  aria-label="Toggle sidebar"
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  <Menu size={20} />
                </button>
              )}
            </div>
            <span
              className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1"
              aria-label="RAG is active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              RAG Active
            </span>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-24 h-24 bg-white rotate-4 rounded-2xl shadow-lg flex items-center justify-center">
                  <Bot className="w-14 h-14 text-blue-500" />
                </div>
                <div className="text-center max-w-md">
                  <h3 className="text-gray-900 font-medium mb-1 text-2xl">How can I help you?</h3>
                  <p className="text-md">Ask questions about your documents</p>
                </div>
              </div>
            )}

            <div className="space-y-6 max-w-[90%] mx-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="w-10 h-10 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm mr-4"
                      aria-label="AI response"
                    >
                      <Bot size={24} />
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div
                      className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm mr-4"
                      aria-label="Your message"
                    >
                      <User size={24} />
                    </div>
                  )}
                  <div
                    className={`${
                      msg.role === 'user'
                        ? 'bg-gray-200 w-[80%] text-gray-800 text-xl rounded-2xl rounded-tr-sm shadow-md ml-2'
                        : 'bg-white w-full border text-gray-800 text-xl border-gray-200 rounded-2xl rounded-tl-sm shadow-sm mr-2'
                    } p-4`}
                  >
                    <SimpleTextRenderer
                      content={msg.content}
                      isBot={msg.role === 'assistant'}
                      onCitationClick={(docId) => setSelectedFileRemoteId(docId)}
                    />
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div
                    className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center mt-1 text-white"
                    aria-label="AI is responding"
                  >
                    <Bot size={16} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 100}ms` }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="max-w-[90%] mx-auto relative">
              {/* Context Menu */}
              {isContextOpen && (
                <div
                  className="context-menu absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-20 animate-in slide-in-from-bottom-2 fade-in duration-200"
                  role="menu"
                >
                  {!isSelectingDocs ? (
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setContextDocIds([]);
                          setIsContextOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                        role="menuitem"
                      >
                        <X size={14} /> Clear Context
                      </button>
                      <button
                        onClick={() => {
                          const readyIds = files
                            .filter((f) => f.status === 'ready')
                            .map((f) => f.id);
                          setContextDocIds(readyIds);
                          setIsContextOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                        role="menuitem"
                      >
                        <FileStack size={14} /> All Documents
                      </button>
                      <button
                        onClick={() => setIsSelectingDocs(true)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                        role="menuitem"
                      >
                        <CheckSquare size={14} /> Select Specific...
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      <button
                        onClick={() => {
                          setIsDocsModalOpen(true);
                          setIsContextOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                        role="menuitem"
                      >
                        <UploadCloud size={14} /> Upload New
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500">Select Documents</span>
                        <button
                          onClick={() => setIsSelectingDocs(false)}
                          className="text-xs text-blue-600"
                        >
                          Back
                        </button>
                      </div>
                      <DocumentSelector
                        files={files}
                        contextDocIds={contextDocIds}
                        setContextDocIds={setContextDocIds}
                        onClose={() => {
                          /* unused but required by prop */
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:ring-4 focus-within:ring-gray-50 focus-within:border-gray-300 transition-all">
                {/* Context chips */}
                {contextChips.length > 0 && (
                  <div className="px-3 pt-3 flex flex-wrap gap-2">
                    {contextChips.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-1.5 bg-gray-50 text-gray-700 text-sm px-2 py-1 rounded-md border border-gray-200 animate-in fade-in zoom-in duration-200"
                      >
                        <Paperclip size={10} className="text-gray-400" />
                        <span className="max-w-[160px] truncate font-medium">
                          {file.name}
                        </span>
                        <button
                          onClick={() => setContextDocIds((prev) => prev.filter((id) => id !== file.id))}
                          className="text-gray-400 hover:text-red-500 ml-0.5"
                          aria-label={`Remove ${file.name} from context`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask a question with context from: ${contextSummary}…`}
                  className="w-full bg-transparent border-0 text-gray-900 rounded-2xl pl-6 pr-4 py-4 focus:outline-none focus:ring-0 resize-none text-lg"
                  rows={1}
                  style={{ minHeight: '56px' }}
                  disabled={isLoading}
                  aria-label="Type your message"
                />

                {/* Toolbar */}
                <div className="flex justify-between items-center px-2 pb-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleContextMenu}
                      aria-controls="context-menu"
                      aria-expanded={isContextOpen}
                      className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium ${
                        isContextOpen
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      <Paperclip size={18} />
                      {contextDocIds.length === 0 && <span>Attach</span>}
                    </button>

                    <div className="h-4 w-px bg-gray-200 mx-1" />

                    <button
                      className="flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      disabled
                      aria-hidden="true" // disable for now; future extensibility
                    >
                      <span>Ask AI</span>
                      <ChevronRight size={14} className="opacity-50" />
                    </button>
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`p-2 rounded-xl transition-all shadow-sm ${
                      input.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                    aria-label={input.trim() ? 'Send message' : 'Type a message to send'}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              <p className="text-center mt-2 text-xs text-gray-400" aria-live="polite">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Document Viewer */}
        {shouldShowDocViewer && (
          <div className="hidden md:flex flex-col w-1/2 bg-white h-full border-l border-gray-200 animate-in slide-in-from-right duration-300">
            <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
              <span className="font-medium text-gray-700 text-sm flex items-center gap-2 truncate">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{selectedFile.name}</span>
              </span>
              <button
                onClick={() => setSelectedFileRemoteId(null)}
                className="p-1 hover:bg-gray-200 rounded text-gray-500"
                aria-label="Close document viewer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentViewerContent remoteId={selectedFileRemoteId} localName={selectedFile.name} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Document Overlay */}
      {shouldShowDocViewer && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-white flex flex-col animate-in slide-in-from-bottom duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-doc-title"
        >
          <div className="p-4 border-b flex items-center gap-3 bg-gray-50">
            <button
              onClick={() => setSelectedFileRemoteId(null)}
              className="p-2 hover:bg-gray-200 rounded-full"
              aria-label="Go back"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <h2 id="mobile-doc-title" className="font-medium truncate">
              {selectedFile.name}
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <DocumentViewerContent remoteId={selectedFileRemoteId} localName={selectedFile.name} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;