/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, useImageEditor, combineImages, useLightbox, useDebounce, downloadImage } from './uiUtils';
import { cn } from '../lib/utils';
import Lightbox from './Lightbox';
import { ImageThumbnailActions } from './ImageThumbnailActions';
import { CloudUploadIcon, LoadingSpinnerIcon } from './icons';

interface ImageLayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SelectedItem {
    url: string;
    label: string;
}

const FONT_FAMILIES = [ 'Be Vietnam Pro', 'Asimovian', 'Playwrite AU SA', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Comic Sans MS' ];

const ImageLayoutModal: React.FC<ImageLayoutModalProps> = ({ isOpen, onClose }) => {
    const { imageGallery, addImagesToGallery, removeImageFromGallery, replaceImageInGallery, t } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    
    const [layoutMode, setLayoutMode] = useState<'smart-grid' | 'horizontal' | 'vertical'>('smart-grid');
    const [gap, setGap] = useState(0);
    const [mainTitle, setMainTitle] = useState('');
    const [labelFontColor, setLabelFontColor] = useState('#000000');
    const [labelBgColor, setLabelBgColor] = useState('#FFFFFF');
    const [labelFontSize, setLabelFontSize] = useState(40);
    const [fontFamily, setFontFamily] = useState('Be Vietnam Pro');
    const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');


    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    
    const debouncedOptions = useDebounce({
        isOpen,
        selectedItems,
        layoutMode,
        gap,
        mainTitle,
        labelFontColor,
        labelBgColor,
        labelFontSize,
        fontFamily,
        backgroundColor
    }, 300);

    useEffect(() => {
        if (!debouncedOptions.isOpen || debouncedOptions.selectedItems.length === 0) {
            setPreviewUrl(null);
            return;
        }

        let isCancelled = false;
        const generatePreview = async () => {
            setIsPreviewLoading(true);
            try {
                 const hasLabels = debouncedOptions.mainTitle.trim() !== '' || debouncedOptions.selectedItems.some(item => item.label.trim() !== '');
                 const url = await combineImages(debouncedOptions.selectedItems, {
                    layout: debouncedOptions.layoutMode,
                    mainTitle: debouncedOptions.mainTitle.trim(),
                    gap: debouncedOptions.gap,
                    backgroundColor: debouncedOptions.backgroundColor,
                    labels: {
                        enabled: hasLabels,
                        fontColor: debouncedOptions.labelFontColor,
                        backgroundColor: debouncedOptions.labelBgColor,
                        baseFontSize: debouncedOptions.labelFontSize,
                        fontFamily: debouncedOptions.fontFamily,
                    }
                });
                if (!isCancelled) {
                    setPreviewUrl(url);
                }
            } catch (e) {
                console.error("Preview generation failed", e);
            } finally {
                if (!isCancelled) {
                    setIsPreviewLoading(false);
                }
            }
        };

        generatePreview();

        return () => { isCancelled = true; };
    }, [debouncedOptions]);


    const handleToggleSelect = (url: string) => {
        setSelectedItems(prev => 
            prev.some(item => item.url === url) 
                ? prev.filter(item => item.url !== url) 
                : [...prev, { url, label: '' }]
        );
    };

    const handleLabelChange = (index: number, newLabel: string) => {
        setSelectedItems(prev => {
            const newItems = [...prev];
            if (newItems[index]) {
                newItems[index].label = newLabel;
            }
            return newItems;
        });
    };
    
    const handleDeleteImage = (indexToDelete: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlToDelete = imageGallery[indexToDelete];
        setSelectedItems(prev => prev.filter(item => item.url !== urlToDelete));
        removeImageFromGallery(indexToDelete);
    };

    const handleEditImage = (indexToEdit: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlToEdit = imageGallery[indexToEdit];
        if (!urlToEdit || urlToEdit.startsWith('blob:')) {
            alert('Không thể chỉnh sửa video.');
            return;
        }

        openImageEditor(urlToEdit, (newUrl) => {
            replaceImageInGallery(indexToEdit, newUrl);
            setSelectedItems(prev => prev.map(item => item.url === urlToEdit ? { ...item, url: newUrl } : item));
        });
    };

    const handleQuickView = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        openLightbox(index);
    };

    const handleSwapColors = () => {
        const temp = labelFontColor;
        setLabelFontColor(labelBgColor);
        setLabelBgColor(temp);
    };

    const handleCombine = async () => {
        if (selectedItems.length < 1) return;
        setIsLoading(true);
        setError(null);
        try {
            const hasLabels = mainTitle.trim() !== '' || selectedItems.some(item => item.label.trim() !== '');

            const resultUrl = await combineImages(selectedItems, {
                layout: layoutMode,
                mainTitle: mainTitle.trim(),
                gap: gap,
                backgroundColor: backgroundColor,
                labels: {
                    enabled: hasLabels,
                    fontColor: labelFontColor,
                    backgroundColor: labelBgColor,
                    baseFontSize: labelFontSize,
                    fontFamily: fontFamily,
                }
            });
            addImagesToGallery([resultUrl], 'extra');
            downloadImage(resultUrl, `aPix-layout-${Date.now()}`);
        } catch (err) {
            console.error("Failed to combine images:", err);
            const errorMessage = err instanceof Error ? err.message : "Lỗi không xác định.";
            setError(`Lỗi: Không thể ghép ảnh. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        if (isLoading) return;
        onClose();
        setSelectedItems([]);
        setMainTitle('');
        setError(null);
        setPreviewUrl(null);
    };
    
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter(file => (file as File).type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const readImageAsDataURL = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read file.'));
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        try {
            const imageDataUrls = await Promise.all(imageFiles.map(readImageAsDataURL));
            addImagesToGallery(imageDataUrls, 'upload');
        } catch (error) {
            console.error("Error reading dropped files:", error);
        }
    }, [addImagesToGallery]);

    const layoutButtonClasses = "btn btn-secondary btn-sm !text-xs !py-1 !px-3 flex-1 rounded-md";

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="modal-overlay z-[60]"
                        aria-modal="true"
                        role="dialog"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content !max-w-7xl !h-[90vh] flex flex-row !p-0 relative"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {/* Sidebar */}
                            <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
                                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                    <h3 className="base-font font-bold text-2xl text-yellow-400">{t('imageLayout_title')}</h3>
                                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label={t('imageLayout_close')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                
                                <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-4">
                                    <div>
                                        <label className="block text-base font-medium text-neutral-300 mb-2">{t('imageLayout_mode')}</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={() => setLayoutMode('smart-grid')} className={cn(layoutButtonClasses, layoutMode === 'smart-grid' && '!bg-yellow-400 !text-black')}>{t('imageLayout_modeGrid')}</button>
                                            <button onClick={() => setLayoutMode('horizontal')} className={cn(layoutButtonClasses, layoutMode === 'horizontal' && '!bg-yellow-400 !text-black')}>{t('imageLayout_modeHorizontal')}</button>
                                            <button onClick={() => setLayoutMode('vertical')} className={cn(layoutButtonClasses, layoutMode === 'vertical' && '!bg-yellow-400 !text-black')}>{t('imageLayout_modeVertical')}</button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label htmlFor="layout-gap" className="block text-base font-medium text-neutral-300 mb-2">
                                                {t('imageLayout_gap', gap)}
                                            </label>
                                            <input
                                                id="layout-gap"
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={gap}
                                                onChange={(e) => setGap(Number(e.target.value))}
                                                className="slider-track"
                                            />
                                        </div>
                                        <div className="flex-shrink-0">
                                            <label htmlFor="bg-color" className="block text-base font-medium text-neutral-300 mb-2 text-center">Nền</label>
                                            <div className="relative w-10 h-10">
                                                <input type="color" id="bg-color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Chọn màu nền"/>
                                                <div className="w-full h-full rounded-full border-2 border-white/20 shadow-inner pointer-events-none" style={{ backgroundColor: backgroundColor }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-6 space-y-4">
                                        <h4 className="text-base font-medium text-neutral-200">{t('imageLayout_labels_title')}</h4>
                                        <div>
                                            <label htmlFor="main-title" className="block text-sm font-medium text-neutral-300 mb-2">{t('imageLayout_labels_mainTitle')}</label>
                                            <input type="text" id="main-title" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} className="form-input" placeholder={t('imageLayout_labels_mainTitlePlaceholder')}/>
                                        </div>
                                         <div>
                                            <label htmlFor="font-family" className="block text-sm font-medium text-neutral-300 mb-2">Phông chữ</label>
                                            <select id="font-family" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="form-input !p-2 !text-sm">
                                                {FONT_FAMILIES.map(font => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm font-medium text-neutral-300 whitespace-nowrap flex-shrink-0">
                                                {t('imageLayout_labels_colors')}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-10 h-10">
                                                    <input type="color" id="label-fontcolor" value={labelFontColor} onChange={(e) => setLabelFontColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title={t('imageLayout_labels_fontColor')} />
                                                    <div className="w-full h-full rounded-full border-2 border-white/20 shadow-inner pointer-events-none" style={{ backgroundColor: labelFontColor }}/>
                                                </div>
                                                <button type="button" onClick={handleSwapColors} className="p-2 rounded-full hover:bg-neutral-700 transition-colors" aria-label={t('imageLayout_labels_swap')} title={t('imageLayout_labels_swap')} >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /> </svg>
                                                </button>
                                                <div className="relative w-10 h-10">
                                                    <input type="color" id="label-bgcolor" value={labelBgColor} onChange={(e) => setLabelBgColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title={t('imageLayout_labels_bgColor')} />
                                                    <div className="w-full h-full rounded-full border-2 border-white/20 shadow-inner pointer-events-none" style={{ backgroundColor: labelBgColor }}/>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="label-fontsize" className="block text-sm font-medium text-neutral-300 mb-2">{t('imageLayout_labels_fontSize', labelFontSize)}</label>
                                            <input id="label-fontsize" type="range" min="10" max="100" step="1" value={labelFontSize} onChange={(e) => setLabelFontSize(Number(e.target.value))} className="slider-track" />
                                        </div>
                                        <p className="text-xs text-neutral-500">{t('imageLayout_labels_note')}</p>
                                        <ul className="space-y-3 pt-3 border-t border-white/10 max-h-60 overflow-y-auto">
                                            {selectedItems.map((item, index) => (
                                                <li key={item.url} className="flex items-center gap-3">
                                                    <img src={item.url} className="w-12 h-12 object-cover rounded-md flex-shrink-0" alt={`Selected thumbnail ${index + 1}`}/>
                                                    <input type="text" placeholder={t('imageLayout_labels_placeholder', index + 1)} value={item.label} onChange={(e) => handleLabelChange(index, e.target.value)} className="form-input" />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                
                                <div className="flex-shrink-0 pt-6 border-t border-white/10">
                                    {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                                    <button onClick={handleCombine} className="btn btn-primary w-full rounded-md" disabled={selectedItems.length < 1 || isLoading}>
                                     {isLoading ? t('imageLayout_submitLoading') : t('imageLayout_submit', selectedItems.length)}
                                   </button>
                                </div>
                            </aside>

                            {/* Main Content */}
                            <main className="flex-1 flex flex-col p-6 overflow-hidden">
                                 <div className="flex-grow flex items-center justify-center bg-neutral-800/50 rounded-lg relative overflow-hidden">
                                    {previewUrl ? <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Live preview"/> : <p className="text-neutral-500">Xem trước sẽ hiển thị ở đây</p>}
                                    {isPreviewLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><LoadingSpinnerIcon className="h-8 w-8 text-yellow-400"/></div>}
                                 </div>
                                 <div className="flex-shrink-0 pt-4 mt-4 border-t border-white/10 h-1/3 flex flex-col">
                                     <h3 className="base-font font-bold text-lg text-neutral-300 mb-2 flex-shrink-0">{t('imageLayout_galleryTitle')}</h3>
                                     {imageGallery.length > 0 ? (
                                        <div className="gallery-grid flex-grow">
                                            {imageGallery.map((img, index) => {
                                                const selectedIndex = selectedItems.findIndex(item => item.url === img);
                                                const isSelected = selectedIndex !== -1;
                                                const isVideo = img.startsWith('blob:');
                                                return (
                                                    <motion.div 
                                                        key={`${img.slice(-20)}-${index}`} 
                                                        className="gallery-grid-item group relative"
                                                        onClick={() => handleToggleSelect(img)}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: index * 0.03 }}
                                                    >
                                                        {isVideo ? (
                                                            <video src={img} autoPlay loop muted playsInline className="w-full h-auto block" />
                                                        ) : (
                                                            <img src={img} alt={`Gallery image ${index + 1}`} loading="lazy" />
                                                        )}
                                                        <div className={cn(
                                                            "absolute inset-0 transition-all duration-200 pointer-events-none",
                                                            isSelected ? 'bg-yellow-400/50 ring-4 ring-yellow-400' : 'bg-black/60 opacity-0 group-hover:opacity-100'
                                                        )}>
                                                        {isSelected && (
                                                            <div className="absolute top-2 left-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-sm border-2 border-white/50">
                                                                {selectedIndex + 1}
                                                            </div>
                                                        )}
                                                        </div>
                                                        <ImageThumbnailActions
                                                            isSelectionMode={false}
                                                            isVideo={isVideo}
                                                            onQuickView={(e) => handleQuickView(index, e)}
                                                            onEdit={!isVideo ? (e) => handleEditImage(index, e) : undefined}
                                                            onDelete={(e) => handleDeleteImage(index, e)}
                                                        />
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center text-neutral-400 flex-1 flex items-center justify-center">
                                            <p>{t('imageLayout_galleryEmpty')}</p>
                                        </div>
                                    )}
                                 </div>
                            </main>

                            <AnimatePresence>
                                {isDraggingOver && (
                                    <motion.div
                                        className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1} />
                                        <p className="text-2xl font-bold text-yellow-400">{t('imageLayout_dropPrompt')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Lightbox images={imageGallery} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </>
    );
};

export default ImageLayoutModal;
