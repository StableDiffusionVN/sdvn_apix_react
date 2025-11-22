/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, useImageEditor, combineImages, useLightbox, useDebounce, downloadImage } from './uiUtils';
import { ImageThumbnailActions } from './ImageThumbnailActions';
import { cn } from '../lib/utils';
import Lightbox from './Lightbox';
import { 
    CloudUploadIcon, 
    PlacementTopLeftIcon,
    PlacementTopRightIcon,
    PlacementBottomLeftIcon,
    PlacementBottomRightIcon,
    DirectionHorizontalIcon,
    DirectionVerticalIcon,
    LoadingSpinnerIcon
} from './icons';

interface AppCoverCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SelectedItem {
    url: string;
    label: string;
}

const COVER_ASPECT_RATIOS = ['Giữ nguyên', '1:1', '2:3', '3:2', '5:4', '4:5', '2:1', '1:2', '16:9', '9:16'];

const loadImg = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url.substring(0, 50)}...`));
    img.src = url;
});

type Placement = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
type Direction = 'horizontal' | 'vertical';

const createCoverLayout = async (
    outputUrl: string,
    inputUrls: string[],
    aspectRatioStr: string,
    placement: Placement,
    direction: Direction,
    sizePercent: number,
    overlapPercent: number,
    inputAspectRatioStr: string
): Promise<string> => {
    const outputImg = await loadImg(outputUrl);
    const inputImgs = await Promise.all(inputUrls.map(loadImg));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    
    const getRatioValue = (ratioStr: string): number => {
        const parts = ratioStr.split(':');
        if (parts.length === 2) {
            const [w, h] = parts.map(Number);
            if (!isNaN(w) && !isNaN(h) && h > 0) return w / h;
        }
        return 16 / 9;
    };
    
    const ratio = aspectRatioStr === 'Giữ nguyên' && outputImg.naturalHeight > 0
        ? outputImg.naturalWidth / outputImg.naturalHeight
        : getRatioValue(aspectRatioStr);

    canvas.width = 1920;
    canvas.height = Math.round(canvas.width / ratio);
    
    const canvasAspect = canvas.width / canvas.height;
    const imgAspect = outputImg.naturalWidth / outputImg.naturalHeight;
    let sx, sy, sWidth, sHeight;

    if (imgAspect > canvasAspect) {
        sHeight = outputImg.naturalHeight;
        sWidth = sHeight * canvasAspect;
        sx = (outputImg.naturalWidth - sWidth) / 2;
        sy = 0;
    } else {
        sWidth = outputImg.naturalWidth;
        sHeight = sWidth / canvasAspect;
        sx = 0;
        sy = (outputImg.naturalHeight - sHeight) / 2;
    }
    ctx.drawImage(outputImg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

    const inputCount = inputImgs.length;
    if (inputCount > 0) {
        const getInputRatioValue = (ratioStr: string): number => {
            const parts = ratioStr.split(':');
            if (parts.length === 2) {
                const [w, h] = parts.map(Number);
                if (!isNaN(w) && !isNaN(h) && h > 0) return w / h;
            }
            return 1; // Default to 1:1 if invalid
        };
        const inputTargetRatio = getInputRatioValue(inputAspectRatioStr);

        const baseWidth = Math.min(canvas.width, canvas.height) * (sizePercent / 100);
        const baseHeight = baseWidth / inputTargetRatio;
        const borderSize = baseWidth * 0.05;
        const margin = Math.min(canvas.width, canvas.height) * 0.05;
        
        const horizontalOverlap = baseWidth * (overlapPercent / 100);
        const verticalOverlap = baseHeight * (overlapPercent / 100);

        const totalWidth = direction === 'horizontal' ? baseWidth + (inputCount - 1) * (baseWidth - horizontalOverlap) : baseWidth;
        const totalHeight = direction === 'vertical' ? baseHeight + (inputCount - 1) * (baseHeight - verticalOverlap) : baseHeight;
        
        let startX: number, startY: number;

        if (placement.includes('bottom')) {
            startY = canvas.height - margin - (direction === 'vertical' ? totalHeight : baseHeight);
        } else { // top
            startY = margin;
        }

        if (placement.includes('right')) {
            startX = canvas.width - margin - (direction === 'horizontal' ? totalWidth : baseWidth);
        } else { // left
            startX = margin;
        }

        const positions: {x: number, y: number}[] = [];
        for (let i = 0; i < inputCount; i++) {
            if (direction === 'horizontal') {
                positions.push({ x: startX + i * (baseWidth - horizontalOverlap), y: startY });
            } else {
                positions.push({ x: startX, y: startY + i * (baseHeight - verticalOverlap) });
            }
        }

        inputImgs.forEach((img, index) => {
            if (index >= positions.length) return;
            const { x, y } = positions[index];

            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
            
            ctx.fillRect(x, y, baseWidth, baseHeight);
            ctx.shadowColor = 'transparent';

            const imgRatio = img.naturalWidth / img.naturalHeight;
            let sx_in = 0, sy_in = 0, sWidth_in = img.naturalWidth, sHeight_in = img.naturalHeight;

            if (imgRatio > inputTargetRatio) {
                sWidth_in = img.naturalHeight * inputTargetRatio;
                sx_in = (img.naturalWidth - sWidth_in) / 2;
            } else {
                sHeight_in = img.naturalWidth / inputTargetRatio;
                sy_in = (img.naturalHeight - sHeight_in) / 2;
            }
            
            const boxWidth = baseWidth - borderSize * 2;
            const boxHeight = baseHeight - borderSize * 2;
            
            ctx.drawImage(img, sx_in, sy_in, sWidth_in, sHeight_in, x + borderSize, y + borderSize, boxWidth, boxHeight);
        });
    }
    
    return canvas.toDataURL('image/jpeg', 0.9);
};


const AppCoverCreatorModal: React.FC<AppCoverCreatorModalProps> = ({ isOpen, onClose }) => {
    const { imageGallery, addImagesToGallery, removeImageFromGallery, replaceImageInGallery, t } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [inputImages, setInputImages] = useState<string[]>([]);
    const [aspectRatio, setAspectRatio] = useState('Giữ nguyên');
    const [inputPlacement, setInputPlacement] = useState<Placement>('bottom-right');
    const [inputDirection, setInputDirection] = useState<Direction>('horizontal');
    const [inputSize, setInputSize] = useState(30);
    const [inputOverlap, setInputOverlap] = useState(30);
    const [inputAspectRatio, setInputAspectRatio] = useState('1:1');


    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isDraggingOverGallery, setIsDraggingOverGallery] = useState(false);
    const [isDraggingOverOutput, setIsDraggingOverOutput] = useState(false);
    const [isDraggingOverInputs, setIsDraggingOverInputs] = useState(false);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const debouncedOptions = useDebounce({ isOpen, outputImage, inputImages, aspectRatio, inputPlacement, inputDirection, inputSize, inputOverlap, inputAspectRatio }, 300);

    useEffect(() => {
        if (!debouncedOptions.isOpen || !debouncedOptions.outputImage) {
            setPreviewUrl(null);
            return;
        }

        let isCancelled = false;
        const generatePreview = async () => {
            setIsPreviewLoading(true);
            try {
                const url = await createCoverLayout(
                    debouncedOptions.outputImage!,
                    debouncedOptions.inputImages,
                    debouncedOptions.aspectRatio,
                    debouncedOptions.inputPlacement,
                    debouncedOptions.inputDirection,
                    debouncedOptions.inputSize,
                    debouncedOptions.inputOverlap,
                    debouncedOptions.inputAspectRatio
                );
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


    useEffect(() => {
        if (!isOpen) {
            clearSelections();
            closeLightbox();
        }
    }, [isOpen, closeLightbox]);

    const handleSelectImage = (url: string) => {
        if (url === outputImage) { setOutputImage(null); return; }
        if (inputImages.includes(url)) { setInputImages(prev => prev.filter(img => img !== url)); return; }
        if (!outputImage) { setOutputImage(url); } 
        else if (inputImages.length < 4) { setInputImages(prev => [...prev, url]); }
    };
    
    const clearSelections = () => {
        setOutputImage(null);
        setInputImages([]);
    };

    const isVideo = (url: string | null) => url?.startsWith('blob:');

    const handleCombine = async () => {
        if (!outputImage) return;
        setIsLoading(true);
        setError(null);
        try {
            const resultUrl = await createCoverLayout(outputImage, inputImages, aspectRatio, inputPlacement, inputDirection, inputSize, inputOverlap, inputAspectRatio);
            addImagesToGallery([resultUrl], 'extra');
            downloadImage(resultUrl, `aPix-cover-${Date.now()}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error.";
            setError(t('appCover_error', errorMessage));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteImage = (indexToDelete: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlToDelete = imageGallery[indexToDelete];
        if (urlToDelete === outputImage) setOutputImage(null);
        setInputImages(prev => prev.filter(img => img !== urlToDelete));
        removeImageFromGallery(indexToDelete);
    };

    const handleEditImage = (indexToEdit: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlToEdit = imageGallery[indexToEdit];
        if (isVideo(urlToEdit)) {
            alert(t('galleryModal_cannotEditVideo'));
            return;
        }

        openImageEditor(urlToEdit, (newUrl) => {
            replaceImageInGallery(indexToEdit, newUrl);
            if (urlToEdit === outputImage) setOutputImage(newUrl);
            setInputImages(prev => prev.map(img => img === urlToEdit ? newUrl : img));
        });
    };

    const handleQuickView = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        openLightbox(index);
    };

    const renderSelectionBadge = (url: string) => {
        if (url === outputImage) return <div className="absolute top-1 left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white/50">1</div>;
        const inputIndex = inputImages.indexOf(url);
        if (inputIndex !== -1) return <div className="absolute top-1 left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white/50">{inputIndex + 2}</div>;
        return null;
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, url: string) => { e.dataTransfer.setData('application/apix-image-url', url); e.dataTransfer.effectAllowed = 'copy'; };
    const handleOutputDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); if (e.dataTransfer.types.includes('application/apix-image-url')) setIsDraggingOverOutput(true); };
    const handleOutputDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOverOutput(false); const url = e.dataTransfer.getData('application/apix-image-url'); if (url && !isVideo(url)) { if(inputImages.includes(url)) setInputImages(prev => prev.filter(img => img !== url)); setOutputImage(url); } };
    const handleInputsDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); if (e.dataTransfer.types.includes('application/apix-image-url')) setIsDraggingOverInputs(true); };
    const handleInputsDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOverInputs(false); const url = e.dataTransfer.getData('application/apix-image-url'); if (url && !isVideo(url) && inputImages.length < 4 && !inputImages.includes(url)) { if(url === outputImage) setOutputImage(null); setInputImages(prev => [...prev, url]); } };

    const processFiles = useCallback(async (files: FileList) => {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;
        const readImageAsDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read file.')); reader.onerror = reject; reader.readAsDataURL(file); });
        try { const imageDataUrls = await Promise.all(imageFiles.map(readImageAsDataURL)); addImagesToGallery(imageDataUrls, 'upload'); } catch (error) { console.error("Error reading dropped files:", error); }
    }, [addImagesToGallery]);

    const handleGalleryDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes('Files')) setIsDraggingOverGallery(true); };
    const handleGalleryDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverGallery(false); };
    const handleGalleryDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverGallery(false); processFiles(e.dataTransfer.files); };

    const layoutButtonClasses = "btn btn-secondary btn-sm !text-xs !py-1 !px-3 flex-1 rounded-md";

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
                            className="modal-content !max-w-7xl !h-[90vh] flex flex-row !p-0 relative"
                        >
                            {/* Sidebar */}
                            <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
                                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                    <h3 className="base-font font-bold text-2xl text-yellow-400">{t('appCover_title')}</h3>
                                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label={t('appCover_close')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                                <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-4">
                                    <div className="border-b border-white/10 pb-6 space-y-4">
                                        <h4 className="text-base font-medium text-neutral-200">Tuỳ chỉnh bố cục</h4>
                                        <div><label htmlFor="cover-aspect-ratio" className="block text-sm font-medium text-neutral-300 mb-2">{t('appCover_aspectRatio')}</label><select id="cover-aspect-ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="form-input !p-2">{COVER_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}</select></div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-300 mb-2">Tỉ lệ ảnh Input</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {(['1:1', '4:5', '2:3', '3:2', '5:4'] as const).map(ratio => (
                                                    <button
                                                        key={ratio}
                                                        onClick={() => setInputAspectRatio(ratio)}
                                                        className={cn(layoutButtonClasses, inputAspectRatio === ratio && '!bg-yellow-400 !text-black')}
                                                    >
                                                        {ratio}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div><label className="block text-sm font-medium text-neutral-300 mb-2">Vị trí</label><div className="grid grid-cols-4 gap-2">{ (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as Placement[]).map(p => { const Icon = { 'top-left': PlacementTopLeftIcon, 'top-right': PlacementTopRightIcon, 'bottom-left': PlacementBottomLeftIcon, 'bottom-right': PlacementBottomRightIcon }[p]; return <button key={p} onClick={() => setInputPlacement(p)} className={cn(layoutButtonClasses, inputPlacement === p && '!bg-yellow-400 !text-black')}><Icon className="h-5 w-5"/></button> }) }</div></div>
                                        <div><label className="block text-sm font-medium text-neutral-300 mb-2">Hướng xếp</label><div className="grid grid-cols-2 gap-2">{ (['horizontal', 'vertical'] as Direction[]).map(d => { const Icon = { 'horizontal': DirectionHorizontalIcon, 'vertical': DirectionVerticalIcon }[d]; return <button key={d} onClick={() => setInputDirection(d)} className={cn(layoutButtonClasses, inputDirection === d && '!bg-yellow-400 !text-black')}><Icon className="h-5 w-5"/></button> }) }</div></div>
                                        <div><label htmlFor="input-size" className="block text-sm font-medium text-neutral-300 mb-2">Kích thước ({inputSize}%)</label><input id="input-size" type="range" min="10" max="60" step="1" value={inputSize} onChange={(e) => setInputSize(Number(e.target.value))} className="slider-track"/></div>
                                        <div><label htmlFor="input-overlap" className="block text-sm font-medium text-neutral-300 mb-2">Khoảng cách giữa xếp cách ảnh ({inputOverlap}%)</label><input id="input-overlap" type="range" min="-50" max="80" step="1" value={inputOverlap} onChange={(e) => setInputOverlap(Number(e.target.value))} className="slider-track"/></div>
                                    </div>

                                    <div onDragOver={handleOutputDragOver} onDragLeave={() => setIsDraggingOverOutput(false)} onDrop={handleOutputDrop}>
                                        <label className="block text-base font-medium text-neutral-300 mb-2">{t('appCover_output')}</label>
                                        <div className={cn("h-32 bg-neutral-800 rounded-md flex items-center justify-center transition-all", isDraggingOverOutput && "ring-4 ring-blue-500 ring-inset")}>
                                            {outputImage ? <img src={outputImage} className="w-full h-full object-contain rounded-md" alt="Output preview"/> : <span className="text-sm text-neutral-500">{t('appCover_selectOutput')}</span>}
                                        </div>
                                    </div>
                                    <div onDragOver={handleInputsDragOver} onDragLeave={() => setIsDraggingOverInputs(false)} onDrop={handleInputsDrop}>
                                        <label className="block text-base font-medium text-neutral-300 mb-2">{t('appCover_inputs')} ({inputImages.length}/4)</label>
                                        <div className={cn("flex gap-2 transition-all p-1", isDraggingOverInputs && "ring-4 ring-green-500 ring-inset rounded-md")}>
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className="h-20 w-1/4 bg-neutral-800 rounded-md flex items-center justify-center relative overflow-hidden">
                                                    {inputImages[i] ? (
                                                        <img src={inputImages[i]} className="w-full h-full object-cover" alt={`Input ${i+1} preview`}/>
                                                    ) : (
                                                        i === 0 && <span className="text-xs text-neutral-500 text-center px-1">{t('appCover_selectInputs')}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 pt-6 border-t border-white/10">
                                    {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleCombine} className="btn btn-primary btn-sm flex-grow" disabled={!outputImage || isLoading}>{isLoading ? t('appCover_generating') : t('appCover_generate')}</button>
                                        <button onClick={clearSelections} className="btn btn-secondary btn-sm flex-grow" disabled={isLoading}>{t('appCover_clear')}</button>
                                    </div>
                                </div>
                            </aside>

                            <main className="flex-1 flex flex-col p-6 overflow-hidden" onDragOver={handleGalleryDragOver} onDragLeave={handleGalleryDragLeave} onDrop={handleGalleryDrop}>
                                 <div className="flex-grow flex items-center justify-center bg-neutral-800/50 rounded-lg relative overflow-hidden">
                                    {previewUrl ? <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Live preview"/> : <p className="text-neutral-500">Xem trước sẽ hiển thị ở đây</p>}
                                    {isPreviewLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><LoadingSpinnerIcon className="h-8 w-8 text-yellow-400"/></div>}
                                 </div>
                                 <div className="flex-shrink-0 pt-4 mt-4 border-t border-white/10 h-1/3 flex flex-col">
                                     <h3 className="base-font font-bold text-lg text-neutral-300 mb-2 flex-shrink-0">Chọn ảnh từ thư viện (Thứ tự chọn = thứ tự ghép)</h3>
                                     {imageGallery.length > 0 ? (
                                        <div className="gallery-grid flex-grow">
                                            {imageGallery.map((img, index) => {
                                                const isSelected = img === outputImage || inputImages.includes(img);
                                                return (
                                                    <div
                                                        key={`${img.slice(-20)}-${index}`}
                                                        className="gallery-grid-item group relative"
                                                        onClick={() => handleSelectImage(img)}
                                                        draggable={!isVideo(img)}
                                                        onDragStart={(e) => !isVideo(img) && handleDragStart(e, img)}
                                                    >
                                                        {isVideo(img) ? (
                                                            <video src={img} autoPlay loop muted playsInline className="w-full h-auto block" />
                                                        ) : (
                                                            <img src={img} alt={`Gallery image ${index + 1}`} loading="lazy" className="w-full h-auto block" />
                                                        )}
                                                        <div className={cn("absolute inset-0 transition-all duration-200 pointer-events-none", isSelected ? '' : 'bg-black/60 opacity-0 group-hover:opacity-100' )}>{renderSelectionBadge(img)}</div>
                                                        <ImageThumbnailActions
                                                            isSelectionMode={false}
                                                            isVideo={isVideo(img)}
                                                            onQuickView={(e) => handleQuickView(index, e)}
                                                            onEdit={!isVideo(img) ? (e) => handleEditImage(index, e) : undefined}
                                                            onDelete={(e) => handleDeleteImage(index, e)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : ( <div className="text-center text-neutral-400 flex-1 flex items-center justify-center"><p>Thư viện trống.</p></div> )}
                                </div>
                                <AnimatePresence>
                                    {isDraggingOverGallery && ( <motion.div className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none m-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}> <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1} /> <p className="text-2xl font-bold text-yellow-400">Thả ảnh vào đây</p> </motion.div> )}
                                </AnimatePresence>
                            </main>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Lightbox images={imageGallery} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </>
    , document.body);
};

export default AppCoverCreatorModal;
