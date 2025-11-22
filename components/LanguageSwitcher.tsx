/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAppControls } from './uiUtils';
import { cn } from '../lib/utils';

const LanguageSwitcher: React.FC = () => {
    const { language, handleLanguageChange } = useAppControls();

    return (
        <div className="flex items-center gap-1 bg-black/30 rounded-full p-1 text-sm text-neutral-200 backdrop-blur-sm border border-white/10">
            <button 
                onClick={() => handleLanguageChange('vi')} 
                className={cn(
                    'px-3 py-0.5 rounded-full text-xs font-bold transition-colors duration-200', 
                    language === 'vi' 
                        ? 'bg-yellow-400 text-black' 
                        : 'text-neutral-300 hover:bg-white/10'
                )}
                aria-pressed={language === 'vi'}
                aria-label="Switch to Vietnamese"
            >
                VI
            </button>
            <button 
                onClick={() => handleLanguageChange('en')} 
                className={cn(
                    'px-3 py-0.5 rounded-full text-xs font-bold transition-colors duration-200', 
                    language === 'en' 
                        ? 'bg-yellow-400 text-black' 
                        : 'text-neutral-300 hover:bg-white/10'
                )}
                aria-pressed={language === 'en'}
                aria-label="Switch to English"
            >
                EN
            </button>
        </div>
    );
};

export default LanguageSwitcher;
