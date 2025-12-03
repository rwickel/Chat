// frontend/src/hooks/useFiles.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { FileService } from "../services/api";
import { UploadedFile } from "../types";

// Interval for polling the file list endpoint (e.g., every 5 seconds)
const POLLING_INTERVAL = 5000; 

export const useFiles = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store AbortControllers to cancel active uploads
  const uploadControllers = useRef<Record<string, AbortController>>({});
  
  // Ref to store IDs of files that are currently processing, so we only poll when necessary
  const processingFileIds = useRef<Set<string>>(new Set());

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const serverFiles = await FileService.listFiles();
      
      // Update the set of files that are processing
      const currentlyProcessing = new Set(serverFiles
        .filter(f => f.status === "processing")
        .map(f => f.id)
      );
      processingFileIds.current = currentlyProcessing;
      
      // Merge remote list with active local uploads that haven't received a remoteId yet
      setFiles(currentFiles => {
        // 1. Identify active local uploads (uploading status + no remoteId)
        const activeLocalUploads = currentFiles.filter(f => 
            f.status === "uploading" && !f.remoteId
        );
        
        // 2. Map remote files for easy lookup
        const remoteMap = new Map(serverFiles.map(f => [f.id, f]));
        
        // 3. Keep remote files and any active local uploads that haven't been finalized yet
        const mergedFiles: UploadedFile[] = [...serverFiles];
        
        activeLocalUploads.forEach(localFile => {
            if (!remoteMap.has(localFile.id)) {
                mergedFiles.push(localFile);
            }
        });
        
        // Simple sorting for UI consistency
        return mergedFiles.sort((a, b) => 
            (a.status === "uploading" || a.status === "processing" ? -1 : 1) - 
            (b.status === "uploading" || b.status === "processing" ? -1 : 1) || 
            (a.name ?? '').localeCompare(b.name ?? '')
        );
      });
      
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setError("Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling Effect
  useEffect(() => {
    // Initial fetch
    fetchFiles();

    // Set up polling only if there are files marked as 'processing'
    const intervalId = setInterval(() => {
        // Only run the fetch if there are files still processing
        if (processingFileIds.current.size > 0) {
            fetchFiles();
        }
    }, POLLING_INTERVAL);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [fetchFiles]);


  /**
   * Handles uploading multiple files
   */
  const uploadFiles = (fileList: File[]) => {
    // 1. Filter PDFs (using synchronous check)
    const pdfFiles = fileList.filter((f) => f.type === "application/pdf");
    if (pdfFiles.length !== fileList.length) {
      // NOTE: Replacing alert() with console/UI message as per instructions
      console.warn("Only PDF files are allowed.");
      return;
    }

    // 2. Create optimistic local entries
    const newEntries: UploadedFile[] = pdfFiles.map((file) => ({
      // Using crypto.randomUUID for better uniqueness than Math.random for local temp ID
      id: crypto.randomUUID(), 
      name: file.name,
      // Use helper function or format here if needed, but keeping it simple for now
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, 
      status: "uploading",
      progress: 0,
      remoteId: undefined,
      mimeType: file.type,
    }));

    // Add new entries to the state immediately
    setFiles((prev) => [...prev, ...newEntries]);

    // 3. Process uploads in parallel
    newEntries.forEach(async (entry, index) => {
      const fileToUpload = pdfFiles[index];
      const controller = new AbortController();
      uploadControllers.current[entry.id] = controller;

      try {
        const responseData = await FileService.uploadFile(
          fileToUpload,
          (percent) => {
            // Update progress in UI
            setFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id ? { ...f, progress: percent } : f
              )
            );
          },
          controller.signal
        );

        // --- CRITICAL CHANGE START ---
        // Success: Update local entry with remote ID and server-provided status ("processing")
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  // Use status returned by server (which is "processing")
                  status: responseData.status as UploadedFile['status'], 
                  progress: 0, // Upload is finished
                  remoteId: responseData.id,
                  name: responseData.original_name || f.name,
                  size: responseData.size, // Use server-formatted size
                  // Now that we have a remote ID, add it to the processing list
                }
              : f
          )
        );
        
        // Immediately add the file to the list of processing IDs and trigger a fetch
        processingFileIds.current.add(responseData.id);
        fetchFiles();
        // --- CRITICAL CHANGE END ---

      } catch (err: any) {
        // Cleanup controller reference in case of failure
        delete uploadControllers.current[entry.id];
        
        // Check if cancelled or failed
        const isCancelled = err.name === "AbortError" || err.code === 20; // 20 is the code for DOMException: The operation was aborted.

        if (isCancelled) {
          console.log(`Upload cancelled for ${entry.name}`);
          // Remove cancelled item completely instead of marking as error
          setFiles((prev) => prev.filter((f) => f.id !== entry.id));
        } else {
          console.error(`Upload failed for ${entry.name}`, err);
          // Mark as error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, status: "error", progress: 0 } : f
            )
          );
        }
      } finally {
        // Ensure controller is deleted upon finalization (success or failure)
        delete uploadControllers.current[entry.id];
      }
    });
  };

  /**
   * Cancel an active upload
   */
  const cancelUpload = (localId: string) => {
    const controller = uploadControllers.current[localId];
    if (controller) {
      controller.abort();
      // Abort logic handles state update by removing the file or marking as error
    } else {
        // If upload wasn't found (e.g., if we click 'Abort' right after it finished)
        // Ensure it's removed from the state if it's still marked "uploading"
        setFiles((prev) => prev.filter((f) => f.id !== localId));
    }
  };

  /**
   * Delete file (Remote and Local)
   */
  const deleteFile = async (localId: string) => {
    const file = files.find((f) => f.id === localId);
    if (!file) return;

    // Optimistic update: remove immediately from UI
    setFiles((prev) => prev.filter((f) => f.id !== localId));
    
    // Also remove from processing list if it was there
    if (file.remoteId) {
        processingFileIds.current.delete(file.remoteId);
    }
    
    // Cancel any ongoing uploads
    const controller = uploadControllers.current[localId];
    if (controller) {
        controller.abort();
        delete uploadControllers.current[localId];
    }


    if (file.remoteId) {
      try {
        await FileService.deleteFile(file.remoteId);
      } catch (err) {
        console.error("Failed to delete file on server:", err);
        // Inform the user of failure, but don't re-add to state immediately
        // Rely on next fetch to sync state if deletion failed server-side
        console.error("Failed to delete file from server."); 
        // Force a refresh to see if the file reappears
        fetchFiles();
      }
    }
  };

  return {
    files,
    isLoading,
    error,
    uploadFiles,
    cancelUpload,
    deleteFile,
    refreshFiles: fetchFiles,
  };
};