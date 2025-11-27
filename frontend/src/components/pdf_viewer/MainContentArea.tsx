import React, { RefObject } from 'react';

// Import the SearchResultsPanel component
import SearchResultsPanel from './SearchResultsPanel';
import { SearchResult } from '../../types';

interface MainContentAreaProps {
  showResultsPanel: boolean;
  searchResults: SearchResult[];
  currentMatchIndex: number;
  onNavigateToMatch: (result: SearchResult) => void;
  searchQuery: string;
  canvasRef: RefObject<HTMLCanvasElement>;
  textLayerRef: RefObject<HTMLDivElement>;
  pageTextContent: any;
  currentPage: number;
}

const MainContentArea: React.FC<MainContentAreaProps> = ({
  showResultsPanel,
  searchResults,
  currentMatchIndex,
  onNavigateToMatch,
  searchQuery,
  canvasRef,
  textLayerRef,
  pageTextContent,
  currentPage
}) => {
  // ================ RENDER TEXT LAYER (HIGHLIGHTS) ================
  React.useEffect(() => {
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

  }, [pageTextContent, searchQuery, searchResults, currentMatchIndex, currentPage, textLayerRef]);

  return (
    <div className="flex flex-1 overflow-hidden">
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

      {/* Search Results Panel - Right Hand Side */}
      {showResultsPanel && searchResults.length > 0 && (
        <div className="w-80 overflow-auto bg-white shadow-lg ml-4">
          <SearchResultsPanel
            searchResults={searchResults}
            currentMatchIndex={currentMatchIndex}
            onNavigateToMatch={onNavigateToMatch}
            searchQuery={searchQuery}
          />
        </div>
      )}
    </div>
  );
};

export default MainContentArea;