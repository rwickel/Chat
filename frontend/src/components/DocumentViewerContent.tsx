// frontend\src\components\DocumentViewerContent.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

interface DocumentViewerContentProps {
  remoteId?: string;       // server-side file id
  localName?: string;      // original file name for display
  page?: number;           // optional page to show (PDF)
}

const DocumentViewerContent: React.FC<DocumentViewerContentProps> = ({ remoteId, localName, page }) => {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!remoteId) {
      setText(null);
      setPreviewUrl(null);
      return;
    }

    setLoading(true);
    setText(null);
    setPreviewUrl(null);
    setError(null);

    const token = localStorage.getItem("token") || "";

    axios.get(`${API_URL}/content/${remoteId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    .then(res => {
      const data = res.data;
      if (data.type === "text") {
        setText(data.content);
      } else if (data.type === "binary") {
        // Append token as query param for backend to recognize the user
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
        setPreviewUrl(`${API_URL}/get/${remoteId}${tokenParam}`);
        setMime(data.mime_type || null);
      } else {
        setError("Unknown file type");
      }
    })
    .catch(err => {
      console.error(err);
      setError("Failed to load document");
    })
    .finally(() => setLoading(false));
  }, [remoteId]);

  if (!remoteId) {
    return <div className="p-6 text-gray-500">No document selected.</div>;
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  if (text !== null) {
    return <div className="p-6 prose max-w-full whitespace-pre-wrap">{text}</div>;
  }

  if (previewUrl) {
    // Append page number if specified (works for PDFs)
    const urlWithPage = page && mime === "application/pdf" ? `${previewUrl}#page=${page}` : previewUrl;

    return (
      <div className=" h-full">
        <iframe
          title={localName || "document-preview"}
          src={urlWithPage}
          className="w-full h-full border-0 bg-white"
        />
      </div>
    );
  }

  return <div className="p-6 text-gray-500">Preview not available.</div>;
};

export default DocumentViewerContent;
