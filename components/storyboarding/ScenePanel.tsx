
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppControls, PromptRegenerationModal } from '../uiUtils';
import type { SceneState } from '../uiTypes';
import SceneImageToolbar from './SceneImageToolbar';
import { PencilIcon, LoadingSpinnerIcon, ErrorIcon, StoryboardPlaceholderIcon, DuplicateIcon, RegenerateIcon, CloudUploadIcon } from '../icons';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface ScenePanelProps {
    scene: SceneState;
    frameType: 'start' | 'end';
    index: number;
    allScenes: SceneState[];
    referenceImages: string[];
    onGenerate: (index: number, frameType: 'start' | 'end') => void;
    onEditPrompt: (index: number, frameType: 'start' | 'end', newDescription: string) => void;
    onImageSourceChange: (index: number, frameType: 'start' | 'end', newSource: string) => void;
    onSelectCustomImage: (index: number, frameType: 'start' | 'end') => void;
    onUploadCustomImage: (index: number, frameType: 'start' | 'end') => void;
    onClearImage: (index: number, frameType: 'start' | 'end') => void;
    onImageFile: (file: File, index: number, frameType: 'start' | 'end') => void;
    onEditImage: (index: number, frameType: 'start' | 'end') => void;
    onPreviewImage: (index: number, frameType: 'start' | 'end') => void;
    onDownloadImage: (index: number, frameType: 'start' | 'end') => void;
    onRegeneratePrompt: (index: number, frameType: 'start' | 'end', modificationPrompt: string) => void;
    aspectRatio: string;
}

const ScenePanel: React.FC<ScenePanelProps> = (props) => {
    const {
        scene, frameType, index, allScenes, referenceImages, onGenerate, onEditPrompt, onImageSourceChange,
        onSelectCustomImage, onUploadCustomImage, onClearImage, onImageFile, onEditImage, onPreviewImage, onDownloadImage, onRegeneratePrompt,
        aspectRatio,
    } = props;

    const { t } = useAppControls();
    
    const frame = frameType === 'start' ? scene.startFrame : scene.endFrame;
    const title = frameType === 'start' ? t('storyboarding_startFrame') : t('storyboarding_endFrame');

    const [isEditing, setIsEditing] = useState(false);
    const [editedDescription, setEditedDescription] = useState(frame.description);
    const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const formattedAspectRatio = useMemo(() => {
        if (!aspectRatio || aspectRatio === 'Giữ nguyên' || aspectRatio === 'Keep Original') {
            return '16 / 9';
        }
        return aspectRatio.replace(':', ' / ');
    }, [aspectRatio]);

    const handleSaveEdit = () => {
        if (editedDescription.trim() !== frame.description) {
            onEditPrompt(index, frameType, editedDescription);
        }
        setIsEditing(false);
    };

    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'custom') {
            onSelectCustomImage(index, frameType);
        } else {
            onImageSourceChange(index, frameType, value);
        }
    };

    const getSourceThumbnail = () => {
        if (frame.imageSource === 'reference') {
            return referenceImages.length > 0 ? referenceImages[0] : null;
        }
        if (frame.imageSource.startsWith('data:image')) {
            return frame.imageSource;
        }
        const [sourceSceneIndexStr, sourceFrameType] = frame.imageSource.split('-');
        const sourceSceneIndex = parseInt(sourceSceneIndexStr, 10);

        if (!isNaN(sourceSceneIndex) && allScenes[sourceSceneIndex]) {
            const sourceScene = allScenes[sourceSceneIndex];
            if (sourceFrameType === 'start' && sourceScene.startFrame.imageUrl) {
                return sourceScene.startFrame.imageUrl;
            } else if (sourceFrameType === 'end' && sourceScene.endFrame.imageUrl) {
                return sourceScene.endFrame.imageUrl;
            }
        }
        return null;
    };

    const sourceThumbnailUrl = getSourceThumbnail();

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(frame.description);
        toast.success(t('common_promptCopied'));
    };
    
    const handleConfirmRegeneration = (modificationPrompt: string) => {
        onRegeneratePrompt(index, frameType, modificationPrompt);
        setIsRegenModalOpen(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!frame.imageUrl) {
            setIsDraggingOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (!frame.imageUrl && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onImageFile(e.dataTransfer.files[0], index, frameType);
        }
    };

    return (
        <motion.div
            className="storyboard-panel"
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            <div
                className={cn(
                    "storyboard-panel-image-container group",
                    !frame.imageUrl && "cursor-pointer"
                )}
                style={{ aspectRatio: formattedAspectRatio }}
                onClick={frame.imageUrl ? () => onPreviewImage(index, frameType) : () => onUploadCustomImage(index, frameType)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {frame.status === 'pending' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <LoadingSpinnerIcon className="h-8 w-8 text-yellow-400 animate-spin" />
                    </div>
                )}
                {frame.status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/50 p-2">
                        <ErrorIcon className="h-8 w-8 text-red-400 mb-2" />
                        <p className="text-xs text-red-300 text-center">{frame.error}</p>
                    </div>
                )}
                {frame.imageUrl ? (
                    <>
                        <img src={frame.imageUrl} className="absolute inset-0 w-full h-full object-contain" alt={title} />
                        <SceneImageToolbar 
                            onEdit={() => onEditImage(index, frameType)}
                            onDownload={() => onDownloadImage(index, frameType)}
                            onSelectFromGallery={() => onSelectCustomImage(index, frameType)}
                            onUpload={() => onUploadCustomImage(index, frameType)}
                            onClear={() => onClearImage(index, frameType)}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-900/50">
                        <StoryboardPlaceholderIcon className="h-20 w-20 text-neutral-700 opacity-60" />
                    </div>
                )}
                 {isDraggingOver && !frame.imageUrl && (
                    <div className="absolute inset-0 z-10 bg-black/70 border-2 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none">
                        <CloudUploadIcon className="h-10 w-10 text-yellow-400 mb-2" strokeWidth={1} />
                        <p className="text-sm font-bold text-yellow-400">{t('polaroid_dropPrompt')}</p>
                    </div>
                )}
            </div>
            <div className="storyboard-panel-content">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-yellow-400">{title}</h4>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyPrompt} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title={t('storyboarding_copyPrompt')}>
                            <DuplicateIcon className="h-4 w-4" strokeWidth="1.5" />
                        </button>
                        <button onClick={() => setIsRegenModalOpen(true)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title="Tạo lại prompt">
                            <RegenerateIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditing(!isEditing)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title={t('storyboarding_editPrompt')}>
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {isEditing ? (
                    <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        onBlur={handleSaveEdit}
                        className="storyboard-panel-textarea"
                        autoFocus
                    />
                ) : (
                    <p className="storyboard-panel-description">{frame.description}</p>
                )}
                <div className="mt-auto pt-2 border-t border-neutral-700/50 space-y-2">
                    <div>
                        <label className="text-xs font-bold text-neutral-400">{t('storyboarding_syncImage')}</label>
                        <div className="flex items-center gap-2 mt-1">
                            <select
                                value={frame.imageSource.startsWith('data:image') ? 'custom' : frame.imageSource}
                                onChange={handleSourceChange}
                                className="form-input !text-xs !py-1 flex-grow"
                            >
                                <option value="reference">{t('storyboarding_sync_reference')}</option>
                                {allScenes.flatMap((s, i) => {
                                    const options = [];
                                    if (s.startFrame.imageUrl) options.push({ value: `${i}-start`, label: `Start Frame ${s.scene}`});
                                    if (s.endFrame.imageUrl) options.push({ value: `${i}-end`, label: `End Frame ${s.scene}`});
                                    return options;
                                }).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                <option value="custom">{t('storyboarding_sync_custom')}</option>
                            </select>
                            {sourceThumbnailUrl && (
                                <img src={sourceThumbnailUrl} className="w-8 h-8 object-cover rounded-sm flex-shrink-0 bg-neutral-700" alt="Source preview" />
                            )}
                        </div>
                    </div>
                    <button onClick={() => onGenerate(index, frameType)} className="btn btn-secondary !text-xs !py-1.5 !px-4 w-full" disabled={frame.status === 'pending'}>
                        {frame.status === 'pending' ? t('common_creating') : (frame.status === 'done' ? t('common_regenerate') : t('storyboarding_scene_generate'))}
                    </button>
                </div>
            </div>
            <PromptRegenerationModal
                isOpen={isRegenModalOpen}
                onClose={() => setIsRegenModalOpen(false)}
                onConfirm={handleConfirmRegeneration}
                itemToModify={`Prompt ${title}`}
            />
        </motion.div>
    );
};

export default ScenePanel;
