import { useState, useCallback, useEffect } from "react";
import { UploadedFile } from "../types";

export const useFileSelection = (files: UploadedFile[]) => {
  const [selectedFileRemoteId, setSelectedFileRemoteId] = useState<string | null>(null);
  const [contextDocIds, setContextDocIds] = useState<string[]>([]);
  const [isSelectingDocs, setIsSelectingDocs] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  /**
   * Safely updates the selected file ID, handling edge cases
   */
  const updateSelectedFileRemoteId = useCallback((id: string | null) => {
    if (!id || typeof id !== "string") {
      setSelectedFileRemoteId(null);
      return;
    }

    const trimmed = id.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "null" || trimmed === "undefined") {
      setSelectedFileRemoteId(null);
      return;
    }

    setSelectedFileRemoteId(trimmed);
  }, []);

  // Auto-select the first ready file if nothing is selected
  useEffect(() => {
    if (files.length > 0 && !selectedFileRemoteId) {
      const firstReady = files.find((f) => f.status === "ready")?.remoteId;
      if (firstReady) {
        updateSelectedFileRemoteId(firstReady);
      }
    }
  }, [files, selectedFileRemoteId, updateSelectedFileRemoteId]);

  return {
    selectedFileRemoteId,
    updateSelectedFileRemoteId,
    contextDocIds,
    setContextDocIds,
    isSelectingDocs,
    setIsSelectingDocs,
    isContextOpen,
    setIsContextOpen,
    isDocsModalOpen,
    setIsDocsModalOpen
  };
};