// components/Sidebar.tsx
import * as React from 'react'; // Removed unused useState import
import { UploadedFile, Config } from '../types';
import { 
  Settings, 
  LogOut,   
  UploadCloud,
  FileText,
  Loader2,
  Bot,  
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isConfigOpen: boolean;
  setIsConfigOpen: (v: boolean) => void;
  config: Config;
  setConfig: (c: Config) => void;
  isDocsModalOpen: boolean;
  setIsDocsModalOpen: (v: boolean) => void;  
  files: UploadedFile[];
  onSelect: (id: string) => void;
  selectedFileRemoteId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
   isOpen, setIsConfigOpen, setIsDocsModalOpen, files, onSelect, selectedFileRemoteId
}) => {  

  const handleLogout = () => {
    // Clear the token from localStorage/sessionStorage
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    // Redirect to login page or refresh the page
    window.location.href = '/login';
  };

  return (
    <div className={`bg-gray-900 text-gray-300 min-w-80 flex flex-col transition-all duration-300 ease-in-out border-r border-gray-800 overflow-hidden relative ${isOpen ? 'w-80' : 'w-20'}`}>
      {/* Sidebar Header */}
        <div className="p-5 border-b border-gray-800 flex items-center gap-3 min-w-72">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white leading-tight">Agentic RAG</h2>
            <span className="text-xs text-gray-500">Workspace Pro</span>
          </div>
        </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto py-8 ">
        <div className="px-4 mb-2 text-md font-semibold text-gray-500 uppercase tracking-wider">
          Documents
        </div>
        
        {files.length === 0 ? (
           <div className="px-4 py-8 text-center text-md text-gray-500">
             <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
             No files yet
           </div>
        ) : (
          <div className="space-y-0.5 px-2 text-md">
            {files.map(f => (
              <button
                key={f.id}
                onClick={() => f.status === 'ready' && f.remoteId && onSelect(f.remoteId)}
                className={`w-full text-left text-md flex items-center text-md gap-3 px-3 py-2 rounded-lg  transition-colors ${
                  selectedFileRemoteId === f.remoteId 
                    ? 'bg-blue-900 text-gray-200' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className='w-6 h-6' />
                <span className="truncate">{f.name}</span>
                {f.status !== 'ready' && <Loader2 size={18} className="animate-spin ml-auto text-gray-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
        <button 
          onClick={() => setIsDocsModalOpen(true)}
          className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-800 rounded-lg text-md text-gray-400 hover:text-white transition-colors"
        >
          <UploadCloud className="w-6 h-6" /> Upload Files
        </button>
        <button 
          onClick={() => setIsConfigOpen(true)}
          className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-800 rounded-lg text-md text-gray-400 hover:text-white transition-colors"
        >
          <Settings className="w-6 h-6" /> Settings
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-800 rounded-lg text-md text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-6 h-6" /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;