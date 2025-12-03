// frontend/src/hooks/useChat.ts
import { useState, useCallback } from "react";
import { ChatService } from "../services/api";
import type { Message, ChatResponse } from "../types";

interface UseChatArgs {
  contextDocIds: string[];
}

export function useChat({ contextDocIds }: UseChatArgs) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Creates an error message to display in chat
   */
  const createErrorMessage = useCallback((error: any): Message => {
    let errorContent = "Sorry, there was an error processing your request.";
    
    // Extract meaningful error information
    if (error?.message) {
      if (error.message.includes("Network Error")) {
        errorContent = "Network Error: Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error.response?.status === 401) {
        errorContent = "Authentication Error: Please check your credentials.";
      } else if (error.response?.status === 403) {
        errorContent = "Access Denied: You don't have permission to perform this action.";
      } else if (error.response?.status === 404) {
        errorContent = "Service Not Found: The requested resource is unavailable.";
      } else if (error.response?.status >= 500) {
        errorContent = "Server Error: Please try again later.";
      } else {
        // Include specific error message for debugging
        errorContent = `Error: ${error.message}`;
      }
    }
    
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: errorContent,
      timestamp: new Date(),
      isError: true, // Add error flag
    };
  }, []);

  /**
   * Sends message to backend and updates messages state
   */
  const sendMessage = useCallback(
    async (input: string) => {
      if (!input.trim() || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response: ChatResponse = await ChatService.sendMessage(
          [...messages, userMessage],
          contextDocIds
        );
        
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.content,
          timestamp: new Date(),
          citations: response.citations,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        console.error("Chat request failed:", err);
        
        // Create error message and add to chat
        const errorMessage = createErrorMessage(err);
        setMessages((prev) => [...prev, errorMessage]);
      }

      setIsLoading(false);
    },
    [messages, contextDocIds, isLoading, createErrorMessage]
  );

  return {
    messages,
    isLoading,
    sendMessage,
    setMessages,
  };
}