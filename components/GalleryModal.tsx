/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useMemo, useState, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadAllImagesAsZip, ImageForZip, useLightbox, useAppControls, useImageEditor, combineImages } from './uiUtils';
import Lightbox from './Lightbox';
import { ImageThumbnail } from './ImageThumbnail';
import { GalleryToolbar } from './GalleryToolbar';
import { CloudUploadIcon } from './icons';

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, images }) => {
    const { 
        lightboxIndex: selectedImageIndex, 
        openLightbox, 
        closeLightbox, 
        navigateLightbox 
    } = useLightbox();

    const { t, addImagesToGallery, removeImageFromGallery, replaceImageInGallery } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isCombining, setIsCombining] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    useEffect(() => {
        if (!isOpen) {
            closeLightbox();
            setIsSelectionMode(false);
            setSelectedIndices([]);
        }
    }, [isOpen, closeLightbox]);

    const baseFilters = [
        { id: 'all', label: 'All' },
        { id: 'upload', label: 'Upload' },
        { id: 'outputs', label: 'Outputs' },
        { id: 'canvas', label: 'Canvas' },
        { id: 'image_editor', label: 'Image Editor' },
        { id: 'storyboard', label: 'Storyboard' },
        { id: 'extra', label: 'Extra Apps' },
    ];

    const availableSubfolders = useMemo(() => {
        const subfolders = new Set<string>();
        images.forEach(img => {
            const match = img.match(/\/([^/]+)\/([^/]+)\/[^/]+$/);
            if (match && match[2]) {
                subfolders.add(match[2]);
            }
        });
        return Array.from(subfolders).sort();
    }, [images]);

    const filterOptions = useMemo(() => {
        const dynamic = availableSubfolders
            .filter(sub => !baseFilters.some(f => f.id === sub))
            .map(sub => ({ id: sub, label: sub }));
        return [...baseFilters, ...dynamic];
    }, [availableSubfolders]);

    const filteredImages = useMemo(() => {
        if (activeFilter === 'all') return images;
        return images.filter(img => img.includes(`/gallery/${activeFilter}/`));
    }, [activeFilter, images]);

    const resolveOriginalIndex = (filteredIndex: number) => {
        const url = filteredImages[filteredIndex];
        return images.indexOf(url);
    };

    const handleDownloadAll = () => {
        const imagesToZip: ImageForZip[] = images.map((url, index) => ({
            url,
            filename: `aPix-gallery-image-${index + 1}`,
            folder: 'gallery',
            extension: url.startsWith('blob:') ? 'mp4' : undefined,
        }));
        downloadAllImagesAsZip(imagesToZip, 'aPix-gallery.zip');
    };
    
    const handleEditImage = (filteredIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const actualIndex = resolveOriginalIndex(filteredIndex);
        if (actualIndex === -1) return;
        const urlToEdit = images[actualIndex];
        if (!urlToEdit || urlToEdit.startsWith('blob:')) {
            alert(t('galleryModal_cannotEditVideo'));
            return;
        };

        openImageEditor(urlToEdit, (newUrl) => {
            replaceImageInGallery(actualIndex, newUrl);
        });
    };

    const handleDeleteImage = (filteredIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const actualIndex = resolveOriginalIndex(filteredIndex);
        if (actualIndex === -1) return;
        removeImageFromGallery(actualIndex);
    };

    const handleQuickView = (filteredIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const actualIndex = resolveOriginalIndex(filteredIndex);
        if (actualIndex === -1) return;
        openLightbox(actualIndex);
    };

    const handleToggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIndices([]);
    };
    
    const handleImageSelect = (index: number) => {
        const actualIndex = resolveOriginalIndex(index);
        if (actualIndex === -1) return;
        if (isSelectionMode) {
            setSelectedIndices(prev => 
                prev.includes(actualIndex) ? prev.filter(i => i !== actualIndex) : [...prev, actualIndex]
            );
        } else {
            openLightbox(actualIndex);
        }
    };
    
    const handleDeleteSelected = () => {
        if (selectedIndices.length === 0) return;
        
        // Sort descending to avoid index shifting issues while removing
        const sortedIndices = [...selectedIndices].sort((a, b) => b - a); 
        sortedIndices.forEach(index => {
            removeImageFromGallery(index);
        });

        setSelectedIndices([]);
        setIsSelectionMode(false);
    };

    const handleCombine = async (direction: 'horizontal' | 'vertical') => {
        if (selectedIndices.length < 2) return;
        setIsCombining(true);
        try {
            const itemsToCombine = selectedIndices.map(index => ({
                url: images[index],
                label: '' // No labels are used when combining from the main gallery.
            }));
            const resultUrl = await combineImages(itemsToCombine, {
                layout: direction,
                gap: 0,
                backgroundColor: '#FFFFFF',
                labels: { enabled: false }
            });
            addImagesToGallery([resultUrl], 'outputs');
            // Reset state after combining
            setSelectedIndices([]);
            setIsSelectionMode(false);
        } catch (err) {
            console.error("Failed to combine images:", err);
            alert(t('galleryModal_combineError', err instanceof Error ? err.message : "Lỗi không xác định."));
        } finally {
            setIsCombining(false);
        }
    };

    const processFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
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
        } catch (error) { console.error("Error reading files:", error); }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    };
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
        await processFiles(e.dataTransfer.files);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        await processFiles(e.target.files);
        // Reset input value to allow re-uploading the same file
        e.target.value = '';
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="modal-overlay" aria-modal="true" role="dialog" >
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="modal-content !max-w-4xl !h-[85vh] flex flex-col relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                                multiple
                                onChange={handleFileSelect}
                            />
                            <GalleryToolbar
                                isSelectionMode={isSelectionMode}
                                selectedCount={selectedIndices.length}
                                imageCount={filteredImages.length}
                                title={t('galleryModal_title')}
                                isCombining={isCombining}
                                onToggleSelectionMode={handleToggleSelectionMode}
                                onDeleteSelected={handleDeleteSelected}
                                onClose={onClose}
                                onUploadClick={handleUploadClick}
                                onDownloadAll={handleDownloadAll}
                                onCombineHorizontal={() => handleCombine('horizontal')}
                                onCombineVertical={() => handleCombine('vertical')}
                            />
                            <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-white/10">
                                {filterOptions.map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveFilter(filter.id)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                            activeFilter === filter.id
                                                ? 'bg-yellow-400 text-black'
                                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            {filteredImages.length > 0 ? (
                                <div className="gallery-grid">
                                    <AnimatePresence>
                                        {filteredImages.map((img, index) => {
                                            const originalIndex = resolveOriginalIndex(index);
                                            return (
                                                <ImageThumbnail
                                                    key={`${img.slice(-20)}-${index}`}
                                                    index={index}
                                                    imageUrl={img}
                                                    isSelectionMode={isSelectionMode}
                                                    isSelected={originalIndex !== -1 && selectedIndices.includes(originalIndex)}
                                                    onSelect={handleImageSelect}
                                                    onEdit={handleEditImage}
                                                    onDelete={handleDeleteImage}
                                                    onQuickView={handleQuickView}
                                                />
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="text-center text-neutral-400 py-8 flex-1 flex items-center justify-center">
                                    <p>{t('galleryModal_empty')}<br/>{t('galleryModal_empty_dragDrop')}</p>
                                </div>
                            )}
                             <AnimatePresence>
                                {isDraggingOver && (
                                    <motion.div className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1} />
                                        <p className="text-2xl font-bold text-yellow-400">{t('galleryModal_dropPrompt')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Lightbox images={images} selectedIndex={selectedImageIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </>
    );
};

export default GalleryModal;
