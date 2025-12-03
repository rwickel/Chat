// src/components/MessageList.tsx
import React, { useRef, useEffect } from 'react';
import { Bot } from 'lucide-react';
import EmptyState from './EmptyState';
import MessageBubble from './MessageBubble';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onCitationClick: (docId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onAbortEdit?: () => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading, 
  onCitationClick,
  onEditMessage,
  onAbortEdit 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the index of the last user message
  const findLastUserMessageIndex = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return i;
      }
    }
    return -1;
  };

  const lastUserMessageIndex = findLastUserMessageIndex();

  // Auto-scroll to bottom when new messages are added or during loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only auto-scroll if we're near the bottom
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end' 
      });
    }
  }, [messages, isLoading]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth"
    >
      {messages.length === 0 && !isLoading && <EmptyState />}

      <div className="space-y-6 max-w-[90%] mx-auto">
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCitationClick={onCitationClick}
            isLastUserMessage={
              msg.role === 'user' && 
              index === lastUserMessageIndex
            }
            onEditMessage={onEditMessage}
            onAbortEdit={onAbortEdit}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-4">
            <div
              className="w-10 h-10 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm"
              aria-label="AI is responding"
            >
              <Bot size={24} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Thinking</span>
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
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} style={{ height: '1px' }} aria-hidden="true" />
      </div>
    </div>
  );
};

export default MessageList;