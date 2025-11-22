/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, useImageEditor, ExtraTools } from './uiUtils';
import { cn } from '../lib/utils';
import { 
    HomeIcon, 
    BackIcon, 
    ForwardIcon, 
    SearchIcon, 
    InfoIcon, 
    GalleryIcon, 
    EditorIcon, 
    LayerComposerIcon, 
    EllipsisIcon,
    HistoryIcon,
    StoryboardIcon
} from './icons';

const AppToolbar: React.FC = () => {
    const {
        currentView,
        historyIndex,
        viewHistory,
        handleGoHome,
        handleGoBack,
        handleGoForward,
        handleOpenGallery,
        handleOpenSearch,
        handleOpenInfo,
        handleOpenHistoryPanel,
        addImagesToGallery,
        isExtraToolsOpen,
        toggleExtraTools,
        isLayerComposerVisible,
        toggleLayerComposer,
        isStoryboardingModalVisible,
        toggleStoryboardingModal,
        t,
        isHistoryPanelOpen,
        handleCloseHistoryPanel,
    } = useAppControls();

    const { openEmptyImageEditor, imageToEdit } = useImageEditor();

    const [activeTooltip, setActiveTooltip] = useState<{ text: string; rect: DOMRect } | null>(null);
    const tooltipTimeoutRef = useRef<number | null>(null);

    const showTooltip = (text: string, e: React.MouseEvent) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        const target = e.currentTarget as HTMLElement;
        tooltipTimeoutRef.current = window.setTimeout(() => {
            if (document.body.contains(target)) {
                const rect = target.getBoundingClientRect();
                setActiveTooltip({ text, rect });
            }
        }, 500);
    };

    const hideTooltip = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltip(null);
    };


    const handleOpenEditor = useCallback(() => {
            openEmptyImageEditor((newUrl) => {
            addImagesToGallery([newUrl], 'outputs');
        });
    }, [openEmptyImageEditor, addImagesToGallery]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if user is typing in an input/textarea to avoid hijacking browser functionality.
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const isEditorOpen = imageToEdit !== null;

            const isUndo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
            const isRedo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey;
            const isSearch = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f';
            const isGallery = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g';
            const isGoHome = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h';
            const isHistoryToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y';
            const isInfo = (e.metaKey || e.ctrlKey) && e.key === '/';
            const isEditor = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e';
            const isLayerComposer = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l';
            const isStoryboard = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b';

            if (isUndo && !isEditorOpen && !isLayerComposerVisible && !isStoryboardingModalVisible) {
                e.preventDefault();
                handleGoBack();
            } else if (isRedo && !isEditorOpen && !isLayerComposerVisible && !isStoryboardingModalVisible) {
                e.preventDefault();
                handleGoForward();
            } else if (isSearch) {
                e.preventDefault();
                handleOpenSearch();
            } else if (isGallery) {
                e.preventDefault();
                handleOpenGallery();
            } else if (isGoHome) {
                e.preventDefault();
                handleGoHome();
            } else if (isHistoryToggle) {
                e.preventDefault();
                if (isHistoryPanelOpen) {
                    handleCloseHistoryPanel();
                } else {
                    handleOpenHistoryPanel();
                }
            } else if (isInfo) {
                e.preventDefault();
                handleOpenInfo();
            } else if (isEditor && !isLayerComposerVisible) {
                e.preventDefault();
                handleOpenEditor();
            } else if (isLayerComposer) {
                e.preventDefault();
                toggleLayerComposer();
            } else if (isStoryboard) {
                e.preventDefault();
                toggleStoryboardingModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleGoBack, handleGoForward, handleOpenSearch, handleOpenGallery, handleGoHome, handleOpenInfo, handleOpenHistoryPanel, handleCloseHistoryPanel, isHistoryPanelOpen, handleOpenEditor, toggleLayerComposer, imageToEdit, isLayerComposerVisible, isStoryboardingModalVisible, toggleStoryboardingModal]);

    return (
        <>
            <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
                {/* --- Group 1: Navigation & Info --- */}
                <button
                    onClick={handleGoHome}
                    className="btn-search"
                    aria-label={t('appToolbar_home')}
                    disabled={currentView.viewId === 'home'}
                    onMouseEnter={(e) => showTooltip(t('appToolbar_home'), e)}
                    onMouseLeave={hideTooltip}
                >
                    <HomeIcon className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                    onClick={handleGoBack}
                    className="btn-search"
                    aria-label={t('appToolbar_back')}
                    disabled={historyIndex <= 0}
                    onMouseEnter={(e) => showTooltip(t('appToolbar_back'), e)}
                    onMouseLeave={hideTooltip}
                >
                    <BackIcon className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                    onClick={handleGoForward}
                    className="btn-search"
                    aria-label={t('appToolbar_forward')}
                    disabled={historyIndex >= viewHistory.length - 1}
                    onMouseEnter={(e) => showTooltip(t('appToolbar_forward'), e)}
                    onMouseLeave={hideTooltip}
                >
                    <ForwardIcon className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                    onClick={handleOpenSearch}
                    className="btn-search"
                    aria-label={t('appToolbar_search')}
                    onMouseEnter={(e) => showTooltip(t('appToolbar_search'), e)}
                    onMouseLeave={hideTooltip}
                >
                    <SearchIcon className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                    onClick={handleOpenInfo}
                    className="btn-search"
                    aria-label={t('appToolbar_info')}
                    onMouseEnter={(e) => showTooltip(t('appToolbar_info'), e)}
                    onMouseLeave={hideTooltip}
                >
                    <InfoIcon className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                    onClick={handleOpenHistoryPanel}
                    className="btn-search"
                    aria-label={t('appToolbar_history')}
                    onMouseEnter={(e) => showTooltip(t('appToolbar_history'), e)}
                    onMouseLeave={hideTooltip}
                >
                    <HistoryIcon className="h-5 w-5" strokeWidth={1.5} />
                </button>
                
                {/* --- Group 2: Creation & Tools (Hidden on mobile) --- */}
                <div className="hidden md:flex items-center gap-2">
                    <div className="w-px h-5 bg-white/20 mx-1 self-center" />
                    <button
                        onClick={handleOpenGallery}
                        className="btn-gallery"
                        aria-label={t('appToolbar_gallery')}
                        onMouseEnter={(e) => showTooltip(t('appToolbar_gallery'), e)}
                        onMouseLeave={hideTooltip}
                    >
                         <GalleryIcon className="h-5 w-5" strokeWidth={2} />
                    </button>
                    <button
                        onClick={handleOpenEditor}
                        className="btn-search"
                        aria-label={t('appToolbar_editor')}
                        onMouseEnter={(e) => showTooltip(t('appToolbar_editor'), e)}
                        onMouseLeave={hideTooltip}
                    >
                        <EditorIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={toggleLayerComposer}
                        className="btn-search"
                        aria-label={t('appToolbar_layerComposer')}
                        onMouseEnter={(e) => showTooltip(t('appToolbar_layerComposer'), e)}
                        onMouseLeave={hideTooltip}
                    >
                        <LayerComposerIcon className="h-5 w-5" strokeWidth="1.5" />
                    </button>
                    <button
                        onClick={toggleStoryboardingModal}
                        className={cn("btn-search", isStoryboardingModalVisible && 'bg-white/20')}
                        aria-label={t('extraTools_storyboarding')}
                        onMouseEnter={(e) => showTooltip(t('extraTools_storyboarding'), e)}
                        onMouseLeave={hideTooltip}
                    >
                        <StoryboardIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={toggleExtraTools}
                        className={cn("btn-search", isExtraToolsOpen && 'bg-white/20')}
                        aria-label={t('appToolbar_extra')}
                        onMouseEnter={(e) => showTooltip(t('appToolbar_extra'), e)}
                        onMouseLeave={hideTooltip}
                    >
                        <EllipsisIcon className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>
            </div>
            <ExtraTools isOpen={isExtraToolsOpen} />
            <AnimatePresence>
                {activeTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-50 p-2 text-xs text-center text-white bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-md shadow-lg pointer-events-none"
                        style={{
                            top: activeTooltip.rect.bottom + 8,
                            left: activeTooltip.rect.left + activeTooltip.rect.width / 2,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {activeTooltip.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AppToolbar;
