// frontend/src/components/DocumentViewerContent.tsx
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

interface DocumentViewerContentProps {
  remoteId?: string | undefined;
  localName?: string;
  page?: number; // 1-based
}

const DocumentViewerContent: React.FC<DocumentViewerContentProps> = ({
  remoteId,
  localName,
  page: targetPage = 1,
}) => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(targetPage);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [taskLines, setTaskLines] = useState<{page: number, text: string}[]>([]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  // ================ PDF LOADING ================
  useEffect(() => {    
    if (!remoteId) {
      setPdf(null);
      setNumPages(0);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const loadPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token') || '';
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`${API_URL}/get/${remoteId}`, {
          headers,
          responseType: 'arraybuffer',
        });

        if (isCancelled) return;

        const pdfData = new Uint8Array(res.data);
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) return;

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);

        // Set initial page only once
        const page = Math.min(targetPage, pdfDoc.numPages);
        setCurrentPage(page);

      } catch (err) {
        console.error('PDF load error:', err);
        if (!isCancelled) {
          setError('Failed to load PDF document');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isCancelled = true;
    };
  }, [remoteId, targetPage]);

  // ================ RENDER PAGE ================
  const renderPage = async (pageNum: number) => {
    if (!pdf || pageNum < 1 || pageNum > numPages) return;
    
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoomLevel });

      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Render text layer
      const textLayerDiv = textLayerRef.current;
      if (textLayerDiv) {
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.cssText = `
          position: absolute;
          left: 0; top: 0;
          width: ${viewport.width}px;
          height: ${viewport.height}px;
          pointer-events: none;
          transform-origin: 0 0;
          transform: scale(${1 / zoomLevel});
        `;

        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
          if (!item.str?.trim()) continue;
          const span = document.createElement('span');
          span.textContent = item.str;
          span.style.cssText = `
            position: absolute;
            left: ${item.transform[4]}px;
            top: ${item.transform[5] - 10}px;
            font-size: 12px;
            color: rgba(0,0,0,0.5);
            pointer-events: none;
          `;
          textLayerDiv.appendChild(span);
        }
      }
    } catch (err) {
      console.error('Page render error:', err);
    }
  };

  // ================ PAGE NAVIGATION ================
  useEffect(() => {
    if (pdf) {
      renderPage(currentPage);
    }
  }, [currentPage, pdf, zoomLevel]);

  // ================ HANDLE PAGE CHANGE ================
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
    }
  };

  // ================ ZOOM CONTROLS ================
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3.0)); // Max zoom 300%
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); // Min zoom 50%
  };

  const handleZoomReset = () => {
    setZoomLevel(1.0);
  };

  // ================ RENDER UI ================
  if (!remoteId) {
    return (
      <div className="pdf-viewer-placeholder">
        <p>Please select a document to view</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pdf-viewer-loading">
        <p>Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container">
      {/* PDF Viewer */}
      <div className="pdf-viewer">
        {/* Controls */}
        <div className="pdf-controls">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          
          <span>
            Page {currentPage} of {numPages}
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            Next
          </button>
          
          <div className="bg-gray-400 text-gray-300">
            <button onClick={handleZoomOut}>-</button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={handleZoomIn}>+</button>
            <button onClick={handleZoomReset}>Reset</button>
          </div>
        </div>
        
        {/* Canvas Container */}
        <div 
          className="pdf-canvas-container"
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left'
          }}
        >
          <canvas ref={canvasRef} />
          <div ref={textLayerRef} className="text-layer"></div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerContent;
