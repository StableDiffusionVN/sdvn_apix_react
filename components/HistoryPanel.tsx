/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls } from './uiUtils';
import { type GenerationHistoryEntry } from './uiTypes';
import { CloseIcon, DownloadIcon, ReloadIcon } from './icons';
import { downloadJson } from './uiFileUtilities';

interface HistoryItemProps {
    entry: GenerationHistoryEntry;
    onReload: (settings: GenerationHistoryEntry['settings']) => void;
    onDownload: (entry: GenerationHistoryEntry) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, onReload, onDownload }) => {
    const { t } = useAppControls();

    const handleDownload = () => {
        onDownload(entry);
    };

    const handleReload = () => {
        onReload(entry.settings);
    };

    return (
        <motion.li
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-start gap-4 p-3 bg-neutral-800/50 rounded-lg border border-transparent hover:border-yellow-400/30 hover:bg-neutral-800/80 transition-all"
        >
            <img src={entry.thumbnailUrl} alt={`History thumbnail for ${entry.appName}`} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-neutral-700" />
            <div className="flex-grow min-w-0">
                <p className="font-bold text-yellow-400 truncate">{entry.appName}</p>
                <p className="text-xs text-neutral-400">{new Date(entry.timestamp).toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2">
                    <button onClick={handleDownload} className="thumbnail-action-btn" title={t('historyPanel_download')}>
                        <DownloadIcon className="h-4 w-4" />
                    </button>
                    <button onClick={handleReload} className="thumbnail-action-btn" title={t('historyPanel_reload')}>
                        <ReloadIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </motion.li>
    );
};

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
    const { generationHistory, importSettingsAndNavigate, t } = useAppControls();

    const handleReload = (settings: GenerationHistoryEntry['settings']) => {
        importSettingsAndNavigate(settings);
        onClose();
    };

    const handleDownload = useCallback((entry: GenerationHistoryEntry) => {
        // Since history now directly embeds image data, no rehydration is needed.
        downloadJson(
            entry.settings,
            `aPix-history-${entry.appId}-${entry.timestamp}.json`
        );
    }, []);
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/30 z-40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />
            )}
            {isOpen && (
                <motion.div
                    className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-neutral-900/80 backdrop-blur-lg border-l border-white/10 shadow-2xl z-50 flex flex-col"
                    initial={{ x: '100%' }}
                    animate={{ x: '0%' }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                >
                    <div className="flex justify-between items-center p-4 border-b border-white/10 flex-shrink-0">
                        <h3 className="base-font font-bold text-2xl text-yellow-400">{t('historyPanel_title')}</h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label={t('historyPanel_close')}>
                            <CloseIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {generationHistory.length > 0 ? (
                        <ul className="flex-grow overflow-y-auto p-4 space-y-3">
                           <AnimatePresence>
                                {generationHistory.map(entry => (
                                    <HistoryItem 
                                        key={entry.id} 
                                        entry={entry} 
                                        onReload={handleReload}
                                        onDownload={handleDownload}
                                    />
                                ))}
                            </AnimatePresence>
                        </ul>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-center text-neutral-400 p-4">
                            <p>{t('historyPanel_empty')}</p>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HistoryPanel;