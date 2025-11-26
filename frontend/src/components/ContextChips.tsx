// src/components/ContextChips.tsx
import * as React from 'react';
import { Paperclip, X } from 'lucide-react';
import { UploadedFile } from '../types';

interface ContextChipsProps {
  files: UploadedFile[];
  contextDocIds: string[];
  onRemove: (id: string) => void;
}

const ContextChips: React.FC<ContextChipsProps> = ({ files, contextDocIds, onRemove }) => {
  // Dedupe & map to files
  const chips = [...new Set(contextDocIds)]
    .map((id) => files.find((f) => f.id === id))
    .filter(Boolean) as UploadedFile[];

  if (chips.length === 0) return null;

  return (
    <div className="px-3 pt-3 flex flex-wrap gap-2">
      {chips.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-1.5 bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded-md border border-gray-200 animate-in fade-in zoom-in duration-200"
        >          
          <span className="max-w-[100px] truncate font-medium">{file.name}</span>
          <button
            onClick={() => onRemove(file.id)}
            className="text-gray-400 hover:text-red-500 ml-0.5"
            aria-label={`Remove ${file.name} from context`}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ContextChips;