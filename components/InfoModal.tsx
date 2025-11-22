/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls } from './uiUtils';
import { CloseIcon, LoadingSpinnerIcon } from './icons';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface InfoData {
    version: string;
    developer: {
        name: string;
        url: string;
    };
    notice: {
        prefix: string;
        linkText: string;
        linkUrl: string;
        suffix: string;
    };
    community: {
        prefix: string;
        linkText: string;
        linkUrl: string;
    };
    latestUpdate: string;
    videoTutorial: {
        prefix: string;
        linkText: string;
        linkUrl: string;
    };
}


const Shortcut: React.FC<{ keys: string }> = ({ keys }) => (
    <div className="flex items-center gap-1 flex-shrink-0">
        {keys.split('+').map(key => (
            <kbd key={key} className="px-2 py-1 text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-700 rounded-md">
                {key.trim()}
            </kbd>
        ))}
    </div>
);


const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    const { t } = useAppControls();
    const [infoData, setInfoData] = useState<InfoData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetch('/info.json')
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return res.json();
                })
                .then(data => {
                    setInfoData(data);
                })
                .catch(err => console.error("Could not load info.json", err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content md:!max-w-6xl lg:!max-w-7xl xl:!max-w-[90vw] relative"
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors" aria-label={t('infoModal_close')}>
                            <CloseIcon className="h-6 w-6" strokeWidth={2} />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-neutral-300 mb-6 pb-4 border-b border-white/10 min-h-[100px]">
                            {isLoading ? (
                                <div className="md:col-span-2 flex items-center justify-center h-full">
                                    <LoadingSpinnerIcon className="h-6 w-6 animate-spin text-yellow-400" />
                                </div>
                            ) : infoData ? (
                                <>
                                    <p className="font-bold text-yellow-300">{infoData.version}</p>
                                    <p>
                                        Người phát triển: <a href={infoData.developer.url} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">{infoData.developer.name}</a>
                                    </p>
                                    <p>
                                        {infoData.notice.prefix}
                                        <a href={infoData.notice.linkUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">{infoData.notice.linkText}</a>
                                        {infoData.notice.suffix}
                                    </p>
                                    <p>
                                        {infoData.community.prefix}
                                        <a href={infoData.community.linkUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">{infoData.community.linkText}</a>
                                    </p>
                                    <p className="md:col-span-2 font-bold text-yellow-300 mt-2 pt-2 border-t border-white/10">{infoData.latestUpdate}</p>
                                    {infoData.videoTutorial && (
                                        <p className="md:col-span-2 font-bold text-yellow-300">
                                            {infoData.videoTutorial.prefix}
                                            <a href={infoData.videoTutorial.linkUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">{infoData.videoTutorial.linkText}</a>
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="md:col-span-2 text-red-400">Không thể tải thông tin ứng dụng.</p>
                            )}
                        </div>

                        <div className="max-h-[65vh] overflow-y-auto pr-2">
                            <div className="text-neutral-300 columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-x-8">
                                {/* Section 1 */}
                                <div className="break-inside-avoid mb-6">
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">{t('infoModal_generalShortcuts_title')}</h4>
                                    <p className="text-sm text-neutral-400 mb-3">{t('infoModal_generalShortcuts_subtitle')}</p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.home')}</span> <Shortcut keys="Cmd/Ctrl + H" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.history')}</span> <Shortcut keys="Cmd/Ctrl + Y" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.search')}</span> <Shortcut keys="Cmd/Ctrl + F" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.gallery')}</span> <Shortcut keys="Cmd/Ctrl + G" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.editor')}</span> <Shortcut keys="Cmd/Ctrl + E" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.layerComposer')}</span> <Shortcut keys="Cmd/Ctrl + L" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.storyboard')}</span> <Shortcut keys="Cmd/Ctrl + B" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_generalShortcuts_items.info')}</span> <Shortcut keys="Cmd/Ctrl + /" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_appNav_items.undo')}</span> <Shortcut keys="Cmd/Ctrl + Z" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_appNav_items.redo')}</span> <Shortcut keys="Cmd/Ctrl + Shift + Z" /></li>
                                    </ul>
                                </div>

                                 {/* Section 2 */}
                                <div className="break-inside-avoid mb-6">
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">{t('infoModal_editorTools_title')}</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorUndo_items.undo')}</span> <Shortcut keys="Cmd/Ctrl + Z" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorUndo_items.redo')}</span> <Shortcut keys="Cmd/Ctrl + Shift + Z" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorTools_items.crop')}</span> <Shortcut keys="C" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorTools_items.brush')}</span> <Shortcut keys="B" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorTools_items.eraser')}</span> <Shortcut keys="E" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorTools_items.picker')}</span> <Shortcut keys="I" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorTools_items.brushSize')}</span> <Shortcut keys="] / [" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_editorTools_items.tempPicker')}</span> <Shortcut keys="Giữ Alt" /></li>
                                    </ul>
                                </div>

                                 {/* Section 3 */}
                                <div className="break-inside-avoid mb-6">
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">{t('infoModal_layerComposerTools_title')}</h4>
                                    <p className="text-sm text-neutral-400 mb-3">{t('infoModal_layerComposerTools_subtitle')}</p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerTools_items.select')}</span> <Shortcut keys="V" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerTools_items.hand')}</span> <Shortcut keys="H" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerTools_items.pan')}</span> <Shortcut keys="Giữ Space" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerTools_items.toggleLog')}</span> <Shortcut keys="Tab" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerTools_items.toggleChatbot')}</span> <Shortcut keys="~" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerActions_items.delete')}</span> <Shortcut keys="Delete / Backspace" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerActions_items.duplicate')}</span> <Shortcut keys="Cmd/Ctrl + J" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerActions_items.moveUp')}</span> <Shortcut keys="Cmd/Ctrl + ]" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerActions_items.moveDown')}</span> <Shortcut keys="Cmd/Ctrl + [" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_layerComposerActions_items.deselect')}</span> <Shortcut keys="Cmd/Ctrl + D" /></li>                                    
                                    </ul>
                                </div>

                                 {/* Section 4*/}
                                <div className="break-inside-avoid mb-6">
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">{t('infoModal_usageTips_title')}</h4>
                                    <p className="text-sm text-neutral-400 mb-3">{t('infoModal_usageTips_subtitle')}</p>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex justify-between items-center"><span>{t('infoModal_usageTips_items.dragDrop')}</span></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_usageTips_items.tempPicker')}</span> <Shortcut keys="Giữ Alt" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_usageTips_items.quickDuplicate')}</span> <Shortcut keys="Giữ Alt + Kéo" /></li>
                                        <li className="flex justify-between items-center"><span>{t('infoModal_usageTips_items.multiSelect')}</span> <Shortcut keys="Giữ Shift" /></li>
                                        <li className="flex items-center"><span>{t('infoModal_usageTips_items.apiLimitSolution')}</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InfoModal;