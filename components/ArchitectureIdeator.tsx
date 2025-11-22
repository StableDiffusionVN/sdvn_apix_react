/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateArchitecturalImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    type ArchitectureIdeatorState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    SearchableSelect,
    useAppControls,
    embedJsonInPng,
    getInitialStateForApp,
} from './uiUtils';

interface ArchitectureIdeatorProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ArchitectureIdeatorState;
    onStateChange: (newState: ArchitectureIdeatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}

const ArchitectureIdeator: React.FC<ArchitectureIdeatorProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery, 
        appState, onStateChange, onReset, onGoBack,
        logGeneration,
        ...headerProps 
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const [localNotes, setLocalNotes] = useState(appState.options.notes);

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);
    
    const lightboxImages = [appState.uploadedImage, appState.styleReferenceImage, ...appState.historicalImages].filter((img): img is string => !!img);
    
    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            uploadedImage: imageDataUrl,
            generatedImage: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl], 'upload');
    };
    
    const handleStyleReferenceImageChange = (imageDataUrl: string | null) => {
        onStateChange({
            ...appState,
            styleReferenceImage: imageDataUrl,
        });
        if (imageDataUrl) {
            addImagesToGallery([imageDataUrl], 'upload');
        }
    };


    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, handleImageSelectedForUploader);
    }, [appState, onStateChange]);
    
    const handleOptionChange = (field: keyof ArchitectureIdeatorState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: {
                ...appState.options,
                [field]: value
            }
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;
        
        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await generateArchitecturalImage(appState.uploadedImage, appState.options, appState.styleReferenceImage);
            const settingsToEmbed = { 
                viewId: 'architecture-ideator', 
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('architecture-ideator', preGenState, urlWithMetadata);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                historicalImages: [...appState.historicalImages, urlWithMetadata],
            });
            addImagesToGallery([urlWithMetadata], 'outputs');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };

    const handleRegeneration = async (prompt: string) => {
        if (!appState.generatedImage) return;

        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await editImageWithPrompt(appState.generatedImage, prompt);
             const settingsToEmbed = { 
                viewId: 'architecture-ideator', 
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('architecture-ideator', preGenState, urlWithMetadata);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                historicalImages: [...appState.historicalImages, urlWithMetadata],
            });
            addImagesToGallery([urlWithMetadata], 'outputs');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleUploadedImageChange = (newUrl: string | null) => {
        onStateChange({ ...appState, uploadedImage: newUrl, stage: newUrl ? 'configuring' : 'idle' });
        if (newUrl) {
            addImagesToGallery([newUrl], 'upload');
        }
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl], 'outputs');
    };

    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.uploadedImage) {
            inputImages.push({
                url: appState.uploadedImage,
                filename: 'anh-phac-thao-goc',
                folder: 'input',
            });
        }
        if (appState.styleReferenceImage) {
            inputImages.push({
                url: appState.styleReferenceImage,
                filename: 'anh-tham-chieu-style',
                folder: 'input',
            });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-kien-truc.zip',
            baseOutputFilename: 'ket-qua-kien-truc',
        });
    };
    
    const isLoading = appState.stage === 'generating';

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

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="architecture"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <motion.div
                        className="flex flex-col items-center gap-8 w-full max-w-6xl py-6 overflow-y-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex flex-col md:flex-row items-start justify-center gap-8">
                             <div className="w-full md:w-auto">
                                <ActionablePolaroidCard
                                    type="sketch-input"
                                    mediaUrl={appState.uploadedImage}
                                    caption={t('architectureIdeator_sketchCaption')}
                                    status="done"
                                    onClick={() => openLightbox(lightboxImages.indexOf(appState.uploadedImage!))}
                                    onImageChange={handleUploadedImageChange}
                                />
                            </div>
                            <div className="w-full md:w-auto">
                                <ActionablePolaroidCard
                                    type="style-input"
                                    mediaUrl={appState.styleReferenceImage ?? undefined}
                                    caption={t('architectureIdeator_styleReferenceCaption')}
                                    placeholderType='style'
                                    status='done'
                                    onImageChange={handleStyleReferenceImageChange}
                                    onClick={appState.styleReferenceImage ? () => openLightbox(lightboxImages.indexOf(appState.styleReferenceImage!)) : undefined}
                                />
                                <p className="mt-4 text-center text-sm text-neutral-400 max-w-xs mx-auto">{t('architectureIdeator_styleReferenceDescription')}</p>
                            </div>
                        </div>

                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('architectureIdeator_optionsTitle')}</h2>
                            <AnimatePresence mode="wait">
                                {!appState.styleReferenceImage ? (
                                    <motion.div
                                        key="options"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <SearchableSelect
                                                id="context"
                                                label={t('architectureIdeator_contextLabel')}
                                                options={t('architectureIdeator_contextOptions')}
                                                value={appState.options.context}
                                                onChange={(value) => handleOptionChange('context', value)}
                                                placeholder={t('architectureIdeator_contextPlaceholder')}
                                            />
                                            <SearchableSelect
                                                id="style"
                                                label={t('architectureIdeator_styleLabel')}
                                                options={t('architectureIdeator_styleOptions')}
                                                value={appState.options.style}
                                                onChange={(value) => handleOptionChange('style', value)}
                                                placeholder={t('architectureIdeator_stylePlaceholder')}
                                            />
                                            <SearchableSelect
                                                id="color"
                                                label={t('architectureIdeator_colorLabel')}
                                                options={t('architectureIdeator_colorOptions')}
                                                value={appState.options.color}
                                                onChange={(value) => handleOptionChange('color', value)}
                                                placeholder={t('architectureIdeator_colorPlaceholder')}
                                            />
                                            <SearchableSelect
                                                id="lighting"
                                                label={t('architectureIdeator_lightingLabel')}
                                                options={t('architectureIdeator_lightingOptions')}
                                                value={appState.options.lighting}
                                                onChange={(value) => handleOptionChange('lighting', value)}
                                                placeholder={t('architectureIdeator_lightingPlaceholder')}
                                            />
                                        </div>
                                    </motion.div>
                                ) : (
                                     <motion.div
                                        key="style-ref-active"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-center p-3 bg-neutral-700/50 rounded-lg my-2"
                                    >
                                        <p className="text-sm text-yellow-300">{t('architectureIdeator_styleReferenceActive')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="pt-2">
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('architectureIdeator_notesLabel')}</label>
                                <textarea
                                    id="notes"
                                    value={localNotes}
                                    onChange={(e) => setLocalNotes(e.target.value)}
                                    onBlur={() => {
                                        if (localNotes !== appState.options.notes) {
                                            handleOptionChange('notes', localNotes);
                                        }
                                    }}
                                    placeholder={t('architectureIdeator_notesPlaceholder')}
                                    className="form-input h-24"
                                    rows={3}
                                />
                            </div>
                             <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="remove-watermark-arch"
                                    checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                    aria-label={t('common_removeWatermark')}
                                />
                                <label htmlFor="remove-watermark-arch" className="ml-3 block text-sm font-medium text-neutral-300">
                                    {t('common_removeWatermark')}
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">
                                    {t('common_changeImage')}
                                </button>
                                <button 
                                    onClick={executeInitialGeneration} 
                                    className="btn btn-primary"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('common_creating') : t('architectureIdeator_createButton')}
                                </button>
                            </div>
                        </OptionsPanel>
                    </motion.div>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    inputImages={inputImagesForResults}
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (
                                <button onClick={handleDownloadAll} className="btn btn-secondary">
                                    {t('common_downloadAll')}
                                </button>
                            )}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">
                                {t('common_editOptions')}
                            </button>
                            <button onClick={onReset} className="btn btn-secondary">
                                {t('common_startOver')}
                            </button>
                        </>
                    }
                >
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-architecture"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}
                    >
                        <ActionablePolaroidCard
                            type="output"
                            caption={t('common_result')}
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle={t('architectureIdeator_regenTitle')}
                            regenerationDescription={t('architectureIdeator_regenDescription')}
                            regenerationPlaceholder={t('architectureIdeator_regenPlaceholder')}
                        />
                    </motion.div>
                    {appState.historicalImages.map(sourceUrl => {
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

export default ArchitectureIdeator;
