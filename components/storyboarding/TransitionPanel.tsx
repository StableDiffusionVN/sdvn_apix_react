
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppControls, PromptRegenerationModal } from '../uiUtils';
import { PencilIcon, DuplicateIcon, LoadingSpinnerIcon, RegenerateIcon, AnimationLineIcon, ErrorIcon } from '../icons';
import toast from 'react-hot-toast';
import type { SceneState } from '../uiTypes';
import { cn } from '../../lib/utils';

interface TransitionPanelProps {
    scene: SceneState;
    index: number;
    onEditAnimation: (newText: string) => void;
    onGenerateVideoPrompt: (promptMode: 'auto' | 'start-end' | 'json') => Promise<void>;
    onGenerateVideo: () => void;
    onEditVideoPrompt: (newPrompt: string) => void;
    onRegenerateAnimation: (modificationPrompt: string) => void;
    aspectRatio: string;
}

const TransitionPanel: React.FC<TransitionPanelProps> = ({ scene, index, onEditAnimation, onGenerateVideoPrompt, onGenerateVideo, onEditVideoPrompt, onRegenerateAnimation, aspectRatio }) => {
    const { t } = useAppControls();
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(scene.animationDescription || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [promptMode, setPromptMode] = useState<'auto' | 'start-end' | 'json'>('auto');

    const [isEditingVideoPrompt, setIsEditingVideoPrompt] = useState(false);
    const [editedVideoPrompt, setEditedVideoPrompt] = useState(scene.videoPrompt || '');
    const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);

    useEffect(() => {
        setEditedText(scene.animationDescription || '');
    }, [scene.animationDescription]);
    
    useEffect(() => {
        setEditedVideoPrompt(scene.videoPrompt || '');
    }, [scene.videoPrompt]);

    const formattedAspectRatio = useMemo(() => {
        if (!aspectRatio || aspectRatio === 'Giữ nguyên' || aspectRatio === 'Keep Original') {
            return '16 / 9';
        }
        return aspectRatio.replace(':', ' / ');
    }, [aspectRatio]);


    const handleSaveVideoPrompt = () => {
        onEditVideoPrompt(editedVideoPrompt);
        setIsEditingVideoPrompt(false);
    };

    const handleSave = () => {
        if (editedText.trim() !== (scene.animationDescription || '')) {
            onEditAnimation(editedText);
        }
        setIsEditing(false);
    };
    
    const handleCopyVideoPrompt = () => {
        if (!scene.videoPrompt) return;
        navigator.clipboard.writeText(scene.videoPrompt);
        toast.success(t('common_promptCopied'));
    };
    
    const handleCopyAnimationDescription = () => {
        if (!scene.animationDescription) return;
        navigator.clipboard.writeText(scene.animationDescription);
        toast.success(t('common_promptCopied'));
    };

    const handleGenerateVideoPrompt = async () => {
        setIsGenerating(true);
        try {
            await onGenerateVideoPrompt(promptMode);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error";
            toast.error(`Failed to generate video prompt: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirmRegeneration = (modificationPrompt: string) => {
        onRegenerateAnimation(modificationPrompt);
        setIsRegenModalOpen(false);
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
                className="storyboard-panel-image-container group"
                style={{ aspectRatio: formattedAspectRatio }}
            >
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleCopyVideoPrompt(); }} 
                        className="p-1 rounded-full hover:bg-neutral-600 transition-colors" 
                        title={t('storyboarding_copyPrompt')}
                        disabled={!scene.videoPrompt}
                    >
                        <DuplicateIcon className="h-4 w-4" strokeWidth="1.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditingVideoPrompt(true); }} 
                        className="p-1 rounded-full hover:bg-neutral-600 transition-colors"
                        title={t('storyboarding_editPrompt')}
                    >
                        <PencilIcon className="h-4 w-4" />
                    </button>
                </div>
                {scene.videoStatus === 'pending' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <LoadingSpinnerIcon className="h-8 w-8 text-yellow-400 animate-spin" />
                        <p className="text-xs text-yellow-300 mt-2">Đang tạo video...</p>
                    </div>
                )}
                {scene.videoStatus === 'error' && scene.videoError && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/50 p-2">
                        <ErrorIcon className="h-8 w-8 text-red-400 mb-2" />
                        <p className="text-xs text-red-300 text-center">{scene.videoError}</p>
                    </div>
                )}
                {scene.videoStatus === 'done' && scene.videoUrl ? (
                    <video src={scene.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                ) : isEditingVideoPrompt ? (
                    <textarea 
                        value={editedVideoPrompt} 
                        onChange={(e) => setEditedVideoPrompt(e.target.value)} 
                        onBlur={handleSaveVideoPrompt}
                        className="absolute inset-0 storyboard-panel-textarea w-full h-full font-mono"
                        autoFocus
                    />
                ) : scene.videoPrompt ? (
                    <div 
                        onClick={() => setIsEditingVideoPrompt(true)}
                        className="absolute inset-0 w-full h-full p-3 overflow-y-auto text-xs text-neutral-300 whitespace-pre-wrap storyboard-panel-description cursor-text font-mono" 
                    >
                        {scene.videoPrompt}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <AnimationLineIcon className="h-16 w-16 text-neutral-700 opacity-60" />
                    </div>
                )}
            </div>
            <div className="storyboard-panel-content">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-yellow-400">{t('storyboarding_animation_title')}</h4>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyAnimationDescription} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title={t('storyboarding_copyPrompt')} disabled={!scene.animationDescription}>
                            <DuplicateIcon className="h-4 w-4" strokeWidth="1.5" />
                        </button>
                        <button onClick={() => setIsRegenModalOpen(true)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title="Tạo lại chuyển động">
                            <RegenerateIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditing(!isEditing)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title="Chỉnh sửa chuyển động">
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {isEditing ? (
                    <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} onBlur={handleSave} placeholder="Mô tả chuyển động..." className="storyboard-panel-textarea" autoFocus />
                ) : (
                    <p className="storyboard-panel-description italic">
                        {scene.animationDescription || 'Mô tả chuyển động...'}
                    </p>
                )}

                <div className="mt-auto pt-3 border-t border-neutral-700/50 space-y-2">
                    <div>
                        <label className="text-xs font-bold text-neutral-400">{t('storyboarding_promptMode')}</label>
                        <select
                            value={promptMode}
                            onChange={(e) => setPromptMode(e.target.value as 'auto' | 'start-end' | 'json')}
                            className="form-input !text-xs !py-1 w-full mt-1"
                        >
                            <option value="auto">{t('storyboarding_promptMode_auto')}</option>
                            <option value="start-end">{t('storyboarding_promptMode_startEnd')}</option>
                            <option value="json">{t('storyboarding_promptMode_json')}</option>
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleGenerateVideoPrompt} className="btn btn-secondary !text-xs !py-1.5 !px-4 w-full flex items-center justify-center" disabled={isGenerating}>
                            {isGenerating ? <LoadingSpinnerIcon className="h-4 w-4 animate-spin"/> : 'Tạo prompt video'}
                        </button>
                        <button
                            onClick={onGenerateVideo}
                            className={cn(
                                "btn btn-primary !text-xs !py-1.5 !px-4 w-full flex items-center justify-center",
                                scene.videoStatus === 'pending' && "gap-1.5"
                            )}
                            disabled={isGenerating || scene.videoStatus === 'pending'}
                        >
                            {scene.videoStatus === 'pending' && <LoadingSpinnerIcon className="h-4 w-4 animate-spin"/>}
                            {scene.videoStatus === 'pending' ? 'Đang tạo...' : 'Tạo Video'}
                        </button>
                    </div>
                </div>
            </div>
            <PromptRegenerationModal
                isOpen={isRegenModalOpen}
                onClose={() => setIsRegenModalOpen(false)}
                onConfirm={handleConfirmRegeneration}
                itemToModify={`Chuyển động Cảnh ${scene.scene}`}
            />
        </motion.div>
    );
};

export default TransitionPanel;
