// src/components/ContextMenu.tsx
import * as React from 'react';
import {
  X,
  FileStack,
  CheckSquare,
  UploadCloud,
} from 'lucide-react';
import DocumentSelector from './DocumentSelector';
import { UploadedFile } from '../types';

interface ContextMenuProps {
  isOpen: boolean;
  isSelectingDocs: boolean;
  files: UploadedFile[];
  contextDocIds: string[];
  setContextDocIds: (ids: string[]) => void;
  setIsDocsModalOpen: (open: boolean) => void;
  setIsSelectingDocs: (selecting: boolean) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  isSelectingDocs,
  files,
  contextDocIds,
  setContextDocIds,
  setIsDocsModalOpen,
  setIsSelectingDocs,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="context-menu absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-20 animate-in slide-in-from-bottom-2 fade-in duration-200"
      role="menu"
    >
      {!isSelectingDocs ? (
        <div className="space-y-1">
          <button
            onClick={() => {
              setContextDocIds([]);
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
            role="menuitem"
          >
            <X size={14} /> Clear Context
          </button>
          <button
            onClick={() => {
              const readyIds = files.filter((f) => f.status === 'ready').map((f) => f.id);
              setContextDocIds(readyIds);
              onClose();
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
              onClose();
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
            <button onClick={() => setIsSelectingDocs(false)} className="text-xs text-blue-600">
              Back
            </button>
          </div>
          <DocumentSelector
            files={files}
            contextDocIds={contextDocIds}
            setContextDocIds={setContextDocIds}
            onClose={() => {}}
          />
        </div>
      )}
    </div>
  );
};

export default ContextMenu;