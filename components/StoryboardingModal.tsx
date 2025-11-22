/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, useImageEditor, type ImageForZip, downloadAllImagesAsZip, downloadJson, useDebounce } from './uiUtils';
import { GalleryPicker } from './uiComponents';
import { useLightbox } from './uiHooks';
import { downloadImage } from './uiFileUtilities';
import type { SceneState } from './uiTypes';
import { CloseIcon, CloudUploadIcon, UndoIcon, RedoIcon } from './icons';
import { createScriptSummaryFromIdea, createScriptSummaryFromText, createScriptSummaryFromAudio, developScenesFromSummary, type ScriptSummary, generateVideoPromptFromScenes, refineSceneDescription, refineSceneTransition, startVideoGeneration, pollVideoOperation, processImageInput } from '../services/geminiService';
import { generateFreeImage } from '../services/gemini/freeGenerationService';
import toast from 'react-hot-toast';
import StoryboardingInput from './storyboarding/StoryboardingInput';
import StoryboardingSummary from './storyboarding/StoryboardingSummary';
import StoryboardingScenes from './storyboarding/StoryboardingScenes';
import Lightbox from './Lightbox';
import * as fileStorage from '../services/fileStorage';


interface StoryboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHide: () => void;
}

type InputMethod = 'prompt' | 'text' | 'audio';



const dataURLtoFile = (dataUrl: string, filename: string, fileType: string): File => {
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: fileType });
};

export const StoryboardingModal: React.FC<StoryboardingModalProps> = ({ isOpen, onClose, onHide }) => {
    const { t, language, addImagesToGallery, imageGallery } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();

    const [activeInput, setActiveInput] = useState<InputMethod>('prompt');
    const [idea, setIdea] = useState('');
    const [scriptText, setScriptText] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    
    const [scriptSummary, setScriptSummary] = useState<ScriptSummary | null>(null);
    const [scenes, setScenes] = useState<SceneState[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    const [isDraggingRef, setIsDraggingRef] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [pickingCustomImageFor, setPickingCustomImageFor] = useState<{index: number, frameType: 'start' | 'end'} | null>(null);
    
    const [style, setStyle] = useState('');
    const [numberOfScenes, setNumberOfScenes] = useState(0);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [notes, setNotes] = useState('');
    const [storyboardLanguage, setStoryboardLanguage] = useState<'vi' | 'en' | 'zh'>('vi');
    const [scriptType, setScriptType] = useState<'auto' | 'dialogue' | 'action'>('auto');
    const [keepClothing, setKeepClothing] = useState(false);
    const [keepBackground, setKeepBackground] = useState(false);

    const [audioData, setAudioData] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // NEW: State for Undo/Redo
    const [history, setHistory] = useState<SceneState[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const audioInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const customImageUploadRef = useRef<HTMLInputElement>(null);
    const [uploadingImageFor, setUploadingImageFor] = useState<{index: number, frameType: 'start' | 'end'} | null>(null);

    const scenesRef = useRef(scenes);
    useEffect(() => {
        scenesRef.current = scenes;
    }, [scenes]);


    const aspectRatioOptions: string[] = t('storyboarding_aspectRatioOptions');

    const styleOptions: any[] = useMemo(() => t('storyboarding_styleOptions'), [t]);

    // --- NEW: History Management ---
    const updateScenesAndHistory = useCallback((newScenes: SceneState[]) => {
        const currentScenes = history[historyIndex];
        if (currentScenes && JSON.stringify(newScenes) === JSON.stringify(currentScenes)) {
            return;
        }
        
        setScenes(newScenes);

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newScenes);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (canUndo) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setScenes(history[newIndex]);
        }
    }, [history, historyIndex, canUndo]);

    const handleRedo = useCallback(() => {
        if (canRedo) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setScenes(history[newIndex]);
        }
    }, [history, historyIndex, canRedo]);

    const handleStyleChange = (displayValue: string) => {
        if (!displayValue) {
            setStyle(''); // Handle empty selection, which means "Auto"
            return;
        }
        const match = displayValue.match(/\(([^)]+)\)/);
        const aiValue = match ? match[1] : displayValue;
        setStyle(aiValue);
    };
    
    const displayStyleValue = useMemo(() => {
        if (!style) return '';
        const allOptions: string[] = styleOptions.flatMap((opt: any) =>
            typeof opt === 'string' ? [opt] : (opt.options || [])
        );
        for (const fullDisplayValue of allOptions) {
            const match = fullDisplayValue.match(/\(([^)]+)\)/);
            const aiValue = match ? match[1] : fullDisplayValue;
            if (aiValue === style) {
                return fullDisplayValue;
            }
        }
        return style;
    }, [style, styleOptions]);


    const resetState = useCallback(() => {
        setActiveInput('prompt');
        setIdea('');
        setScriptText('');
        setAudioFile(null);
        setReferenceImages([]);
        setScriptSummary(null);
        setScenes([]);
        setIsLoading(false);
        setLoadingMessage('');
        setError(null);
        setStyle('');
        setNumberOfScenes(0);
        setAspectRatio(aspectRatioOptions[0] || '16:9');
        setNotes('');
        setStoryboardLanguage('vi');
        setScriptType('auto');
        setKeepClothing(false);
        setKeepBackground(false);
        setHistory([[]]);
        setHistoryIndex(0);
    }, [aspectRatioOptions]);

    const handleNew = () => {
        resetState();
        fileStorage.deleteData('storyboard-state.json');
        toast.success("Storyboard mới đã được tạo.");
    };

    useEffect(() => {
        if (isOpen) {
            const loadState = async () => {
                try {
                    const savedState = await fileStorage.loadData('storyboard-state.json');
                    if (savedState) {
                        setActiveInput(savedState.activeInput || 'prompt');
                        setIdea(savedState.idea || '');
                        setScriptText(savedState.scriptText || '');
                        if (savedState.audioData) {
                            const file = dataURLtoFile(savedState.audioData.dataUrl, savedState.audioData.name, savedState.audioData.type);
                            setAudioFile(file);
                        } else {
                            setAudioFile(null);
                        }
                        setReferenceImages(savedState.referenceImages || []);
                        setScriptSummary(savedState.scriptSummary || null);
                        
                        const loadedScenes = savedState.scenes || [];
                        setScenes(loadedScenes);
                        setHistory([loadedScenes]);
                        setHistoryIndex(0);

                        setStyle(savedState.style || '');
                        setNumberOfScenes(savedState.numberOfScenes ?? 0);
                        setAspectRatio(savedState.aspectRatio || aspectRatioOptions[0]);
                        setNotes(savedState.notes || '');
                        setStoryboardLanguage(savedState.storyboardLanguage || 'vi');
                        setScriptType(savedState.scriptType || 'auto');
                        setKeepClothing(savedState.keepClothing || false);
                        setKeepBackground(savedState.keepBackground || false);
                    } else {
                        // Default state if no save found
                        setScenes([]);
                        setHistory([[]]);
                        setHistoryIndex(0);
                    }
                } catch (error) {
                    console.error("Failed to load storyboard state:", error);
                    setScenes([]);
                    setHistory([[]]);
                    setHistoryIndex(0);
                }
                setIsLoaded(true);
            };
            loadState();
        } else {
            setIsLoaded(false);
        }
    }, [isOpen, aspectRatioOptions]);

    useEffect(() => {
        if (audioFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setAudioData({
                        name: audioFile.name,
                        type: audioFile.type,
                        dataUrl: reader.result as string,
                    });
                }
            };
            reader.readAsDataURL(audioFile);
        } else {
            setAudioData(null);
        }
    }, [audioFile]);

    const debouncedState = useDebounce({
        activeInput, idea, scriptText, audioData, referenceImages,
        scriptSummary, scenes, style, numberOfScenes, aspectRatio, notes, storyboardLanguage,
        scriptType, keepClothing, keepBackground
    }, 1000);

    useEffect(() => {
        if (isOpen && isLoaded) {
            fileStorage.saveData('storyboard-state.json', debouncedState);
        }
    }, [debouncedState, isOpen, isLoaded]);

    const mapServiceSceneToState = (s: any): SceneState => ({
        scene: s.scene,
        animationDescription: s.animationDescription,
        startFrame: {
            description: s.startFrameDescription,
            status: 'idle',
            imageSource: 'reference',
        },
        endFrame: {
            description: s.endFrameDescription,
            status: 'idle',
            imageSource: 'reference',
        }
    });

    const handleGenerateScriptSummary = async () => {
        setIsLoading(true);
        setError(null);
        setLoadingMessage(t('storyboarding_generating_scenario'));
        setScriptSummary(null);

        try {
            let result: ScriptSummary;
            const referenceImagesData = await Promise.all(referenceImages.map(url => processImageInput(url)));
            const options = { style, numberOfScenes, aspectRatio, notes, keepClothing, keepBackground };

            switch (activeInput) {
                case 'text':
                    if (!scriptText.trim()) throw new Error(t('storyboarding_error_noText'));
                    result = await createScriptSummaryFromText(scriptText, referenceImagesData, options, storyboardLanguage, scriptType);
                    break;
                case 'audio':
                    if (!audioFile) throw new Error(t('storyboarding_error_noAudio'));
                    const audioData = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(audioFile);
                    });
                    result = await createScriptSummaryFromAudio({ mimeType: audioFile.type, data: audioData }, referenceImagesData, options, storyboardLanguage, scriptType);
                    break;
                case 'prompt':
                default:
                    if (!idea.trim()) throw new Error(t('storyboarding_error_noIdea'));
                    result = await createScriptSummaryFromIdea(idea, referenceImagesData, options, storyboardLanguage, scriptType);
                    break;
            }
            setScriptSummary(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('storyboarding_error_scenario');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDevelopScenesFromSummary = async () => {
        if (!scriptSummary) return;
        setIsLoading(true);
        setLoadingMessage(t('storyboarding_developing_scenes'));
        setError(null);
        updateScenesAndHistory([]);
    
        try {
            const summaryWithSceneCount = { ...scriptSummary, numberOfScenes };
            const finalScenario = await developScenesFromSummary(summaryWithSceneCount, storyboardLanguage, scriptType);
    
            if (numberOfScenes === 1 && finalScenario.scenes.length > 0) {
                const newScenes = [mapServiceSceneToState(finalScenario.scenes[0])];
                updateScenesAndHistory(newScenes);
                await handleGenerateVideoPromptForScene(0, 'json', newScenes);
            } else {
                updateScenesAndHistory(finalScenario.scenes.map(mapServiceSceneToState));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('storyboarding_error_develop');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDevelopFromText = async () => {
        if (!scriptText.trim()) {
            setError(t('storyboarding_error_noText'));
            return;
        }
        setIsLoading(true);
        setLoadingMessage(t('storyboarding_developing_scenes'));
        setError(null);
        updateScenesAndHistory([]);
        
        const summaryForDevelopment: ScriptSummary = {
            title: t('storyboarding_scriptType_auto'),
            characters: t('storyboarding_scriptType_auto'),
            setting: t('storyboarding_scriptType_auto'),
            content: scriptText,
            style: style,
            duration: '',
            notes: notes,
            numberOfScenes: numberOfScenes,
        };

        try {
            const finalScenario = await developScenesFromSummary(summaryForDevelopment, storyboardLanguage, scriptType);
            
            if (numberOfScenes === 1 && finalScenario.scenes.length > 0) {
                const newScenes = [mapServiceSceneToState(finalScenario.scenes[0])];
                updateScenesAndHistory(newScenes);
                await handleGenerateVideoPromptForScene(0, 'json', newScenes);
            } else {
                updateScenesAndHistory(finalScenario.scenes.map(mapServiceSceneToState));
            }
            
            setScriptSummary(summaryForDevelopment);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('storyboarding_error_develop');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitialScriptGeneration = () => {
        updateScenesAndHistory([]);
        handleGenerateScriptSummary();
    };
    
    const handleGenerateImage = async (sceneIndex: number, frameType: 'start' | 'end') => {
        const sceneToGenerate = scenesRef.current[sceneIndex];
        const frameToGenerate = frameType === 'start' ? sceneToGenerate.startFrame : sceneToGenerate.endFrame;

        if (!sceneToGenerate || !frameToGenerate) return;

        setScenes(prev => prev.map((s, i) => {
            if (i === sceneIndex) {
                if (frameType === 'start') return { ...s, startFrame: { ...s.startFrame, status: 'pending', error: undefined } };
                return { ...s, endFrame: { ...s.endFrame, status: 'pending', error: undefined } };
            }
            return s;
        }));
        
        try {
            let sourceImages: (string | undefined)[] = [];
            const source = frameToGenerate.imageSource;

            if (source === 'reference') {
                sourceImages = referenceImages;
            } else if (source.startsWith('data:image')) {
                sourceImages = [source];
            } else {
                const [sourceSceneIndexStr, sourceFrameType] = source.split('-');
                const sourceSceneIndex = parseInt(sourceSceneIndexStr, 10);
                if (!isNaN(sourceSceneIndex) && scenesRef.current[sourceSceneIndex]) {
                    const sourceScene = scenesRef.current[sourceSceneIndex];
                    if (sourceFrameType === 'start' && sourceScene.startFrame.imageUrl) {
                        sourceImages = [sourceScene.startFrame.imageUrl];
                    } else if (sourceFrameType === 'end' && sourceScene.endFrame.imageUrl) {
                        sourceImages = [sourceScene.endFrame.imageUrl];
                    } else {
                        sourceImages = referenceImages; // Fallback
                    }
                } else {
                    sourceImages = referenceImages; // Fallback
                }
            }
            
            let finalPrompt = frameToGenerate.description;

            if (style && style.trim() !== '') {
                const styleInstruction = language === 'vi' 
                    ? `\n\n**Phong cách (Style):** ${style}`
                    : `\n\n**Style:** ${style}`;
                finalPrompt += styleInstruction;
            }

            if (keepClothing) {
                finalPrompt += '\n\n**Yêu cầu quan trọng (Important requirement):** Giữ nguyên trang phục của nhân vật từ ảnh nguồn (Keep the character\'s clothing from the source image).';
            }
            if (keepBackground) {
                finalPrompt += '\n\n**Yêu cầu quan trọng (Important requirement):** Giữ nguyên bối cảnh/phông nền từ ảnh nguồn (Keep the background/scenery from the source image).';
            }

            const results = await generateFreeImage(
                finalPrompt, 
                1, 
                aspectRatio, 
                sourceImages[0],
                sourceImages[1],
                sourceImages[2],
                sourceImages[3],
                true
            );
            if (results.length > 0) {
                setScenes(prev => prev.map((s, i) => {
                    if (i === sceneIndex) {
                        if (frameType === 'start') return { ...s, startFrame: { ...s.startFrame, status: 'done', imageUrl: results[0] } };
                        return { ...s, endFrame: { ...s.endFrame, status: 'done', imageUrl: results[0] } };
                    }
                    return s;
                }));
                addImagesToGallery(results, 'storyboard');
            } else {
                throw new Error(t('storyboarding_error_noImage'));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('storyboarding_error_imageGen');
            setScenes(prev => prev.map((s, i) => {
                if (i === sceneIndex) {
                    if (frameType === 'start') return { ...s, startFrame: { ...s.startFrame, status: 'error', error: errorMessage } };
                    return { ...s, endFrame: { ...s.endFrame, status: 'error', error: errorMessage } };
                }
                return s;
            }));
        }
    };
    
    const handleGenerateVideo = useCallback(async (sceneIndex: number) => {
        const sceneToGenerate = scenesRef.current[sceneIndex];
        if (!sceneToGenerate) return;

        let videoPrompt = '';
        let inputImage: { mimeType: string; data: string } | undefined = undefined;

        const startImgUrl = sceneToGenerate.startFrame.imageUrl;
        const endImgUrl = sceneToGenerate.endFrame.imageUrl;

        if (startImgUrl || endImgUrl) {
            videoPrompt = sceneToGenerate.animationDescription;
            inputImage = await processImageInput(startImgUrl || endImgUrl!);
        } else {
            videoPrompt = `Start frame: ${sceneToGenerate.startFrame.description}. Animation: ${sceneToGenerate.animationDescription}. End frame: ${sceneToGenerate.endFrame.description}`;
        }

        if (!videoPrompt.trim()) {
            toast.error("Vui lòng nhập mô tả cho các khung hình hoặc chuyển động.");
            return;
        }

        setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, videoStatus: 'pending', videoError: undefined, videoOperation: undefined } : s));
        
        try {
            const operation = await startVideoGeneration(videoPrompt, inputImage);
            setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, videoOperation: operation } : s));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, videoStatus: 'error', videoError: errorMessage } : s));
        }
    }, [t]);

    useEffect(() => {
        const scenesToPoll = scenes.filter(scene => scene.videoStatus === 'pending' && scene.videoOperation);
        if (scenesToPoll.length === 0) return;

        let isCancelled = false;

        const poll = async () => {
            if (isCancelled) return;

            let tasksUpdated = false;
            const newScenes = [...scenesRef.current];

            await Promise.all(scenesToPoll.map(async (scene) => {
                const sceneIndex = scene.scene - 1;
                if (!scene.videoOperation || sceneIndex < 0 || sceneIndex >= newScenes.length) return;

                try {
                    const updatedOp = await pollVideoOperation(scene.videoOperation);
                    if (isCancelled) return;

                    if (updatedOp.done) {
                        if (updatedOp.response?.generatedVideos?.[0]?.video?.uri) {
                            const downloadLink = updatedOp.response.generatedVideos[0].video.uri;
                            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            
                            newScenes[sceneIndex] = { ...newScenes[sceneIndex], videoStatus: 'done', videoUrl: blobUrl, videoOperation: undefined };
                            addImagesToGallery([blobUrl], 'storyboard');
                        } else {
                            throw new Error(updatedOp.error?.message || "Video generation finished but no URI was found.");
                        }
                    } else {
                        newScenes[sceneIndex] = { ...newScenes[sceneIndex], videoOperation: updatedOp };
                    }
                    tasksUpdated = true;
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                    newScenes[sceneIndex] = { ...newScenes[sceneIndex], videoStatus: 'error', videoError: errorMessage, videoOperation: undefined };
                    tasksUpdated = true;
                }
            }));

            if (!isCancelled && tasksUpdated) {
                setScenes(newScenes);
            }

            const stillPending = newScenes.some(s => s.videoStatus === 'pending' && s.videoOperation);
            if (!isCancelled && stillPending) {
                setTimeout(poll, 10000);
            }
        };

        const timeoutId = setTimeout(poll, 5000);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [scenes, addImagesToGallery]);

    const handleGenerateAll = async () => {
        for (let i = 0; i < scenesRef.current.length; i++) {
            const scene = scenesRef.current[i];
            if (scene.startFrame.status !== 'done' && scene.startFrame.status !== 'pending') {
                await handleGenerateImage(i, 'start');
            }
             if (scene.endFrame.status !== 'done' && scene.endFrame.status !== 'pending') {
                await handleGenerateImage(i, 'end');
            }
        }
    };

    const handleDownloadAll = async () => {
        const imagesToDownload: ImageForZip[] = scenes.flatMap((scene, index) => {
            const sceneImages: ImageForZip[] = [];
            if (scene.startFrame.imageUrl) {
                sceneImages.push({ url: scene.startFrame.imageUrl, filename: `scene-${scene.scene}-start`, folder: 'storyboard' });
            }
            if (scene.endFrame.imageUrl) {
                sceneImages.push({ url: scene.endFrame.imageUrl, filename: `scene-${scene.scene}-end`, folder: 'storyboard' });
            }
            return sceneImages;
        });
    
        if (imagesToDownload.length === 0) {
            toast.error(t('storyboarding_error_noImagesToDownload'));
            return;
        }
        
        await downloadAllImagesAsZip(imagesToDownload, 'storyboard.zip');
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'text' | 'audio') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'text') {
            const reader = new FileReader();
            reader.onload = (event) => setScriptText(event.target?.result as string);
            reader.readAsText(file);
        } else if (type === 'audio') {
            setAudioFile(file);
        }
        e.target.value = '';
    };
    
    const handleRefDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingRef(true); };
    const handleRefDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingRef(false); };
    const handleRefDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingRef(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter((file: any) => file.type.startsWith('image/'));
            const remainingSlots = 4 - referenceImages.length;
            const filesToAdd = files.slice(0, remainingSlots);
            filesToAdd.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => { setReferenceImages(prev => [...prev, reader.result as string]); };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    const handleGallerySelect = (imageUrl: string) => {
        if (pickingCustomImageFor !== null) {
            handleImageSourceChange(pickingCustomImageFor.index, pickingCustomImageFor.frameType, imageUrl);
        } else if (referenceImages.length < 4) {
            setReferenceImages(prev => [...prev, imageUrl]);
        }
        setIsGalleryPickerOpen(false);
        setPickingCustomImageFor(null);
    };

    const handleSummaryChange = useCallback((field: keyof ScriptSummary, value: string) => {
        setScriptSummary(prev => prev ? { ...prev, [field]: value } : null);
    }, []);

    const handleEditSceneDescription = (index: number, frameType: 'start' | 'end', newDescription: string) => {
        setScenes(prev => prev.map((s, i) => {
            if (i === index) {
                return frameType === 'start'
                    ? { ...s, startFrame: { ...s.startFrame, description: newDescription } }
                    : { ...s, endFrame: { ...s.endFrame, description: newDescription } };
            }
            return s;
        }));
    };
    
    const handleEditSceneAnimation = (index: number, newAnimation: string) => {
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, animationDescription: newAnimation } : s));
    };

    const handleImageSourceChange = (sceneIndex: number, frameType: 'start' | 'end', newSource: string) => {
        setScenes(prev => prev.map((s, i) => {
            if (i === sceneIndex) {
                 return frameType === 'start'
                    ? { ...s, startFrame: { ...s.startFrame, imageSource: newSource, imageUrl: newSource.startsWith('data:image') ? newSource : s.startFrame.imageUrl } }
                    : { ...s, endFrame: { ...s.endFrame, imageSource: newSource, imageUrl: newSource.startsWith('data:image') ? newSource : s.endFrame.imageUrl } };
            }
            return s;
        }));
    };
    
    const handleClearImageForScene = useCallback((sceneIndex: number, frameType: 'start' | 'end') => {
        setScenes(prev => prev.map((s, i) => {
            if (i === sceneIndex) {
                const updatedFrame = {
                    ... (frameType === 'start' ? s.startFrame : s.endFrame),
                    status: 'idle' as const,
                    imageUrl: undefined,
                    imageSource: 'reference', // Reset to default source
                    error: undefined
                };
                return frameType === 'start'
                    ? { ...s, startFrame: updatedFrame }
                    : { ...s, endFrame: updatedFrame };
            }
            return s;
        }));
    }, []);

    const handleSelectCustomImage = (sceneIndex: number, frameType: 'start' | 'end') => {
        setPickingCustomImageFor({ index: sceneIndex, frameType });
        setIsGalleryPickerOpen(true);
    };

    const handleEditImage = (index: number, frameType: 'start' | 'end') => {
        const scene = scenes[index];
        if (!scene) return;
        const frame = frameType === 'start' ? scene.startFrame : scene.endFrame;

        if (frame && frame.imageUrl) {
            openImageEditor(frame.imageUrl, (newUrl) => {
                 setScenes(prev => prev.map((s, i) => {
                    if (i === index) {
                         const updatedFrame = { ...frame, imageUrl: newUrl, imageSource: newUrl };
                         return frameType === 'start'
                            ? { ...s, startFrame: updatedFrame }
                            : { ...s, endFrame: updatedFrame };
                    }
                    return s;
                }));
                addImagesToGallery([newUrl], 'storyboard');
            });
        }
    };

    const handlePreviewImage = (index: number, frameType: 'start' | 'end') => {
        const scene = scenes[index];
        if (!scene) return;
        const frame = frameType === 'start' ? scene.startFrame : scene.endFrame;
        
        if (frame && frame.imageUrl) {
            const globalIndex = imageGallery.indexOf(frame.imageUrl);
            if (globalIndex !== -1) {
                openLightbox(globalIndex);
            }
        }
    };

    const handleDownloadImage = (index: number, frameType: 'start' | 'end') => {
        const scene = scenes[index];
        if (!scene) return;
        const frame = frameType === 'start' ? scene.startFrame : scene.endFrame;
        
        if (frame && frame.imageUrl) {
            downloadImage(frame.imageUrl, `storyboard-scene-${scene.scene}-${frameType}`);
        }
    };

    const handleAddScene = useCallback(() => {
        const newSceneNumber = scenes.length > 0 ? Math.max(...scenes.map(s => s.scene)) + 1 : 1;
        const newScene: SceneState = {
            scene: newSceneNumber,
            startFrame: {
                description: t('storyboarding_startFrame_placeholder', newSceneNumber),
                status: 'idle',
                imageSource: 'reference',
            },
            animationDescription: '',
            endFrame: {
                description: t('storyboarding_endFrame_placeholder', newSceneNumber),
                status: 'idle',
                imageSource: 'reference',
            },
        };
        updateScenesAndHistory([...scenes, newScene]);
    }, [scenes, t, updateScenesAndHistory]);

    const handleEditSceneVideoPrompt = (index: number, newPrompt: string) => {
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, videoPrompt: newPrompt } : s));
    };

    const handleGenerateVideoPromptForScene = async (sceneIndex: number, promptMode: 'auto' | 'start-end' | 'json', scenesToUse: SceneState[] = scenesRef.current) => {
        const sceneToProcess = scenesToUse[sceneIndex];
        if (!sceneToProcess) return;

        try {
            const result = await generateVideoPromptFromScenes(
                sceneToProcess.startFrame.description,
                sceneToProcess.animationDescription,
                sceneToProcess.endFrame.description,
                storyboardLanguage,
                promptMode,
                scriptType
            );
            setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, videoPrompt: result } : s));

        } catch (err) {
            console.error("Error generating video prompt in modal:", err);
            throw err;
        }
    };
    
    const handleRegenerateScenePrompt = async (index: number, frameType: 'start' | 'end', modificationPrompt: string) => {
        const originalScene = scenes[index];
        if (!originalScene) return;
        const originalFrame = frameType === 'start' ? originalScene.startFrame : originalScene.endFrame;

        setIsLoading(true);
        setLoadingMessage(`Đang viết lại prompt cho Cảnh ${originalScene.scene}...`);
        setError(null);

        try {
            const newDescription = await refineSceneDescription(originalFrame.description, modificationPrompt, storyboardLanguage);
            handleEditSceneDescription(index, frameType, newDescription);
            toast.success(`Đã tạo lại prompt cho Cảnh ${originalScene.scene}.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Không thể tạo lại prompt.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateSceneTransition = async (index: number, modificationPrompt: string) => {
        const originalScene = scenes[index];
        if (!originalScene || originalScene.animationDescription === undefined) return;

        setIsLoading(true);
        setLoadingMessage(`Đang viết lại chuyển động cho Cảnh ${originalScene.scene}...`);
        setError(null);

        try {
            const newTransition = await refineSceneTransition(originalScene.animationDescription, modificationPrompt, storyboardLanguage);
            handleEditSceneAnimation(index, newTransition);
            toast.success(`Đã tạo lại chuyển động cho Cảnh ${originalScene.scene}.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Không thể tạo lại chuyển động.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        if (scenes.length === 0 && !scriptSummary) {
            toast.error(t('storyboarding_export_disabled'));
            return;
        }
    
        const exportState = {
            version: 'storyboard-v1',
            activeInput,
            idea,
            scriptText,
            audioData,
            referenceImages,
            style,
            numberOfScenes,
            aspectRatio,
            notes,
            storyboardLanguage,
            scriptType,
            keepClothing,
            keepBackground,
            scriptSummary,
            scenes,
        };
    
        downloadJson(exportState, `storyboard-session-${Date.now()}.json`);
    };

    const processImportFile = (file: File) => {
        if (!file || file.type !== 'application/json') {
            toast.error(t('storyboarding_import_error'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result as string;
                const importedState = JSON.parse(result);

                if (importedState.version !== 'storyboard-v1' || !Array.isArray(importedState.scenes)) {
                    throw new Error(t('storyboarding_import_error'));
                }

                resetState(); 
                setActiveInput(importedState.activeInput || 'prompt');
                setIdea(importedState.idea || '');
                setScriptText(importedState.scriptText || '');
                
                if (importedState.audioData) {
                    const newAudioFile = dataURLtoFile(importedState.audioData.dataUrl, importedState.audioData.name, importedState.audioData.type);
                    setAudioFile(newAudioFile);
                } else {
                    setAudioFile(null);
                }

                setReferenceImages(importedState.referenceImages || []);
                setStyle(importedState.style || '');
                setNumberOfScenes(importedState.numberOfScenes ?? 0);
                setAspectRatio(importedState.aspectRatio || aspectRatioOptions[0]);
                setNotes(importedState.notes || '');
                setStoryboardLanguage(importedState.storyboardLanguage || 'vi');
                setScriptType(importedState.scriptType || 'auto');
                setKeepClothing(importedState.keepClothing || false);
                setKeepBackground(importedState.keepBackground || false);
                setScriptSummary(importedState.scriptSummary || null);
                
                const importedScenes = importedState.scenes || [];
                setScenes(importedScenes);
                setHistory([importedScenes]);
                setHistoryIndex(0);
                
                toast.success(t('storyboarding_import_success'));

            } catch (err) {
                toast.error(err instanceof Error ? err.message : t('storyboarding_import_error'));
                console.error("Failed to import storyboard:", err);
            }
        };
        reader.readAsText(file);
    };

    const handleFileSelectedForImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processImportFile(file);
        }
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            if (e.dataTransfer.items[0].kind === 'file' && e.dataTransfer.items[0].type === 'application/json') {
                setIsDraggingOver(true);
            }
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processImportFile(e.dataTransfer.files[0]);
        }
    };

    const handleDeleteScene = useCallback((indexToDelete: number) => {
        const newScenes = scenes.filter((_, index) => index !== indexToDelete)
                              .map((scene, index) => ({ ...scene, scene: index + 1 }));
        updateScenesAndHistory(newScenes);
    }, [scenes, updateScenesAndHistory]);
    
    const handleMoveScene = useCallback((indexToMove: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && indexToMove === 0) || (direction === 'down' && indexToMove === scenes.length - 1)) {
            return;
        }

        const newScenes = [...scenes];
        const targetIndex = direction === 'up' ? indexToMove - 1 : indexToMove + 1;
        
        const sceneNum1 = newScenes[indexToMove].scene;
        const sceneNum2 = newScenes[targetIndex].scene;
        newScenes[indexToMove].scene = sceneNum2;
        newScenes[targetIndex].scene = sceneNum1;
        
        [newScenes[indexToMove], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[indexToMove]];
        
        updateScenesAndHistory(newScenes);
    }, [scenes, updateScenesAndHistory]);

    const handleCustomImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && uploadingImageFor) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newUrl = reader.result as string;
                handleImageSourceChange(uploadingImageFor.index, uploadingImageFor.frameType, newUrl);
                addImagesToGallery([newUrl], 'upload');
            };
            reader.readAsDataURL(file);
        }
        if(e.target) e.target.value = '';
        setUploadingImageFor(null);
    };
    
    const handleImageFileForScene = useCallback((file: File, sceneIndex: number, frameType: 'start' | 'end') => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const newUrl = reader.result as string;
            handleImageSourceChange(sceneIndex, frameType, newUrl);
            addImagesToGallery([newUrl], 'upload');
        };
        reader.readAsDataURL(file);
    }, [handleImageSourceChange, addImagesToGallery]);

    const handleTriggerCustomImageUpload = (index: number, frameType: 'start' | 'end') => {
        setUploadingImageFor({ index, frameType });
        customImageUploadRef.current?.click();
    };
    
    const videoPlatforms = [
        { name: 'Kling', url: 'https://app.klingai.com/global/image-to-video/frame-mode/new' },
        { name: 'Veo', url: 'https://labs.google/fx/vi/tools/flow' },
        { name: 'Higgsfield', url: 'https://higgsfield.ai/' },
        { name: 'Dreamina', url: 'https://dreamina.capcut.com/ai-tool/home' },
        { name: 'Sora', url: 'https://sora.chatgpt.com/explore' },
        { name: 'Wan', url: 'https://wan.video/' },
        { name: 'ComfyUI', url: 'https://colab.research.google.com/github/StableDiffusionVN/SDVN-WebUI/blob/main/SDVN_WebUI_v3.ipynb' },
        { name: 'Runway', url: 'https://runwayml.com/' },
        { name: 'Midjourney', url: 'https://www.midjourney.com/explore?tab=random' },
    ];

    return ReactDOM.createPortal(
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onHide} className="modal-overlay z-[60]" aria-modal="true" role="dialog" >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content !max-w-[95vw] !w-[95vw] !h-[95vh] flex flex-col !p-0 overflow-hidden relative"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input type="file" ref={customImageUploadRef} onChange={handleCustomImageFileSelect} className="hidden" accept="image/*" />
                            <div className="flex-grow flex flex-row overflow-hidden">
                                <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-4 border-r border-white/10">
                                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                        <h3 className="base-font font-bold text-xl text-yellow-400">{t('extraTools_storyboarding')}</h3>
                                        <button onClick={onHide} className="p-2 rounded-full hover:bg-white/10" aria-label={t('common_cancel')}><CloseIcon className="h-5 w-5" /></button>
                                    </div>
                                    <div className="flex-grow flex flex-col overflow-y-auto space-y-4 pr-2 -mr-4">
                                        <StoryboardingInput
                                            activeInput={activeInput} setActiveInput={setActiveInput} idea={idea} setIdea={setIdea} scriptText={scriptText} setScriptText={setScriptText}
                                            audioFile={audioFile} audioInputRef={audioInputRef} textInputRef={textInputRef} handleFileSelect={handleFileSelect}
                                            referenceImages={referenceImages} isDraggingRef={isDraggingRef} handleRefDragOver={handleRefDragOver} handleRefDragLeave={handleRefDragLeave}
                                            handleRefDrop={handleRefDrop} setReferenceImages={setReferenceImages} setIsGalleryPickerOpen={setIsGalleryPickerOpen}
                                            style={displayStyleValue} setStyle={handleStyleChange} styleOptions={styleOptions}
                                            numberOfScenes={numberOfScenes} setNumberOfScenes={setNumberOfScenes}
                                            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} aspectRatioOptions={aspectRatioOptions}
                                            notes={notes} setNotes={setNotes}
                                            storyboardLanguage={storyboardLanguage}
                                            setStoryboardLanguage={setStoryboardLanguage}
                                            scriptType={scriptType}
                                            setScriptType={setScriptType}
                                            keepClothing={keepClothing}
                                            setKeepClothing={setKeepClothing}
                                            keepBackground={keepBackground}
                                            setKeepBackground={setKeepBackground}
                                        />
                                        {scriptSummary && (
                                            <StoryboardingSummary scriptSummary={scriptSummary} onSummaryChange={handleSummaryChange} />
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 pt-4 border-t border-white/10">
                                        {(() => {
                                            if (activeInput === 'text') {
                                                if (scenes.length === 0) {
                                                    return (
                                                        <button onClick={handleDevelopFromText} className="btn btn-primary btn-sm w-full" disabled={isLoading || !scriptText.trim()}>
                                                            {isLoading ? loadingMessage : t('storyboarding_developScenes')}
                                                        </button>
                                                    );
                                                } else {
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => { setScriptSummary(null); updateScenesAndHistory([]); }} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                                                {t('storyboarding_editInput')}
                                                            </button>
                                                            <button onClick={handleDevelopFromText} className="btn btn-primary btn-sm flex-grow" disabled={isLoading}>
                                                                {isLoading ? loadingMessage : t('storyboarding_redevelopScenes')}
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                            }

                                            if (!scriptSummary) {
                                                return (
                                                    <button onClick={handleInitialScriptGeneration} className="btn btn-primary btn-sm w-full" disabled={isLoading}>
                                                        {isLoading ? loadingMessage : t('storyboarding_idea_submit')}
                                                    </button>
                                                );
                                            }
                                            if (scenes.length === 0) {
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={handleGenerateScriptSummary} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                                            {t('storyboarding_regenerateScript')}
                                                        </button>
                                                        <button onClick={handleDevelopScenesFromSummary} className="btn btn-primary btn-sm flex-grow" disabled={isLoading}>
                                                            {isLoading && loadingMessage === t('storyboarding_developing_scenes') ? loadingMessage : t('storyboarding_developScenes')}
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleGenerateScriptSummary} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                                        {t('storyboarding_regenerateScript')}
                                                    </button>
                                                    <button onClick={handleDevelopScenesFromSummary} className="btn btn-primary btn-sm flex-grow" disabled={isLoading}>
                                                        {isLoading && loadingMessage === t('storyboarding_developing_scenes') ? loadingMessage : t('storyboarding_redevelopScenes')}
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                        {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
                                    </div>
                                </aside>

                                <main className="flex-1 flex flex-col p-4 overflow-hidden bg-neutral-800/30">
                                    <div className="flex-shrink-0 pb-4 mb-4 border-b border-white/10 flex items-center justify-end gap-2">
                                        <input type="file" ref={importInputRef} onChange={handleFileSelectedForImport} accept=".json" className="hidden" />
                                        <button onClick={() => importInputRef.current?.click()} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                            {t('storyboarding_import')}
                                        </button>
                                        <button onClick={handleExport} className="btn btn-secondary btn-sm" disabled={isLoading || (scenes.length === 0 && !scriptSummary)} title={(scenes.length === 0 && !scriptSummary) ? t('storyboarding_export_disabled') : ''}>
                                            {t('storyboarding_export')}
                                        </button>
                                        <button onClick={handleNew} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                            {t('storyboarding_new')}
                                        </button>
                                        <button onClick={handleGenerateAll} className="btn btn-secondary btn-sm" disabled={isLoading || scenes.length === 0 || scenes.some(s => s.startFrame.status === 'pending' || s.endFrame.status === 'pending')}>
                                            {t('storyboarding_generateAll')}
                                        </button>
                                        <button onClick={handleDownloadAll} className="btn btn-secondary btn-sm" disabled={isLoading || scenes.every(s => !s.startFrame.imageUrl && !s.endFrame.imageUrl)}>
                                            {t('common_downloadAll')}
                                        </button>
                                        <div className="w-px h-5 bg-white/20 mx-1" />
                                        <button onClick={handleUndo} className="btn-search" disabled={!canUndo} title={t('infoModal_appNav_items.undo')}>
                                            <UndoIcon className="h-5 w-5" strokeWidth={2} />
                                        </button>
                                        <button onClick={handleRedo} className="btn-search" disabled={!canRedo} title={t('infoModal_appNav_items.redo')}>
                                            <RedoIcon className="h-5 w-5" strokeWidth={2} />
                                        </button>
                                    </div>
                                    <div className="flex-grow overflow-y-auto">
                                        <StoryboardingScenes
                                            scenes={scenes}
                                            referenceImages={referenceImages}
                                            onGenerateImage={handleGenerateImage}
                                            onGenerateVideo={handleGenerateVideo}
                                            onEditSceneDescription={handleEditSceneDescription}
                                            onEditSceneAnimation={handleEditSceneAnimation}
                                            onImageSourceChange={handleImageSourceChange}
                                            onSelectCustomImage={handleSelectCustomImage}
                                            onUploadCustomImage={handleTriggerCustomImageUpload}
                                            onClearImage={handleClearImageForScene}
                                            onImageFile={handleImageFileForScene}
                                            onEditImage={handleEditImage}
                                            onPreviewImage={handlePreviewImage}
                                            onDownloadImage={handleDownloadImage}
                                            onAddScene={handleAddScene}
                                            onGenerateVideoPrompt={handleGenerateVideoPromptForScene}
                                            onEditSceneVideoPrompt={handleEditSceneVideoPrompt}
                                            onRegenerateScenePrompt={handleRegenerateScenePrompt}
                                            onRegenerateAnimation={handleRegenerateSceneTransition}
                                            aspectRatio={aspectRatio}
                                            onDeleteScene={handleDeleteScene}
                                            onMoveScene={handleMoveScene}
                                        />
                                    </div>
                                </main>
                            </div>

                            <div className="flex-shrink-0 border-t border-white/10 px-4 py-2 flex items-center justify-between bg-neutral-900/50">
                                <p className="text-xs text-neutral-500 mr-4 flex-shrink-0">
                                    {t('storyboarding_videoPlatforms_note')}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    {videoPlatforms.map(platform => (
                                        <a
                                            key={platform.name}
                                            href={platform.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-neutral-800 text-neutral-300 text-xs px-3 py-1 rounded-md hover:bg-neutral-700 hover:text-white transition-colors"
                                        >
                                            {platform.name}
                                        </a>
                                    ))}
                                </div>
                            </div>

                             <AnimatePresence>
                                {isDraggingOver && (
                                    <motion.div
                                        className="absolute inset-0 z-50 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1} />
                                        <p className="text-2xl font-bold text-yellow-400">{t('storyboarding_dropPrompt')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <GalleryPicker
                isOpen={isGalleryPickerOpen}
                onClose={() => { setIsGalleryPickerOpen(false); setPickingCustomImageFor(null); }}
                onSelect={handleGallerySelect}
                images={imageGallery}
            />
            <Lightbox
                images={imageGallery}
                selectedIndex={lightboxIndex}
                onClose={closeLightbox}
                onNavigate={navigateLightbox}
            />
        </>,
        document.body
    );
};
