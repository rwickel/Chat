// src/components/MessageList.tsx
import React, { useRef } from 'react';
import { Bot } from 'lucide-react';
import EmptyState from './EmptyState';
import MessageBubble from './MessageBubble';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onCitationClick: (docId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, onCitationClick }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
      {messages.length === 0 && <EmptyState />}

      <div className="space-y-6 max-w-[90%] mx-auto">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onCitationClick={onCitationClick} />
        ))}

        {isLoading && (
          <div className="flex gap-4">
            <div
              className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center mt-1 text-white"
              aria-label="AI is responding"
            >
              <Bot size={16} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
    </div>
  );
};

export default MessageList;