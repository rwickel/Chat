// components/SimpleTextRenderer.tsx

import React from "react";
import { FileText } from "lucide-react";
import "prismjs/themes/prism-okaidia.css";

interface Props {
  content: string;
  onCitationClick: (docId: string, page: number) => void;
}

const SimpleTextRenderer: React.FC<Props> = ({ content, onCitationClick }) => {

  // Split around <think> blocks
  const parts = content.split(/(<think>[\s\S]*?<\/think>)/g);

  // SAFER citation pattern: allow empty ID, but capture it cleanly
  const citationRegex = /\[([^\|\]]*)\|(\d+)\]/g;

  // Validate docId (reject "", "[]", whitespace)
  const isValidDocId = (id: string) => {
    if (!id) return false;
    if (id.trim() === "") return false;
    if (id === "[]") return false;
    return true;
  };

  return (
    <div className="prose prose-sm max-w-none">
      {parts.map((part, idx) => {

        // THINK BLOCK
        if (part.startsWith("<think>")) {
          const thinkContent = part.replace(/<\/?think>/g, "").trim();
          return (
            <div
              key={idx}
              className="my-2 p-3 bg-gray-50 border-l-2 border-gray-300 text-gray-500 text-xs italic rounded-r-lg"
            >
              <div className="font-semibold mb-1 not-italic text-gray-400 uppercase text-[10px]">
                Reasoning Process
              </div>
              {thinkContent}
            </div>
          );
        }

        // NORMAL TEXT + CITATIONS
        const segments = part.split(citationRegex);
        if (segments.length === 1) {
          return (
            <span key={idx} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        }

        const elements: React.ReactNode[] = [];

        for (let i = 0; i < segments.length; i += 3) {
          // plain text
          elements.push(
            <span key={`t-${idx}-${i}`} className="whitespace-pre-wrap">
              {segments[i]}
            </span>
          );

          // citation (if exists)
          if (i + 1 < segments.length) {
            const docId = segments[i + 1];
            const page = parseInt(segments[i + 2], 10);

            if (!isNaN(page) && isValidDocId(docId)) {
              elements.push(
                <button
                  key={`c-${idx}-${i}`}
                  onClick={() => onCitationClick(docId, page)}
                  className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors translate-y-[-1px]"
                >
                  <FileText className="w-3 h-3" />
                  <span>Page {page}</span>
                </button>
              );
            }
          }
        }

        return <span key={idx}>{elements}</span>;
      })}
    </div>
  );
};

export default SimpleTextRenderer;
