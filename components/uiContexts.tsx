/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import toast from 'react-hot-toast';
import {
    type ImageToEdit, type ViewState, type AnyAppState, type Theme,
    type AppConfig, THEMES, getInitialStateForApp, type Settings,
    type GenerationHistoryEntry, type ModelVersion, type ImageResolution,
    type AppControlContextType,
    type ImageSource
} from './uiTypes';

import * as fileStorage from '../services/fileStorage';

// --- Auth Context ---
interface Account {
    username: string;
    password?: string;
}

interface LoginSettings {
    enabled: boolean;
    accounts: Account[];
}

interface AuthContextType {
    loginSettings: LoginSettings | null;
    isLoggedIn: boolean;
    currentUser: string | null;
    isLoading: boolean;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loginSettings, setLoginSettings] = useState<LoginSettings | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const defaultSettingsOnError: LoginSettings = {
                enabled: true,
                accounts: [
                    { username: "aPix", password: "sdvn" },
                    { username: "guest", password: "123" }
                ]
            };
            
            const handleEnabledLogin = (settings: LoginSettings) => {
                const storedUser = sessionStorage.getItem('currentUser');
                if (storedUser && settings.accounts.some(acc => acc.username === storedUser)) {
                    setCurrentUser(storedUser);
                    setIsLoggedIn(true);
                }
            };

            try {
                const response = await fetch('/setting-login.json');
                if (response.ok) {
                    const settings: LoginSettings = await response.json();
                    setLoginSettings(settings);
                    
                    if (settings.enabled === false) {
                        // Login is disabled. Bypass the login screen. No user is set.
                        setIsLoggedIn(true);
                        setCurrentUser(null);
                        sessionStorage.removeItem('currentUser');
                    } else {
                        // Treat enabled:true or missing enabled property as login required.
                        handleEnabledLogin(settings);
                    }
                } else {
                    // File not found. Default to login enabled.
                    console.warn("setting-login.json not found. Defaulting to login enabled.");
                    setLoginSettings(defaultSettingsOnError);
                    handleEnabledLogin(defaultSettingsOnError);
                }
            } catch (error) {
                // On any other error (parsing, network), default to login enabled.
                console.error("Error processing setting-login.json. Defaulting to login enabled.", error);
                setLoginSettings(defaultSettingsOnError);
                handleEnabledLogin(defaultSettingsOnError);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = useCallback(async (username: string, password?: string): Promise<boolean> => {
        if (!loginSettings) return false;

        const account = loginSettings.accounts.find(acc => acc.username === username);
        if (account && account.password === password) {
            setCurrentUser(username);
            setIsLoggedIn(true);
            sessionStorage.setItem('currentUser', username);
            return true;
        }
        return false;
    }, [loginSettings]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        setIsLoggedIn(false);
        sessionStorage.removeItem('currentUser');
    }, []);

    const value = { loginSettings, isLoggedIn, currentUser, isLoading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// --- Image Editor Hook & Context ---
interface ImageEditorContextType {
    imageToEdit: ImageToEdit | null;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
    openEmptyImageEditor: (onSave: (newUrl: string) => void) => void;
    closeImageEditor: () => void;
}

const ImageEditorContext = createContext<ImageEditorContextType | undefined>(undefined);

export const ImageEditorProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [imageToEdit, setImageToEdit] = useState<ImageToEdit | null>(null);

    const openImageEditor = useCallback((url: string, onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        if (!url) {
            console.error("openImageEditor called with no URL.");
            return;
        }
        setImageToEdit({ url, onSave });
    }, []);

    const openEmptyImageEditor = useCallback((onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        setImageToEdit({ url: null, onSave });
    }, []);

    const closeImageEditor = useCallback(() => {
        setImageToEdit(null);
    }, []);

    const value = { imageToEdit, openImageEditor, openEmptyImageEditor, closeImageEditor };

    return (
        <ImageEditorContext.Provider value={value}>
            {children}
        </ImageEditorContext.Provider>
    );
};

export const useImageEditor = (): ImageEditorContextType => {
    const context = useContext(ImageEditorContext);
    if (context === undefined) {
        throw new Error('useImageEditor must be used within an ImageEditorProvider');
    }
    return context;
};

// --- App Control Context ---

const AppControlContext = createContext<AppControlContextType | undefined>(undefined);

export const AppControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [viewHistory, setViewHistory] = useState<ViewState[]>([{ viewId: 'home', state: { stage: 'home' } }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme && THEMES.includes(savedTheme)) {
            return savedTheme;
        }
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [isExtraToolsOpen, setIsExtraToolsOpen] = useState(false);
    const [isImageLayoutModalOpen, setIsImageLayoutModalOpen] = useState(false);
    const [isBeforeAfterModalOpen, setIsBeforeAfterModalOpen] = useState(false);
    const [isAppCoverCreatorModalOpen, setIsAppCoverCreatorModalOpen] = useState(false);
    const [isStoryboardingModalMounted, setIsStoryboardingModalMounted] = useState(false);
    const [isStoryboardingModalVisible, setIsStoryboardingModalVisible] = useState(false);
    const [isLayerComposerMounted, setIsLayerComposerMounted] = useState(false);
    const [isLayerComposerVisible, setIsLayerComposerVisible] = useState(false);
    const [imageGallery, setImageGallery] = useState<string[]>([]);
    const [generationHistory, setGenerationHistory] = useState<GenerationHistoryEntry[]>([]);
    const [isDbLoaded, setIsDbLoaded] = useState(false);

    const [language, setLanguage] = useState<'vi' | 'en'>(() => (localStorage.getItem('app-language') as 'vi' | 'en') || 'vi');
    const [translations, setTranslations] = useState<Record<string, any>>({});
    const [settings, setSettings] = useState<Settings | null>(null);
    
    const [modelVersion, setModelVersion] = useState<ModelVersion>('v2');
    const [imageResolution, setImageResolution] = useState<ImageResolution>('1K');

    const currentView = viewHistory[historyIndex];

    useEffect(() => {
        const fetchTranslations = async () => {
             const modules = [
                'common', 
                'data',
                'home', 
                'architectureIdeator',
                'avatarCreator',
                'babyPhotoCreator',
                'beautyCreator',
                'midAutumnCreator',
                'dressTheModel',
                'entrepreneurCreator',
                'freeGeneration',
                'imageInterpolation',
                'imageToReal',
                'mixStyle',
                'photoRestoration',
                'swapStyle',
                'toyModelCreator'
            ];
            try {
                const fetchPromises = modules.map(module =>
                    fetch(`/locales/${language}/${module}.json`)
                        .then(res => {
                            if (!res.ok) {
                                console.warn(`Could not fetch ${module}.json for ${language}`);
                                return {}; // Return empty object on failure to not break Promise.all
                            }
                            return res.json();
                        })
                );

                const loadedTranslations = await Promise.all(fetchPromises);
                
                const mergedTranslations = loadedTranslations.reduce(
                    (acc, current) => ({ ...acc, ...current }),
                    {}
                );
                setTranslations(mergedTranslations);
            } catch (error) {
                console.error(`Could not load translations for ${language}`, error);
            }
        };
        fetchTranslations();
    }, [language]);
    
    // Effect to initialize DB, migrate, and load data on app start
    useEffect(() => {
        async function loadData() {
            // await db.migrateFromLocalStorageToIdb(); // No longer needed
            try {
                // Load gallery from file list (recursive)
                const galleryImages = await fileStorage.listImages('gallery');
                
                // Sort by modification time (newest first)
                // The backend sorts by mtime, but we ensure it here especially if we were to merge multiple sources
                galleryImages.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));

                // We just need the URLs for the gallery state
                const galleryUrls = galleryImages.map(img => img.url);
                setImageGallery(galleryUrls);

                // Load history from JSON file
                const history = await fileStorage.loadData('history.json');
                if (history && Array.isArray(history)) {
                    setGenerationHistory(history);
                }
            } catch (error) {
                console.error("Failed to load initial data:", error);
            }
            setIsDbLoaded(true);
        }
        loadData();
    }, []);

    const t = useCallback((key: string, ...args: any[]) => {
        const keys = key.split('.');
        let translation = keys.reduce((obj, keyPart) => {
            if (obj && typeof obj === 'object' && keyPart in obj) {
                return (obj as Record<string, any>)[keyPart];
            }
            return undefined;
        }, translations as any);

        if (translation === undefined) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }

        if (typeof translation === 'string' && args.length > 0) {
            let result = translation;
            args.forEach((arg, index) => {
                result = result.replace(`{${index}}`, String(arg));
            });
            return result;
        }

        return translation;
    }, [translations]);
    
    const addGenerationToHistory = useCallback(async (entryData: Omit<GenerationHistoryEntry, 'id' | 'timestamp'>) => {
        try {
            // Upload thumbnail to server if it's a base64 string
            let thumbnailUrl = entryData.thumbnailUrl;
            if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
                thumbnailUrl = await fileStorage.uploadBase64Image(thumbnailUrl, 'history');
            }

            const newEntry: GenerationHistoryEntry = {
                ...entryData,
                thumbnailUrl,
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                timestamp: Date.now(),
            };
            
            // Update local state
            const updatedHistory = [newEntry, ...generationHistory];
            setGenerationHistory(updatedHistory);
            
            // Save to server
            await fileStorage.saveData('history.json', updatedHistory);

        } catch (error) {
            console.error('Error adding generation to history:', error);
            toast.error('Không thể lưu vào lịch sử');
        }
    }, [generationHistory]);


    const handleLanguageChange = useCallback((lang: 'vi' | 'en') => {
        setLanguage(lang);
        localStorage.setItem('app-language', lang);
    }, []);
    
    const handleModelVersionChange = useCallback((version: ModelVersion) => {
        setModelVersion(version);
    }, []);

    const handleResolutionChange = useCallback((resolution: ImageResolution) => {
        setImageResolution(resolution);
    }, []);
    
    const addImagesToGallery = useCallback(async (newImages: string[], source: 'outputs' | 'image_editor' | 'extra' | 'storyboard' | 'upload' = 'upload') => {
        const uniqueNewImages = newImages.filter(img => img && !imageGallery.includes(img));
        if (uniqueNewImages.length === 0) {
            return;
        }

        try {
            // Upload images to server and get file URLs with subfolder
            const uploadedUrls = await fileStorage.uploadMultipleBase64Images(uniqueNewImages, 'gallery', source);
            
            // Update local state
            setImageGallery(prev => [...uploadedUrls, ...prev]);
            
            // No need to save gallery list explicitly as it is derived from file system
        } catch (error) {
            console.error('Error adding images to gallery:', error);
            toast.error('Không thể lưu ảnh vào gallery');
        }
    }, [imageGallery]);

    const removeImageFromGallery = useCallback(async (indexToRemove: number) => {
        const urlToDelete = imageGallery[indexToRemove];
        if (urlToDelete) {
            try {
                // Delete file from server
                await fileStorage.deleteImageByUrl(urlToDelete);
                
                // Update local state
                setImageGallery(prev => prev.filter((_, index) => index !== indexToRemove));
            } catch (error) {
                console.error('Error removing image from gallery:', error);
                toast.error('Không thể xóa ảnh');
            }
        }
    }, [imageGallery]);

    const replaceImageInGallery = useCallback(async (indexToReplace: number, newImageUrl: string) => {
        const oldUrl = imageGallery[indexToReplace];
        if (oldUrl) {
            try {
                // Upload new image to server (save to editor folder as it is an edit)
                const uploadedUrl = await fileStorage.uploadBase64Image(newImageUrl, 'gallery', 'image_editor');
                
                // Delete old file from server
                await fileStorage.deleteImageByUrl(oldUrl);
                
                // Update local state
                setImageGallery(prev => {
                    const newImages = [...prev];
                    newImages[indexToReplace] = uploadedUrl;
                    return newImages;
                });
            } catch (error) {
                console.error('Error replacing image in gallery:', error);
                toast.error('Không thể thay thế ảnh');
            }
        }
    }, [imageGallery]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/setting.json');
                 if (!response.ok) {
                    console.warn('Could not load setting.json, using built-in settings.');
                    return;
                }
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch or parse setting.json:", error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        // Dynamically remove all possible theme classes to prevent conflicts
        THEMES.forEach(t => document.body.classList.remove(`theme-${t}`));
        
        // Add the current theme class
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const restoreStateFromGallery = useCallback((stateToRestore: any, gallery: string[]): AnyAppState => {
        const restoredState = JSON.parse(JSON.stringify(stateToRestore));
    
        const restoreRefs = (obj: any) => {
            if (typeof obj !== 'object' || obj === null) return;
            
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (obj[key].type === 'galleryRef' && typeof obj[key].index === 'number') {
                        const galleryIndex = obj[key].index;
                        if (gallery[galleryIndex]) {
                            obj[key] = gallery[galleryIndex];
                        } else {
                            console.warn(`Gallery reference with index ${galleryIndex} not found.`);
                            obj[key] = null;
                        }
                    } else {
                        restoreRefs(obj[key]);
                    }
                }
            }
        };
    
        restoreRefs(restoredState);
        return restoredState;
    }, []);

    const navigateTo = useCallback((viewId: string) => {
        const current = viewHistory[historyIndex];
        const initialState = getInitialStateForApp(viewId);
    
        if (current.viewId === viewId && JSON.stringify(current.state) === JSON.stringify(initialState)) {
            return;
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: initialState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);
    
    const handleStateChange = useCallback((newAppState: AnyAppState) => {
        const current = viewHistory[historyIndex];
        if (JSON.stringify(current.state) === JSON.stringify(newAppState)) {
            return; // No change
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId: current.viewId, state: newAppState } as ViewState);
    
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);

    const importSettingsAndNavigate = useCallback((settings: any) => {
        if (!settings || typeof settings.viewId !== 'string' || typeof settings.state !== 'object') {
            alert('Invalid settings file.');
            return;
        }
    
        const { viewId, state: importedState } = settings;
        
        const initialState = getInitialStateForApp(viewId);
        if (initialState.stage === 'home') {
            alert(`Unknown app in settings file: ${viewId}`);
            return;
        }
    
        const restoredState = restoreStateFromGallery(importedState, imageGallery);
        const mergedState = { ...initialState, ...restoredState };
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: mergedState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    
    }, [viewHistory, historyIndex, imageGallery, restoreStateFromGallery]);

    const handleSelectApp = useCallback((appId: string) => {
        if (settings) {
            const validAppIds = settings.apps.map((app: AppConfig) => app.id);
            if (validAppIds.includes(appId)) {
                navigateTo(appId);
            } else {
                navigateTo('home');
            }
        }
    }, [settings, navigateTo]);

    const handleGoHome = useCallback(() => {
        navigateTo('home');
    }, [navigateTo]);

    const handleGoBack = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);
    
    const handleGoForward = useCallback(() => {
        if (historyIndex < viewHistory.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, viewHistory.length]);

    const handleResetApp = useCallback(() => {
        const currentViewId = viewHistory[historyIndex].viewId;
        if (currentViewId !== 'home') {
            navigateTo(currentViewId);
        }
    }, [viewHistory, historyIndex, navigateTo]);
    
    const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
    const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
    const handleOpenGallery = useCallback(() => setIsGalleryOpen(true), []);
    const handleCloseGallery = useCallback(() => setIsGalleryOpen(false), []);
    const handleOpenInfo = useCallback(() => setIsInfoOpen(true), []);
    const handleCloseInfo = useCallback(() => setIsInfoOpen(false), []);
    const handleOpenHistoryPanel = useCallback(() => setIsHistoryPanelOpen(true), []);
    const handleCloseHistoryPanel = useCallback(() => setIsHistoryPanelOpen(false), []);
    const toggleExtraTools = useCallback(() => setIsExtraToolsOpen(prev => !prev), []);
    const openImageLayoutModal = useCallback(() => {
        setIsImageLayoutModalOpen(true);
        setIsExtraToolsOpen(false); // Close the tools menu when opening the modal
    }, []);
    const closeImageLayoutModal = useCallback(() => setIsImageLayoutModalOpen(false), []);
    const openBeforeAfterModal = useCallback(() => {
        setIsBeforeAfterModalOpen(true);
        setIsExtraToolsOpen(false);
    }, []);
    const closeBeforeAfterModal = useCallback(() => setIsBeforeAfterModalOpen(false), []);
    const openAppCoverCreatorModal = useCallback(() => {
        setIsAppCoverCreatorModalOpen(true);
        setIsExtraToolsOpen(false);
    }, []);
    const closeAppCoverCreatorModal = useCallback(() => setIsAppCoverCreatorModalOpen(false), []);

    const openStoryboardingModal = useCallback(() => {
        setIsStoryboardingModalMounted(true);
        setIsStoryboardingModalVisible(true);
        setIsExtraToolsOpen(false);
    }, []);

    const hideStoryboardingModal = useCallback(() => {
        setIsStoryboardingModalVisible(false);
    }, []);
    
    const closeStoryboardingModal = useCallback(() => {
        setIsStoryboardingModalMounted(false);
        setIsStoryboardingModalVisible(false);
    }, []);

    const toggleStoryboardingModal = useCallback(() => {
        if (isStoryboardingModalVisible) {
            hideStoryboardingModal();
        } else {
            openStoryboardingModal();
        }
    }, [isStoryboardingModalVisible, hideStoryboardingModal, openStoryboardingModal]);

    const openLayerComposer = useCallback(() => {
        setIsLayerComposerMounted(true);
        setIsLayerComposerVisible(true);
        setIsExtraToolsOpen(false);
    }, []);
    const closeLayerComposer = useCallback(() => {
        setIsLayerComposerMounted(false);
        setIsLayerComposerVisible(false);
    }, []);
    const hideLayerComposer = useCallback(() => {
        setIsLayerComposerVisible(false);
    }, []);
    
    const toggleLayerComposer = useCallback(() => {
        if (isLayerComposerVisible) {
            hideLayerComposer();
        } else {
            openLayerComposer();
        }
    }, [isLayerComposerVisible, hideLayerComposer, openLayerComposer]);

    const value: AppControlContextType = {
        currentView,
        settings,
        theme,
        imageGallery,
        historyIndex,
        viewHistory,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        isHistoryPanelOpen,
        isExtraToolsOpen,
        isImageLayoutModalOpen,
        isBeforeAfterModalOpen,
        isAppCoverCreatorModalOpen,
        isStoryboardingModalMounted,
        isStoryboardingModalVisible,
        isLayerComposerMounted,
        isLayerComposerVisible,
        language,
        generationHistory,
        modelVersion,
        imageResolution,
        addGenerationToHistory,
        addImagesToGallery,
        removeImageFromGallery,
        replaceImageInGallery,
        handleThemeChange,
        handleLanguageChange,
        handleModelVersionChange,
        handleResolutionChange,
        navigateTo,
        handleStateChange,
        handleSelectApp,
        handleGoHome,
        handleGoBack,
        handleGoForward,
        handleResetApp,
        handleOpenSearch,
        handleCloseSearch,
        handleOpenGallery,
        handleCloseGallery,
        handleOpenInfo,
        handleCloseInfo,
        handleOpenHistoryPanel,
        handleCloseHistoryPanel,
        toggleExtraTools,
        openImageLayoutModal,
        closeImageLayoutModal,
        openBeforeAfterModal,
        closeBeforeAfterModal,
        openAppCoverCreatorModal,
        closeAppCoverCreatorModal,
        openStoryboardingModal,
        closeStoryboardingModal,
        hideStoryboardingModal,
        toggleStoryboardingModal,
        openLayerComposer,
        closeLayerComposer,
        hideLayerComposer,
        toggleLayerComposer,
        importSettingsAndNavigate,
        t,
    };

    return (
        <AppControlContext.Provider value={value}>
            {children}
        </AppControlContext.Provider>
    );
};

export const useAppControls = (): AppControlContextType => {
    const context = useContext(AppControlContext);
    if (context === undefined) {
        throw new Error('useAppControls must be used within an AppControlProvider');
    }
    return context;
};
