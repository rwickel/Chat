import { useState } from "react";

export interface LLMConfig {
  llmProvider: string;
  apiKey: string;
  model: string;
  chunkSize: number;
  chunkOverlap: number;
  docLinkUrl: string;
  temperature: number;
}

const DEFAULT_CONFIG: LLMConfig = {
  llmProvider: "openai",
  apiKey: "",
  model: "",
  chunkSize: 1000,
  chunkOverlap: 200,
  docLinkUrl: "",
  temperature: 0.1,
};

export const useConfig = () => {
  const [config, setConfigState] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const updateConfig = (newConfig: Partial<LLMConfig>) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  };

  return {
    config,
    updateConfig,
    isConfigOpen,
    setIsConfigOpen,
  };
};