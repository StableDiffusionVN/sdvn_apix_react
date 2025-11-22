/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";

const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Get API key from localStorage first, fallback to environment variable
const getApiKey = (): string => {
    if (typeof window !== 'undefined') {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedKey && storedKey.trim()) {
            return storedKey.trim();
        }
    }
    return process.env.API_KEY || '';
};

// This creates a single, shared instance of the GoogleGenAI client.
let ai = new GoogleGenAI({ apiKey: getApiKey() });

// Function to update the API key and reinitialize the client
export const updateApiKey = (newApiKey?: string) => {
    const apiKey = newApiKey || getApiKey();
    ai = new GoogleGenAI({ apiKey });
};

export default ai;