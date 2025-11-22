
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { generateMidAutumnImage, analyzeForConcepts } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    useMediaQuery,
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    type MidAutumnCreatorState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
} from './uiUtils';
import { MagicWandIcon } from './icons';
import { editImageWithPrompt } from '../services/gemini/imageEditingService';

interface MidAutumnCreatorProps {
    mainTitle: string;
    subtitle: string;
    minIdeas: number;
    maxIdeas: number;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    uploaderCaptionStyle: string;
    uploaderDescriptionStyle: string;
    addImagesToGallery: (images: string[]) => void;
    appState: MidAutumnCreatorState;
    onStateChange: (newState: MidAutumnCreatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}

const MidAutumnCreator: React.FC<MidAutumnCreatorProps> = (props) => {
    const { 
        minIdeas, maxIdeas, 
        uploaderCaption, uploaderDescription, uploaderCaptionStyle, uploaderDescriptionStyle,
        addImagesToGallery,
        appState, onStateChange, onReset,
        logGeneration,
        ...headerProps
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [localPrompt, setLocalPrompt] = useState(appState.options.additionalPrompt);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const hasLoggedGeneration = useRef(false);

    useEffect(() => {
        setLocalPrompt(appState.options.additionalPrompt);
    }, [appState.options.additionalPrompt]);
    
    const IDEAS_BY_CATEGORY = t('midAutumnCreator_ideasByCategory');
    const ASPECT_RATIO_OPTIONS = t('aspectRatioOptions');

    const outputLightboxImages = appState.selectedIdeas
        .map(idea => appState.generatedImages[idea])
        .filter(img => img?.status === 'done' && img.url)
        .map(img => img.url!);

    const lightboxImages = [appState.uploadedImage, appState.styleReferenceImage, ...outputLightboxImages].filter((img): img is string => !!img);
    
    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            uploadedImage: imageDataUrl,
            generatedImages: {},
            selectedIdeas: [],
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl], 'upload');
    };
    
    const handleStyleReferenceImageChange = (imageDataUrl: string | null) => {
        onStateChange({
            ...appState,
            styleReferenceImage: imageDataUrl,
            selectedIdeas: [],
        });
        if (imageDataUrl) {
            addImagesToGallery([imageDataUrl], 'upload');
        }
    };

    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, handleImageSelectedForUploader);
    }, [appState, onStateChange]);
    
    const handleUploadedImageChange = (newUrl: string | null) => {
        onStateChange({ 
            ...appState, 
            uploadedImage: newUrl,
            stage: newUrl ? 'configuring' : 'idle' 
        });
        if (newUrl) {
            addImagesToGallery([newUrl], 'upload');
        }
    };

    const handleOptionChange = (field: keyof MidAutumnCreatorState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value },
        });
    };

    const handleIdeaSelect = (idea: string) => {
        const { selectedIdeas } = appState;
        let newSelectedIdeas: string[];

        if (selectedIdeas.includes(idea)) {
            newSelectedIdeas = selectedIdeas.filter(p => p !== idea);
        } else if (selectedIdeas.length < maxIdeas) {
            newSelectedIdeas = [...selectedIdeas, idea];
        } else {
            toast.error(t('midAutumnCreator_maxIdeasError', maxIdeas));
            return;
        }

        onStateChange({ ...appState, selectedIdeas: newSelectedIdeas });
    };

    const executeGeneration = async (ideas?: string[]) => {
        if (!appState.uploadedImage) return;

        hasLoggedGeneration.current = false;

        if (appState.styleReferenceImage) {
            const idea = "Style Reference";
            const preGenState = { ...appState, selectedIdeas: [idea] };
            const stage: 'generating' = 'generating';
            // FIX: Capture intermediate state to pass to subsequent updates, avoiding stale state issues.
            // FIX: The status property was being inferred as a generic 'string'. Using 'as const' ensures
            // it's typed as a literal, which is assignable to the 'ImageStatus' type.
            const generatingState = { ...appState, stage, generatedImages: { [idea]: { status: 'pending' as const } }, selectedIdeas: [idea] };
            onStateChange(generatingState);

            try {
                const resultUrl = await generateMidAutumnImage(
                    appState.uploadedImage,
                    '',
                    appState.options.additionalPrompt,
                    appState.options.removeWatermark,
                    appState.options.aspectRatio,
                    appState.styleReferenceImage
                );
                const settingsToEmbed = {
                    viewId: 'mid-autumn-creator',
                    state: { ...preGenState, stage: 'configuring', generatedImages: {}, historicalImages: [], error: null },
                };
                const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
                logGeneration('mid-autumn-creator', preGenState, urlWithMetadata);
                // FIX: Pass a state object instead of a function to `onStateChange`.
                onStateChange({
                    ...generatingState,
                    stage: 'results',
                    // FIX: Cast generatedImages to any to resolve TS error
                    generatedImages: { [idea]: { status: 'done' as const, url: urlWithMetadata } } as any,
                    historicalImages: [...generatingState.historicalImages, { idea, url: urlWithMetadata }],
                });
                addImagesToGallery([urlWithMetadata], 'outputs');
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                // FIX: Pass a state object instead of a function to `onStateChange`.
                onStateChange({
                    ...generatingState,
                    stage: 'results',
                    // FIX: Cast generatedImages to any to resolve TS error
                    generatedImages: { [idea]: { status: 'error' as const, error: errorMessage } } as any,
                });
            }
            return;
        }

        if (!ideas || ideas.length === 0) return;
        if (ideas.length > maxIdeas && !ideas.includes(t('midAutumnCreator_randomConcept'))) {
            toast.error(t('midAutumnCreator_maxIdeasError', maxIdeas));
            return;
        }
        
        const preGenState = { ...appState, selectedIdeas: ideas };
        const randomConceptString = t('midAutumnCreator_randomConcept');
        
        let ideasToGenerate = [...ideas];
        const randomCount = ideasToGenerate.filter(i => i === randomConceptString).length;

        if (randomCount > 0) {
            setIsAnalyzing(true);
            try {
                const allCategories = IDEAS_BY_CATEGORY.filter((c: any) => c.key !== 'random');
                const suggestedCategories = await analyzeForConcepts(appState.uploadedImage, allCategories);
                
                let ideaPool: string[] = [];
                if (suggestedCategories.length > 0) {
                    ideaPool = allCategories
                        .filter((c: any) => suggestedCategories.includes(c.category))
                        .flatMap((c: any) => c.ideas);
                }
                
                if (ideaPool.length === 0) {
                    ideaPool = allCategories.flatMap((c: any) => c.ideas);
                }
                
                const randomIdeas: string[] = [];
                for (let i = 0; i < randomCount; i++) {
                    if (ideaPool.length > 0) {
                         const randomIndex = Math.floor(Math.random() * ideaPool.length);
                         randomIdeas.push(ideaPool[randomIndex]);
                         ideaPool.splice(randomIndex, 1);
                    }
                }
                ideasToGenerate = ideasToGenerate.filter(i => i !== randomConceptString).concat(randomIdeas);
                ideasToGenerate = [...new Set(ideasToGenerate)];
            } catch (err) {
                toast.error(t('midAutumnCreator_analysisError'));
                setIsAnalyzing(false);
                return;
            } finally {
                setIsAnalyzing(false);
            }
        }

        const stage : 'generating' = 'generating';
        onStateChange({ ...appState, stage: stage });
        
        const initialGeneratedImages = { ...appState.generatedImages };
        ideasToGenerate.forEach(idea => {
            // FIX: Add 'as const' to prevent type widening of 'status' to string.
            initialGeneratedImages[idea] = { status: 'pending' as const };
        });
        
        onStateChange({ ...appState, stage: stage, generatedImages: initialGeneratedImages, selectedIdeas: ideasToGenerate });

        const concurrencyLimit = 2;
        const ideasQueue = [...ideasToGenerate];
        
        let currentAppState: MidAutumnCreatorState = { ...appState, stage: stage, generatedImages: initialGeneratedImages, selectedIdeas: ideasToGenerate };
        const settingsToEmbed = {
            viewId: 'mid-autumn-creator',
            state: { ...preGenState, stage: 'configuring', generatedImages: {}, historicalImages: [], error: null },
        };

        const processIdea = async (idea: string) => {
            try {
                const resultUrl = await generateMidAutumnImage(appState.uploadedImage!, idea, appState.options.additionalPrompt, appState.options.removeWatermark, appState.options.aspectRatio);
                const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
                
                if (!hasLoggedGeneration.current) {
                    logGeneration('mid-autumn-creator', preGenState, urlWithMetadata);
                    hasLoggedGeneration.current = true;
                }

                currentAppState = {
                    ...currentAppState,
                    generatedImages: {
                        ...currentAppState.generatedImages,
                        // FIX: Add 'as const' to prevent type widening of 'status' to string.
                        // FIX: Cast to any to resolve TS error
                        [idea]: { status: 'done' as const, url: urlWithMetadata } as any,
                    },
                    historicalImages: [...currentAppState.historicalImages, { idea, url: urlWithMetadata }],
                };
                onStateChange(currentAppState);
                addImagesToGallery([urlWithMetadata], 'outputs');

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                 currentAppState = {
                    ...currentAppState,
                    generatedImages: {
                        ...currentAppState.generatedImages,
                        // FIX: Add 'as const' to prevent type widening of 'status' to string.
                        // FIX: Cast to any to resolve TS error
                        [idea]: { status: 'error' as const, error: errorMessage } as any,
                    },
                };
                onStateChange(currentAppState);
                console.error(`Failed to generate image for ${idea}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (ideasQueue.length > 0) {
                const idea = ideasQueue.shift();
                if (idea) {
                    await processIdea(idea);
                }
            }
        });

        await Promise.all(workers);
        
        onStateChange({ ...currentAppState, stage: 'results' });
    };

    const handleGenerateClick = async () => {
        if (appState.styleReferenceImage) {
            await executeGeneration();
        } else {
            const effectiveIdeas = appState.selectedIdeas.length > 0
                ? appState.selectedIdeas
                : [t('midAutumnCreator_randomConcept')];
            await executeGeneration(effectiveIdeas);
        }
    };

    const handleRandomGenerateClick = async () => {
        onStateChange({ ...appState, styleReferenceImage: null });
        await executeGeneration([t('midAutumnCreator_randomConcept')]);
    };

    const handleRegenerateIdea = async (idea: string, customPrompt: string) => {
        // FIX: Cast to any to fix type error on 'status' property.
        const imageToEditState = appState.generatedImages[idea] as any;
        if (!imageToEditState || imageToEditState.status !== 'done' || !imageToEditState.url) {
            return;
        }
        
        const imageUrlToEdit = imageToEditState.url;
        const preGenState = { ...appState };
        
        onStateChange({
            ...appState,
            // FIX: Add 'as const' to prevent type widening of 'status' to string.
            generatedImages: { ...appState.generatedImages, [idea]: { status: 'pending' as const } } as any
        });

        try {
            const resultUrl = await editImageWithPrompt(imageUrlToEdit, customPrompt);
            const settingsToEmbed = {
                viewId: 'mid-autumn-creator',
                state: { ...appState, stage: 'configuring', generatedImages: {}, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('mid-autumn-creator', preGenState, urlWithMetadata);
            onStateChange({
                ...appState,
                // FIX: Add 'as const' to prevent type widening of 'status' to string.
                generatedImages: { ...appState.generatedImages, [idea]: { status: 'done' as const, url: urlWithMetadata } } as any,
                historicalImages: [...appState.historicalImages, { idea: `${idea}-edit`, url: urlWithMetadata }],
            });
            addImagesToGallery([urlWithMetadata], 'outputs');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
             onStateChange({
                ...appState,
                // FIX: Add 'as const' to prevent type widening of 'status' to string.
                generatedImages: { ...appState.generatedImages, [idea]: { status: 'error' as const, error: errorMessage } } as any
            });
            console.error(`Failed to regenerate image for ${idea}:`, err);
        }
    };
    
     const handleGeneratedImageChange = (idea: string) => (newUrl: string) => {
        const newGeneratedImages = { ...appState.generatedImages, [idea]: { status: 'done' as 'done', url: newUrl } };
        const newHistorical = [...appState.historicalImages, { idea: `${idea}-edit`, url: newUrl }];
        onStateChange({ ...appState, generatedImages: newGeneratedImages as any, historicalImages: newHistorical });
        addImagesToGallery([newUrl], 'outputs');
    };
    
    const handleChooseOtherIdeas = () => {
        onStateChange({ ...appState, stage: 'configuring', generatedImages: {}, historicalImages: [] });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.uploadedImage) {
            inputImages.push({
                url: appState.uploadedImage,
                filename: 'anh-goc',
                folder: 'input',
            });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'anh-trung-thu.zip',
            baseOutputFilename: 'anh-trung-thu',
        });
    };

    const isLoading = appState.stage === 'generating' || isAnalyzing;
    const getButtonText = () => {
        if (isAnalyzing) return t('midAutumnCreator_analyzing');
        if (isLoading) return t('common_creating');
        return t('midAutumnCreator_createButton');
    };
    const hasPartialError = appState.stage === 'results' && Object.values(appState.generatedImages).some((img: any) => img.status === 'error');

    const inputImagesForResults = [];
    if (appState.uploadedImage) {
        inputImagesForResults.push({
            url: appState.uploadedImage,
            caption: t('common_originalImage'),
            onClick: () => openLightbox(lightboxImages.indexOf(appState.uploadedImage!))
        });
    }
    if (appState.styleReferenceImage) {
        inputImagesForResults.push({
            url: appState.styleReferenceImage,
            caption: t('common_referenceImage'),
            onClick: () => openLightbox(lightboxImages.indexOf(appState.styleReferenceImage!))
        });
    }

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
            {(appState.stage === 'idle' || appState.stage === 'configuring') && (
                <AppScreenHeader {...headerProps} />
            )}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <ImageUploader 
                    onImageChange={handleImageSelectedForUploader}
                    uploaderCaption={uploaderCaption}
                    uploaderDescription={uploaderDescription}
                    placeholderType="person"
                />
            )}

            {appState.stage === 'configuring' && appState.uploadedImage && (
                <motion.div 
                    className="flex flex-col items-center gap-6 w-full max-w-6xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                     <div className="flex flex-col md:flex-row items-start justify-center gap-8">
                        <ActionablePolaroidCard
                            type="photo-input"
                            mediaUrl={appState.uploadedImage}
                            caption={t('midAutumnCreator_yourImageCaption')}
                            status="done"
                            onClick={() => openLightbox(lightboxImages.indexOf(appState.uploadedImage!))}
                            onImageChange={handleUploadedImageChange}
                        />
                        <div className="w-full md:w-auto">
                            <ActionablePolaroidCard
                                type="style-input"
                                mediaUrl={appState.styleReferenceImage ?? undefined}
                                caption={uploaderCaptionStyle}
                                placeholderType='magic'
                                status='done'
                                onImageChange={handleStyleReferenceImageChange}
                                onClick={appState.styleReferenceImage ? () => openLightbox(lightboxImages.indexOf(appState.styleReferenceImage!)) : undefined}
                            />
                            <p className="mt-4 text-center text-sm text-neutral-400 max-w-xs mx-auto">{uploaderDescriptionStyle}</p>
                        </div>
                    </div>

                    {!appState.styleReferenceImage ? (
                        <div className="w-full max-w-4xl text-center mt-4">
                            <h2 className="base-font font-bold text-2xl text-neutral-200">{t('midAutumnCreator_selectIdeasTitle', minIdeas, maxIdeas)}</h2>
                            <p className="text-neutral-400 mb-4">{t('midAutumnCreator_selectedCount', appState.selectedIdeas.length, maxIdeas)}</p>
                            <div className="mb-4">
                                <button
                                    onClick={handleRandomGenerateClick}
                                    className="btn btn-primary btn-sm"
                                    disabled={isLoading || isAnalyzing}
                                >
                                    {t('midAutumnCreator_randomButton')}
                                </button>
                            </div>
                            <div className="max-h-[50vh] overflow-y-auto p-4 bg-black/20 border border-white/10 rounded-lg space-y-6">
                                {Array.isArray(IDEAS_BY_CATEGORY) && IDEAS_BY_CATEGORY.map((categoryObj: any) => (
                                    <div key={categoryObj.category}>
                                        <h3 className="text-xl base-font font-bold text-yellow-400 text-left mb-3 sticky top-0 bg-black/50 py-2 -mx-4 px-4 z-10 flex items-center gap-2">
                                            {categoryObj.category}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {categoryObj.ideas.map((p: string) => {
                                                const isSelected = appState.selectedIdeas.includes(p);
                                                return (
                                                    <button 
                                                        key={p}
                                                        onClick={() => handleIdeaSelect(p)}
                                                        className={`base-font font-bold p-2 rounded-sm text-sm transition-all duration-200 ${
                                                            isSelected 
                                                            ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 scale-105' 
                                                            : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                                                        } ${!isSelected && appState.selectedIdeas.length === maxIdeas ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={!isSelected && appState.selectedIdeas.length === maxIdeas}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-4xl text-center p-4 bg-neutral-700/50 rounded-lg my-4">
                            <p className="text-sm text-yellow-300">{t('common_styleReferenceActive')}</p>
                        </div>
                    )}
                    
                    <div className="w-full max-w-4xl mx-auto mt-2 space-y-4">
                        <div>
                            <label htmlFor="aspect-ratio-mid-autumn" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_aspectRatio')}</label>
                            <select
                                id="aspect-ratio-mid-autumn"
                                value={appState.options.aspectRatio}
                                onChange={(e) => handleOptionChange('aspectRatio', e.target.value)}
                                className="form-input"
                            >
                                {ASPECT_RATIO_OPTIONS.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="additional-prompt-mid-autumn" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotesOptional')}</label>
                            <textarea
                                id="additional-prompt-mid-autumn"
                                value={localPrompt}
                                onChange={(e) => setLocalPrompt(e.target.value)}
                                onBlur={() => {
                                    if (localPrompt !== appState.options.additionalPrompt) {
                                        handleOptionChange('additionalPrompt', localPrompt);
                                    }
                                }}
                                placeholder={t('midAutumnCreator_notesPlaceholder')}
                                className="form-input h-20"
                                rows={2}
                                aria-label="Ghi chú bổ sung cho ảnh"
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="remove-watermark-mid-autumn"
                                checked={appState.options.removeWatermark}
                                onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                aria-label={t('common_removeWatermark')}
                            />
                            <label htmlFor="remove-watermark-mid-autumn" className="ml-3 block text-sm font-medium text-neutral-300">
                                {t('common_removeWatermark')}
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4">
                        <button onClick={onReset} className="btn btn-secondary">
                            {t('common_changeImage')}
                        </button>
                        <button 
                            onClick={handleGenerateClick} 
                            className="btn btn-primary"
                            disabled={
                                (!appState.styleReferenceImage && appState.selectedIdeas.length < minIdeas && appState.selectedIdeas[0] !== t('midAutumnCreator_randomConcept')) ||
                                (!appState.styleReferenceImage && appState.selectedIdeas.length > maxIdeas) ||
                                isLoading ||
                                isAnalyzing
                            }
                        >
                            {getButtonText()}
                        </button>
                    </div>
                </motion.div>
            )}

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    inputImages={inputImagesForResults}
                    isMobile={isMobile}
                    hasPartialError={hasPartialError}
                    actions={
                        <>
                            <button onClick={handleDownloadAll} className="btn btn-secondary">
                                {t('common_downloadAll')}
                            </button>
                            <button onClick={handleChooseOtherIdeas} className="btn btn-secondary">
                                {t('midAutumnCreator_chooseOtherIdeas')}
                            </button>
                            <button onClick={onReset} className="btn btn-secondary">
                                {t('common_startOver')}
                            </button>
                        </>
                    }
                >
                    {appState.selectedIdeas.map((idea, index) => {
                        // FIX: Cast generatedImages to any to resolve TS error 'Property status does not exist on type unknown'
                        const imageState = (appState.generatedImages as any)[idea];
                        const currentImageIndexInLightbox = imageState?.url ? lightboxImages.indexOf(imageState.url) : -1;
                        return (
                            <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={idea}
                                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: 0,
                                    rotate: 0,
                                }}
                                transition={{ type: 'spring', stiffness: 80, damping: 15, delay: index * 0.15 }}
                                whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                            >
                                <ActionablePolaroidCard
                                    type="output"
                                    caption={idea === 'Style Reference' ? t('common_result') : idea}
                                    status={imageState?.status || 'pending'}
                                    mediaUrl={imageState?.url}
                                    error={imageState?.error}
                                    onImageChange={handleGeneratedImageChange(idea)}
                                    onRegenerate={(prompt) => handleRegenerateIdea(idea, prompt)}
                                    onGenerateVideoFromPrompt={(prompt) => imageState?.url && generateVideo(imageState.url, prompt)}
                                    regenerationTitle={t('common_regenTitle')}
                                    regenerationDescription={t('common_regenDescription')}
                                    regenerationPlaceholder={t('midAutumnCreator_regenPlaceholder')}
                                    onClick={imageState?.status === 'done' && imageState.url ? () => openLightbox(currentImageIndexInLightbox) : undefined}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        );
                    })}
                     {appState.historicalImages.map(({ url: sourceUrl }) => {
                        const videoTask = videoTasks[sourceUrl];
                        if (!videoTask) return null;
                        return (
                            <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={`${sourceUrl}-video`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                            >
                                <ActionablePolaroidCard
                                    type="output"
                                    caption={t('common_video')}
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        );
                    })}
                </ResultsView>
            )}
            
            <Lightbox
                images={lightboxImages}
                selectedIndex={lightboxIndex}
                onClose={closeLightbox}
                onNavigate={navigateLightbox}
            />
        </div>
    );
};

export default MidAutumnCreator;
