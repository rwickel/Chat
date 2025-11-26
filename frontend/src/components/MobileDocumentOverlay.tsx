// src/components/MobileDocumentOverlay.tsx
import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import DocumentViewerContent from './DocumentViewerContent';

interface MobileDocumentOverlayProps {
  remoteId: string;
  fileName: string;
  onClose: () => void;
}

const MobileDocumentOverlay: React.FC<MobileDocumentOverlayProps> = ({ remoteId, fileName, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 md:hidden bg-white flex flex-col animate-in slide-in-from-bottom duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-doc-title"
    >
      <div className="p-4 border-b flex items-center gap-3 bg-gray-50">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-full"
          aria-label="Go back"
        >
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <h2 id="mobile-doc-title" className="font-medium truncate">
          {fileName}
        </h2>
      </div>
      <div className="flex-1 overflow-auto">
        <DocumentViewerContent remoteId={remoteId} localName={fileName} />
      </div>
    </div>
  );
};

export default MobileDocumentOverlay;