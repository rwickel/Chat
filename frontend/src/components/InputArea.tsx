// src/components/InputArea.tsx
import React, { useRef } from 'react';
import { Send, Paperclip, ChevronRight } from 'lucide-react';
import ContextChips from './ContextChips';
import ContextMenu from './ContextMenu';

interface InputAreaProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  handleSend: () => void;
  contextDocIds: string[];
  files: { id: string; name: string }[];
  isContextOpen: boolean;
  isSelectingDocs: boolean;
  setIsContextOpen: (open: boolean) => void;
  setIsSelectingDocs: (selecting: boolean) => void;
  setContextDocIds: (ids: string[]) => void;
  setIsDocsModalOpen: (open: boolean) => void;
}

const InputArea: React.FC<InputAreaProps> = ({
  input,
  setInput,
  isLoading,
  handleSend,
  contextDocIds,
  files,
  isContextOpen,
  isSelectingDocs,
  setIsContextOpen,
  setIsSelectingDocs,
  setContextDocIds,
  setIsDocsModalOpen,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextSummary =
    contextDocIds.length === 0
      ? 'No context'
      : `${contextDocIds.length} file${contextDocIds.length !== 1 ? 's' : ''}`;

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    setInput(el.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleContextMenu = () => {
    setIsSelectingDocs(false);
    setIsContextOpen(!isContextOpen);
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="max-w-[90%] mx-auto relative">
        <ContextMenu
          isOpen={isContextOpen}
          isSelectingDocs={isSelectingDocs}
          files={files}
          contextDocIds={contextDocIds}
          setContextDocIds={setContextDocIds}
          setIsDocsModalOpen={setIsDocsModalOpen}
          setIsSelectingDocs={setIsSelectingDocs}
          onClose={() => setIsContextOpen(false)}
        />

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:ring-4 focus-within:ring-gray-50 focus-within:border-gray-300 transition-all">
          <ContextChips
            files={files}
            contextDocIds={contextDocIds}
            onRemove={(id) => setContextDocIds(contextDocIds.filter((x) => x !== id))}
          />

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
                aria-hidden="true"
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
  );
};

export default InputArea;