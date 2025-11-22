/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, type Theme, THEME_DETAILS } from './uiUtils';
import ApiSettingsModal from './ApiSettingsModal';

const Footer: React.FC<{}> = () => {
    const { theme, handleThemeChange, t } = useAppControls();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentThemeInfo = THEME_DETAILS.find(td => td.id === theme) || THEME_DETAILS[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectTheme = (newTheme: Theme) => {
        handleThemeChange(newTheme);
        setIsDropdownOpen(false);
    };

    return (
        <footer className="base-font fixed bottom-0 left-0 right-0 footer-themed-bg p-2 z-50 text-neutral-300 text-xs sm:text-sm border-t border-white/10">
            <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-1 sm:gap-2 px-4">
                <div className="text-neutral-400 whitespace-nowrap"> 
                    <a
                        href="http://sdvn.vn/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-yellow-400 transition-colors duration-200"
                    >
                        {t('footer_copyright')}
                    </a>
                </div>
                <div className="flex items-center flex-wrap justify-center gap-1 sm:gap-2">
                    <div className="flex items-center gap-2">
                        <div ref={dropdownRef} className="theme-dropdown">
                             <AnimatePresence>
                                {isDropdownOpen && (
                                    <motion.ul
                                        className="theme-dropdown-panel"
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15, ease: 'easeOut' }}
                                        role="listbox"
                                    >
                                        {THEME_DETAILS.map(themeInfo => (
                                            <li
                                                key={themeInfo.id}
                                                className="theme-dropdown-item"
                                                onClick={() => handleSelectTheme(themeInfo.id)}
                                                role="option"
                                                aria-selected={theme === themeInfo.id}
                                                tabIndex={0}
                                            >
                                                <span
                                                    className="theme-swatch"
                                                    style={{ background: `linear-gradient(to right, ${themeInfo.colors[0]}, ${themeInfo.colors[1]})` }}
                                                ></span>
                                                <span className="base-font">{themeInfo.name}</span>
                                            </li>
                                        ))}
                                    </motion.ul>
                                )}
                            </AnimatePresence>

                            <button
                                id="theme-select-button"
                                type="button"
                                className="theme-dropdown-button"
                                onClick={() => setIsDropdownOpen(prev => !prev)}
                                aria-haspopup="listbox"
                                aria-expanded={isDropdownOpen}
                                aria-label="Chọn giao diện nền"
                            >
                                <span className="flex items-center gap-2">
                                     <span
                                        className="theme-swatch"
                                        style={{ background: `linear-gradient(to right, ${currentThemeInfo.colors[0]}, ${currentThemeInfo.colors[1]})` }}
                                    ></span>
                                    <span className="base-font">{currentThemeInfo.name}</span>
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                     <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="bg-black/40 border border-white/20 rounded-md px-3 py-1 text-neutral-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none hover:bg-black/60 transition-colors flex items-center gap-1.5"
                        aria-label="Cài đặt API"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                     <a
                        href="https://stablediffusion.vn/gop-y/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/40 border border-white/20 rounded-md px-3 py-1 text-neutral-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none hover:bg-black/60 transition-colors"
                        aria-label="Gửi góp ý"
                    >
                        {t('footer_feedback')}
                    </a>
                     <a
                        href="https://stablediffusion.vn/donate/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/40 border border-white/20 rounded-md px-3 py-1 text-neutral-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none hover:bg-black/60 transition-colors"
                        aria-label="Donate"
                    >
                        Donate
                    </a>
                </div>
            </div>
            <ApiSettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
            />
        </footer>
    );
};

export default Footer;