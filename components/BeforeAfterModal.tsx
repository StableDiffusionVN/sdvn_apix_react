/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, useImageEditor, useLightbox } from './uiUtils';
import { cn } from '../lib/utils';
import Lightbox from './Lightbox';
import { ImageThumbnailActions } from './ImageThumbnailActions';

interface BeforeAfterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BeforeAfterModal: React.FC<BeforeAfterModalProps> = ({ isOpen, onClose }) => {
    // FIX: Replaced `sessionGalleryImages` with an aliased `imageGallery` from context to match the provided type.
    const { imageGallery, removeImageFromGallery, replaceImageInGallery, t } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();

    const [beforeImage, setBeforeImage] = useState<string | null>(null);
    const [afterImage, setAfterImage] = useState<string | null>(null);
    const [sliderPosition, setSliderPosition] = useState(50);

    useEffect(() => {
        if (!isOpen) {
            setBeforeImage(null);
            setAfterImage(null);
            setSliderPosition(50);
            closeLightbox();
        }
    }, [isOpen, closeLightbox]);

    const handleSelectImage = (url: string) => {
        if (url === beforeImage || url === afterImage) {
            // Deselect if clicking the same image again
            if (url === beforeImage) setBeforeImage(null);
            if (url === afterImage) setAfterImage(null);
            return;
        }

        if (!beforeImage) {
            setBeforeImage(url);
        } else if (!afterImage) {
            setAfterImage(url);
        } else {
            // Cycle through: new selection replaces 'after', old 'after' becomes 'before'
            setBeforeImage(afterImage);
            setAfterImage(url);
        }
    };
    
    const clearSelections = () => {
        setBeforeImage(null);
        setAfterImage(null);
    };

    const handleDelete = (indexToDelete: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlToDelete = imageGallery[indexToDelete];
        if (urlToDelete === beforeImage) setBeforeImage(null);
        if (urlToDelete === afterImage) setAfterImage(null);
        removeImageFromGallery(indexToDelete);
    };

    const handleEdit = (indexToEdit: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlToEdit = imageGallery[indexToEdit];
        if (isVideo(urlToEdit)) return;

        openImageEditor(urlToEdit, (newUrl) => {
            replaceImageInGallery(indexToEdit, newUrl);
            if (urlToEdit === beforeImage) setBeforeImage(newUrl);
            if (urlToEdit === afterImage) setAfterImage(newUrl);
        });
    };

    const handleQuickView = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        openLightbox(index);
    };

    const isVideo = (url: string | null) => url?.startsWith('blob:');

    return ReactDOM.createPortal(
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="modal-overlay z-[60]"
                        aria-modal="true"
                        role="dialog"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content !max-w-7xl !h-[90vh] flex flex-row !p-0"
                        >
                            {/* Sidebar */}
                            <aside className="w-2/5 flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
                                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                    <h3 className="base-font font-bold text-2xl text-yellow-400">{t('beforeAfter_title')}</h3>
                                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto pr-2 -mr-4 before-after-sidebar-grid">
                                    {imageGallery.map((img, index) => {
                                        const isSelectedBefore = img === beforeImage;
                                        const isSelectedAfter = img === afterImage;
                                        const isSelected = isSelectedBefore || isSelectedAfter;
                                        
                                        return (
                                             <div 
                                                key={`${img.slice(-20)}-${index}`} 
                                                className="gallery-grid-item group relative"
                                                onClick={() => handleSelectImage(img)}
                                            >
                                                {isVideo(img) ? (
                                                    <video src={img} autoPlay loop muted playsInline className="w-full h-auto block" />
                                                ) : (
                                                    <img src={img} alt={`Gallery image ${index + 1}`} loading="lazy" />
                                                )}
                                                <div className={cn(
                                                    "absolute inset-0 transition-all duration-200 pointer-events-none",
                                                    isSelected ? (isSelectedBefore ? 'ring-4 ring-blue-500' : 'ring-4 ring-green-500') : 'bg-black/60 opacity-0 group-hover:opacity-100'
                                                )}>
                                                   {isSelected && (
                                                       <div className={cn(
                                                           "absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white/50",
                                                           isSelectedBefore ? 'bg-blue-500' : 'bg-green-500'
                                                        )}>
                                                           {isSelectedBefore ? '1' : '2'}
                                                       </div>
                                                   )}
                                                </div>
                                                <ImageThumbnailActions
                                                    isSelectionMode={false}
                                                    isVideo={isVideo(img)}
                                                    onQuickView={(e) => handleQuickView(index, e)}
                                                    onEdit={!isVideo(img) ? (e) => handleEdit(index, e) : undefined}
                                                    onDelete={(e) => handleDelete(index, e)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="pt-4 mt-auto border-t border-white/10 flex-shrink-0">
                                    <button onClick={clearSelections} className="btn btn-secondary w-full" disabled={!beforeImage && !afterImage}>{t('beforeAfter_clear')}</button>
                                </div>
                            </aside>

                            {/* Main Viewer */}
                            <main className="flex-1 flex items-center justify-center p-6 bg-neutral-800/30 relative">
                                {beforeImage && afterImage ? (
                                    <div className="comparison-container">
                                        {/* After Image (Bottom Layer) */}
                                        <div className="comparison-image-wrapper">
                                            <img src={afterImage} alt={t('beforeAfter_after')} className="comparison-image" loading="lazy" />
                                             <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">2: {t('beforeAfter_after')}</div>
                                        </div>
                                        {/* Before Image (Top Layer, Clipped) */}
                                        <div className="comparison-image-wrapper" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                                            <img src={beforeImage} alt={t('beforeAfter_before')} className="comparison-image" loading="lazy" />
                                            <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">1: {t('beforeAfter_before')}</div>
                                        </div>
                                        {/* Slider Handle */}
                                        <div className="comparison-slider-handle" style={{ left: `${sliderPosition}%` }} />
                                        {/* Range Input */}
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={sliderPosition}
                                            onChange={(e) => setSliderPosition(Number(e.target.value))}
                                            className="comparison-range-input"
                                            aria-label="Image comparison slider"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-center text-neutral-400">
                                        <h4 className="text-2xl font-bold">{beforeImage ? t('beforeAfter_selectOneMore') : t('beforeAfter_selectTwo')}</h4>
                                    </div>
                                )}
                            </main>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Lightbox images={imageGallery} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </>
    , document.body);
};

export default BeforeAfterModal;