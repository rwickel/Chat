// src/components/pdf_viewer/Toolbar.tsx

import React, { RefObject } from 'react';

import { 
    ChevronLeft, 
    ChevronRight, 
    ZoomIn, 
    ZoomOut, 
    Search,
    X,
    List
} from 'lucide-react';

interface SearchResult {
  page: number;
  text: string;
  matchIndex: number;
  totalMatches: number;
  itemIndex: number;
}

interface ToolbarProps {
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  searchResults: SearchResult[];
  currentMatchIndex: number;
  onNavigateToNextMatch: () => void;
  onNavigateToPrevMatch: () => void;
  showResultsPanel: boolean;
  onToggleResultsPanel: () => void;
  zoomLevel: number;
  autoZoom: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAutoZoom: () => void;
  searchInputRef: RefObject<HTMLInputElement>;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentPage,
  numPages,
  onPageChange,
  searchQuery,
  onSearchChange,
  onClearSearch,
  searchResults,
  currentMatchIndex,
  onNavigateToNextMatch,
  onNavigateToPrevMatch,
  showResultsPanel,
  onToggleResultsPanel,
  zoomLevel,
  autoZoom,
  onZoomIn,
  onZoomOut,
  onAutoZoom,
  searchInputRef
}) => {
  return (
    <div className="flex w-full  items-center justify-between">
      {/* Left: Page Navigation */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
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
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
          title="Next Page"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Middle: Search Bar with Navigation */}
      <div className="flex items-center flex-1 max-w-2xl">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            ref={searchInputRef}
            type="text"
            placeholder="Find in document..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
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
              onClick={onClearSearch}
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
              onClick={onNavigateToPrevMatch}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              title="Previous Match"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={onNavigateToNextMatch}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              title="Next Match"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button 
              onClick={onToggleResultsPanel}
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
      <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2 mr-4">
        <button 
          onClick={onZoomOut}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-6 h-6" />
        </button>
        
        <button
          onClick={onAutoZoom}
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
          onClick={onZoomIn}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-6 h-6" />
        </button>     
      </div>
    </div>
  );
};

export default Toolbar;