/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This file contains shared type definitions for UI components and application state.

// Base types
export interface ImageForZip {
    url: string;
    filename: string;
    folder?: string;
    extension?: string;
}

export interface VideoTask {
    status: 'pending' | 'done' | 'error';
    resultUrl?: string;
    error?: string;
    operation?: any;
}

export interface AppConfig {
    id: string;
    titleKey: string;
    descriptionKey: string;
    icon: string;
    supportsCanvasPreset?: boolean;
    previewImageUrl?: string;
}

export interface AppSettings {
    mainTitleKey: string;
    subtitleKey: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    [key: string]: any;
}
  
export interface Settings {
    home: {
        mainTitleKey: string;
        subtitleKey: string;
        useSmartTitleWrapping: boolean;
        smartTitleWrapWords: number;
    };
    apps: AppConfig[];
    enableImageMetadata: boolean;
    // FIX: Add missing enableWebcam property to the Settings interface.
    enableWebcam: boolean;
    architectureIdeator: AppSettings;
    avatarCreator: AppSettings & { minIdeas: number; maxIdeas: number; };
    babyPhotoCreator: AppSettings & { minIdeas: number; maxIdeas: number; };
    beautyCreator: AppSettings;
    midAutumnCreator: AppSettings & { minIdeas: number; maxIdeas: number; };
    entrepreneurCreator: AppSettings & { minIdeas: number; maxIdeas: number; };
    dressTheModel: AppSettings;
    photoRestoration: AppSettings;
    swapStyle: AppSettings;
    freeGeneration: AppSettings;
    toyModelCreator: AppSettings;
    imageInterpolation: AppSettings;
}

export type Theme = 'sdvn' | 'vietnam' | 'skyline' | 'hidden-jaguar' | 'wide-matrix' | 'rainbow' | 'soundcloud' | 'amin';
export const THEMES: Theme[] = ['sdvn', 'vietnam', 'skyline', 'hidden-jaguar', 'wide-matrix', 'rainbow', 'soundcloud', 'amin'];

export interface ThemeInfo {
    id: Theme;
    name: string;
    colors: [string, string]; // [startColor, endColor] for gradient
}

export const THEME_DETAILS: ThemeInfo[] = [
    { id: 'sdvn', name: 'SDVN', colors: ['#5858e6', '#151523'] },
    { id: 'vietnam', name: 'Việt Nam', colors: ['#DA251D', '#a21a14'] },
    { id: 'skyline', name: 'Skyline', colors: ['#0052D4', '#6FB1FC'] },
    { id: 'hidden-jaguar', name: 'Hidden Jaguar', colors: ['#f9f047', '#0fd850'] },
    { id: 'wide-matrix', name: 'Wide Matrix', colors: ['#ff7882', '#0c1db8'] },
    { id: 'rainbow', name: 'RainBow', colors: ['#0575E6', '#00F260'] },
    { id: 'soundcloud', name: 'SoundCloud', colors: ['#f83600', '#fe8c00'] },
    { id: 'amin', name: 'Amin', colors: ['#4A00E0', '#8E2DE2'] }
];


export interface ImageToEdit {
    url: string | null;
    onSave: (newUrl: string) => void;
}

export type ImageSource = 'outputs' | 'image_editor' | 'extra' | 'storyboard' | 'upload';


// --- Centralized State Definitions ---

export type HomeState = { stage: 'home' };

export interface ArchitectureIdeatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    styleReferenceImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        context: string;
        style: string;
        color: string;
        lighting: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export type ImageStatus = 'pending' | 'done' | 'error';
export interface GeneratedAvatarImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}
interface HistoricalAvatarImage {
    idea: string;
    url: string;
}
export interface AvatarCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    styleReferenceImage: string | null;
    generatedImages: Record<string, GeneratedAvatarImage>;
    historicalImages: HistoricalAvatarImage[];
    selectedIdeas: string[];
    options: {
        additionalPrompt: string;
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

export interface BabyPhotoCreatorState extends AvatarCreatorState {}

export interface BeautyCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    styleReferenceImage: string | null;
    generatedImages: Record<string, GeneratedAvatarImage>;
    historicalImages: HistoricalAvatarImage[];
    selectedIdeas: string[];
    options: {
        notes: string;
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

export interface MidAutumnCreatorState extends AvatarCreatorState {}
export interface EntrepreneurCreatorState extends AvatarCreatorState {}


export interface DressTheModelState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    modelImage: string | null;
    clothingImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        background: string;
        pose: string;
        style: string;
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface PhotoRestorationState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        type: string;
        gender: string;
        age: string;
        nationality: string;
        notes: string;
        removeWatermark: boolean;
        removeStains: boolean;
        colorizeRgb: boolean;
    };
    error: string | null;
}

export interface SwapStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    contentImage: string | null;
    styleImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        style: string;
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
        convertToReal: boolean;
    };
    error: string | null;
}

// FIX: Add missing MixStyleState type definition.
export interface MixStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    contentImage: string | null;
    styleImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    finalPrompt: string | null;
    options: {
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface FreeGenerationState {
    stage: 'configuring' | 'generating' | 'results';
    image1: string | null;
    image2: string | null;
    image3: string | null;
    image4: string | null;
    generatedImages: string[];
    historicalImages: string[];
    options: {
        prompt: string;
        removeWatermark: boolean;
        numberOfImages: number;
        aspectRatio: string;
    };
    error: string | null;
}

// FIX: Add missing ImageToRealState type definition to resolve import error.
export interface ImageToRealState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        faithfulness: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface ToyModelCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    concept: string; // e.g., 'desktop_model', 'keychain', 'gachapon', 'miniature'
    options: {
        // Concept 1: Desktop Model
        computerType: string;
        softwareType: string;
        boxType: string;
        background: string;
        // Concept 2: Keychain
        keychainMaterial: string;
        keychainStyle: string;
        accompanyingItems: string;
        deskSurface: string;
        // Concept 3: Gachapon
        capsuleColor: string;
        modelFinish: string;
        capsuleContents: string;
        displayLocation: string;
        // Concept 4: Miniature
        miniatureMaterial: string;
        baseMaterial: string;
        baseShape: string;
        lightingStyle: string;
        // Concept 5: Pokémon Model
        pokeballType: string;
        evolutionDisplay: string;
        modelStyle: string;
        // Concept 6: Crafting Model
        modelType: string;
        blueprintType: string;
        characterMood: string;
        // Constant Options
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface ImageInterpolationState {
    stage: 'idle' | 'prompting' | 'configuring' | 'generating' | 'results';
    analysisMode: 'general' | 'deep' | 'expert';
    inputImage: string | null;
    outputImage: string | null;
    referenceImage: string | null;
    generatedPrompt: string;
    promptSuggestions: string;
    additionalNotes: string;
    finalPrompt: string | null;
    generatedImage: string | null;
    historicalImages: { url: string; prompt: string; }[];
    options: {
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

// --- Storyboarding Types ---
export interface FrameState {
    description: string;
    status: 'idle' | 'pending' | 'done' | 'error';
    imageSource: 'reference' | string; // 'reference', 'scene.frame-x.y', or custom image data URL
    imageUrl?: string;
    error?: string;
}

export interface SceneState {
    scene: number;
    startFrame: FrameState;
    animationDescription: string;
    videoPrompt?: string;
    endFrame: FrameState;
    videoStatus?: 'idle' | 'pending' | 'done' | 'error';
    videoUrl?: string;
    videoError?: string;
    videoOperation?: any;
}


// Union type for all possible app states
// FIX: Add MixStyleState and ImageToRealState to the AnyAppState union type.
export type AnyAppState =
  | HomeState
  | ArchitectureIdeatorState
  | AvatarCreatorState
  | BabyPhotoCreatorState
  | BeautyCreatorState
  | MidAutumnCreatorState
  | EntrepreneurCreatorState
  | DressTheModelState
  | PhotoRestorationState
  | SwapStyleState
  | MixStyleState
  | FreeGenerationState
  | ImageToRealState
  | ToyModelCreatorState
  | ImageInterpolationState;

// --- App Navigation & State Types (Moved from App.tsx) ---
export type HomeView = { viewId: 'home'; state: HomeState };
export type ArchitectureIdeatorView = { viewId: 'architecture-ideator'; state: ArchitectureIdeatorState };
export type AvatarCreatorView = { viewId: 'avatar-creator'; state: AvatarCreatorState };
export type BabyPhotoCreatorView = { viewId: 'baby-photo-creator'; state: BabyPhotoCreatorState };
export type BeautyCreatorView = { viewId: 'beauty-creator'; state: BeautyCreatorState };
export type MidAutumnCreatorView = { viewId: 'mid-autumn-creator'; state: MidAutumnCreatorState };
export type EntrepreneurCreatorView = { viewId: 'entrepreneur-creator'; state: EntrepreneurCreatorState };
export type DressTheModelView = { viewId: 'dress-the-model'; state: DressTheModelState };
export type PhotoRestorationView = { viewId: 'photo-restoration'; state: PhotoRestorationState };
export type SwapStyleView = { viewId: 'swap-style'; state: SwapStyleState };
export type FreeGenerationView = { viewId: 'free-generation'; state: FreeGenerationState };
export type ToyModelCreatorView = { viewId: 'toy-model-creator'; state: ToyModelCreatorState };
export type ImageInterpolationView = { viewId: 'image-interpolation'; state: ImageInterpolationState };
// FIX: Add missing ImageToRealView type definition.
export type ImageToRealView = { viewId: 'image-to-real'; state: ImageToRealState };


export type ViewState =
  | HomeView
  | ArchitectureIdeatorView
  | AvatarCreatorView
  | BabyPhotoCreatorView
  | BeautyCreatorView
  | MidAutumnCreatorView
  | EntrepreneurCreatorView
  | DressTheModelView
  | PhotoRestorationView
  | SwapStyleView
  | FreeGenerationView
  | ToyModelCreatorView
  | ImageInterpolationView
  // FIX: Add missing ImageToRealView to union type.
  | ImageToRealView;

// Helper function to get initial state for an app
export const getInitialStateForApp = (viewId: string): AnyAppState => {
    switch (viewId) {
        case 'home':
            return { stage: 'home' };
        case 'architecture-ideator':
            return { stage: 'idle', uploadedImage: null, styleReferenceImage: null, generatedImage: null, historicalImages: [], options: { context: '', style: '', color: '', lighting: '', notes: '', removeWatermark: false }, error: null };
        case 'avatar-creator':
            return { stage: 'idle', uploadedImage: null, styleReferenceImage: null, generatedImages: {}, historicalImages: [], selectedIdeas: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'baby-photo-creator':
            return { stage: 'idle', uploadedImage: null, styleReferenceImage: null, generatedImages: {}, historicalImages: [], selectedIdeas: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'beauty-creator':
            return { stage: 'idle', uploadedImage: null, styleReferenceImage: null, generatedImages: {}, historicalImages: [], selectedIdeas: [], options: { notes: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'mid-autumn-creator':
            return { stage: 'idle', uploadedImage: null, styleReferenceImage: null, generatedImages: {}, historicalImages: [], selectedIdeas: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'entrepreneur-creator':
            return { stage: 'idle', uploadedImage: null, styleReferenceImage: null, generatedImages: {}, historicalImages: [], selectedIdeas: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'dress-the-model':
            return { stage: 'idle', modelImage: null, clothingImage: null, generatedImage: null, historicalImages: [], options: { background: '', pose: '', style: '', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        case 'photo-restoration':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { type: 'Chân dung', gender: 'Tự động', age: '', nationality: '', notes: '', removeWatermark: false, removeStains: true, colorizeRgb: true }, error: null };
        case 'swap-style':
            return { stage: 'idle', contentImage: null, styleImage: null, generatedImage: null, historicalImages: [], options: { style: '', styleStrength: 'Rất mạnh', notes: '', removeWatermark: false, convertToReal: false }, error: null };
        case 'free-generation':
            return { stage: 'configuring', image1: null, image2: null, image3: null, image4: null, generatedImages: [], historicalImages: [], options: { prompt: '', removeWatermark: false, numberOfImages: 1, aspectRatio: 'Giữ nguyên' }, error: null };
        // FIX: Add missing 'image-to-real' case to factory function.
        case 'image-to-real':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { faithfulness: 'Tự động', notes: '', removeWatermark: false }, error: null };
        case 'toy-model-creator':
            return { 
                stage: 'idle', 
                uploadedImage: null, 
                generatedImage: null, 
                historicalImages: [],
                concept: 'desktop_model', 
                options: { 
                    computerType: '', 
                    softwareType: '', 
                    boxType: '', 
                    background: '',
                    keychainMaterial: '',
                    keychainStyle: '',
                    accompanyingItems: '',
                    deskSurface: '',
                    capsuleColor: '',
                    modelFinish: '',
                    capsuleContents: '',
                    displayLocation: '',
                    miniatureMaterial: '',
                    baseMaterial: '',
                    baseShape: '',
                    lightingStyle: '',
                    pokeballType: '',
                    evolutionDisplay: '',
                    modelStyle: '',
                    modelType: '',
                    blueprintType: '',
                    characterMood: '',
                    aspectRatio: 'Giữ nguyên', 
                    notes: '', 
                    removeWatermark: false 
                }, 
                error: null 
            };
        case 'image-interpolation':
             return { stage: 'idle', analysisMode: 'general', inputImage: null, outputImage: null, referenceImage: null, generatedPrompt: '', promptSuggestions: '', additionalNotes: '', finalPrompt: null, generatedImage: null, historicalImages: [], options: { removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        default:
            return { stage: 'home' };
    }
};

// --- History Entry Type ---
export interface GenerationHistoryEntry {
    id: string;
    timestamp: number;
    appId: string;
    appName: string;
    thumbnailUrl: string;
    settings: {
        viewId: string;
        state: AnyAppState;
    };
}

export type ModelVersion = 'v2' | 'v3';
export type ImageResolution = '1K' | '2K' | '4K';

// --- Context Types ---

export interface AppControlContextType {
    currentView: ViewState;
    settings: any;
    theme: Theme;
    imageGallery: string[];
    historyIndex: number;
    viewHistory: ViewState[];
    isSearchOpen: boolean;
    isGalleryOpen: boolean;
    isInfoOpen: boolean;
    isHistoryPanelOpen: boolean;
    isExtraToolsOpen: boolean;
    isImageLayoutModalOpen: boolean;
    isBeforeAfterModalOpen: boolean;
    isAppCoverCreatorModalOpen: boolean;
    isStoryboardingModalMounted: boolean;
    isStoryboardingModalVisible: boolean;
    isLayerComposerMounted: boolean;
    isLayerComposerVisible: boolean;
    language: 'vi' | 'en';
    generationHistory: GenerationHistoryEntry[];
    modelVersion: ModelVersion;
    imageResolution: ImageResolution;
    addGenerationToHistory: (entryData: Omit<GenerationHistoryEntry, 'id' | 'timestamp'>) => void;
    addImagesToGallery: (newImages: string[], source?: ImageSource) => void;
    removeImageFromGallery: (imageIndex: number) => void;
    replaceImageInGallery: (imageIndex: number, newImageUrl: string) => void;
    handleThemeChange: (newTheme: Theme) => void;
    handleLanguageChange: (lang: 'vi' | 'en') => void;
    handleModelVersionChange: (version: ModelVersion) => void;
    handleResolutionChange: (resolution: ImageResolution) => void;
    navigateTo: (viewId: string) => void;
    handleStateChange: (newAppState: AnyAppState) => void;
    handleSelectApp: (appId: string) => void;
    handleGoHome: () => void;
    handleGoBack: () => void;
    handleGoForward: () => void;
    handleResetApp: () => void;
    handleOpenSearch: () => void;
    handleCloseSearch: () => void;
    handleOpenGallery: () => void;
    handleCloseGallery: () => void;
    handleOpenInfo: () => void;
    handleCloseInfo: () => void;
    handleOpenHistoryPanel: () => void;
    handleCloseHistoryPanel: () => void;
    toggleExtraTools: () => void;
    openImageLayoutModal: () => void;
    closeImageLayoutModal: () => void;
    openBeforeAfterModal: () => void;
    closeBeforeAfterModal: () => void;
    openAppCoverCreatorModal: () => void;
    closeAppCoverCreatorModal: () => void;
    openStoryboardingModal: () => void;
    closeStoryboardingModal: () => void;
    hideStoryboardingModal: () => void;
    toggleStoryboardingModal: () => void;
    openLayerComposer: () => void;
    closeLayerComposer: () => void;
    hideLayerComposer: () => void;
    toggleLayerComposer: () => void;
    importSettingsAndNavigate: (settings: any) => void;
    t: (key: string, ...args: any[]) => any;
}
