/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAppControls } from '../uiUtils';
import { cn } from '../../lib/utils';
import { PencilIcon, DocumentTextIcon, SpeakerWaveIcon, CloudUploadIcon, CloseIcon } from '../icons';
import StoryboardingOptions from './StoryboardingOptions';

type InputMethod = 'prompt' | 'text' | 'audio';

interface StoryboardingInputProps {
    activeInput: InputMethod;
    setActiveInput: (method: InputMethod) => void;
    idea: string;
    setIdea: (idea: string) => void;
    scriptText: string;
    setScriptText: (text: string) => void;
    audioFile: File | null;
    audioInputRef: React.RefObject<HTMLInputElement>;
    textInputRef: React.RefObject<HTMLInputElement>;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>, type: 'text' | 'audio') => void;
    referenceImages: string[];
    isDraggingRef: boolean;
    handleRefDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleRefDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    handleRefDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    setReferenceImages: (images: string[] | ((prev: string[]) => string[])) => void;
    setIsGalleryPickerOpen: (isOpen: boolean) => void;
    style: string;
    setStyle: (style: string) => void;
    styleOptions: any[];
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    aspectRatioOptions: string[];
    notes: string;
    setNotes: (notes: string) => void;
    numberOfScenes: number;
    setNumberOfScenes: (num: number) => void;
    storyboardLanguage: 'vi' | 'en' | 'zh';
    setStoryboardLanguage: (lang: 'vi' | 'en' | 'zh') => void;
    scriptType: 'auto' | 'dialogue' | 'action';
    setScriptType: (type: 'auto' | 'dialogue' | 'action') => void;
    keepClothing: boolean;
    setKeepClothing: (keep: boolean) => void;
    keepBackground: boolean;
    setKeepBackground: (keep: boolean) => void;
}

const InputMethodTab: React.FC<{ method: InputMethod, label: string, icon: React.ReactNode, activeInput: InputMethod, setActiveInput: (method: InputMethod) => void }> = ({ method, label, icon, activeInput, setActiveInput }) => (
    <button
        onClick={() => setActiveInput(method)}
        title={label}
        className={cn(
            "w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200",
            activeInput === method
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300'
        )}
    >
        {icon}
    </button>
);


const StoryboardingInput: React.FC<StoryboardingInputProps> = (props) => {
    const { t } = useAppControls();
    const {
        activeInput, setActiveInput, idea, setIdea, scriptText, setScriptText, audioFile,
        audioInputRef, textInputRef, handleFileSelect, referenceImages, isDraggingRef,
        handleRefDragOver, handleRefDragLeave, handleRefDrop, setReferenceImages,
        setIsGalleryPickerOpen, storyboardLanguage, setStoryboardLanguage, scriptType, setScriptType,
        style, setStyle, styleOptions, numberOfScenes, setNumberOfScenes, aspectRatio, setAspectRatio, aspectRatioOptions,
        notes, setNotes, keepClothing, setKeepClothing, keepBackground, setKeepBackground
    } = props;

    const scriptTypeButtonClasses = "btn btn-secondary !text-xs !py-1 !px-3 flex-1 rounded-md";

    return (
        <div className="space-y-3">
            <div className="flex justify-start gap-3 items-center">
                <InputMethodTab method="prompt" label={t('storyboarding_prompt')} icon={<PencilIcon className="h-5 w-5"/>} activeInput={activeInput} setActiveInput={setActiveInput} />
                <InputMethodTab method="text" label={t('storyboarding_text')} icon={<DocumentTextIcon className="h-5 w-5"/>} activeInput={activeInput} setActiveInput={setActiveInput} />
                <InputMethodTab method="audio" label={t('storyboarding_audio')} icon={<SpeakerWaveIcon className="h-5 w-5"/>} activeInput={activeInput} setActiveInput={setActiveInput} />
                <div className="w-px h-6 bg-neutral-700 mx-1" />
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setStoryboardLanguage('vi')}
                        className={cn("px-2 py-1 rounded-md text-xs font-bold transition-colors", storyboardLanguage === 'vi' ? 'bg-yellow-400 text-black' : 'bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300')}
                    >
                        VI
                    </button>
                    <button
                        onClick={() => setStoryboardLanguage('en')}
                        className={cn("px-2 py-1 rounded-md text-xs font-bold transition-colors", storyboardLanguage === 'en' ? 'bg-yellow-400 text-black' : 'bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300')}
                    >
                        EN
                    </button>
                     <button
                        onClick={() => setStoryboardLanguage('zh')}
                        className={cn("px-2 py-1 rounded-md text-xs font-bold transition-colors", storyboardLanguage === 'zh' ? 'bg-yellow-400 text-black' : 'bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300')}
                    >
                        ZH
                    </button>
                </div>
            </div>
            {activeInput === 'prompt' && <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t('storyboarding_idea_placeholder')} className="form-input !text-xs w-full h-32" />}
            {activeInput === 'text' && (
                <div className="flex flex-col gap-2">
                    <textarea value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder={t('storyboarding_pasteScript')} className="form-input !text-xs w-full h-32" />
                    <input type="file" accept=".txt" ref={textInputRef} onChange={(e) => handleFileSelect(e, 'text')} className="hidden"/>
                    <button onClick={() => textInputRef.current?.click()} className="btn btn-secondary !text-xs !py-1.5 !px-4">{t('storyboarding_uploadScript')}</button>
                </div>
            )}
            {activeInput === 'audio' && (
                <div className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-800 rounded-lg">
                    <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => handleFileSelect(e, 'audio')} className="hidden"/>
                    <button onClick={() => audioInputRef.current?.click()} className="btn btn-secondary !text-xs !py-1.5 !px-4">{t('storyboarding_uploadAudio')}</button>
                    {audioFile && <p className="text-xs text-neutral-400 mt-2 truncate max-w-full">{audioFile.name}</p>}
                </div>
            )}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-neutral-300">{t('storyboarding_referenceImages')}</label>
                    {referenceImages.length > 0 && (
                        <button onClick={() => setReferenceImages([])} className="text-xs text-neutral-400 hover:text-yellow-400 transition-colors">
                            Xóa tất cả
                        </button>
                    )}
                </div>
                <div
                    onDragOver={handleRefDragOver}
                    onDragLeave={handleRefDragLeave}
                    onDrop={handleRefDrop}
                    className={cn(
                        "grid grid-cols-4 gap-2 p-1 rounded-lg border-2 border-dashed transition-colors",
                        isDraggingRef ? "border-yellow-400 bg-neutral-800/50" : "border-transparent"
                    )}
                >
                    {referenceImages.map((url, index) => (
                        <div key={index} className="relative group w-full aspect-square">
                            <img src={url} className="w-full h-full object-cover rounded" alt={`Reference ${index + 1}`} />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setReferenceImages(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                                aria-label={`Remove reference image ${index + 1}`}
                            >
                                <CloseIcon className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {referenceImages.length < 4 && (
                        Array.from({ length: 4 - referenceImages.length }).map((_, index) => (
                                <button
                                key={`add-${index}`}
                                onClick={() => setIsGalleryPickerOpen(true)}
                                className="w-full aspect-square bg-neutral-800 rounded flex items-center justify-center text-neutral-500 hover:bg-neutral-700 hover:text-yellow-400 transition-colors"
                                aria-label="Add reference image from gallery"
                            >
                                <CloudUploadIcon className="h-6 w-6" />
                            </button>
                        ))
                    )}
                </div>
            </div>
            <div className="pt-2">
                <div className="flex items-center gap-6">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="keep-clothing-toggle"
                            checked={keepClothing}
                            onChange={(e) => setKeepClothing(e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800 cursor-pointer"
                        />
                        <label htmlFor="keep-clothing-toggle" className="ml-2 text-sm font-medium text-neutral-300 cursor-pointer">
                            {t('storyboarding_keepClothing')}
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="keep-background-toggle"
                            checked={keepBackground}
                            onChange={(e) => setKeepBackground(e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800 cursor-pointer"
                        />
                        <label htmlFor="keep-background-toggle" className="ml-2 text-sm font-medium text-neutral-300 cursor-pointer">
                            {t('storyboarding_keepBackground')}
                        </label>
                    </div>
                </div>
            </div>
             <div>
                <label className="text-sm font-medium text-neutral-300">{t('storyboarding_scriptType')}</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                    <button onClick={() => setScriptType('auto')} className={cn(scriptTypeButtonClasses, scriptType === 'auto' && '!bg-yellow-400 !text-black')}>
                        {t('storyboarding_scriptType_auto')}
                    </button>
                    <button onClick={() => setScriptType('dialogue')} className={cn(scriptTypeButtonClasses, scriptType === 'dialogue' && '!bg-yellow-400 !text-black')}>
                        {t('storyboarding_scriptType_dialogue')}
                    </button>
                    <button onClick={() => setScriptType('action')} className={cn(scriptTypeButtonClasses, scriptType === 'action' && '!bg-yellow-400 !text-black')}>
                        {t('storyboarding_scriptType_action')}
                    </button>
                </div>
            </div>
            <StoryboardingOptions
                style={style}
                setStyle={setStyle}
                styleOptions={styleOptions}
                numberOfScenes={numberOfScenes}
                setNumberOfScenes={setNumberOfScenes}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                aspectRatioOptions={aspectRatioOptions}
                notes={notes}
                setNotes={setNotes}
            />
        </div>
    );
};

export default StoryboardingInput;
