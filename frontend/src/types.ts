export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Citation[]; // Links to specific document pages
  isThinking?: boolean; // For agentic "thinking" state
}

export interface Citation {
  docId: string;
  docName: string;
  pageNumber: number;
  snippet: string;
}

export interface AppConfig {
  apiKey: string;
  llmProvider: 'ollama' | 'openai';
  chunkSize: number;
  chunkOverlap: number;
  docLinkUrl: string;
}

// --- Types ---
export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress?: number;
  remoteId?: string;
  content?: string; // Mock content for demo
  type?: 'text' | 'pdf';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Config {
  llmProvider: string;
  apiKey: string;
}

export interface SearchResult {
  page: number;
  text: string;
  matchIndex: number;
  totalMatches: number;
  itemIndex: number;
}

export interface DocumentViewerContentProps {
  remoteId?: string | undefined;
  localName?: string;
  page?: number; // 1-based
  searchResults?: SearchResult[]; // optional precomputed search results from llm
}