/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDressedModelImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    handleFileUpload,
    useMediaQuery,
    ImageForZip,
    ResultsView,
    type DressTheModelState,
    useLightbox,
    OptionsPanel,
    useVideoGeneration,
    processAndDownloadAll,
    SearchableSelect,
    useAppControls,
    embedJsonInPng,
    getInitialStateForApp,
} from './uiUtils';

interface DressTheModelProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionModel: string;
    uploaderDescriptionModel: string;
    uploaderCaptionClothing: string;
    uploaderDescriptionClothing: string;
    addImagesToGallery: (images: string[]) => void;
    appState: DressTheModelState;
    onStateChange: (newState: DressTheModelState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}


const DressTheModel: React.FC<DressTheModelProps> = (props) => {
    const { 
        uploaderCaptionModel, uploaderDescriptionModel,
        uploaderCaptionClothing, uploaderDescriptionClothing,
        addImagesToGallery,
        appState, onStateChange, onReset,
        logGeneration,
        ...headerProps
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [localNotes, setLocalNotes] = useState(appState.options.notes);

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);
    
    const BACKGROUND_OPTIONS = t('dressTheModel_backgroundOptions');
    const POSE_OPTIONS = t('dressTheModel_poseOptions');
    const PHOTO_STYLE_OPTIONS = t('dressTheModel_photoStyleOptions');
    const ASPECT_RATIO_OPTIONS = t('aspectRatioOptions');

    const lightboxImages = [appState.modelImage, appState.clothingImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleModelImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.clothingImage ? 'configuring' : 'idle',
                modelImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl], 'upload');
        });
    };

    const handleClothingImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.modelImage ? 'configuring' : 'idle',
                clothingImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl], 'upload');
        });
    };
    
    const handleModelImageChange = (newUrl: string | null) => {
        onStateChange({
            ...appState,
            stage: newUrl && appState.clothingImage ? 'configuring' : 'idle',
            modelImage: newUrl,
        });
        if (newUrl) {
            addImagesToGallery([newUrl], 'upload');
        }
    };
    const handleClothingImageChange = (newUrl: string | null) => {
        onStateChange({
            ...appState,
            stage: newUrl && appState.modelImage ? 'configuring' : 'idle',
            clothingImage: newUrl,
        });
        if (newUrl) {
            addImagesToGallery([newUrl], 'upload');
        }
    };
    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl], 'outputs');
    };

    const handleOptionChange = (field: keyof DressTheModelState['options'], value: string | boolean) => {
        onStateChange({ ...appState, options: { ...appState.options, [field]: value } });
    };

    const executeInitialGeneration = async () => {
        if (!appState.modelImage || !appState.clothingImage) return;
        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });
        try {
            // No need to transform options, the service handles '' and 'Tự động' correctly
            const resultUrl = await generateDressedModelImage(appState.modelImage, appState.clothingImage, appState.options);
            const settingsToEmbed = {
                viewId: 'dress-the-model',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('dress-the-model', preGenState, urlWithMetadata);
            onStateChange({ ...appState, stage: 'results', generatedImage: urlWithMetadata, historicalImages: [...appState.historicalImages, urlWithMetadata] });
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
                viewId: 'dress-the-model',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('dress-the-model', preGenState, urlWithMetadata);
            onStateChange({ ...appState, stage: 'results', generatedImage: urlWithMetadata, historicalImages: [...appState.historicalImages, urlWithMetadata] });
            addImagesToGallery([urlWithMetadata], 'outputs');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.modelImage) {
            inputImages.push({ url: appState.modelImage, filename: 'model-goc', folder: 'input' });
        }
        if (appState.clothingImage) {
            inputImages.push({ url: appState.clothingImage, filename: 'trang-phuc-goc', folder: 'input' });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-thu-do.zip',
            baseOutputFilename: 'ket-qua-thu-do',
        });
    };

    const Uploader = ({ id, onUpload, caption, description, currentImage, onImageChange, placeholderType, cardType }: any) => (
        <div className="flex flex-col items-center gap-4">
            <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                <ActionablePolaroidCard
                    type={currentImage ? cardType : 'uploader'}
                    caption={caption}
                    status="done"
                    mediaUrl={currentImage || undefined}
                    placeholderType={placeholderType}
                    onClick={currentImage ? () => openLightbox(lightboxImages.indexOf(currentImage)) : undefined}
                    onImageChange={onImageChange}
                />
            </label>
            <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onUpload} />
            {description && <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">{description}</p>}
        </div>
    );

    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <div className="w-full overflow-x-auto pb-4">
                    <motion.div
                        className="flex flex-col md:flex-row items-center md:items-start justify-center gap-6 md:gap-8 w-full md:w-max mx-auto px-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Uploader id="model-upload" onUpload={handleModelImageUpload} onImageChange={handleModelImageChange} caption={uploaderCaptionModel} description={uploaderDescriptionModel} currentImage={appState.modelImage} placeholderType="person" cardType="photo-input" />
                        <Uploader id="clothing-upload" onUpload={handleClothingImageUpload} onImageChange={handleClothingImageChange} caption={uploaderCaptionClothing} description={uploaderDescriptionClothing} currentImage={appState.clothingImage} placeholderType="clothing" cardType="clothing-input" />
                    </motion.div>
                </div>
            )}

            {appState.stage === 'configuring' && appState.modelImage && appState.clothingImage && (
                <motion.div className="flex flex-col items-center gap-8 w-full max-w-screen-2xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 w-full md:w-max mx-auto px-4">
                            <ActionablePolaroidCard type="photo-input" mediaUrl={appState.modelImage} caption={t('dressTheModel_modelCaption')} status="done" onClick={() => appState.modelImage && openLightbox(lightboxImages.indexOf(appState.modelImage))} onImageChange={handleModelImageChange} />
                            <ActionablePolaroidCard type="clothing-input" mediaUrl={appState.clothingImage} caption={t('dressTheModel_clothingCaption')} status="done" onClick={() => appState.clothingImage && openLightbox(lightboxImages.indexOf(appState.clothingImage))} onImageChange={handleClothingImageChange} />
                        </div>
                    </div>

                    <OptionsPanel className="max-w-4xl">
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('common_options')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect
                                id="background"
                                label={t('dressTheModel_backgroundLabel')}
                                options={BACKGROUND_OPTIONS}
                                value={appState.options.background}
                                onChange={(value) => handleOptionChange('background', value)}
                                placeholder={t('dressTheModel_backgroundPlaceholder')}
                            />
                            <SearchableSelect
                                id="pose"
                                label={t('dressTheModel_poseLabel')}
                                options={POSE_OPTIONS}
                                value={appState.options.pose}
                                onChange={(value) => handleOptionChange('pose', value)}
                                placeholder={t('dressTheModel_posePlaceholder')}
                            />
                             <SearchableSelect
                                id="style"
                                label={t('dressTheModel_styleLabel')}
                                options={PHOTO_STYLE_OPTIONS}
                                value={appState.options.style}
                                onChange={(value) => handleOptionChange('style', value)}
                                placeholder={t('dressTheModel_stylePlaceholder')}
                            />
                             <div>
                                <label htmlFor="aspect-ratio-dress" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_aspectRatio')}</label>
                                <select id="aspect-ratio-dress" value={appState.options.aspectRatio} onChange={(e) => handleOptionChange('aspectRatio', e.target.value)} className="form-input">
                                    {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotes')}</label>
                            <textarea
                                id="notes"
                                value={localNotes}
                                onChange={(e) => setLocalNotes(e.target.value)}
                                onBlur={() => {
                                    if (localNotes !== appState.options.notes) {
                                        handleOptionChange('notes', localNotes);
                                    }
                                }}
                                placeholder={t('dressTheModel_notesPlaceholder')}
                                className="form-input h-24"
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input type="checkbox" id="remove-watermark-dress" checked={appState.options.removeWatermark} onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" aria-label={t('common_removeWatermark')} />
                            <label htmlFor="remove-watermark-dress" className="ml-3 block text-sm font-medium text-neutral-300">{t('common_removeWatermark')}</label>
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                            <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? t('dressTheModel_creating') : t('dressTheModel_createButton')}</button>
                        </div>
                    </OptionsPanel>
                </motion.div>
            )}
            
            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView stage={appState.stage} originalImage={appState.modelImage} onOriginalClick={() => appState.modelImage && openLightbox(lightboxImages.indexOf(appState.modelImage))} error={appState.error} isMobile={isMobile} actions={
                    <>
                        {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-secondary">{t('common_downloadAll')}</button>)}
                        <button onClick={handleBackToOptions} className="btn btn-secondary">{t('common_editOptions')}</button>
                        <button onClick={onReset} className="btn btn-secondary">{t('common_startOver')}</button>
                    </>
                }>
                    {appState.clothingImage && (
                        <motion.div key="clothing" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            <ActionablePolaroidCard type="clothing-input" caption={t('dressTheModel_clothingCaption')} status="done" mediaUrl={appState.clothingImage} isMobile={isMobile} onClick={() => appState.clothingImage && openLightbox(lightboxImages.indexOf(appState.clothingImage))} onImageChange={handleClothingImageChange} />
                        </motion.div>
                    )}
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-dress" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }} whileHover={{ scale: 1.05, zIndex: 10 }}>
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
                            regenerationPlaceholder={t('dressTheModel_regenPlaceholder')}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            isMobile={isMobile}
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
                                    isMobile={isMobile}
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

export default DressTheModel;
