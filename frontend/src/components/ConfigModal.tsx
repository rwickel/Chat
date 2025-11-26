// frontend\src\components\ConfigModal.tsx
import React, { useState, useEffect } from 'react';
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

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (cfg: AppConfig) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setErrors({});
    }
  }, [isOpen, config]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate model name
    if (!localConfig.model.trim()) {
      newErrors.model = 'Model name is required';
    }
    
    // Validate chunk size
    if (localConfig.chunkSize <= 0) {
      newErrors.chunkSize = 'Chunk size must be greater than 0';
    }
    
    // Validate chunk overlap
    if (localConfig.chunkOverlap < 0) {
      newErrors.chunkOverlap = 'Chunk overlap cannot be negative';
    }
    
    // Validate docLinkUrl if provided
    if (localConfig.docLinkUrl && !isValidUrl(localConfig.docLinkUrl)) {
      newErrors.docLinkUrl = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(localConfig);
      onClose();
    }
  };

  const handleInputChange = (field: keyof AppConfig, value: string | number) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-[550px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-800">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-lg">System Configuration</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close configuration modal"
          >
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
                  onChange={e => handleInputChange('llmProvider', e.target.value as 'ollama' | 'openai')}
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI (Cloud)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Model Name</label>
                <input 
                  type="text" 
                  className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.model ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={localConfig.model}
                  onChange={e => handleInputChange('model', e.target.value)}
                  placeholder="e.g. gpt-4o or llama3"
                  aria-invalid={!!errors.model}
                  aria-describedby={errors.model ? "model-error" : undefined}
                />
                {errors.model && (
                  <p id="model-error" className="mt-1 text-sm text-red-600">{errors.model}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
              <input 
                type="password" 
                className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                  localConfig.llmProvider === 'ollama' ? 'bg-gray-100' : ''
                }`}
                value={localConfig.apiKey}
                onChange={e => handleInputChange('apiKey', e.target.value)}
                placeholder={localConfig.llmProvider === 'ollama' ? 'Not required for local models' : 'sk-...'}
                disabled={localConfig.llmProvider === 'ollama'}
                aria-describedby={localConfig.llmProvider === 'ollama' ? "api-key-disabled" : undefined}
              />
              {localConfig.llmProvider === 'ollama' && (
                <p id="api-key-disabled" className="mt-1 text-xs text-gray-500">API key not required for local models</p>
              )}
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
                  className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.chunkSize ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={localConfig.chunkSize}
                  onChange={e => handleInputChange('chunkSize', Number(e.target.value))}
                  min="1"
                  aria-invalid={!!errors.chunkSize}
                  aria-describedby={errors.chunkSize ? "chunk-size-error" : undefined}
                />
                {errors.chunkSize && (
                  <p id="chunk-size-error" className="mt-1 text-sm text-red-600">{errors.chunkSize}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Chunk Overlap</label>
                <input 
                  type="number" 
                  className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.chunkOverlap ? 'border-red-500' : 'border-gray-200'
                  }`}
                  value={localConfig.chunkOverlap}
                  onChange={e => handleInputChange('chunkOverlap', Number(e.target.value))}
                  min="0"
                  aria-invalid={!!errors.chunkOverlap}
                  aria-describedby={errors.chunkOverlap ? "chunk-overlap-error" : undefined}
                />
                {errors.chunkOverlap && (
                  <p id="chunk-overlap-error" className="mt-1 text-sm text-red-600">{errors.chunkOverlap}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">DocLink Service URL</label>
              <input 
                type="url" 
                className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                  errors.docLinkUrl ? 'border-red-500' : 'border-gray-200'
                }`}
                value={localConfig.docLinkUrl}
                onChange={e => handleInputChange('docLinkUrl', e.target.value)}
                placeholder="https://api.doclink.service/v1/convert"
                aria-invalid={!!errors.docLinkUrl}
                aria-describedby={errors.docLinkUrl ? "doclink-url-error" : undefined}
              />
              {errors.docLinkUrl && (
                <p id="doclink-url-error" className="mt-1 text-sm text-red-600">{errors.docLinkUrl}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Endpoint used to convert raw documents into processable text.</p>
            </div>
          </section>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cancel configuration"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center gap-2"
            aria-label="Save configuration"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;