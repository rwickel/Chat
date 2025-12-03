export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Citation[]; // Links to specific document pages
  isThinking?: boolean; // For agentic "thinking" state
}
// -------------------------------
// Citations returned from RAG
// -------------------------------
// export interface Citation {
//   docId: string;
//   docName: string;
//   pageNumber: number;
//   snippet: string;
// }
export interface Citation {
  docId: string;        // ID of the file in DB
  docName: string;      // filename.pdf
  chunkId: string;      // internal chunk reference
  score: number;        // vector similarity
  pageNumber?: number;  // optional page number if extracted
}

export interface AppConfig {
  apiKey: string;
  llmProvider: 'ollama' | 'openai';
  chunkSize: number;
  chunkOverlap: number;
  docLinkUrl: string;
}

// --- Types ---
// export interface UploadedFile {
//   id: string;
//   name: string;
//   size: string;
//   status: "uploading" | "processing" | "ready" | "error" | "queued";
//   progress?: number;
//   remoteId?: string;
//   content?: string; 
//   type?: 'text' | 'pdf';
// }

export interface UploadedFile {
  id: string;           // Local ID (usually React)
  remoteId: string;     // Server ID from FastAPI
  name: string;
  size: number;
  status: string;        // "PROCESSING", "READY", "ERROR", etc.
  mimeType: string;
  progress: number;      // Upload progress (0–100)
}

// -------------------------------
// Chat API Request & Response
// -------------------------------
export interface ChatRequest {
  messages: Message[];
  contextDocIds: string[];
}

export interface ChatResponse {
  content: string;
  citations: Citation[];
}


// -------------------------------
// Chat Message Types
// -------------------------------
export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  citations?: Citation[];
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