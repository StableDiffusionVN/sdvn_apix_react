/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayerComposerState } from './LayerComposer/useLayerComposerState';
import { GalleryPicker, WebcamCaptureModal, useAppControls } from './uiUtils';
import { LayerComposerSidebar } from './LayerComposer/LayerComposerSidebar';
import { LayerComposerCanvas } from './LayerComposer/LayerComposerCanvas';
import { AIProcessLogger } from './LayerComposer/AIProcessLogger';
import { AIChatbot } from './LayerComposer/AIChatbot';
import { CloudUploadIcon } from './icons';

interface LayerComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHide: () => void;
}

// Wrapper component to conditionally render webcam button
const CustomStartScreen: React.FC<{ state: any }> = ({ state }) => {
    const { t, settings } = useAppControls();
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-900/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-yellow-400 base-font">{t('layerComposer_title')}</h3>
            <p className="text-neutral-400 text-center max-w-sm">Tạo canvas mới, tải lên ảnh hoặc kéo thả file .json để bắt đầu.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                <button onClick={state.handleCreateNew} className="btn btn-primary btn-sm">{t('imageEditor_createButton')}</button>
                <button onClick={() => state.setIsGalleryOpen(true)} className="btn btn-secondary btn-sm" disabled={state.imageGallery.length === 0}>{t('imageEditor_galleryButton')}</button>
                <button onClick={state.handleUploadClick} className="btn btn-secondary btn-sm">{t('imageEditor_uploadButton')}</button>
                {settings?.enableWebcam && (
                    <button onClick={() => state.setIsWebcamOpen(true)} className="btn btn-secondary btn-sm">{t('imageEditor_webcamButton')}</button>
                )}
            </div>
        </div>
    );
};

export const LayerComposerModal: React.FC<LayerComposerModalProps> = ({ isOpen, onClose, onHide }) => {
    const state = useLayerComposerState({ isOpen, onClose, onHide });

    return ReactDOM.createPortal(
        <>
            <motion.div
                className="modal-overlay z-[60]"
                aria-modal="true"
                role="dialog"
                initial={false}
                animate={isOpen ? "open" : "closed"}
                variants={{
                    open: { opacity: 1, pointerEvents: 'auto' },
                    closed: { opacity: 0, pointerEvents: 'none' },
                }}
                transition={{ duration: 0.2 }}
                onClick={onHide}
            >
                <motion.div
                    className="modal-content !max-w-[95vw] !w-[95vw] !h-[95vh] flex flex-row !p-0 relative"
                    onClick={(e) => e.stopPropagation()}
                    initial={false}
                    animate={isOpen ? "open" : "closed"}
                    variants={{
                        open: { opacity: 1, scale: 1, y: 0 },
                        closed: { opacity: 0, scale: 0.95, y: 20 },
                    }}
                    transition={{ duration: 0.2 }}
                >
                    {!state.canvasInitialized ? (
                        <div className="w-full h-full" onDragOver={state.handleStartScreenDragOver} onDragLeave={state.handleStartScreenDragLeave} onDrop={state.handleStartScreenDrop}>
                            <input
                                type="file"
                                ref={state.fileInputRef}
                                className="hidden"
                                accept="image/*,.json"
                                multiple
                                onChange={state.handleFileSelected}
                            />
                            <CustomStartScreen state={state} />
                            <AnimatePresence>
                                {state.isStartScreenDraggingOver && (
                                    <motion.div
                                        className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1} />
                                        <p className="text-2xl font-bold text-yellow-400">{state.t('layerComposer_startScreen_dropPrompt')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <>
                            <LayerComposerSidebar {...state} />
                            <LayerComposerCanvas {...state} />
                        </>
                    )}
                </motion.div>
                 <AnimatePresence>
                    {isOpen && state.isLogVisible && state.aiProcessLog.length > 0 && (
                        <AIProcessLogger log={state.aiProcessLog} onClose={() => state.setIsLogVisible(false)} t={state.t} />
                    )}
                </AnimatePresence>
                <AIChatbot
                    isOpen={state.isChatbotOpen}
                    onClose={state.handleCloseChatbot}
                    selectedLayers={state.selectedLayers}
                    captureLayer={state.captureLayer}
                />
            </motion.div>
            
            <GalleryPicker
                isOpen={state.isGalleryOpen}
                onClose={() => state.setIsGalleryOpen(false)}
                onSelect={state.handleAddImage}
                images={state.imageGallery}
            />
             <WebcamCaptureModal
                isOpen={state.isWebcamOpen}
                onClose={() => state.setIsWebcamOpen(false)}
                onCapture={state.handleAddImage}
            />
            <AnimatePresence>
                 {isOpen && state.isConfirmingClose && (
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
                            <h3 className="base-font font-bold text-2xl text-yellow-400">{state.t('confirmClose_title')}</h3>
                            <p className="text-neutral-300 my-2">{state.t('confirmClose_message')}</p>
                            <div className="flex justify-end items-center gap-4 mt-4">
                                <button onClick={() => state.setIsConfirmingClose(false)} className="btn btn-secondary btn-sm">{state.t('confirmClose_stay')}</button>
                                <button onClick={() => { state.handleCloseAndReset(); state.setIsConfirmingClose(false); }} className="btn btn-primary btn-sm">{state.t('confirmClose_close')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
             <AnimatePresence>
                 {isOpen && state.isConfirmingNew && (
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
                            <h3 className="base-font font-bold text-2xl text-yellow-400">{state.t('layerComposer_new_title')}</h3>
                            <p className="text-neutral-300 my-2">{state.t('layerComposer_new_message')}</p>
                            <div className="flex justify-end items-center gap-4 mt-4">
                                <button onClick={() => state.setIsConfirmingNew(false)} className="btn btn-secondary btn-sm">{state.t('common_cancel')}</button>
                                <button onClick={state.handleConfirmNew} className="btn btn-primary btn-sm !bg-red-500 hover:!bg-red-600">{state.t('layerComposer_new_confirm')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    , document.body);
};
