/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { restoreOldPhoto, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    type PhotoRestorationState,
    handleFileUpload,
    useLightbox,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
    getInitialStateForApp,
} from './uiUtils';

interface PhotoRestorationProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: PhotoRestorationState;
    onStateChange: (newState: PhotoRestorationState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}

const PhotoRestoration: React.FC<PhotoRestorationProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery, 
        appState, onStateChange, onReset,
        logGeneration,
        ...headerProps 
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    
    // State for searchable nationality dropdown
    const [nationalitySearch, setNationalitySearch] = useState('');
    const [isNationalityDropdownOpen, setNationalityDropdownOpen] = useState(false);
    const nationalityDropdownRef = useRef<HTMLDivElement>(null);
    const [localNotes, setLocalNotes] = useState(appState.options.notes);

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);

    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);
    const COUNTRIES = t('countries');
    const PHOTO_TYPE_OPTIONS = t('photoRestoration_photoTypeOptions');
    const GENDER_OPTIONS = t('photoRestoration_genderOptions');

    const filteredCountries = COUNTRIES.filter((country: string) => 
        country.toLowerCase().includes(nationalitySearch.toLowerCase())
    );

    useEffect(() => {
        // Initialize search with the current state value when component loads/state changes
        setNationalitySearch(appState.options.nationality);
    }, [appState.options.nationality]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
                setNationalityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, handleImageSelectedForUploader);
    }, [appState, onStateChange]);
    
    const handleOptionChange = (field: keyof PhotoRestorationState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const handleNationalitySelect = (country: string) => {
        handleOptionChange('nationality', country);
        setNationalitySearch(country);
        setNationalityDropdownOpen(false);
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;
        
        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await restoreOldPhoto(appState.uploadedImage, appState.options);
            const settingsToEmbed = {
                viewId: 'photo-restoration',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('photo-restoration', preGenState, urlWithMetadata);
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
                viewId: 'photo-restoration',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('photo-restoration', preGenState, urlWithMetadata);
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
                filename: 'anh-goc',
                folder: 'input',
            });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            zipFilename: 'anh-phuc-che.zip',
            baseOutputFilename: 'anh-phuc-che',
        });
    };
    
    const renderSelect = (id: keyof PhotoRestorationState['options'], label: string, optionList: string[]) => (
        <div>
            <label htmlFor={id} className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{label}</label>
            <select id={id} value={appState.options[id] as string} onChange={(e) => handleOptionChange(id, e.target.value)} className="form-input">
                {optionList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="person"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <ActionablePolaroidCard type="content-input" mediaUrl={appState.uploadedImage} caption={t('common_originalImage')} status="done" onClick={() => openLightbox(0)} onImageChange={handleUploadedImageChange} />
                        </div>
                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('photoRestoration_additionalInfoTitle')}</h2>
                            <p className="text-neutral-300 text-sm">{t('photoRestoration_additionalInfoSubtitle')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {renderSelect('type', t('photoRestoration_photoTypeLabel'), PHOTO_TYPE_OPTIONS)}
                                {renderSelect('gender', t('photoRestoration_genderLabel'), GENDER_OPTIONS)}

                                {/* Searchable Nationality Dropdown */}
                                <div ref={nationalityDropdownRef} className="searchable-dropdown-container">
                                    <label htmlFor="nationality" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('photoRestoration_nationalityLabel')}</label>
                                    <input
                                        type="text"
                                        id="nationality"
                                        value={nationalitySearch}
                                        onChange={(e) => {
                                            setNationalitySearch(e.target.value);
                                            setNationalityDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            setNationalityDropdownOpen(true);
                                            setNationalitySearch('');
                                        }}
                                        onBlur={() => handleOptionChange('nationality', nationalitySearch)}
                                        className="form-input"
                                        placeholder={t('photoRestoration_nationalityPlaceholder')}
                                    />
                                    {isNationalityDropdownOpen && (
                                        <ul className="searchable-dropdown-list">
                                            {filteredCountries.length > 0 ? filteredCountries.map((country: string) => (
                                                <li key={country} onMouseDown={() => handleNationalitySelect(country)} className="searchable-dropdown-item">
                                                    {country}
                                                </li>
                                            )) : (
                                                <li className="searchable-dropdown-item !cursor-default">{t('common_notFound')}</li>
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {/* Age Input */}
                                <div>
                                    <label htmlFor="age" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('photoRestoration_ageLabel')}</label>
                                    <input
                                        type="text"
                                        id="age"
                                        value={appState.options.age}
                                        onChange={(e) => handleOptionChange('age', e.target.value)}
                                        className="form-input"
                                        placeholder={t('common_auto')}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('photoRestoration_notesLabel')}</label>
                                <textarea
                                    id="notes"
                                    value={localNotes}
                                    onChange={(e) => setLocalNotes(e.target.value)}
                                    onBlur={() => {
                                        if (localNotes !== appState.options.notes) {
                                            handleOptionChange('notes', localNotes);
                                        }
                                    }}
                                    placeholder={t('photoRestoration_notesPlaceholder')}
                                    className="form-input h-24"
                                    rows={3}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <div className="flex items-center">
                                    <input type="checkbox" id="remove-stains" checked={appState.options.removeStains}
                                        onChange={(e) => handleOptionChange('removeStains', e.target.checked)}
                                        className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                    <label htmlFor="remove-stains" className="ml-3 block text-sm font-medium text-neutral-300">{t('photoRestoration_removeStainsLabel')}</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="colorize-rgb" checked={appState.options.colorizeRgb}
                                        onChange={(e) => handleOptionChange('colorizeRgb', e.target.checked)}
                                        className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                    <label htmlFor="colorize-rgb" className="ml-3 block text-sm font-medium text-neutral-300">{t('photoRestoration_colorizeRgb')}</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="remove-watermark-restore" checked={appState.options.removeWatermark}
                                        onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                        className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                    <label htmlFor="remove-watermark-restore" className="ml-3 block text-sm font-medium text-neutral-300">{t('common_removeWatermark')}</label>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                                <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? t('photoRestoration_creating') : t('photoRestoration_createButton')}</button>
                            </div>
                        </OptionsPanel>
                    </AppOptionsLayout>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.uploadedImage}
                    onOriginalClick={() => openLightbox(0)}
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-secondary">{t('common_downloadAll')}</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">{t('common_editOptions')}</button>
                            <button onClick={onReset} className="btn btn-secondary">{t('common_startOver')}</button>
                        </>
                    }>
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-restoration"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={t('photoRestoration_resultCaption')} status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            regenerationTitle={t('common_regenTitle')}
                            regenerationDescription={t('photoRestoration_regenDescription')}
                            regenerationPlaceholder={t('photoRestoration_regenPlaceholder')}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined} />
                    </motion.div>
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

export default PhotoRestoration;
