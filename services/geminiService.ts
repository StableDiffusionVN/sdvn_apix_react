/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This file acts as an aggregator for all Gemini service functions.
// It allows components to import from a single location, simplifying refactoring.

export * from './gemini/baseService';
export * from './gemini/imageEditingService';
export * from './gemini/avatarCreatorService';
export * from './gemini/babyPhotoCreatorService';
export * from './gemini/beautyCreatorService';
export * from './gemini/midAutumnCreatorService';
export * from './gemini/entrepreneurCreatorService';
export * from './gemini/architectureIdeatorService';
export * from './gemini/dressTheModelService';
export * from './gemini/photoRestorationService';
export * from './gemini/swapStyleService';
export * from './gemini/mixStyleService';
export * from './gemini/freeGenerationService';
export * from './gemini/toyModelCreatorService';
export * from './gemini/imageInterpolationService';
// FIX: Export imageToRealService to resolve 'convertImageToRealistic' not found error.
export * from './gemini/imageToRealService';
export * from './gemini/videoGenerationService';
export * from './gemini/presetService'; // NEW: Export the centralized preset service
export * from './gemini/chatService'; // NEW: Export the new chat service
export * from './gemini/storyboardingService'; // NEW: Export the new storyboarding service
