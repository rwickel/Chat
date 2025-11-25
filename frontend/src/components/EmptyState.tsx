// src/components/EmptyState.tsx
import React from 'react';
import { Bot } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
      <div className="w-24 h-24 bg-white rotate-4 rounded-2xl shadow-lg flex items-center justify-center">
        <Bot className="w-14 h-14 text-blue-500" />
      </div>
      <div className="text-center max-w-md">
        <h3 className="text-gray-900 font-medium mb-1 text-2xl">How can I help you?</h3>
        <p className="text-md">Ask questions about your documents</p>
      </div>
    </div>
  );
};

export default EmptyState;