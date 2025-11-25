// components/SimpleTextRenderer.tsx

import React, { useMemo } from "react";

import "prismjs/themes/prism-okaidia.css";
import { FileText} from 'lucide-react';


interface Props {
  content: string;
  isBot?: boolean;
  onCitationClick?: (docId: string, page: number) => void;
}

const SimpleTextRenderer: React.FC<{
  content: string;
  isBot: boolean;
  onCitationClick: (docId: string, page: number) => void;
}> = ({ content, isBot, onCitationClick }) => {
  
  // Split by <think> blocks first
  const parts = content.split(/(<think>[\s\S]*?<\/think>)/g);

  return (
    <div className={`prose prose-sm max-w-none `}>
      {parts.map((part, idx) => {
        if (part.startsWith('<think>')) {
          const thinkContent = part.replace(/<\/?think>/g, '').trim();
          return (
            <div key={idx} className="my-2 p-3 bg-gray-50 border-l-2 border-gray-300 text-gray-500 text-xs italic rounded-r-lg">
              <div className="font-semibold mb-1 not-italic text-gray-400 uppercase text-[10px]">Reasoning Process</div>
              {thinkContent}
            </div>
          );
        }

        // Render standard text with citations
        // Regex for [DocName|Page] or [uuid|Page]
        // In a real app we'd map UUIDs back to names, here we assume the string inside is displayable or an ID we can handle
        const citationRegex = /\[([^|\]]+)\|(\d+)\]/g;
        const textParts = part.split(citationRegex);
        
        if (textParts.length === 1) return <span key={idx} className="whitespace-pre-wrap">{part}</span>;

        const elements = [];
        for (let i = 0; i < textParts.length; i += 3) {
          elements.push(<span key={`text-${i}`} className="whitespace-pre-wrap">{textParts[i]}</span>);
          if (i + 1 < textParts.length) {
            const docId = textParts[i+1];
            const page = parseInt(textParts[i+2]);
            elements.push(
              <button 
                key={`cit-${i}`}
                onClick={() => onCitationClick(docId, page)}
                className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors transform translate-y-[-1px]"
              >
                <FileText className="w-3 h-3" />
                <span>Page {page}</span>
              </button>
            );
          }
        }
        return <span key={idx}>{elements}</span>;
      })}
    </div>
  );
};
export default SimpleTextRenderer;
