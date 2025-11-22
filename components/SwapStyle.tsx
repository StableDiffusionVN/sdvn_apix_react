/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { ChangeEvent, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Import 'editImageWithPrompt' to resolve 'Cannot find name' error.
import { swapImageStyle, mixImageStyle, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    Slider,
    type SwapStyleState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
    getInitialStateForApp,
    SearchableSelect,
    Switch,
} from './uiUtils';

interface SwapStyleProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionContent: string;
    uploaderDescriptionContent: string;
    uploaderCaptionStyle: string;
    uploaderDescriptionStyle: string;
    addImagesToGallery: (images: string[]) => void;
    appState: SwapStyleState;
    onStateChange: (newState: SwapStyleState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}

const SwapStyle: React.FC<SwapStyleProps> = (props) => {
    const { 
        uploaderCaptionContent, uploaderDescriptionContent, uploaderCaptionStyle, uploaderDescriptionStyle, addImagesToGallery,
        appState, onStateChange, onReset,
        logGeneration,
        ...headerProps
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const [localNotes, setLocalNotes] = useState(appState.options.notes);
    
    const { convertToReal } = appState.options;

    const STYLE_STRENGTH_LEVELS = t('style_strengthLevels');
    const FAITHFULNESS_LEVELS = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];

    const bilingualStyles: { en: string; vi: string }[] = Array.isArray(t('styles')) ? t('styles') : [];
    
    const formattedStyleOptions = useMemo(() => 
        bilingualStyles.map(style => `${style.en} (${style.vi})`), 
    [bilingualStyles]);

    const handleStyleChange = (formattedValue: string) => {
        const selectedStyle = bilingualStyles.find(s => `${s.en} (${s.vi})` === formattedValue);
        // Save the English value for the API, as models are better trained on it.
        handleOptionChange('style', selectedStyle ? selectedStyle.en : formattedValue.split(' (')[0]);
    };

    const displayValue = useMemo(() => {
        const selectedStyle = bilingualStyles.find(s => s.en === appState.options.style);
        return selectedStyle ? `${selectedStyle.en} (${selectedStyle.vi})` : appState.options.style;
    }, [appState.options.style, bilingualStyles]);


    const lightboxImages = [appState.contentImage, appState.styleImage, ...appState.historicalImages].filter((img): img is string => !!img);

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);
    
    const handleContentImageSelected = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            contentImage: imageDataUrl,
            generatedImage: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl], 'upload');
    };
    
    const handleOptionChange = (field: keyof SwapStyleState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value },
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.contentImage) return;

        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            let resultUrl: string;

            if (appState.options.convertToReal) {
                resultUrl = await swapImageStyle(appState.contentImage, appState.options);
            } else if (appState.styleImage) {
                const { resultUrl: mixedUrl } = await mixImageStyle(appState.contentImage, appState.styleImage, appState.options);
                resultUrl = mixedUrl;
            } else {
                resultUrl = await swapImageStyle(appState.contentImage, appState.options);
            }

            const settingsToEmbed = {
                viewId: 'swap-style',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('swap-style', preGenState, urlWithMetadata);
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
                viewId: 'swap-style',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('swap-style', preGenState, urlWithMetadata);
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

    const handleContentImageChange = (newUrl: string | null) => {
        onStateChange({ ...appState, contentImage: newUrl, stage: newUrl ? 'configuring' : 'idle' });
        if (newUrl) {
            addImagesToGallery([newUrl], 'upload');
        }
    };

    const handleStyleImageChange = (newUrl: string | null) => {
        onStateChange({ ...appState, styleImage: newUrl });
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
        if (appState.contentImage) {
            inputImages.push({ url: appState.contentImage, filename: 'anh-goc', folder: 'input' });
        }
        if (appState.styleImage) {
            inputImages.push({ url: appState.styleImage, filename: 'anh-style-tham-chieu', folder: 'input' });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'anh-theo-style.zip',
            baseOutputFilename: `anh-style-${appState.options.style.replace(/[\s()]/g, '-')}`,
        });
    };

    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        onImageChange={handleContentImageSelected}
                        uploaderCaption={uploaderCaptionContent}
                        uploaderDescription={uploaderDescriptionContent}
                        placeholderType="magic"
                    />
                )}

                {appState.stage === 'configuring' && appState.contentImage && (
                    <AppOptionsLayout>
                         <div className="flex flex-col md:flex-row items-start justify-center gap-8">
                            <ActionablePolaroidCard
                                type="content-input"
                                mediaUrl={appState.contentImage}
                                caption={t('swapStyle_contentCaption')}
                                status="done"
                                onClick={() => openLightbox(lightboxImages.indexOf(appState.contentImage!))}
                                onImageChange={handleContentImageChange}
                            />
                            <AnimatePresence>
                                {!convertToReal && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, x: -20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex flex-col items-center gap-4"
                                    >
                                        <ActionablePolaroidCard
                                            type="style-input"
                                            mediaUrl={appState.styleImage ?? undefined}
                                            caption={uploaderCaptionStyle}
                                            placeholderType='style'
                                            status='done'
                                            onImageChange={handleStyleImageChange}
                                            onClick={appState.styleImage ? () => openLightbox(lightboxImages.indexOf(appState.styleImage!)) : undefined}
                                        />
                                        <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">
                                            {uploaderDescriptionStyle}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('common_options')}</h2>
                            
                            <div className="flex items-center pt-2">
                                <Switch
                                    id="convert-to-real-switch"
                                    checked={convertToReal}
                                    onChange={(checked) => handleOptionChange('convertToReal', checked)}
                                />
                                <label htmlFor="convert-to-real-switch" className="ml-3 block text-sm font-medium text-neutral-200">
                                    Chuyển sang ảnh thật
                                </label>
                            </div>
                            
                             <AnimatePresence>
                                {convertToReal && (
                                    <motion.div
                                        key="convert-to-real-note"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <p className="text-xs text-yellow-300/90 mt-1 p-2 bg-yellow-400/10 rounded-md">
                                            {t('swapStyle_convertToRealNote')}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                             <AnimatePresence mode="wait">
                                {!convertToReal && !appState.styleImage ? (
                                    <motion.div
                                        key="style-select"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="pt-2">
                                            <SearchableSelect
                                                id="style-search"
                                                label={t('swapStyle_styleLabel')}
                                                options={formattedStyleOptions}
                                                value={displayValue}
                                                onChange={handleStyleChange}
                                                placeholder={t('swapStyle_stylePlaceholder')}
                                            />
                                        </div>
                                    </motion.div>
                                ) : !convertToReal && appState.styleImage ? (
                                    <motion.div
                                        key="style-ref-active"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-center p-3 bg-neutral-700/50 rounded-lg my-2"
                                    >
                                        <p className="text-sm text-yellow-300">{t('swapStyle_styleReferenceActive')}</p>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>

                            <div className="pt-2">
                                <Slider
                                    label={convertToReal ? "Mức độ giữ nét" : t('swapStyle_strengthLabel')}
                                    options={convertToReal ? FAITHFULNESS_LEVELS : STYLE_STRENGTH_LEVELS}
                                    value={appState.options.styleStrength}
                                    onChange={(value) => handleOptionChange('styleStrength', value)}
                                />
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
                                    placeholder={t('swapStyle_notesPlaceholder')}
                                    className="form-input h-24"
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center pt-2">
                                <input type="checkbox" id="remove-watermark-swap" checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                <label htmlFor="remove-watermark-swap" className="ml-3 block text-sm font-medium text-neutral-300">{t('common_removeWatermark')}</label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                                <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? t('swapStyle_creating') : t('swapStyle_createButton')}</button>
                            </div>
                        </OptionsPanel>
                    </AppOptionsLayout>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.contentImage}
                    onOriginalClick={() => appState.contentImage && openLightbox(lightboxImages.indexOf(appState.contentImage))}
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-secondary">{t('common_downloadAll')}</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">{t('common_edit')}</button>
                            <button onClick={onReset} className="btn btn-secondary">{t('common_startOver')}</button>
                        </>
                    }>
                     {appState.styleImage && !convertToReal && (
                        <motion.div
                            key="style-ref-result"
                            className="w-full md:w-auto flex-shrink-0"
                             initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        >
                             <ActionablePolaroidCard
                                type="display"
                                caption={uploaderCaptionStyle}
                                mediaUrl={appState.styleImage}
                                status="done"
                                onClick={() => openLightbox(lightboxImages.indexOf(appState.styleImage!))}
                            />
                        </motion.div>
                    )}
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-swap"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={
                                appState.options.convertToReal 
                                    ? t('swapStyle_realPhotoCaption')
                                    : (appState.styleImage ? t('common_result') : (appState.options.style || t('swapStyle_autoStyleCaption')))
                            } 
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle={t('common_regenTitle')}
                            regenerationDescription={t('swapStyle_regenDescription')}
                            regenerationPlaceholder={t('swapStyle_regenPlaceholder')}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined} />
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

export default SwapStyle;
