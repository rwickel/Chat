// src/components/ChatHeader.tsx
import * as React from 'react';
import { Menu } from 'lucide-react';

interface ChatHeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ sidebarOpen, toggleSidebar }) => {
  return (
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
  );
};

export default ChatHeader;