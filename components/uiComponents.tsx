/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import { useAppControls, useImageEditor } from './uiContexts';
import { useLightbox } from './uiHooks';
import { ImageThumbnail } from './ImageThumbnail';
import { GalleryToolbar } from './GalleryToolbar';
import { ImageThumbnailActions } from './ImageThumbnailActions';
import { combineImages, downloadJson } from './uiFileUtilities';
import Lightbox from './Lightbox';
import { AvatarCreatorState, BabyPhotoCreatorState, ViewState } from './uiTypes';
export * from './SearchableSelect';

/**
 * Renders a title with optional smart wrapping to keep a specified number of last words together.
 * This prevents orphaned words on a new line.
 * @param title The title string.
 * @param enabled A boolean to enable/disable the smart wrapping logic.
 * @param wordsToKeep The number of words to keep on the same line at the end.
 * @returns A React.ReactNode element for the title.
 */
export const renderSmartlyWrappedTitle = (title: string, enabled: boolean, wordsToKeep: number): React.ReactNode => {
    const numWordsToKeep = (typeof wordsToKeep === 'number' && wordsToKeep > 0) ? wordsToKeep : 2;

    if (!enabled) {
        return title;
    }

    const words = title.split(' ');
    if (words.length > numWordsToKeep) {
        const partToKeepTogether = words.splice(-numWordsToKeep).join(' ');
        const firstPart = words.join(' ');
        return (
            <>
                {firstPart}{' '}
                <span className="whitespace-nowrap">{partToKeepTogether}</span>
            </>
        );
    }
    
    return title;
};

// --- Reusable Modal Component ---
interface RegenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmImage: (prompt: string) => void;
    onConfirmVideo?: (prompt: string) => void;
    itemToModify: string | null;
    title?: string;
    description?: string;
    placeholder?: string;
}

export const RegenerationModal: React.FC<RegenerationModalProps> = ({
    isOpen,
    onClose,
    onConfirmImage,
    onConfirmVideo,
    itemToModify,
    title = "Tinh chỉnh hoặc Tạo video",
    description = "Thêm yêu cầu để tinh chỉnh ảnh, hoặc dùng nó để tạo video cho",
    placeholder = "Ví dụ: tông màu ấm, phong cách phim xưa..."
}) => {
    const [customPrompt, setCustomPrompt] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCustomPrompt('');
        }
    }, [isOpen]);

    const handleConfirmImage = () => {
        onConfirmImage(customPrompt);
    };

    const handleConfirmVideo = () => {
        if (onConfirmVideo) {
            onConfirmVideo(customPrompt);
        }
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && itemToModify && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay z-[70]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content"
                    >
                        <h3 className="base-font font-bold text-2xl text-yellow-400">{title}</h3>
                        <p className="text-neutral-300">
                            {description} <span className="font-bold text-white">"{itemToModify}"</span>.
                        </p>
                        <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder={placeholder}
                            className="modal-textarea"
                            rows={3}
                            aria-label="Yêu cầu chỉnh sửa bổ sung"
                        />
                        <div className="flex justify-end items-center gap-4 mt-2">
                            <button onClick={onClose} className="btn btn-secondary btn-sm">
                                Hủy
                            </button>
                            {onConfirmVideo && (
                                <button onClick={handleConfirmVideo} className="btn btn-secondary btn-sm">
                                    Tạo video
                                </button>
                            )}
                            <button onClick={handleConfirmImage} className="btn btn-primary btn-sm">
                                Tạo lại ảnh
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

interface PromptRegenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (modificationPrompt: string) => void;
    itemToModify: string | null;
    title?: string;
    description?: string;
    placeholder?: string;
}

export const PromptRegenerationModal: React.FC<PromptRegenerationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemToModify,
    title = "Tạo lại Prompt",
    description = "Nhập yêu cầu để AI viết lại prompt cho",
    placeholder = "Ví dụ: thêm chi tiết về cảm xúc nhân vật, mô tả bối cảnh ban đêm..."
}) => {
    const [modificationPrompt, setModificationPrompt] = useState('');

    useEffect(() => {
        if (isOpen) {
            setModificationPrompt('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm(modificationPrompt);
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && itemToModify && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay z-[70]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content"
                    >
                        <h3 className="base-font font-bold text-2xl text-yellow-400">{title}</h3>
                        <p className="text-neutral-300">
                            {description} <span className="font-bold text-white">"{itemToModify}"</span>.
                        </p>
                        <textarea
                            value={modificationPrompt}
                            onChange={(e) => setModificationPrompt(e.target.value)}
                            placeholder={placeholder}
                            className="modal-textarea"
                            rows={3}
                            aria-label="Yêu cầu chỉnh sửa prompt"
                        />
                        <div className="flex justify-end items-center gap-4 mt-2">
                            <button onClick={onClose} className="btn btn-secondary btn-sm">
                                Hủy
                            </button>
                            <button onClick={handleConfirm} className="btn btn-primary btn-sm">
                                Tạo lại Prompt
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// --- Reusable UI Components ---

interface AppScreenHeaderProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
}

export const AppScreenHeader: React.FC<AppScreenHeaderProps> = ({ mainTitle, subtitle, useSmartTitleWrapping, smartTitleWrapWords }) => (
     <motion.div
        className="text-center mb-8"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
    >
        <h1 className="text-5xl/[1.3] md:text-7xl/[1.3] title-font font-bold text-white [text-shadow:1px_1px_3px_rgba(0,0,0,0.4)] tracking-wider">
            {renderSmartlyWrappedTitle(mainTitle, useSmartTitleWrapping, smartTitleWrapWords)}
        </h1>
        <p className="sub-title-font font-bold text-neutral-200 mt-2 text-xl tracking-wide">{subtitle}</p>
    </motion.div>
);

interface ImageUploaderProps {
    onImageChange: (imageDataUrl: string) => void;
    uploaderCaption: string;
    uploaderDescription: string;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, uploaderCaption, uploaderDescription, placeholderType = 'person' }) => {
    return (
        <div className="flex flex-col items-center justify-center w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                 <ActionablePolaroidCard
                    type="uploader"
                    caption={uploaderCaption}
                    status="done"
                    mediaUrl={undefined}
                    placeholderType={placeholderType}
                    onImageChange={onImageChange}
                />
            </motion.div>
            <p className="mt-8 base-font font-bold text-neutral-300 text-center max-w-lg text-lg">
                {uploaderDescription}
            </p>
        </div>
    );
};


interface ResultsViewProps {
    stage: 'generating' | 'results';
    originalImage?: string | null;
    onOriginalClick?: () => void;
    inputImages?: { url: string; caption: string; onClick: () => void; }[];
    children: React.ReactNode;
    actions: React.ReactNode;
    isMobile?: boolean;
    error?: string | null;
    hasPartialError?: boolean;
}


export const ResultsView: React.FC<ResultsViewProps> = ({ stage, originalImage, onOriginalClick, inputImages, children, actions, isMobile, error, hasPartialError }) => {
    const { currentView, t, viewHistory } = useAppControls();

    useEffect(() => {
        if (hasPartialError && stage === 'results') {
            toast.error("Một hoặc nhiều ảnh đã không thể tạo thành công.");
        }
    }, [hasPartialError, stage]);
    
    const finalInputImages = useMemo(() => {
        if (inputImages && inputImages.length > 0) {
            return inputImages;
        }
        if (originalImage) {
            return [{ url: originalImage, caption: t('common_originalImage'), onClick: onOriginalClick || (() => {}) }];
        }
        return [];
    }, [inputImages, originalImage, onOriginalClick, t]);


    const getExportableState = (state: any) => {
        const exportableState = JSON.parse(JSON.stringify(state));

        // NEW: Intelligently find the pre-generation state to ensure "Random" is correctly saved.
        if (currentView.viewId === 'avatar-creator' || currentView.viewId === 'baby-photo-creator') {
            // Find the last 'configuring' state in the view history, which represents the user's choices *before* generation.
            const preGenState = [...viewHistory].reverse().find(
                (view) => view.viewId === currentView.viewId && view.state.stage === 'configuring'
            )?.state;
            
            // FIX: Use a type guard ('in') to safely access 'selectedIdeas' on the preGenState union type.
            if (preGenState && 'selectedIdeas' in preGenState) {
                // If we find the pre-generation state, use its selected ideas. This is the most reliable source.
                exportableState.selectedIdeas = (preGenState as AvatarCreatorState | BabyPhotoCreatorState).selectedIdeas;
            } else if (!exportableState.selectedIdeas || exportableState.selectedIdeas.length === 0) {
                // Fallback for safety: if no pre-gen state is found (e.g., page reload on results screen)
                // and the current state has no ideas, assume it was a "Random" run.
                const camelCaseViewId = currentView.viewId.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
                const randomConceptKey = `${camelCaseViewId}_randomConcept`;
                const randomConceptString = t(randomConceptKey);
                if (randomConceptString) {
                    exportableState.selectedIdeas = [randomConceptString];
                }
            }
        }

        const keysToRemove = [
            'generatedImage', 'generatedImages', 'historicalImages', 
            'finalPrompt', 'error',
        ];

        if (currentView.viewId !== 'image-interpolation') {
            keysToRemove.push('generatedPrompt', 'promptSuggestions');
        }

        const removeKeys = (obj: any) => {
            if (typeof obj !== 'object' || obj === null) return;
            for (const key of keysToRemove) {
                if (key in obj) delete obj[key];
            }
            if ('stage' in obj && (obj.stage === 'generating' || obj.stage === 'results' || obj.stage === 'prompting')) {
                if (currentView.viewId === 'free-generation') obj.stage = 'configuring';
                else if ( ('uploadedImage' in obj && obj.uploadedImage) || ('modelImage' in obj && obj.modelImage && 'clothingImage' in obj && obj.clothingImage) || ('contentImage' in obj && obj.contentImage && 'styleImage' in obj && obj.styleImage) || ('inputImage' in obj && obj.inputImage && 'outputImage' in obj && obj.outputImage) ) {
                     obj.stage = 'configuring';
                } else {
                    obj.stage = 'idle';
                }
            }
            for (const key in obj) {
                if (typeof obj[key] === 'object') removeKeys(obj[key]);
            }
        };

        removeKeys(exportableState);
        return exportableState;
    };
    
    return (
        <div className="w-full flex-1 flex flex-col items-center justify-between pt-12">
            <AnimatePresence>
                {stage === 'results' && (
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        {error ? (
                            <>
                                <h2 className="base-font font-bold text-3xl text-red-400">Đã xảy ra lỗi</h2>
                                <p className="text-neutral-300 mt-1 max-w-md mx-auto">{error}</p>
                            </>
                        ) : (
                            <>
                                <h2 className="base-font font-bold text-3xl text-neutral-100">Đây là kết quả của bạn!</h2>
                                {hasPartialError ? (
                                    <p className="text-yellow-300 mt-1">Một vài ảnh đã gặp lỗi. Bạn có thể thử tạo lại chúng.</p>
                                ) : (
                                    <p className="text-neutral-300 mt-1">Bạn có thể tạo lại từng ảnh hoặc tải về máy.</p>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full flex-1 flex items-start justify-start overflow-y-auto overflow-x-auto py-4 results-scroll-container">
                <motion.div
                    layout
                    className="flex flex-col md:flex-row md:flex-nowrap items-center md:items-stretch gap-6 md:gap-8 px-4 md:px-8 w-full md:w-max mx-auto py-4"
                >
                    {finalInputImages.map((input, index) => (
                        <motion.div
                            key={`input-${index}-${input.url.slice(-10)}`}
                            className="w-full md:w-auto flex-shrink-0"
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15, delay: index * -0.05 }}
                            whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                        >
                             <ActionablePolaroidCard
                                type="display"
                                mediaUrl={input.url}
                                caption={input.caption}
                                status="done"
                                onClick={input.onClick}
                                isMobile={isMobile}
                            />
                        </motion.div>
                    ))}
                    {children}
                </motion.div>
            </div>

            <div className="w-full px-4 my-6 flex items-center justify-center">
                {stage === 'results' && (
                    <motion.div
                        className="results-actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <button
                          className="btn btn-secondary"
                          onClick={() => downloadJson({ viewId: currentView.viewId, state: getExportableState(currentView.state) }, `aPix-${currentView.viewId}-settings.json`)}
                          title={t('common_exportSettings_tooltip')}
                        >
                            {t('common_exportSettings')}
                        </button>
                        {actions}
                    </motion.div>
                )}
            </div>
        </div>
    );
};


// --- Reusable Layout Components for App Screens ---

interface AppOptionsLayoutProps {
    children: React.ReactNode;
}

export const AppOptionsLayout: React.FC<AppOptionsLayoutProps> = ({ children }) => (
    <motion.div
        className="flex flex-col items-center gap-8 w-full max-w-6xl py-6 overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        {children}
    </motion.div>
);

interface OptionsPanelProps {
    children: React.ReactNode;
    className?: string;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ children, className }) => (
     <div className={cn("w-full max-w-3xl bg-black/20 p-6 rounded-lg border border-white/10 space-y-4", className)}>
        {children}
    </div>
);

// --- Slider Component ---

interface SliderProps {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({ label, options, value, onChange, disabled = false }) => {
    const valueIndex = options.indexOf(value);
    const sliderValue = valueIndex >= 0 ? valueIndex : 0;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const newIndex = parseInt(e.target.value, 10);
        if (options[newIndex]) {
            onChange(options[newIndex]);
        }
    };

    return (
        <div>
            <label className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">
                {label}
            </label>
            <div className="slider-container">
                <input
                    type="range"
                    min="0"
                    max={options.length - 1}
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="slider-track"
                    aria-label={label}
                    disabled={disabled}
                />
                <div className="slider-labels">
                    {options.map((option, index) => (
                        <span 
                            key={index} 
                            className={cn(
                                "slider-label",
                                { 'slider-label-active': index === sliderValue && !disabled }
                            )}
                        >
                            {option}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- Gallery Picker Component with Drag & Drop ---
interface GalleryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    images: string[];
}

export const GalleryPicker: React.FC<GalleryPickerProps> = ({ isOpen, onClose, onSelect, images }) => {
    const { addImagesToGallery, removeImageFromGallery, replaceImageInGallery } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const { 
        lightboxIndex, 
        openLightbox, 
        closeLightbox, 
        navigateLightbox 
    } = useLightbox();
    
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const isDroppingRef = useRef(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    useEffect(() => {
        closeLightbox();
        if (!isOpen) {
            setIsSelectionMode(false);
            setSelectedIndices([]);
            setActiveFilter('all');
        }
    }, [isOpen, closeLightbox]);

    // Extract all unique subfolders from images
    const availableSubfolders = useMemo(() => {
        const subfolders = new Set<string>();
        images.forEach(img => {
            // URL format: .../CATEGORY/SUBFOLDER/filename (e.g., .../gallery/upload/img.png)
            // Extract the folder name after the category (upload, outputs, extra, image_editor, etc.)
            const match = img.match(/\/([^/]+)\/([^/]+)\/[^/]+$/);
            if (match && match[2]) {
                subfolders.add(match[2]); // The subfolder (e.g., 'upload', 'outputs')
            }
        });
        return Array.from(subfolders).sort();
    }, [images]);

    const filters = [
        { id: 'all', label: 'Tất cả' },
        { id: 'upload', label: 'Upload' },
        { id: 'outputs', label: 'Output App' },
        { id: 'extra', label: 'Extra Apps' },
        { id: 'image_editor', label: 'Image Editor' },
        { id: 'storyboard', label: 'Storyboard' },
    ];

    // Add any dynamically found folders that aren't in the hardcoded list
    const dynamicFilters = availableSubfolders
        .filter(f => !filters.some(filter => filter.id === f))
        .map(f => ({ id: f, label: f.charAt(0).toUpperCase() + f.slice(1) }));
    
    const allFilters = [...filters, ...dynamicFilters];

    const filteredImages = useMemo(() => {
        let result = images;

        // Filter by Category/Folder
        if (activeFilter !== 'all') {
            result = result.filter(img => img.includes(`/gallery/${activeFilter}/`));
        }

        return result;
    }, [images, activeFilter]);

    // Map filtered indices back to original indices for deletion/selection
    const getOriginalIndex = (filteredIndex: number) => {
        const img = filteredImages[filteredIndex];
        return images.indexOf(img);
    };
    
    const handleToggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIndices([]);
    };

    const handleDeleteSelected = () => {
        if (selectedIndices.length === 0) return;
        // Simplified approach: selectedIndices stores indices of the CURRENT FILTERED VIEW.
        // When deleting, we map them to original indices.
        const originalIndicesToDelete = selectedIndices.map(i => getOriginalIndex(i));
        const sortedIndices = [...originalIndicesToDelete].sort((a, b) => b - a);
        sortedIndices.forEach(index => removeImageFromGallery(index));
        setSelectedIndices([]);
        setIsSelectionMode(false);
    };

    const handleThumbnailClick = (index: number) => {
        if (isSelectionMode) {
            setSelectedIndices(prev =>
                prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
            );
        } else {
            onSelect(filteredImages[index]);
        }
    };
    
    const handleEditImage = (indexInFiltered: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const originalIndex = getOriginalIndex(indexInFiltered);
        const urlToEdit = images[originalIndex];
        
        if (!urlToEdit || urlToEdit.startsWith('blob:')) {
            alert('Không thể chỉnh sửa video.');
            return;
        }

        openImageEditor(urlToEdit, (newUrl) => {
            replaceImageInGallery(originalIndex, newUrl);
        });
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        isDroppingRef.current = true;
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
            // Dropped images go to 'upload' by default as requested
            addImagesToGallery(imageDataUrls, 'upload');
            // Switch filter to 'upload' to show new images
            setActiveFilter('upload');
        } catch (error) {
            console.error("Error reading dropped files:", error);
        } finally {
            isDroppingRef.current = false;
        }
    }, [addImagesToGallery]);
    
    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="modal-overlay z-[75]" // Higher z-index
                        aria-modal="true"
                        role="dialog"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content !max-w-4xl !h-[85vh] flex flex-col"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <GalleryToolbar 
                                isSelectionMode={isSelectionMode}
                                selectedCount={selectedIndices.length}
                                imageCount={filteredImages.length}
                                title="Chọn từ thư viện"
                                onToggleSelectionMode={handleToggleSelectionMode}
                                onDeleteSelected={handleDeleteSelected}
                                onClose={onClose}
                            />
                            
                            {/* Filter Tabs */}
                            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-white/10 no-scrollbar">
                                {allFilters.map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveFilter(filter.id)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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
                                <div className="gallery-grid p-4">
                                    {filteredImages.map((img, index) => (
                                        <ImageThumbnail
                                            key={`${img.slice(-20)}-${index}`}
                                            index={index}
                                            imageUrl={img}
                                            isSelectionMode={isSelectionMode}
                                            isSelected={selectedIndices.includes(index)}
                                            onSelect={handleThumbnailClick}
                                            onEdit={handleEditImage}
                                            onDelete={(idx, e) => {
                                                e.stopPropagation();
                                                const originalIdx = getOriginalIndex(idx);
                                                removeImageFromGallery(originalIdx);
                                            }}
                                            onQuickView={(idx, e) => {
                                                e.stopPropagation();
                                                // Lightbox needs global index or filtered list?
                                                // Lightbox takes 'images' prop. If we pass filteredImages to Lightbox, 
                                                // then index is correct.
                                                // But Lightbox is rendered outside with 'images' (all images).
                                                // We should probably pass filteredImages to Lightbox too.
                                                // For now, let's find the index in the full list.
                                                const originalIdx = getOriginalIndex(idx);
                                                openLightbox(originalIdx);
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                 <div className="text-center text-neutral-400 py-8 flex-1 flex items-center justify-center">
                                    <p>Không có ảnh nào trong mục này.</p>
                                </div>
                            )}
                             <AnimatePresence>
                                {isDraggingOver && (
                                    <motion.div
                                        className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        <p className="text-2xl font-bold text-yellow-400">Thả ảnh vào đây (Inputs)</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Pass filteredImages to Lightbox if we want to navigate only within filter, 
                but Lightbox logic in hook uses global index. 
                For simplicity, we keep Lightbox using all images, but we jump to the correct index.
            */}
            <Lightbox images={images} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </>,
        document.body
    );
};

// --- Webcam Capture Modal ---
interface WebcamCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageDataUrl: string) => void;
}
export const WebcamCaptureModal: React.FC<WebcamCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
    const { t } = useAppControls();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const startCamera = async () => {
                setError(null);
                try {
                    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                } catch (err) {
                    console.error("Error accessing webcam:", err);
                    if (err instanceof DOMException && err.name === "NotAllowedError") {
                        setError(t('webcam_error_permission'));
                    } else {
                        setError(t('webcam_error_device'));
                    }
                }
            };
            startCamera();
        } else {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }
    }, [isOpen, t]);

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            onCapture(canvas.toDataURL('image/png'));
            onClose();
        }
    };
    
    if (!isOpen) {
        return null;
    }
    
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="modal-overlay z-[80]" aria-modal="true" role="dialog" >
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="modal-content !max-w-xl" >
                        <h3 className="base-font font-bold text-2xl text-yellow-400">{t('webcam_title')}</h3>
                        <div className="aspect-video bg-neutral-900 rounded-md overflow-hidden relative">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                             {error && (
                                <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/70">
                                    <p className="text-red-400 text-center">{error}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end items-center gap-4 mt-2">
                            <button onClick={onClose} className="btn btn-secondary btn-sm">{t('webcam_close')}</button>
                            <button onClick={handleCapture} className="btn btn-primary btn-sm" disabled={!stream || !!error}>{t('webcam_submit')}</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// --- Prompt Result Card ---
interface PromptResultCardProps {
    title: string;
    promptText: string;
    className?: string;
}

export const PromptResultCard: React.FC<PromptResultCardProps> = ({ title, promptText, className }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
        toast.success("Đã sao chép prompt!");
    };

    return (
        <div className={cn("prompt-card", className)}>
             <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h3 className="base-font font-bold text-lg text-neutral-800">{title}</h3>
                <button
                    onClick={handleCopy}
                    className="p-2 bg-black/10 rounded-full text-neutral-600 hover:bg-black/20 hover:text-black focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors"
                    aria-label="Sao chép prompt"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
            <div className="prompt-card-content">
                <p className="base-font text-sm text-neutral-700 whitespace-pre-wrap">{promptText}</p>
            </div>
        </div>
    );
};

// FIX: Added missing Switch component
export const Switch: React.FC<{
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}> = ({ id, checked, onChange, disabled }) => (
    <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
            "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-neutral-800",
            "disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-yellow-400" : "bg-neutral-600"
        )}
    >
        <span
            aria-hidden="true"
            className={cn(
                "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                checked ? "translate-x-[8px]" : "-translate-x-[8px]"
            )}
        />
    </button>
);
