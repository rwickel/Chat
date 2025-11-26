import React, { useState } from 'react';
import { UploadedFile } from '../types'; // Adjust import path as needed
import { CheckSquare, Square, Search} from 'lucide-react';
interface DocumentSelectorProps {
  files: UploadedFile[];
  contextDocIds: string[];
  setContextDocIds: (ids: string[]) => void;
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({ 
  files, 
  contextDocIds, 
  setContextDocIds, 
}) => {
  // Only show documents that are 'ready'
  const [searchTerm, setSearchTerm] = useState("");
  
  const readyFiles = files.filter(f => f.status === 'ready');
  const filtered = readyFiles.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleFile = (id: string) => {
    if (contextDocIds.includes(id)) {
      setContextDocIds(contextDocIds.filter(cid => cid !== id));
    } else {
      setContextDocIds([...contextDocIds, id]);
    }
  };

  return (
    <div className="max-h-60 overflow-y-auto pt-2">
      <div className="px-2 mb-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 w-5 h-5 text-gray-400" />
          <input 
            className="w-full bg-gray-100 rounded-md py-1 pl-10 pr-2 p-2 text-md border-1 border-gray-300 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search docs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="p-4 text-center text-md text-gray-800">No matching documents</div>
      ) : (
        filtered.map(f => (
          <div 
            key={f.id} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => toggleFile(f.id)}
          >
            {contextDocIds.includes(f.id) 
              ? <CheckSquare className="w-5 h-5 text-blue-600" />
              : <Square className="w-5 h-5 text-gray-300" />
            }
            <span className="text-md text-gray-800 truncate">{f.name}</span>
          </div>
        ))
      )}
    </div>
  );
};

export default DocumentSelector;