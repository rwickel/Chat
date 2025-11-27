import React, { useEffect, useRef } from 'react';

interface SearchResult {
  page: number;
  text: string;
  matchIndex: number;
  totalMatches: number;
  itemIndex: number;
}

interface SearchResultsPanelProps {
  searchResults: SearchResult[];
  currentMatchIndex: number;
  onNavigateToMatch: (result: SearchResult) => void;
  searchQuery: string;
}

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  searchResults,
  currentMatchIndex,
  onNavigateToMatch,
  searchQuery
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Scroll to current match when results change
  useEffect(() => {
    if (panelRef.current && searchResults.length > 0) {
      const currentMatchElement = panelRef.current.querySelector('.current-match');
      if (currentMatchElement) {
        currentMatchElement.scrollIntoView({ 
          block: 'center',
          behavior: 'smooth'
        });
      }
    }
  }, [searchResults, currentMatchIndex]);

  return (
    <div className="w-full bg-white border-r border-gray-200 overflow-y-auto shrink-0" ref={panelRef}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700">
          Search Results ({searchResults.length})
        </h3>
        <p className="text-md text-gray-500 mt-1">"{searchQuery}"</p>
      </div>
      <div className="divide-y divide-gray-100">
        {searchResults.map((result, index) => (
          <button
            key={`${result.page}-${result.itemIndex}-${index}`}
            onClick={() => onNavigateToMatch(result)}
            className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
              result.matchIndex === currentMatchIndex ? 'bg-blue-50 border-l-4 border-l-blue-500 current-match' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-md font-medium text-gray-700">
                Page {result.page}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                {result.matchIndex}/{searchResults.length}
              </span>
            </div>
            <p className="text-md text-gray-600 mt-1 line-clamp-2">
              {result.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchResultsPanel;