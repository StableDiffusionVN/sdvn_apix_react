
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ImageToEdit, useAppControls, handleFileUpload, GalleryPicker, WebcamCaptureModal } from './uiUtils';
import { ImageEditorToolbar } from './ImageEditor/ImageEditorToolbar';
import { ImageEditorControls } from './ImageEditor/ImageEditorControls';
import { ImageEditorCanvas } from './ImageEditor/ImageEditorCanvas';
import { useImageEditorState } from './ImageEditor/useImageEditorState';
import { TOOLTIPS } from './ImageEditor/ImageEditor.constants';
import { CloudUploadIcon } from './icons';

// --- Main Image Editor Modal Component ---
interface ImageEditorModalProps {
    imageToEdit: ImageToEdit | null;
    onClose: () => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageToEdit, onClose }) => {
    const { 
        imageGallery,
        t,
        settings,
    } = useAppControls();

    const canvasViewRef = useRef<HTMLDivElement>(null);
    const editorState = useImageEditorState(imageToEdit, canvasViewRef);
    const { 
        internalImageUrl, 
        isLoading, 
        isProcessing,
        setIsProcessing,
        isGalleryPickerOpen, 
        setIsGalleryPickerOpen,
        isWebcamModalOpen,
        setIsWebcamModalOpen,
        handleFile,
        handleFileSelected,
        handleGallerySelect,
        handleWebcamCapture,
        handleCreateBlank,
        getFinalImage,
        panX, panY, scale, zoomDisplay,
        history, historyIndex, handleUndo, handleRedo,
        canvasDimensions
    } = editorState;
    
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [activeTooltip, setActiveTooltip] = useState<{ id: string; rect: DOMRect } | null>(null);
    const tooltipTimeoutRef = useRef<number | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isConfirmingClose, setIsConfirmingClose] = useState(false);

    const isOpen = imageToEdit !== null;
    
    const handleRequestClose = useCallback(() => {
        if (internalImageUrl && historyIndex > 0) {
            setIsConfirmingClose(true);
        } else {
            onClose();
        }
    }, [internalImageUrl, historyIndex, onClose]);

    const handleSave = useCallback(async () => {
        if (!imageToEdit) return;
        setIsProcessing(true);
        try {
            const finalUrl = await getFinalImage();
            if (finalUrl) {
                imageToEdit.onSave(finalUrl);
                onClose();
            }
        } catch (err) {
            console.error("Failed to save image", err);
        } finally {
            setIsProcessing(false);
        }
    }, [getFinalImage, imageToEdit, onClose, setIsProcessing]);

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

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                handleFile(file);
            }
        }
    }, [handleFile]);
    
    // --- Tooltip Management ---
    const showTooltip = (id: string, e: React.MouseEvent) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        const target = e.currentTarget as HTMLElement;
        tooltipTimeoutRef.current = window.setTimeout(() => {
            if (document.body.contains(target)) {
                const rect = target.getBoundingClientRect();
                setActiveTooltip({ id, rect });
            }
        }, 1000);
    };

    const hideTooltip = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltip(null);
    };
    
    // --- Zoom and Pan Handlers ---
    const handleFitCanvas = useCallback(() => {
        if (canvasViewRef.current && editorState.previewCanvasRef.current) {
           const viewWidth = canvasViewRef.current.clientWidth;
           const viewHeight = canvasViewRef.current.clientHeight;
           const canvasWidth = editorState.previewCanvasRef.current.width;
           const canvasHeight = editorState.previewCanvasRef.current.height;
           if (viewWidth <= 0 || viewHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) return;
           
           const scaleX = viewWidth / canvasWidth;
           const scaleY = viewHeight / canvasHeight;
           const newZoom = Math.min(scaleX, scaleY) * 0.95;

           scale.set(newZoom);
           panX.set(0);
           panY.set(0);
       }
   }, [scale, panX, panY, canvasViewRef, editorState.previewCanvasRef]);
   
   // Auto-fit canvas when image loads or dimensions change
   useEffect(() => {
       if (canvasDimensions.width > 0 && canvasDimensions.height > 0) {
           // Use a small timeout to ensure the layout has updated
           setTimeout(handleFitCanvas, 10);
       }
   }, [canvasDimensions, handleFitCanvas]);

    const handleZoomChange = useCallback((direction: 'in' | 'out') => {
        const currentZoom = scale.get();
        const zoomFactor = 1.2;
        const newZoom = direction === 'in' ? currentZoom * zoomFactor : currentZoom / zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 5));
        
        const viewRect = canvasViewRef.current?.getBoundingClientRect();
        if (!viewRect) return;

        const viewCenter = { x: viewRect.width / 2, y: viewRect.height / 2 };
        const oldPan = { x: panX.get(), y: panY.get() };
        const scaleRatio = clampedZoom / currentZoom;
    
        const newPanX = viewCenter.x * (1 - scaleRatio) + oldPan.x * scaleRatio;
        const newPanY = viewCenter.y * (1 - scaleRatio) + oldPan.y * scaleRatio;

        scale.set(clampedZoom);
        panX.set(newPanX);
        panY.set(newPanY);
    }, [scale, panX, panY, canvasViewRef]);

    const isBusy = isLoading || isProcessing;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleRequestClose} className="modal-overlay z-[70]" aria-modal="true" role="dialog">
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="modal-content !max-w-[95vw] !w-[95vw] !h-[95vh] image-editor-modal-content relative" tabIndex={-1}>
                        {!internalImageUrl ? (
                             <>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileSelected(e)} onClick={(e) => ((e.target as HTMLInputElement).value = '')} />
                                <div
                                    className="w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-900/50 rounded-lg border-2 border-dashed border-neutral-700 p-8 relative"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <h3 className="text-2xl font-bold text-yellow-400 base-font">{t('imageEditor_startTitle')}</h3>
                                    <p className="text-neutral-400 text-center max-w-sm">{t('imageEditor_startSubtitle')}</p>
                                    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                                        <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">{t('imageEditor_uploadButton')}</button>
                                        <button onClick={() => setIsGalleryPickerOpen(true)} className="btn btn-secondary btn-sm" disabled={imageGallery.length === 0}>{t('imageEditor_galleryButton')}</button>
                                        {settings?.enableWebcam && (
                                            <button onClick={() => setIsWebcamModalOpen(true)} className="btn btn-secondary btn-sm">{t('imageEditor_webcamButton')}</button>
                                        )}
                                        <button onClick={handleCreateBlank} className="btn btn-secondary btn-sm">{t('imageEditor_createButton')}</button>
                                    </div>
                                    <AnimatePresence>
                                        {isDraggingOver && (
                                            <motion.div
                                                className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1} />
                                                <p className="text-2xl font-bold text-yellow-400">{t('imageEditor_dropPrompt')}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <GalleryPicker isOpen={isGalleryPickerOpen} onClose={() => setIsGalleryPickerOpen(false)} onSelect={handleGallerySelect} images={imageGallery} />
                                <WebcamCaptureModal
                                    isOpen={isWebcamModalOpen}
                                    onClose={() => setIsWebcamModalOpen(false)}
                                    onCapture={handleWebcamCapture}
                                />
                            </>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-4 w-full h-full overflow-hidden">
                                {/* Column 1: Toolbar */}
                                <ImageEditorToolbar {...editorState} showTooltip={showTooltip} hideTooltip={hideTooltip} />

                                {/* Column 2: Preview Canvas */}
                                <div className="flex-1 flex items-center justify-center min-h-0 min-w-0 relative">
                                    <ImageEditorCanvas
                                        {...editorState}
                                        isLoading={isLoading}
                                        isProcessing={isProcessing}
                                        canvasViewRef={canvasViewRef}
                                        onZoomIn={() => handleZoomChange('in')}
                                        onZoomOut={() => handleZoomChange('out')}
                                        onFit={handleFitCanvas}
                                        canUndo={historyIndex > 0}
                                        canRedo={historyIndex < history.length - 1}
                                    />
                                </div>

                                {/* Column 3: Controls and Actions */}
                                <div className="flex flex-col flex-shrink-0 md:w-80">
                                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                        <h3 className="base-font font-bold text-2xl text-yellow-400">Image Editor</h3>
                                        <button onClick={() => editorState.resetAll(true)} className="btn btn-secondary btn-sm">Reset All</button>
                                    </div>
                                    <ImageEditorControls {...editorState} />
                                    <div className="flex justify-end items-center gap-2 mt-auto pt-4 border-t border-white/10 flex-shrink-0">
                                        <button onClick={handleRequestClose} className="btn btn-secondary btn-sm">Cancel</button>
                                        <button onClick={editorState.handleApplyAllAdjustments} className="btn btn-secondary btn-sm" disabled={isBusy}>{isProcessing ? 'Applying...' : 'Apply'}</button>
                                        <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isBusy}>{isBusy ? 'Saving...' : 'Save'}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <AnimatePresence>
                            {activeTooltip && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute z-10 p-2 text-xs text-center text-white bg-neutral-800 border border-neutral-600 rounded-md shadow-lg w-48"
                                    style={{
                                        left: activeTooltip.rect.right + 12, // Position to the right of the button
                                        top: activeTooltip.rect.top + activeTooltip.rect.height / 2,
                                        transform: 'translateY(-50%)',
                                    }}
                                >
                                    <div className="font-bold text-yellow-400">{TOOLTIPS[activeTooltip.id as keyof typeof TOOLTIPS].name}</div>
                                    <div>{TOOLTIPS[activeTooltip.id as keyof typeof TOOLTIPS].description}</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
            <AnimatePresence>
                 {isOpen && isConfirmingClose && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-overlay z-[80]"
                        aria-modal="true" role="dialog"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content !max-w-md"
                        >
                            <h3 className="base-font font-bold text-2xl text-yellow-400">{t('confirmClose_title')}</h3>
                            <p className="text-neutral-300 my-2">{t('confirmClose_message')}</p>
                            <div className="flex justify-end items-center gap-4 mt-4">
                                <button onClick={() => setIsConfirmingClose(false)} className="btn btn-secondary btn-sm">{t('confirmClose_stay')}</button>
                                <button onClick={() => { onClose(); setIsConfirmingClose(false); }} className="btn btn-primary btn-sm">{t('confirmClose_close')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
};
