"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Loader, FileText, Briefcase, X, Command } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './GlobalSearch.module.css';

interface SearchResult {
    id: string;
    type: 'brief' | 'document';
    title: string;
    subtitle: string;
    url: string;
    snippet?: string;
    matchType: string;
}

interface GlobalSearchProps {
    workspaceId: string;
}

export default function GlobalSearch({ workspaceId }: GlobalSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}&workspaceId=${workspaceId}`);
                const data = await response.json();
                setResults(data.results || []);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, workspaceId]);

    const handleSelect = (result: SearchResult) => {
        router.push(result.url);
        setIsOpen(false);
        setQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                if (selectedIndex >= 0 && selectedIndex < results.length) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.searchBar}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search documents & briefs... (Ctrl + K)"
                    className={styles.input}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />
                {query && (
                    <button className={styles.clearBtn} onClick={() => setQuery('')}>
                        <X size={14} />
                    </button>
                )}
                <div className={styles.shortcut}>
                    <Command size={10} /> K
                </div>
            </div>

            {isOpen && (query || isSearching) && (
                <div className={styles.resultsDropdown}>
                    {isSearching ? (
                        <div className={styles.loading}>
                            <Loader size={20} className="animate-spin" />
                            <span>Searching across all documents...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <div className={styles.resultsList}>
                            {results.map((result, index) => (
                                <div
                                    key={`${result.type}-${result.id}`}
                                    className={`${styles.resultItem} ${index === selectedIndex ? styles.selected : ''}`}
                                    onClick={() => handleSelect(result)}
                                >
                                    <div className={styles.resultIcon}>
                                        {result.type === 'brief' ? <Briefcase size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className={styles.resultInfo}>
                                        <div className={styles.resultHeader}>
                                            <span className={styles.resultTitle}>{result.title}</span>
                                            <span className={styles.matchType}>{result.matchType}</span>
                                        </div>
                                        <div className={styles.resultSubtitle}>{result.subtitle}</div>
                                        {result.snippet && (
                                            <div className={styles.snippet}>
                                                {result.snippet}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : query.length >= 2 ? (
                        <div className={styles.noResults}>
                            No matches found for "{query}"
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
