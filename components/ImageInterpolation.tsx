/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, ChangeEvent, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeImagePairForPrompt, analyzeImagePairForPromptDeep, analyzeImagePairForPromptExpert, editImageWithPrompt, interpolatePrompts, adaptPromptToContext } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageForZip,
    ResultsView,
    type ImageInterpolationState,
    useLightbox,
    OptionsPanel,
    PromptResultCard,
    useVideoGeneration,
    processAndDownloadAll,
    embedJsonInPng,
    getInitialStateForApp,
    useAppControls,
} from './uiUtils';

interface ImageInterpolationProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionInput: string;
    uploaderDescriptionInput: string;
    uploaderCaptionOutput: string;
    uploaderDescriptionOutput: string;
    uploaderCaptionReference: string;
    uploaderDescriptionReference: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ImageInterpolationState;
    onStateChange: (newState: ImageInterpolationState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}

const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

const ImageInterpolation: React.FC<ImageInterpolationProps> = (props) => {
    const { 
        uploaderCaptionInput, uploaderDescriptionInput,
        uploaderCaptionOutput, uploaderDescriptionOutput,
        uploaderCaptionReference, uploaderDescriptionReference,
        addImagesToGallery, appState, onStateChange, onReset,
        logGeneration,
        ...headerProps
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const [localGeneratedPrompt, setLocalGeneratedPrompt] = useState(appState.generatedPrompt);
    const [localAdditionalNotes, setLocalAdditionalNotes] = useState(appState.additionalNotes);
    const lightboxImages = [appState.inputImage, appState.outputImage, appState.referenceImage, ...appState.historicalImages.map(h => h.url)].filter((img): img is string => !!img);
    
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    });

    useEffect(() => {
        setLocalGeneratedPrompt(appState.generatedPrompt);
    }, [appState.generatedPrompt]);

    useEffect(() => {
        setLocalAdditionalNotes(appState.additionalNotes);
    }, [appState.additionalNotes]);

    const handleInputImageChange = (url: string) => {
        const currentAppState = appStateRef.current;
        const wasConfiguring = currentAppState.stage === 'configuring' || currentAppState.stage === 'prompting';
        onStateChange({
            ...currentAppState, 
            inputImage: url, 
            generatedPrompt: '',
            promptSuggestions: '',
            finalPrompt: null,
            generatedImage: null,
            historicalImages: [],
            error: wasConfiguring ? t('imageInterpolation_inputChangedError') : null,
            stage: wasConfiguring ? 'configuring' : 'idle',
        });
        addImagesToGallery([url], 'upload');
    };

    const handleOutputImageChange = (url: string) => {
        const currentAppState = appStateRef.current;
        const wasConfiguring = currentAppState.stage === 'configuring' || currentAppState.stage === 'prompting';
        onStateChange({
            ...currentAppState, 
            outputImage: url, 
            generatedPrompt: '',
            promptSuggestions: '',
            finalPrompt: null,
            generatedImage: null,
            historicalImages: [],
            error: wasConfiguring ? t('imageInterpolation_outputChangedError') : null,
            stage: wasConfiguring ? 'configuring' : 'idle',
        });
        addImagesToGallery([url], 'upload');
    };

    const handleReferenceImageChange = (url: string) => {
        onStateChange({ ...appState, referenceImage: url });
        addImagesToGallery([url], 'upload');
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, { url: newUrl, prompt: appState.finalPrompt || '' }];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl], 'outputs');
    };
    
    const handleOptionChange = (field: keyof ImageInterpolationState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const handleAnalyzeClick = async (mode: 'general' | 'deep' | 'expert') => {
        if (!appState.inputImage || !appState.outputImage) return;

        onStateChange({ ...appStateRef.current, stage: 'prompting', error: null, analysisMode: mode });
        try {
            let result;
            switch (mode) {
                case 'expert':
                    result = await analyzeImagePairForPromptExpert(appState.inputImage, appState.outputImage);
                    break;
                case 'deep':
                    result = await analyzeImagePairForPromptDeep(appState.inputImage, appState.outputImage);
                    break;
                default:
                    result = await analyzeImagePairForPrompt(appState.inputImage, appState.outputImage);
                    break;
            }
            onStateChange({ ...appStateRef.current, stage: 'configuring', generatedPrompt: result.mainPrompt, promptSuggestions: result.suggestions || '' });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appStateRef.current, stage: 'idle', generatedPrompt: '', promptSuggestions: '', error: t('imageInterpolation_analysisError', errorMessage) });
        }
    };

    const handleGenerate = async () => {
        const referenceImageToUse = appState.referenceImage || appState.inputImage;
        if (!referenceImageToUse || !appState.generatedPrompt) return;

        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null, finalPrompt: null });

        const skipAdaptation = !appState.referenceImage && !appState.additionalNotes.trim();
        let finalPromptText = '';
        
        try {
            if (skipAdaptation) {
                finalPromptText = appState.generatedPrompt;
            } else {
                let intermediatePrompt = appState.generatedPrompt;
                if (appState.additionalNotes.trim()) {
                    intermediatePrompt = await interpolatePrompts(appState.generatedPrompt, appState.additionalNotes);
                }
                finalPromptText = await adaptPromptToContext(referenceImageToUse, intermediatePrompt);
            }
            
            const resultUrl = await editImageWithPrompt(
                referenceImageToUse,
                finalPromptText,
                appState.options.aspectRatio,
                appState.options.removeWatermark
            );

            const settingsToEmbed = {
                viewId: 'image-interpolation',
                state: { ...appState, stage: 'configuring', finalPrompt: null, generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('image-interpolation', preGenState, urlWithMetadata);

            const newHistory = [...appState.historicalImages, { url: urlWithMetadata, prompt: finalPromptText }];
            
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                generatedImage: urlWithMetadata, 
                historicalImages: newHistory,
                finalPrompt: finalPromptText, 
            });
            addImagesToGallery([urlWithMetadata], 'outputs');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                error: errorMessage,
                finalPrompt: finalPromptText,
            });
        }
    };

    const handleRegeneration = async (prompt: string) => {
        if (!appState.generatedImage) return;

        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await editImageWithPrompt(
                appState.generatedImage,
                prompt,
                appState.options.aspectRatio,
                appState.options.removeWatermark
            );
            
            const settingsToEmbed = {
                viewId: 'image-interpolation',
                state: { ...appState, stage: 'configuring', finalPrompt: null, generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('image-interpolation', preGenState, urlWithMetadata);

            const newHistory = [...appState.historicalImages, { url: urlWithMetadata, prompt: prompt }];
            
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                generatedImage: urlWithMetadata, 
                historicalImages: newHistory,
                finalPrompt: prompt,
            });
            addImagesToGallery([urlWithMetadata], 'outputs');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                error: errorMessage,
                finalPrompt: prompt,
            });
        }
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.inputImage) inputImages.push({ url: appState.inputImage, filename: 'anh-truoc', folder: 'input' });
        if (appState.outputImage) inputImages.push({ url: appState.outputImage, filename: 'anh-sau', folder: 'input' });
        if (appState.referenceImage) inputImages.push({ url: appState.referenceImage, filename: 'anh-tham-chieu', folder: 'input' });
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-noi-suy-anh.zip',
            baseOutputFilename: 'ket-qua-noi-suy',
        });
    };

    const isLoading = appState.stage === 'prompting' || appState.stage === 'generating';
    const getAnalyzingText = () => {
        if (appState.stage !== 'prompting') return '';
        switch (appState.analysisMode) {
            case 'expert': return t('imageInterpolation_analyzingExpert');
            case 'deep': return t('imageInterpolation_analyzingDeep');
            default: return t('imageInterpolation_analyzingGeneral');
        }
    };

    const referenceImageToShow = appState.referenceImage || appState.inputImage;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {appState.stage !== 'results' && appState.stage !== 'generating' && (
                    <AppScreenHeader {...headerProps} />
                )}
            </AnimatePresence>

            {(appState.stage === 'idle' || appState.stage === 'configuring' || appState.stage === 'prompting') && (
                <motion.div className="flex flex-col items-center gap-6 w-full max-w-screen-2xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-6 md:gap-8 w-full md:w-max mx-auto px-4">
                            <div className="flex flex-col items-center gap-4">
                                <ActionablePolaroidCard
                                    type={appState.inputImage ? 'content-input' : 'uploader'}
                                    caption={uploaderCaptionInput}
                                    status="done"
                                    mediaUrl={appState.inputImage || undefined}
                                    placeholderType="magic"
                                    onImageChange={handleInputImageChange}
                                />
                                <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">
                                    {uploaderDescriptionInput}
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-4">
                                 <ActionablePolaroidCard
                                    type={appState.outputImage ? 'content-input' : 'uploader'}
                                    caption={uploaderCaptionOutput}
                                    status="done"
                                    mediaUrl={appState.outputImage || undefined}
                                    placeholderType="magic"
                                    onImageChange={handleOutputImageChange}
                                />
                                <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">
                                    {uploaderDescriptionOutput}
                                </p>
                            </div>
                            <AnimatePresence>
                                {(appState.stage === 'configuring' || appState.stage === 'prompting') && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex flex-col items-center gap-4"
                                    >
                                        <ActionablePolaroidCard
                                            type={appState.referenceImage ? 'content-input' : 'uploader'}
                                            caption={uploaderCaptionReference}
                                            status="done"
                                            mediaUrl={appState.referenceImage || undefined}
                                            placeholderType="magic"
                                            onImageChange={handleReferenceImageChange}
                                        />
                                        <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">
                                            {uploaderDescriptionReference}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex flex-col items-center mt-4">
                        <div className="flex items-center gap-4">
                             <button onClick={() => handleAnalyzeClick('general')} className="btn btn-secondary" disabled={!appState.inputImage || !appState.outputImage || appState.stage === 'prompting'}>
                                {appState.stage === 'prompting' && appState.analysisMode === 'general' ? getAnalyzingText() : t('imageInterpolation_analyzeGeneral')}
                            </button>
                            <button onClick={() => handleAnalyzeClick('deep')} className="btn btn-secondary" disabled={!appState.inputImage || !appState.outputImage || appState.stage === 'prompting'}>
                                {appState.stage === 'prompting' && appState.analysisMode === 'deep' ? getAnalyzingText() : t('imageInterpolation_analyzeDeep')}
                            </button>
                             <button onClick={() => handleAnalyzeClick('expert')} className="btn btn-secondary" disabled={!appState.inputImage || !appState.outputImage || appState.stage === 'prompting'}>
                                {appState.stage === 'prompting' && appState.analysisMode === 'expert' ? getAnalyzingText() : t('imageInterpolation_analyzeExpert')}
                            </button>
                        </div>
                        {appState.error && <p className="text-yellow-300 text-sm mt-2 max-w-md text-center">{appState.error}</p>}
                    </div>

                    <AnimatePresence>
                        {(appState.stage === 'configuring' || appState.stage === 'prompting') && (
                            <motion.div 
                                className="w-full flex justify-center mt-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                                exit={{ opacity: 0, y: 20 }}
                            >
                                <OptionsPanel className="max-w-4xl flex flex-col gap-8">
                                    <div className="space-y-4">
                                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('imageInterpolation_generatedPromptTitle')}</h2>
                                        {appState.stage === 'prompting' ? (
                                            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div></div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label htmlFor="generated-prompt" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('imageInterpolation_mainPromptLabel')}</label>
                                                    <textarea 
                                                        id="generated-prompt" 
                                                        value={localGeneratedPrompt} 
                                                        onChange={(e) => setLocalGeneratedPrompt(e.target.value)}
                                                        onBlur={() => {
                                                            if (localGeneratedPrompt !== appState.generatedPrompt) {
                                                                onStateChange({ ...appState, generatedPrompt: localGeneratedPrompt });
                                                            }
                                                        }}
                                                        className="form-input !h-28" 
                                                        rows={4}
                                                    />
                                                </div>
                                                {appState.promptSuggestions && (
                                                    <div>
                                                        <h4 className="base-font font-bold text-lg text-neutral-200 mb-2">{t('imageInterpolation_suggestionsTitle')}</h4>
                                                        <div className="flex flex-col items-start gap-2">
                                                            {appState.promptSuggestions.split('\n').map((suggestion, index) => {
                                                                const cleanSuggestion = suggestion.replace(/^- /, '').trim();
                                                                if (!cleanSuggestion) return null;
                                                                return (
                                                                    <button 
                                                                        key={index}
                                                                        onClick={() => onStateChange({ ...appState, additionalNotes: `${appState.additionalNotes.trim()} ${cleanSuggestion}`.trim() })}
                                                                        className="bg-neutral-700/60 text-neutral-300 text-sm px-3 py-1.5 rounded-md hover:bg-neutral-700 transition-colors text-left w-full"
                                                                        title={t('imageInterpolation_addSuggestionTooltip')}
                                                                    >
                                                                        {cleanSuggestion}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('imageInterpolation_customizeTitle')}</h2>
                                        <div>
                                            <label htmlFor="additional-notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('imageInterpolation_notesLabel')}</label>
                                            <textarea
                                                id="additional-notes"
                                                value={localAdditionalNotes}
                                                onChange={(e) => setLocalAdditionalNotes(e.target.value)}
                                                onBlur={() => {
                                                    if (localAdditionalNotes !== appState.additionalNotes) {
                                                        onStateChange({ ...appState, additionalNotes: localAdditionalNotes });
                                                    }
                                                }}
                                                placeholder={t('imageInterpolation_notesPlaceholder')}
                                                className="form-input h-20"
                                                rows={2}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                            <div>
                                                <label htmlFor="aspect-ratio-interp" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_aspectRatio')}</label>
                                                <select id="aspect-ratio-interp" value={appState.options.aspectRatio} onChange={(e) => handleOptionChange('aspectRatio', e.target.value)} className="form-input">
                                                    {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-center pb-3">
                                                <input type="checkbox" id="remove-watermark-interp" checked={appState.options.removeWatermark} onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                                <label htmlFor="remove-watermark-interp" className="ml-3 block text-sm font-medium text-neutral-300">{t('common_removeWatermark')}</label>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-4 pt-4">
                                            <button onClick={onReset} className="btn btn-secondary">{t('common_startOver')}</button>
                                            <button onClick={handleGenerate} className="btn btn-primary" disabled={!appState.generatedPrompt || isLoading}>{isLoading ? t('common_creating') : t('imageInterpolation_createButton')}</button>
                                        </div>
                                    </div>
                                </OptionsPanel>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
            
            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={referenceImageToShow}
                    onOriginalClick={referenceImageToShow ? () => openLightbox(lightboxImages.indexOf(referenceImageToShow!)) : undefined}
                    error={appState.error}
                    actions={(
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-secondary">{t('common_downloadAll')}</button>)}
                            <button onClick={() => onStateChange({...appState, stage: 'configuring'})} className="btn btn-secondary">{t('common_edit')}</button>
                            <button onClick={onReset} className="btn btn-secondary">{t('common_startOver')}</button>
                        </>
                    )}
                >
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-interp" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={t('common_result')}
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle={t('common_regenTitle')}
                            regenerationDescription={t('common_regenDescription')}
                            regenerationPlaceholder={t('imageInterpolation_regenPlaceholder')}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                        />
                    </motion.div>
                    
                    {appState.finalPrompt && (
                        <motion.div 
                            className="w-full md:w-96 flex-shrink-0"
                            key="final-prompt" 
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.3 }}
                        >
                            <PromptResultCard 
                                title="Prompt cuối cùng" 
                                promptText={appState.finalPrompt} 
                                className="h-full"
                            />
                        </motion.div>
                    )}

                    {appState.historicalImages.map(({ url: sourceUrl }) => {
                        const videoTask = videoTasks[sourceUrl];
                        if (!videoTask) return null;
                        return (
                            <motion.div className="w-full md:w-auto flex-shrink-0" key={`${sourceUrl}-video`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}>
                                <ActionablePolaroidCard
                                    type="output"
                                    caption={t('common_video')}
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined}
                                />
                            </motion.div>
                        );
                    })}
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default ImageInterpolation;
