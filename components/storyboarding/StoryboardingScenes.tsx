/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'framer-motion';
import ScenePanel from './ScenePanel';
import TransitionPanel from './TransitionPanel';
import type { SceneState } from '../uiTypes';
import { AddIcon, DeleteIcon, UpArrowIcon, DownArrowIcon } from '../icons';
import { useAppControls } from '../uiUtils';
import { cn } from '../../lib/utils';

interface StoryboardingScenesProps {
    scenes: SceneState[];
    referenceImages: string[];
    onGenerateImage: (index: number, frameType: 'start' | 'end') => void;
    onGenerateVideo: (index: number) => void;
    onEditSceneDescription: (index: number, frameType: 'start' | 'end', newDescription: string) => void;
    onEditSceneAnimation: (index: number, newAnimation: string) => void;
    onImageSourceChange: (index: number, frameType: 'start' | 'end', newSource: string) => void;
    onSelectCustomImage: (index: number, frameType: 'start' | 'end') => void;
    onUploadCustomImage: (index: number, frameType: 'start' | 'end') => void;
    onClearImage: (index: number, frameType: 'start' | 'end') => void;
    onImageFile: (file: File, index: number, frameType: 'start' | 'end') => void;
    onEditImage: (index: number, frameType: 'start' | 'end') => void;
    onPreviewImage: (index: number, frameType: 'start' | 'end') => void;
    onDownloadImage: (index: number, frameType: 'start' | 'end') => void;
    onAddScene: () => void;
    onDeleteScene: (index: number) => void;
    onMoveScene: (index: number, direction: 'up' | 'down') => void;
    onGenerateVideoPrompt: (index: number, promptMode: 'auto' | 'start-end' | 'json') => Promise<void>;
    onEditSceneVideoPrompt: (index: number, newPrompt: string) => void;
    onRegenerateScenePrompt: (index: number, frameType: 'start' | 'end', modificationPrompt: string) => void;
    onRegenerateAnimation: (index: number, modificationPrompt: string) => void;
    aspectRatio: string;
}

const StoryboardingScenes: React.FC<StoryboardingScenesProps> = (props) => {
    const {
        scenes, onAddScene, onDeleteScene, onMoveScene,
        onGenerateImage,
        onGenerateVideo,
        onEditSceneDescription,
        onEditSceneAnimation,
        onImageSourceChange,
        onSelectCustomImage,
        onUploadCustomImage,
        onClearImage,
        onImageFile,
        onEditImage,
        onPreviewImage,
        onDownloadImage,
        onGenerateVideoPrompt,
        onEditSceneVideoPrompt,
        onRegenerateScenePrompt,
        onRegenerateAnimation,
        aspectRatio,
        referenceImages
    } = props;
    const { t } = useAppControls();
    
    const toolbarButtonClasses = "p-1.5 bg-neutral-700/50 rounded-md text-neutral-400 hover:bg-neutral-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-700/50 disabled:hover:text-neutral-400";

    return (
        <div className="flex flex-col gap-4 p-2 w-full">
            {scenes.map((scene, index) => (
                <div key={scene.scene} className="storyboard-scene-group relative">
                    <div className="flex justify-between items-center mb-2 pb-3 border-b border-white/10">
                        <h3 className="storyboard-scene-group-title !p-0 !m-0 !border-none">{t('storyboarding_scene_title')} {scene.scene}</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onMoveScene(index, 'up')} disabled={index === 0} className={toolbarButtonClasses} title="Di chuyển lên">
                                <UpArrowIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => onMoveScene(index, 'down')} disabled={index === scenes.length - 1} className={toolbarButtonClasses} title="Di chuyển xuống">
                                <DownArrowIcon className="h-4 w-4" />
                            </button>
                             <button onClick={() => onDeleteScene(index)} className={cn(toolbarButtonClasses, "hover:!bg-red-500/80")} title="Xóa cảnh">
                                <DeleteIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                        <ScenePanel
                            scene={scene}
                            index={index}
                            frameType="start"
                            allScenes={scenes}
                            referenceImages={referenceImages}
                            onGenerate={onGenerateImage}
                            onEditPrompt={onEditSceneDescription}
                            onImageSourceChange={onImageSourceChange}
                            onSelectCustomImage={onSelectCustomImage}
                            onUploadCustomImage={onUploadCustomImage}
                            onClearImage={onClearImage}
                            onImageFile={onImageFile}
                            onEditImage={onEditImage}
                            onPreviewImage={onPreviewImage}
                            onDownloadImage={onDownloadImage}
                            onRegeneratePrompt={onRegenerateScenePrompt}
                            aspectRatio={aspectRatio}
                        />
                        <TransitionPanel
                            scene={scene}
                            index={index}
                            onEditAnimation={(newAnimation) => onEditSceneAnimation(index, newAnimation)}
                            onGenerateVideoPrompt={(promptMode) => onGenerateVideoPrompt(index, promptMode)}
                            onGenerateVideo={() => onGenerateVideo(index)}
                            onEditVideoPrompt={(newPrompt) => onEditSceneVideoPrompt(index, newPrompt)}
                            onRegenerateAnimation={(modificationPrompt) => onRegenerateAnimation(index, modificationPrompt)}
                            aspectRatio={aspectRatio}
                        />
                        <ScenePanel
                            scene={scene}
                            index={index}
                            frameType="end"
                            allScenes={scenes}
                            referenceImages={referenceImages}
                            onGenerate={onGenerateImage}
                            onEditPrompt={onEditSceneDescription}
                            onImageSourceChange={onImageSourceChange}
                            onSelectCustomImage={onSelectCustomImage}
                            onUploadCustomImage={onUploadCustomImage}
                            onClearImage={onClearImage}
                            onImageFile={onImageFile}
                            onEditImage={onEditImage}
                            onPreviewImage={onPreviewImage}
                            onDownloadImage={onDownloadImage}
                            onRegeneratePrompt={onRegenerateScenePrompt}
                            aspectRatio={aspectRatio}
                        />
                    </div>
                </div>
            ))}
            <motion.button
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={onAddScene}
                className="w-full flex flex-col items-center justify-center min-h-[12rem] bg-neutral-800/70 border-2 border-dashed border-neutral-700 rounded-xl text-neutral-500 hover:border-yellow-400/80 hover:text-yellow-400 transition-colors duration-200"
                aria-label={t('storyboarding_addScene')}
            >
                <AddIcon className="h-8 w-8" strokeWidth={1.5} />
                <span className="mt-2 font-bold text-sm">{t('storyboarding_addScene')}</span>
            </motion.button>
        </div>
    );
};

export default StoryboardingScenes;