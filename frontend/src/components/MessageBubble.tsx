// src/components/MessageBubble.tsx
import * as React from 'react';
import { User, Bot, AlertTriangle, Copy, Check, Edit2, Send, X } from 'lucide-react';
import SimpleTextRenderer from './SimpleTextRenderer';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onCitationClick: (docId: string) => void;
  isLastUserMessage?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onAbortEdit?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onCitationClick, 
  isLastUserMessage = false,
  onEditMessage,
  onAbortEdit 
}) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() === message.content.trim()) {
      setIsEditing(false);
      return;
    }

    if (editContent.trim() && onEditMessage) {
      await onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
    if (onAbortEdit) {
      onAbortEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Determine bubble styling based on message type
  const getBubbleStyles = () => {
    if (isUser) {
      if (isEditing) {
        return 'bg-blue-50 border-2 border-blue-300 text-gray-800 rounded-2xl rounded-tr-sm';
      }
      return 'bg-gray-200 text-gray-800 rounded-2xl rounded-tr-sm';
    }
    if (isError) {
      return 'bg-red-50 border border-red-200 text-red-800 rounded-2xl rounded-tl-sm';
    }
    return 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm';
  };

  // Determine icon styling
  const getIconStyles = () => {
    if (isUser) {
      return 'bg-blue-600';
    }
    if (isError) {
      return 'bg-red-500';
    }
    return 'bg-emerald-600';
  };

  // Get appropriate icon
  const Icon = isUser ? User : (isError ? AlertTriangle : Bot);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full mb-4`}>
      {/* Left icon for assistant/error messages */}
      {!isUser && (
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm mr-4 ${getIconStyles()}`}
          aria-label={isError ? 'Error message' : 'AI response'}
        >
          <Icon size={24} />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`${getBubbleStyles()} ${
          isUser ? 'w-[80%]' : 'w-full'
        } p-4 shadow-sm relative`}
      >
        {/* Error badge (optional) */}
        {isError && (
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              Error
            </span>
          </div>
        )}

        {/* Message content */}
        <div className={isUser && !isEditing ? 'pl-2' : 'pr-2'}>
          {isUser && isEditing ? (
            <div className="space-y-4">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[100px] p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-800"
                placeholder="Edit your message..."
              />
              
              {/* Edit buttons below the textarea */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span className="block">Press Ctrl+Enter to save</span>
                  <span className="block">Press Esc to cancel</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-5 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-2"
                    aria-label="Cancel edit"
                    title="Cancel (Esc)"
                  >                    
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-6 py-1 rounded-full bg-blue-700 hover:bg-blue-600 text-white transition-colors flex items-center gap-2"
                    aria-label="Save changes"
                    title="Save changes (Ctrl+Enter)"
                  >                    
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          ) : !isError ? (
            <SimpleTextRenderer
              content={message.content}
              onCitationClick={onCitationClick}
            />
          ) : (
            <>
              <div className="text-xl whitespace-pre-wrap mb-3">{message.content}</div>
              
              {/* Debug details (for development) */}
              {process.env.NODE_ENV === 'development' && message.errorDetails && (
                <div className="mt-3 pt-3 border-t border-red-100">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1 mb-2"
                  >
                    {showDetails ? 'Hide technical details' : 'Show technical details'}
                  </button>
                  {showDetails && (
                    <pre className="text-xs p-3 bg-red-50 border border-red-100 rounded-md text-red-700 overflow-auto max-h-60">
                      {JSON.stringify(message.errorDetails, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp with Edit/Copy buttons (only when NOT editing) */}
        {!isEditing && (
          <div className={`flex items-center justify-between mt-3 ${isError ? 'text-red-500' : 'text-gray-500'}`}>
            <div className="text-xs">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {isUser && isLastUserMessage && ' • Last'}
            </div>
            
            {/* Edit and Copy buttons for user messages */}
            {isUser && isLastUserMessage && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEdit}
                  className="p-1.5 rounded-md bg-transparent hover:bg-gray-300 text-blue-700 transition-colors"
                  aria-label="Edit message"
                  title="Edit message"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md bg-transparent hover:bg-gray-300 text-blue-700 transition-colors"
                  aria-label={copied ? 'Copied!' : 'Copy message'}
                  title="Copy message"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}
            
            {/* Copy button for assistant messages */}
            {!isUser && !isError && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md bg-white hover:bg-gray-200 text-gray-700 transition-colors"
                aria-label={copied ? 'Copied!' : 'Copy message'}
                title="Copy message"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
            
            {/* Copy button for error messages */}
            {isError && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-700 transition-colors "
                aria-label={copied ? 'Copied!' : 'Copy message'}
                title="Copy message"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right icon for user messages */}
      {isUser && (
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-sm ml-4 ${getIconStyles()}`}
          aria-label="Your message"
        >
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;