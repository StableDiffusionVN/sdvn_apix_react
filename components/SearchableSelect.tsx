/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

type Option = string | { group: string; options: string[] };

interface SearchableSelectProps {
    id: string;
    label: string;
    options: Option[];
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ id, label, options, value, onChange, placeholder }) => {
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (inputValue !== value) {
                    onChange(inputValue);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputValue, value, onChange]);

    const flatFilteredOptions = useMemo(() => {
        const result: string[] = [];
        options.forEach(opt => {
            if (typeof opt === 'string') {
                if (opt.toLowerCase().includes(inputValue.toLowerCase())) {
                    result.push(opt);
                }
            } else if (typeof opt === 'object' && opt.group && opt.options) {
                const filtered = opt.options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));
                if (filtered.length > 0) {
                    result.push(...filtered);
                }
            }
        });
        return result;
    }, [options, inputValue]);

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const highlightedItem = listRef.current.querySelector('.is-highlighted') as HTMLLIElement;
            if (highlightedItem) {
                highlightedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    const handleSelectOption = (option: string) => {
        onChange(option);
        setInputValue(option);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % flatFilteredOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + flatFilteredOptions.length) % flatFilteredOptions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && flatFilteredOptions[highlightedIndex]) {
                handleSelectOption(flatFilteredOptions[highlightedIndex]);
            } else {
                 onChange(inputValue);
                 setIsOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setHighlightedIndex(-1);
        }
    }, [isOpen]);

    const renderOptions = () => {
        const elements: React.ReactNode[] = [];
        let hasResults = false;

        options.forEach(opt => {
            if (typeof opt === 'string') {
                if (opt.toLowerCase().includes(inputValue.toLowerCase())) {
                    hasResults = true;
                    elements.push(
                        <li key={opt} onMouseDown={(e) => { e.preventDefault(); handleSelectOption(opt); }} className={cn("searchable-dropdown-item", { 'is-highlighted': flatFilteredOptions[highlightedIndex] === opt })}>
                            {opt}
                        </li>
                    );
                }
            } else if (typeof opt === 'object' && opt.group && opt.options) {
                const filteredGroupOptions = opt.options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));
                if (filteredGroupOptions.length > 0) {
                    hasResults = true;
                    elements.push(<li key={opt.group} className="searchable-dropdown-group-header">{opt.group}</li>);
                    filteredGroupOptions.forEach(option => {
                        elements.push(
                            <li key={option} onMouseDown={(e) => { e.preventDefault(); handleSelectOption(option); }} className={cn("searchable-dropdown-item", { 'is-highlighted': flatFilteredOptions[highlightedIndex] === option })}>
                                {option}
                            </li>
                        );
                    });
                }
            }
        });

        if (!hasResults) {
            return <li className="searchable-dropdown-item !cursor-default">Không tìm thấy</li>;
        }
        return elements;
    };

    return (
        <div ref={containerRef} className="searchable-dropdown-container">
            <label htmlFor={id} className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">
                {label}
            </label>
            <input
                ref={inputRef}
                type="text"
                id={id}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!isOpen) setIsOpen(true);
                    setHighlightedIndex(-1);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                className="form-input !text-xs"
                placeholder={placeholder || "Để trống để chọn Tự động..."}
                autoComplete="off"
            />
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        ref={listRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="searchable-dropdown-list"
                    >
                       {renderOptions()}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

// Memoize the component for performance optimization
export default memo(SearchableSelect);
