// src/components/MessageBubble.tsx
import * as React from 'react';
import { User, Bot } from 'lucide-react';
import SimpleTextRenderer from './SimpleTextRenderer';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onCitationClick: (docId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onCitationClick }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      {!isUser && (
        <div
          className="w-10 h-10 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm mr-4"
          aria-label="AI response"
        >
          <Bot size={24} />
        </div>
      )}
      {isUser && (
        <div
          className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm mr-4"
          aria-label="Your message"
        >
          <User size={24} />
        </div>
      )}

      <div
        className={`${
          isUser
            ? 'bg-gray-200 w-[80%] text-gray-800 text-xl rounded-2xl rounded-tr-sm shadow-md ml-2'
            : 'bg-white w-full border text-gray-800 text-xl border-gray-200 rounded-2xl rounded-tl-sm shadow-sm mr-2'
        } p-4`}
      >
        <SimpleTextRenderer
          content={message.content}          
          onCitationClick={onCitationClick}
        />
      </div>
    </div>
  );
};

export default MessageBubble;