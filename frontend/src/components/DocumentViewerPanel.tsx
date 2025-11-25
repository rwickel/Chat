// src/components/DocumentViewerPanel.tsx
import React from 'react';
import { FileText, X } from 'lucide-react';
import DocumentViewerContent from './DocumentViewerContent';

interface DocumentViewerPanelProps {
  remoteId: string;
  fileName: string;
  onClose: () => void;
}

const DocumentViewerPanel: React.FC<DocumentViewerPanelProps> = ({ remoteId, fileName, onClose }) => {
  return (
    <div className="hidden md:flex flex-col w-1/2 bg-white h-full border-l border-gray-200 animate-in slide-in-from-right duration-300">
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
        <span className="font-medium text-gray-700 text-sm flex items-center gap-2 truncate">
          <FileText size={16} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{fileName}</span>
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded text-gray-500"
          aria-label="Close document viewer"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentViewerContent remoteId={remoteId} localName={fileName} />
      </div>
    </div>
  );
};

export default DocumentViewerPanel;