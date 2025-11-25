// frontend\src\components\ConfigModal.tsx
import React, { useState } from 'react';
import { X, Settings, Cpu, Database, Save } from 'lucide-react';

interface AppConfig {
  apiKey: string;
  llmProvider: 'ollama' | 'openai';
  model: string;
  chunkSize: number;
  chunkOverlap: number;
  docLinkUrl: string;
  temperature: number;
}

const ConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (cfg: AppConfig) => void;
}> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-[550px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-800">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-lg">System Configuration</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* LLM Settings */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3 h-3" /> LLM Backend
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
                <select 
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  value={localConfig.llmProvider}
                  onChange={e => setLocalConfig({...localConfig, llmProvider: e.target.value as any})}
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI (Cloud)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Model Name</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={localConfig.model}
                  onChange={e => setLocalConfig({...localConfig, model: e.target.value})}
                  placeholder="e.g. gpt-4o or llama3"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
              <input 
                type="password" 
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                value={localConfig.apiKey}
                onChange={e => setLocalConfig({...localConfig, apiKey: e.target.value})}
                placeholder={localConfig.llmProvider === 'ollama' ? 'Not required for local models' : 'sk-...'}
                disabled={localConfig.llmProvider === 'ollama'}
              />
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* RAG Strategy */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3 h-3" /> RAG Strategy
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Chunk Size (tokens)</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={localConfig.chunkSize}
                  onChange={e => setLocalConfig({...localConfig, chunkSize: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Chunk Overlap</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={localConfig.chunkOverlap}
                  onChange={e => setLocalConfig({...localConfig, chunkOverlap: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">DocLink Service URL</label>
              <input 
                type="url" 
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={localConfig.docLinkUrl}
                onChange={e => setLocalConfig({...localConfig, docLinkUrl: e.target.value})}
                placeholder="https://api.doclink.service/v1/convert"
              />
              <p className="text-xs text-gray-500 mt-1">Endpoint used to convert raw documents into processable text.</p>
            </div>
          </section>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onSave(localConfig); onClose(); }} 
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;