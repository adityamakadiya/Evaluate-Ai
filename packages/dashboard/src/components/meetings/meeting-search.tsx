'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Calendar } from 'lucide-react';

interface SearchResult {
  meetingId: string;
  title: string;
  date: string;
  durationMinutes: number | null;
  participantCount: number;
  actionItemsCount: number;
  snippet: string | null;
}

interface Props {
  onSelectMeeting: (meetingId: string) => void;
}

export default function MeetingSearch({ onSelectMeeting }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/meetings/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setIsOpen(true);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleClear() {
    setQuery('');
    setResults(null);
    setIsOpen(false);
  }

  function handleSelect(meetingId: string) {
    onSelectMeeting(meetingId);
    setIsOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function highlightMatch(text: string): React.ReactNode {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-purple-500/30 text-purple-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results && results.length > 0 && setIsOpen(true)}
          placeholder="Search meeting transcripts..."
          className="w-full bg-bg-card border border-border-primary rounded-lg pl-9 pr-9 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:outline-none transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results && (
        <div className="absolute z-50 top-full mt-1 w-full bg-bg-card border border-border-primary rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-muted">
              No meetings found for &quot;{query}&quot;
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.meetingId}
                onClick={() => handleSelect(r.meetingId)}
                className="w-full text-left px-4 py-3 hover:bg-bg-elevated transition-colors border-b border-border-primary/50 last:border-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary truncate mr-2">
                    {highlightMatch(r.title)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text-muted shrink-0">
                    <Calendar className="h-3 w-3" />
                    {new Date(r.date).toLocaleDateString()}
                  </span>
                </div>
                {r.snippet && (
                  <p className="text-xs text-text-muted line-clamp-2">
                    {highlightMatch(r.snippet)}
                  </p>
                )}
                <div className="flex gap-3 mt-1 text-xs text-text-muted">
                  <span>{r.participantCount} participant{r.participantCount !== 1 ? 's' : ''}</span>
                  <span>{r.actionItemsCount} action item{r.actionItemsCount !== 1 ? 's' : ''}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
