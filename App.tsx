/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, Suspense, lazy, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { cn } from './lib/utils';

import Footer from './components/Footer';
import Home from './components/Home';
import SearchModal from './components/SearchModal';
import GalleryModal from './components/GalleryModal';
import InfoModal from './components/InfoModal';
import AppToolbar from './components/AppToolbar';
import LoginScreen from './components/LoginScreen';
import UserStatus from './components/UserStatus';
import LanguageSwitcher from './components/LanguageSwitcher';
import HistoryPanel from './components/HistoryPanel';
import { ImageEditorModal } from './components/ImageEditorModal';
// FIX: Import LayerComposerModal directly to break circular dependency.
import { LayerComposerModal } from './components/LayerComposerModal';
import { StoryboardingModal } from './components/StoryboardingModal';
import {
    renderSmartlyWrappedTitle,
    useImageEditor,
    useAppControls,
    ImageLayoutModal,
    BeforeAfterModal,
    AppCoverCreatorModal,
    useAuth,
    createThumbnailDataUrl,
    type AppConfig,
    type GenerationHistoryEntry,
    type ImageResolution
} from './components/uiUtils';
import { LoadingSpinnerIcon } from './components/icons';
import { setGlobalModelConfig } from './services/gemini/baseService';

// Lazy load app components for code splitting
const ArchitectureIdeator = lazy(() => import('./components/ArchitectureIdeator'));
const AvatarCreator = lazy(() => import('./components/AvatarCreator'));
const BabyPhotoCreator = lazy(() => import('./components/BabyPhotoCreator'));
const BeautyCreator = lazy(() => import('./components/BeautyCreator'));
const MidAutumnCreator = lazy(() => import('./components/MidAutumnCreator'));
const EntrepreneurCreator = lazy(() => import('./components/EntrepreneurCreator'));
const DressTheModel = lazy(() => import('./components/DressTheModel'));
const PhotoRestoration = lazy(() => import('./components/PhotoRestoration'));
const SwapStyle = lazy(() => import('./components/SwapStyle'));
const FreeGeneration = lazy(() => import('./components/FreeGeneration'));
const ToyModelCreator = lazy(() => import('./components/ToyModelCreator'));
const ImageInterpolation = lazy(() => import('./components/ImageInterpolation'));


const AppLoadingFallback = () => (
    <div className="w-full h-full flex items-center justify-center">
        <LoadingSpinnerIcon className="animate-spin h-10 w-10 text-yellow-400" />
    </div>
);

const AppComponents: Record<string, any> = {
    'architecture-ideator': { Component: ArchitectureIdeator, settingsKey: 'architectureIdeator', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey) }) },
    'avatar-creator': { Component: AvatarCreator, settingsKey: 'avatarCreator', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey), uploaderCaptionStyle: t(s.uploaderCaptionStyleKey), uploaderDescriptionStyle: t(s.uploaderDescriptionStyleKey) }) },
    'baby-photo-creator': { Component: BabyPhotoCreator, settingsKey: 'babyPhotoCreator', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey), uploaderCaptionStyle: t(s.uploaderCaptionStyleKey), uploaderDescriptionStyle: t(s.uploaderDescriptionStyleKey) }) },
    'beauty-creator': { Component: BeautyCreator, settingsKey: 'beautyCreator', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), minIdeas: s.minIdeas, maxIdeas: s.maxIdeas, uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey), uploaderCaptionStyle: t(s.uploaderCaptionStyleKey), uploaderDescriptionStyle: t(s.uploaderDescriptionStyleKey) }) },
    'mid-autumn-creator': { Component: MidAutumnCreator, settingsKey: 'midAutumnCreator', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey), uploaderCaptionStyle: t(s.uploaderCaptionStyleKey), uploaderDescriptionStyle: t(s.uploaderDescriptionStyleKey) }) },
    'entrepreneur-creator': { Component: EntrepreneurCreator, settingsKey: 'entrepreneurCreator', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey), uploaderCaptionStyle: t(s.uploaderCaptionStyleKey), uploaderDescriptionStyle: t(s.uploaderDescriptionStyleKey) }) },
    'dress-the-model': { Component: DressTheModel, settingsKey: 'dressTheModel', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaptionModel: t(s.uploaderCaptionModelKey), uploaderDescriptionModel: t(s.uploaderDescriptionModelKey), uploaderCaptionClothing: t(s.uploaderCaptionClothingKey), uploaderDescriptionClothing: t(s.uploaderDescriptionClothingKey) }) },
    'photo-restoration': { Component: PhotoRestoration, settingsKey: 'photoRestoration', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey) }) },
    'swap-style': { Component: SwapStyle, settingsKey: 'swapStyle', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaptionContent: t(s.uploaderCaptionContentKey), uploaderDescriptionContent: t(s.uploaderDescriptionContentKey), uploaderCaptionStyle: t(s.uploaderCaptionStyleKey), uploaderDescriptionStyle: t(s.uploaderDescriptionStyleKey) }) },
    'free-generation': { Component: FreeGeneration, settingsKey: 'freeGeneration', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption1: t(s.uploaderCaption1Key), uploaderDescription1: t(s.uploaderDescription1Key), uploaderCaption2: t(s.uploaderCaption2Key), uploaderDescription2: t(s.uploaderDescription2Key), uploaderCaption3: t(s.uploaderCaption3Key), uploaderDescription3: t(s.uploaderDescription3Key), uploaderCaption4: t(s.uploaderCaption4Key), uploaderDescription4: t(s.uploaderDescription4Key) }) },
    'toy-model-creator': { Component: ToyModelCreator, settingsKey: 'toyModelCreator', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaption: t(s.uploaderCaptionKey), uploaderDescription: t(s.uploaderDescriptionKey) }) },
    'image-interpolation': { Component: ImageInterpolation, settingsKey: 'imageInterpolation', props: (s:any, t:any) => ({ mainTitle: t(s.mainTitleKey), subtitle: t(s.subtitleKey), uploaderCaptionInput: t(s.uploaderCaptionInputKey), uploaderDescriptionInput: t(s.uploaderDescriptionInputKey), uploaderCaptionOutput: t(s.uploaderCaptionOutputKey), uploaderDescriptionOutput: t(s.uploaderDescriptionOutputKey), uploaderCaptionReference: t(s.uploaderCaptionReferenceKey), uploaderDescriptionReference: t(s.uploaderDescriptionReferenceKey) }) },
};


function App() {
    const {
        currentView,
        settings,
        imageGallery,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        isHistoryPanelOpen,
        isImageLayoutModalOpen,
        isBeforeAfterModalOpen,
        isAppCoverCreatorModalOpen,
        isStoryboardingModalMounted,
        isStoryboardingModalVisible,
        isLayerComposerMounted,
        isLayerComposerVisible,
        handleSelectApp,
        handleStateChange,
        addImagesToGallery,
        addGenerationToHistory,
        handleResetApp,
        handleGoBack,
        handleCloseSearch,
        handleCloseGallery,
        handleOpenInfo,
        handleCloseInfo,
        handleCloseHistoryPanel,
        closeImageLayoutModal,
        closeBeforeAfterModal,
        closeAppCoverCreatorModal,
        closeStoryboardingModal,
        hideStoryboardingModal,
        closeLayerComposer,
        hideLayerComposer,
        t,
        modelVersion,
        imageResolution,
        handleModelVersionChange,
        handleResolutionChange
    } = useAppControls();
    
    const { imageToEdit, closeImageEditor } = useImageEditor();
    const { loginSettings, isLoggedIn, isLoading, currentUser } = useAuth();

    // Sync global service config when context changes
    useEffect(() => {
        setGlobalModelConfig(modelVersion, imageResolution);
    }, [modelVersion, imageResolution]);

    useEffect(() => {
        const hasSeenInfoModal = localStorage.getItem('aPix_hasSeenInfoModal');
        if (!hasSeenInfoModal) {
            handleOpenInfo();
            localStorage.setItem('aPix_hasSeenInfoModal', 'true');
        }
    }, []); // Empty dependency array ensures this runs only once on mount


    useEffect(() => {
        const isAnyModalOpen = isSearchOpen || 
                               isGalleryOpen || 
                               isInfoOpen ||
                               isHistoryPanelOpen ||
                               isImageLayoutModalOpen || 
                               isBeforeAfterModalOpen || 
                               isAppCoverCreatorModalOpen ||
                               isStoryboardingModalVisible ||
                               isLayerComposerVisible || 
                               !!imageToEdit;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup function to ensure overflow is reset when the component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isSearchOpen, isGalleryOpen, isInfoOpen, isHistoryPanelOpen, isImageLayoutModalOpen, isBeforeAfterModalOpen, isAppCoverCreatorModalOpen, isStoryboardingModalVisible, isLayerComposerVisible, imageToEdit]);

    const getExportableState = useCallback((appState: any, appId: string): any => {
        const exportableState = JSON.parse(JSON.stringify(appState));
        
        const keysToRemove = [
            'generatedImage', 'generatedImages', 'historicalImages', 
            'finalPrompt', 'error',
        ];

        if (appId !== 'image-interpolation') {
            keysToRemove.push('generatedPrompt', 'promptSuggestions');
        }

        const processState = (obj: any) => {
            if (typeof obj !== 'object' || obj === null) return;

            for (const key of keysToRemove) {
                if (key in obj) delete obj[key];
            }

            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    processState(obj[key]);
                }
            }

            if ('stage' in obj && (obj.stage === 'generating' || obj.stage === 'results' || obj.stage === 'prompting')) {
                obj.stage = 'configuring';
            }
        };

        processState(exportableState);
        return exportableState;
    }, []);

    const logGeneration = useCallback(async (appId: string, preGenState: any, thumbnailUrl: string) => {
        if (!settings) return;

        const appConfig = settings.apps.find((app: AppConfig) => app.id === appId);
        const appName = appConfig ? t(appConfig.titleKey) : appId;

        const cleanedState = getExportableState(preGenState, appId);
        
        const smallThumbnailUrl = await createThumbnailDataUrl(thumbnailUrl, 128, 128);

        const entry: Omit<GenerationHistoryEntry, 'id' | 'timestamp'> = {
            appId,
            appName: appName.replace(/\n/g, ' '),
            thumbnailUrl: smallThumbnailUrl,
            settings: {
                viewId: appId,
                state: cleanedState,
            },
        };
        addGenerationToHistory(entry);
    }, [addGenerationToHistory, settings, t, getExportableState]);

    const renderContent = () => {
        if (!settings) return null; // Wait for settings to load

        const commonProps = { 
            addImagesToGallery,
            onStateChange: handleStateChange,
            onReset: handleResetApp,
            onGoBack: handleGoBack,
            logGeneration,
        };
        
        const motionProps = {
            className: "w-full h-full flex-1 min-h-0",
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -20 },
            transition: { duration: 0.4 },
        };

        const homeComponent = (
            <Home 
                key={`home-${currentView.viewId}`}
                onSelectApp={handleSelectApp} 
                title={renderSmartlyWrappedTitle(t(settings.home.mainTitleKey), settings.home.useSmartTitleWrapping, settings.home.smartTitleWrapWords)}
                subtitle={t(settings.home.subtitleKey)}
                apps={settings.apps.map((app: AppConfig) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)}))}
            />
        );

        if (currentView.viewId === 'home') {
            return homeComponent;
        }

        const appInfo = AppComponents[currentView.viewId];

        if (!appInfo) {
            return homeComponent;
        }

        const { Component, settingsKey, props } = appInfo;
        const appSettings = settings[settingsKey];
        const translatedProps = props(appSettings, t);
        
        return (
            <Suspense fallback={<AppLoadingFallback />}>
                <motion.div key={currentView.viewId} {...motionProps}>
                    <Component
                        {...appSettings}
                        {...translatedProps}
                        {...commonProps}
                        appState={currentView.state}
                    />
                </motion.div>
            </Suspense>
        );
    };

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-neutral-900">
                <LoadingSpinnerIcon className="animate-spin h-10 w-10 text-yellow-400" />
            </div>
        );
    }

    if (loginSettings?.enabled && !isLoggedIn) {
        return <LoginScreen />;
    }

    return (
        <main className="text-neutral-200 min-h-screen w-full relative">
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: {
                        fontFamily: '"Be Vietnam Pro", sans-serif',
                        background: 'rgba(38, 38, 38, 0.75)', /* bg-neutral-800 @ 75% */
                        backdropFilter: 'blur(8px)',
                        color: '#E5E5E5', /* text-neutral-200 */
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#FBBF24', // yellow-400
                            secondary: '#171717', // neutral-900
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#f87171', // red-400
                            secondary: '#171717', // neutral-900
                        },
                    },
                }}
            />
            <div className="absolute inset-0 bg-black/30 z-0" aria-hidden="true"></div>
            
            <div className="fixed top-4 left-4 z-20 flex items-center gap-2 flex-wrap">
                {isLoggedIn && currentUser && <UserStatus />}
                <LanguageSwitcher />
                
                <div className="flex items-center gap-1 bg-black/30 rounded-full p-1 text-sm text-neutral-200 backdrop-blur-sm border border-white/10">
                    <button 
                        onClick={() => handleModelVersionChange('v2')} 
                        className={cn(
                            'px-3 py-0.5 rounded-full text-xs font-bold transition-colors duration-200', 
                            modelVersion === 'v2' 
                                ? 'bg-yellow-400 text-black' 
                                : 'text-neutral-300 hover:bg-white/10'
                        )}
                        aria-pressed={modelVersion === 'v2'}
                    >
                        v2
                    </button>
                    <button 
                        onClick={() => handleModelVersionChange('v3')} 
                        className={cn(
                            'px-3 py-0.5 rounded-full text-xs font-bold transition-colors duration-200', 
                            modelVersion === 'v3' 
                                ? 'bg-yellow-400 text-black' 
                                : 'text-neutral-300 hover:bg-white/10'
                        )}
                        aria-pressed={modelVersion === 'v3'}
                    >
                        v3
                    </button>
                </div>

                {modelVersion === 'v3' && (
                    <div className="flex items-center gap-1 bg-black/30 rounded-full p-1 text-sm text-neutral-200 backdrop-blur-sm border border-white/10">
                        {(['1K', '2K', '4K'] as ImageResolution[]).map(res => (
                            <button 
                                key={res}
                                onClick={() => handleResolutionChange(res)}
                                className={cn(
                                    'px-3 py-0.5 rounded-full text-xs font-bold transition-colors duration-200', 
                                    imageResolution === res 
                                        ? 'bg-blue-500 text-white' 
                                        : 'text-neutral-300 hover:bg-white/10'
                                )}
                                aria-pressed={imageResolution === res}
                            >
                                {res}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <AppToolbar />

            <div className="relative z-10 w-full min-h-screen flex flex-row items-center justify-center px-4 pt-16 pb-24">
                <AnimatePresence mode="wait">
                   {renderContent()}
                </AnimatePresence>
            </div>
            
            <SearchModal
                isOpen={isSearchOpen}
                onClose={handleCloseSearch}
                onSelectApp={(appId) => {
                    handleSelectApp(appId);
                    handleCloseSearch();
                }}
                apps={settings ? settings.apps.map((app: AppConfig) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)})) : []}
            />
            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={handleCloseGallery}
                images={imageGallery}
            />
             <InfoModal
                isOpen={isInfoOpen}
                onClose={handleCloseInfo}
            />
            <HistoryPanel
                isOpen={isHistoryPanelOpen}
                onClose={handleCloseHistoryPanel}
            />
            <ImageEditorModal 
                imageToEdit={imageToEdit}
                onClose={closeImageEditor}
            />
            <ImageLayoutModal
                isOpen={isImageLayoutModalOpen}
                onClose={closeImageLayoutModal}
            />
            <BeforeAfterModal
                isOpen={isBeforeAfterModalOpen}
                onClose={closeBeforeAfterModal}
            />
            <AppCoverCreatorModal
                isOpen={isAppCoverCreatorModalOpen}
                onClose={closeAppCoverCreatorModal}
            />
            {isStoryboardingModalMounted && (
                <StoryboardingModal
                    isOpen={isStoryboardingModalVisible}
                    onClose={closeStoryboardingModal}
                    onHide={hideStoryboardingModal}
                />
            )}
            {isLayerComposerMounted && (
                <LayerComposerModal
                    isOpen={isLayerComposerVisible}
                    onClose={closeLayerComposer}
                    onHide={hideLayerComposer}
                />
            )}
            <Footer />
        </main>
    );
}

export default App;