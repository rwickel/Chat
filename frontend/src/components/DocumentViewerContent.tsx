import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
    ChevronLeft, 
    ChevronRight, 
    ZoomIn, 
    ZoomOut, 
    RotateCw,
    Search,
    X,
    List
} from 'lucide-react';

// Define pdfjsLib globally.
declare const pdfjsLib: any;

const API_URL = 'http://localhost:8000/api';

interface DocumentViewerContentProps {
  remoteId?: string | undefined;
  localName?: string;
  page?: number; // 1-based
  searchResults?: SearchResult[]; // optional precomputed search results from llm
}

interface SearchResult {
  page: number;
  text: string;
  matchIndex: number;
  totalMatches: number;
  itemIndex: number;
}

const DocumentViewerContent: React.FC<DocumentViewerContentProps> = ({
  remoteId,
  localName,
  page: targetPage = 1,
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
  const [pageDimensions, setPageDimensions] = useState<{width: number, height: number} | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
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
  const calculateAutoZoom = useCallback((pageWidth: number, pageHeight: number) => {
    if (!containerRef.current) return 1.0;

    const container = containerRef.current;
    const availableWidth = container.clientWidth - 64; // accounting for padding
    const availableHeight = container.clientHeight - 64; // accounting for padding and toolbar

    // Calculate zoom factors for both dimensions
    const widthZoom = availableWidth / pageWidth;
    const heightZoom = availableHeight / pageHeight;

    // Use the smaller zoom factor to ensure the entire page fits
    const calculatedZoom = Math.min(widthZoom, heightZoom) * 0.95; // 5% margin

    // Limit zoom range
    return Math.max(0.1, Math.min(calculatedZoom, 3.0));
  }, []);

  const updatePageDimensions = useCallback(async (page: any) => {
    if (!page) return;
    
    const viewport = page.getViewport({ scale: 1.0 });
    setPageDimensions({
      width: viewport.width,
      height: viewport.height
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
             throw new Error("PDF.js library is not loaded. Please include the script in index.html");
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) return;

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);

        // Get first page dimensions for auto zoom calculation
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

    return () => { isCancelled = true; };
  }, [remoteId, updatePageDimensions]);

  // ================ AUTO ZOOM CALCULATION ================
  useEffect(() => {
    if (!autoZoom || !pageDimensions || !pdf) return;

    const calculateAndSetZoom = () => {
      const calculatedZoom = calculateAutoZoom(pageDimensions.width, pageDimensions.height);
      setZoomLevel(calculatedZoom);
    };

    // Calculate initial zoom
    calculateAndSetZoom();

    // Add resize listener
    const handleResize = () => {
      calculateAndSetZoom();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoZoom, pageDimensions, pdf, calculateAutoZoom]);

  // ================ SEARCH FUNCTIONALITY ================
  const performSearch = useCallback(async () => {
    if (!pdf || !searchQuery.trim()) {
      setSearchResults([]);
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
              totalMatches: 0, // Will be updated later
              itemIndex: itemIndex
            });
          }
        });

        // Update totalMatches for each result on this page
        results.forEach(result => {
          if (result.page === pageNum) {
            result.totalMatches = pageMatchCount;
          }
        });
      }

      setSearchResults(results);
      setCurrentMatchIndex(results.length > 0 ? 1 : 0);
      
      // Auto-show results panel when there are results
      if (results.length > 0) {
        setShowResultsPanel(true);
      }

    } catch (err) {
      console.error('Search error:', err);
    }
  }, [pdf, searchQuery, numPages]);

  // Trigger search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // ================ RENDER CANVAS & FETCH TEXT ================
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || pageNum < 1 || pageNum > numPages) return;

    if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
    }

    try {
      const page = await pdf.getPage(pageNum);
      
      // Update page dimensions if auto zoom is enabled
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

      // Draw PDF to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;

      // Fetch Text Content for Highlighting
      const textContent = await page.getTextContent();
      setPageTextContent({ items: textContent.items, viewport });

    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    }
  }, [pdf, numPages, zoomLevel, rotation, autoZoom, updatePageDimensions]);

  // Trigger render when deps change
  useEffect(() => {
    if (pdf) renderPage(currentPage);
  }, [currentPage, pdf, renderPage]);

  // ================ RENDER TEXT LAYER (HIGHLIGHTS) ================
  useEffect(() => {
    const textLayer = textLayerRef.current;
    if (!textLayer || !pageTextContent) return;

    // Clear previous
    textLayer.innerHTML = '';
    const { items, viewport } = pageTextContent;

    // Match layer size to canvas
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;
    textLayer.style.setProperty('--scale-factor', `${viewport.scale}`);

    const q = searchQuery.trim().toLowerCase();
    const currentPageResults = searchResults.filter(result => result.page === currentPage);

    items.forEach((item: any, itemIndex: number) => {
        if (!item.str) return;

        // PDF.js coordinates are bottom-left based. convertToViewportPoint handles the flip.
        // item.transform is [scaleX, skewX, skewY, scaleY, x, y]
        const tx = item.transform;
        const [x, y] = viewport.convertToViewportPoint(tx[4], tx[5]);
        
        // Approximate font size from transform matrix (scaleY usually)
        // Calculating magnitude of the scaling vector (0, 3)
        const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
        
        const span = document.createElement('span');
        
        // Styling to match PDF text position
        span.style.left = `${x}px`;
        span.style.top = `${y - (fontSize * viewport.scale)}px`; // Adjust for baseline
        span.style.fontSize = `${fontSize * viewport.scale}px`;
        span.style.fontFamily = 'sans-serif';
        span.style.position = 'absolute';
        span.style.transformOrigin = '0% 0%';
        span.style.whiteSpace = 'pre';
        span.style.pointerEvents = 'auto'; // allow selection
        span.style.lineHeight = '1';
        
        // Make text transparent so it doesn't clash with canvas text, 
        // but selectable and capable of showing background highlights
        span.style.color = 'transparent'; 

        // Highlighting Logic
        if (q && item.str.toLowerCase().includes(q)) {
            const isCurrentMatch = currentPageResults.some(
              result => result.itemIndex === itemIndex && result.matchIndex === currentMatchIndex
            );
            
            const highlightColor = isCurrentMatch 
              ? 'rgba(60, 130, 236, 0.2)' // Brighter color for current match
              : 'rgba(60, 130, 236, 0.4)'; // Normal color for other matches
            
            const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            span.innerHTML = item.str.replace(regex, `<mark style="background-color: ${highlightColor}; color: transparent; padding: 3px 1px 3px 1px; border-radius: 4px; border: ${isCurrentMatch ? '1px solid #ff4444' : 'none'}">$1</mark>`);
        } else {
            span.textContent = item.str;
        }

        textLayer.appendChild(span);
    });

  }, [pageTextContent, searchQuery, searchResults, currentMatchIndex, currentPage]);

  // ================ HANDLERS ================
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      // Reset current match index when manually changing pages
      setCurrentMatchIndex(0);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentMatchIndex(0);
    setShowResultsPanel(false);
    searchInputRef.current?.focus();
  };

  const navigateToMatch = (result: SearchResult) => {
    setCurrentPage(result.page);
    setCurrentMatchIndex(result.matchIndex);
    setShowResultsPanel(false);
  };

  const navigateToNextMatch = () => {
    if (searchResults.length === 0) return;
    
    const currentIndex = searchResults.findIndex(result => result.matchIndex === currentMatchIndex);
    const nextIndex = (currentIndex + 1) % searchResults.length;
    navigateToMatch(searchResults[nextIndex]);
  };

  const navigateToPrevMatch = () => {
    if (searchResults.length === 0) return;
    
    const currentIndex = searchResults.findIndex(result => result.matchIndex === currentMatchIndex);
    const prevIndex = currentIndex === 0 ? searchResults.length - 1 : currentIndex - 1;
    navigateToMatch(searchResults[prevIndex]);
  };

  const handleZoomIn = () => {
    setAutoZoom(false);
    setZoomLevel(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setAutoZoom(false);
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
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
         <p className="text-red-600 font-semibold mb-1">Unable to load document</p>
         <p className="text-xs text-red-500 bg-white px-2 py-1 rounded border border-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 border-l border-gray-200 w-full" ref={containerRef}>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 shadow-sm z-10 shrink-0 h-14">
        
        {/* Left: Page Navigation */}
        <div className="flex items-center gap-1">
            <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                title="Previous Page"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-lg font-medium text-gray-700 min-w-[3rem] text-center">
                {currentPage} / {numPages}
            </span>
            <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                title="Next Page"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>

        {/* Middle: Search Bar with Navigation */}
        <div className="flex items-center flex-1 max-w-2xl ">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Find in document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-lg text-gray-600 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Search Results Counter */}
            {searchResults.length > 0 && (
              <div className="absolute right-8 top-1/2 transform -translate-y-1/2 text-md text-gray-500 bg-gray-100 px-3 py-1 rounded">
                {currentMatchIndex} / {searchResults.length}
              </div>
            )}
            
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Search Navigation Buttons - Right next to search bar */}
          {searchResults.length > 0 && (
            <div className="flex items-center ml-2">
              <button 
                onClick={navigateToPrevMatch}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                title="Previous Match"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={navigateToNextMatch}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                title="Next Match"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setShowResultsPanel(!showResultsPanel)}
                className={`p-2 rounded transition-colors ${
                  showResultsPanel ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Show Search Results"
              >
                <List className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
          <button 
            onClick={handleZoomOut}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-6 h-6" />
          </button>
          
          <button
            onClick={handleAutoZoom}
            className={`p-2 rounded transition-colors ${
              autoZoom ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Fit to Window"
          >
            <div className="w-6 h-6 flex items-center justify-center text-sm font-medium">
              Fit
            </div>
          </button>
          
          <span className="text-md text-gray-500 w-12 text-center select-none">
            {Math.round(zoomLevel * 100)}%
          </span>
          
          <button 
            onClick={handleZoomIn}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-6 h-6" />
          </button>     
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Search Results Panel */}
        {showResultsPanel && searchResults.length > 0 && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">
                Search Results ({searchResults.length})
              </h3>
              <p className="text-sm text-gray-500 mt-1">"{searchQuery}"</p>
            </div>
            <div className="divide-y divide-gray-100">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.page}-${result.itemIndex}-${index}`}
                  onClick={() => navigateToMatch(result)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                    result.matchIndex === currentMatchIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Page {result.page}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {result.matchIndex}/{searchResults.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {result.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto relative p-8 flex justify-center bg-gray-50/50">
          <div 
            className="relative bg-white shadow-lg transition-all duration-200 ease-out"
            style={{ 
              width: canvasRef.current ? canvasRef.current.style.width : 'auto',
              height: canvasRef.current ? canvasRef.current.style.height : 'auto' 
            }}
          >
            <canvas ref={canvasRef} className="block" />
            {/* Text Layer for Selection and Highlighting */}
            <div ref={textLayerRef} className="absolute inset-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerContent;