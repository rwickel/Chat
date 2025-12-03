// src/components/DocumentViewer.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, X } from 'lucide-react';

import Toolbar from './pdf_viewer/Toolbar';
import MainContentArea from './pdf_viewer/MainContentArea';

import { SearchResult } from '../types';

declare const pdfjsLib: any;

const API_URL = 'http://localhost:8000/api';

interface DocumentContentProps {
  remoteId?: string | undefined;
  localName?: string;
  page?: number;
  /** Search results from parent */
  searchResults?: SearchResult[];
  /** Callback to update search results in parent */
  onSearchResultsChange?: (results: SearchResult[]) => void;
  onCalculateAutoZoom?: (pageWidth: number, pageHeight: number) => number;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentContentProps> = ({
  remoteId, 
  page: targetPage = 1,
  searchResults = [], // Default to empty array
  onSearchResultsChange,
  onCalculateAutoZoom, 
  onClose, 
}) => {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(targetPage);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [autoZoom, setAutoZoom] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [pageTextContent, setPageTextContent] = useState<any>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ================ WINDOW RESIZE HANDLER ================
  const calculateAutoZoom = useCallback(
    (pageWidth: number, pageHeight: number) => {
      if (!containerRef.current) return 1.0;

      const container = containerRef.current;
      const availableWidth = container.clientWidth - 64;
      const availableHeight = container.clientHeight - 64;

      const searchPanelWidth = showResultsPanel ? 80 : 0;
      const adjustedAvailableWidth = availableWidth - searchPanelWidth;

      const widthZoom = adjustedAvailableWidth / pageWidth;
      const heightZoom = availableHeight / pageHeight;

      const calculatedZoom = Math.min(widthZoom, heightZoom) * 0.95;

      return Math.max(0.1, Math.min(calculatedZoom, 3.0));
    },
    [showResultsPanel]
  );

  useEffect(() => {
    if (onCalculateAutoZoom) {
      onCalculateAutoZoom(pageDimensions?.width ?? 0, pageDimensions?.height ?? 0);
    }
  }, [onCalculateAutoZoom, pageDimensions]);

  const updatePageDimensions = useCallback(async (page: any) => {
    if (!page) return;

    const viewport = page.getViewport({ scale: 1.0 });
    setPageDimensions({
      width: viewport.width,
      height: viewport.height,
    });
  }, []);

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

        if (typeof pdfjsLib === 'undefined') {
          throw new Error('PDF.js library is not loaded. Please include the script in index.html');
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) return;

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);

        const firstPage = await pdfDoc.getPage(1);
        await updatePageDimensions(firstPage);
      } catch (err: any) {
        console.error('PDF load error:', err);
        if (err.response && err.response.status === 404) {
          setError('Document not found on server.');
        } else {
          setError(err.message || 'Failed to load PDF document');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadPDF();

    return () => {
      isCancelled = true;
    };
  }, [remoteId, updatePageDimensions]);

  // ================ AUTO ZOOM CALCULATION ================
  useEffect(() => {
    if (!autoZoom || !pageDimensions || !pdf) return;

    const calculateAndSetZoom = () => {
      const calculatedZoom = calculateAutoZoom(pageDimensions.width, pageDimensions.height);
      setZoomLevel(calculatedZoom);
    };

    calculateAndSetZoom();

    const handleResize = () => {
      calculateAndSetZoom();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoZoom, pageDimensions, pdf, calculateAutoZoom]);

  // ================ SEARCH FUNCTIONALITY ================
  const performSearch = useCallback(async () => {
    if (!pdf || !searchQuery.trim()) {
      // Clear results via callback if provided
      if (onSearchResultsChange) {
        onSearchResultsChange([]);
      }
      setCurrentMatchIndex(0);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const results: SearchResult[] = [];
    let totalMatchCount = 0;

    try {
      // Search through all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        let pageMatchCount = 0;

        textContent.items.forEach((item: any, itemIndex: number) => {
          if (item.str && item.str.toLowerCase().includes(query)) {
            pageMatchCount++;
            totalMatchCount++;

            results.push({
              page: pageNum,
              text: item.str,
              matchIndex: totalMatchCount,
              totalMatches: 0,
              itemIndex: itemIndex,
            });
          }
        });

        // Update totalMatches for each result on this page
        results.forEach((result) => {
          if (result.page === pageNum) {
            result.totalMatches = pageMatchCount;
          }
        });
      }

      // Update search results via callback
      if (onSearchResultsChange) {
        onSearchResultsChange(results);
      }
      
      setCurrentMatchIndex(results.length > 0 ? 1 : 0);

      // Auto-show results panel when there are results
      if (results.length > 0) {
        setShowResultsPanel(true);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [pdf, searchQuery, numPages, onSearchResultsChange]);

  // Trigger search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // ================ RENDER CANVAS & FETCH TEXT ================
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdf || pageNum < 1 || pageNum > numPages) return;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdf.getPage(pageNum);

        if (autoZoom) {
          await updatePageDimensions(page);
        }

        const viewport = page.getViewport({ scale: zoomLevel, rotation });

        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        const textContent = await page.getTextContent();
        setPageTextContent({ items: textContent.items, viewport });
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    },
    [pdf, numPages, zoomLevel, rotation, autoZoom, updatePageDimensions]
  );

  useEffect(() => {
    if (pdf) renderPage(currentPage);
  }, [currentPage, pdf, renderPage]);

  // ================ HANDLERS ================
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      setCurrentMatchIndex(0);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    // Clear results via callback
    if (onSearchResultsChange) {
      onSearchResultsChange([]);
    }
    setCurrentMatchIndex(0);
    setShowResultsPanel(false);
    searchInputRef.current?.focus();
  };

  const navigateToMatch = (result: SearchResult) => {
    setCurrentPage(result.page);
    setCurrentMatchIndex(result.matchIndex);
    setShowResultsPanel(true);
  };

  const navigateToNextMatch = () => {
    if (searchResults.length === 0) return;

    const currentIndex = searchResults.findIndex((result) => result.matchIndex === currentMatchIndex);
    const nextIndex = (currentIndex + 1) % searchResults.length;
    navigateToMatch(searchResults[nextIndex]);
  };

  const navigateToPrevMatch = () => {
    if (searchResults.length === 0) return;

    const currentIndex = searchResults.findIndex((result) => result.matchIndex === currentMatchIndex);
    const prevIndex = currentIndex === 0 ? searchResults.length - 1 : currentIndex - 1;
    navigateToMatch(searchResults[prevIndex]);
  };

  const handleZoomIn = () => {
    setAutoZoom(false);
    setZoomLevel((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setAutoZoom(false);
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleAutoZoom = () => {
    setAutoZoom(true);
    if (pageDimensions) {
      const calculatedZoom = calculateAutoZoom(pageDimensions.width, pageDimensions.height);
      setZoomLevel(calculatedZoom);
    }
  };

  // ================ RENDER UI ================

  if (!remoteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 border-l border-gray-200">
        <div className="p-4 bg-gray-100 rounded-full mb-3">
          <Search className="w-8 h-8 opacity-40" />
        </div>
        <p className="font-medium">Select a document to view</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white border-l border-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p className="text-sm text-gray-500">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-50 border-l border-red-100 p-6 text-center">
        <p className="text-red-600 text-xl font-semibold mb-1">Unable to load document</p>
        <p className="text-md text-red-500 bg-white px-2 py-1 rounded border border-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 border-l border-gray-200 w-full" ref={containerRef}>
      <div className="flex w-full items-center justify-between relative bg-white border-b border-gray-200 h-16 shadow-sm z-10">
        
        <button
          type="button"
          className="flex rounded-full bg-gray-200 hover:bg-gray-300 transition-colors ml-4 p-1"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        
        <Toolbar
          currentPage={currentPage}
          numPages={numPages}
          onPageChange={handlePageChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={clearSearch}
          searchResults={searchResults}
          currentMatchIndex={currentMatchIndex}
          onNavigateToNextMatch={navigateToNextMatch}
          onNavigateToPrevMatch={navigateToPrevMatch}
          showResultsPanel={showResultsPanel}
          onToggleResultsPanel={() => setShowResultsPanel(!showResultsPanel)}
          zoomLevel={zoomLevel}
          autoZoom={autoZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onAutoZoom={handleAutoZoom}
          searchInputRef={searchInputRef}
        />
        
      </div>

      <MainContentArea
        showResultsPanel={showResultsPanel}
        searchResults={searchResults}
        currentMatchIndex={currentMatchIndex}
        onNavigateToMatch={navigateToMatch}
        searchQuery={searchQuery}
        canvasRef={canvasRef}
        textLayerRef={textLayerRef}
        pageTextContent={pageTextContent}
        currentPage={currentPage}
      />
    </div>
  );
};

export default DocumentViewer;