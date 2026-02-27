/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import ai from './client'; // Import the shared client instance

// --- Global Configuration Store ---
interface GlobalConfig {
    modelVersion: 'v2' | 'v3' | 'v3.1';
    imageResolution: '1K' | '2K' | '4K';
}

let globalConfig: GlobalConfig = {
    modelVersion: 'v2',
    imageResolution: '1K'
};

export const setGlobalModelConfig = (version: 'v2' | 'v3' | 'v3.1', resolution: '1K' | '2K' | '4K') => {
    globalConfig = { modelVersion: version, imageResolution: resolution };
};

export const getModelConfig = () => globalConfig;

export const getTextModel = () => (globalConfig.modelVersion === 'v3' || globalConfig.modelVersion === 'v3.1') ? 'gemini-3.1-pro-preview' : 'gemini-2.5-flash';
export const getImageModel = () => (globalConfig.modelVersion === 'v3' || globalConfig.modelVersion === 'v3.1') ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

// --- Centralized Error Processor ---
export function processApiError(error: unknown): Error {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

    if (errorMessage.includes('ReadableStream uploading is not supported')) {
        return new Error("Ứng dụng tạm thời chưa tương thích ứng dụng di động, mong mọi người thông cảm");
    }
    if (errorMessage.toLowerCase().includes('api key not valid')) {
        return new Error("API Key không hợp lệ. Vui lòng liên hệ quản trị viên để được hỗ trợ.");
    }
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('resource_exhausted')) {
        return new Error("Ứng dụng tạm thời đạt giới hạn sử dụng trong ngày, hãy quay trở lại vào ngày tiếp theo.");
    }
    if (errorMessage.toLowerCase().includes('safety') || errorMessage.toLowerCase().includes('blocked')) {
        return new Error("Yêu cầu của bạn đã bị chặn vì lý do an toàn. Vui lòng thử với một hình ảnh hoặc prompt khác.");
    }
    
    // Return original Error object or a new one for other cases
    if (error instanceof Error) {
        return new Error("Đã xảy ra lỗi không mong muốn từ AI. Vui lòng thử lại sau. Chi tiết: " + error.message);
    }
    return new Error("Đã có lỗi không mong muốn từ AI: " + errorMessage);
}

/**
 * Parses a data URL string to extract its mime type and base64 data.
 * @param imageDataUrl The data URL to parse.
 * @returns An object containing the mime type and data.
 */
export function parseDataUrl(imageDataUrl: string): { mimeType: string; data: string } {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
    }
    const [, mimeType, data] = match;
    return { mimeType, data };
}

/**
 * Processes an image input (base64 or URL) and returns the mime type and base64 data.
 * @param input The image input (data URL or HTTP URL).
 * @returns A promise resolving to an object containing the mime type and data.
 */
export async function processImageInput(input: string): Promise<{ mimeType: string; data: string }> {
    if (input.startsWith('data:')) {
        return parseDataUrl(input);
    }

    try {
        const response = await fetch(input);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                try {
                    resolve(parseDataUrl(base64data));
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read image blob'));
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error processing image input:", error);
        throw new Error(`Could not process image: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
export function processGeminiResponse(response: GenerateContentResponse): string {
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse);
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors
 * and for responses that don't contain an image.
 * @param parts An array of parts for the request payload (e.g., image parts, text parts).
 * @param config Optional configuration object for the generateContent call.
 * @returns The GenerateContentResponse from the API.
 */
export async function callGeminiWithRetry(parts: object[], config: any = {}): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;
    let lastError: Error | null = null;

    const model = getImageModel();
    const extraConfig = (globalConfig.modelVersion === 'v3' || globalConfig.modelVersion === 'v3.1')
        ? { imageConfig: { imageSize: globalConfig.imageResolution, ...config.imageConfig } }
        : {};

    const finalConfig = {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        ...config,
        ...extraConfig
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts },
                config: finalConfig,
            });

            // Validate that the response contains an image.
            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                return response; // Success! The response is valid.
            }

            // If no image is found, treat it as a failure and prepare for retry.
            const textResponse = response.text || "No text response received.";
            lastError = new Error(`The AI model responded with text instead of an image: "${textResponse}"`);
            console.warn(`Attempt ${attempt}/${maxRetries}: No image returned. Retrying... Response text: ${textResponse}`);

        } catch (error) {
            const processedError = processApiError(error);
            lastError = processedError;
            const errorMessage = processedError.message;
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, errorMessage);

            // Don't retry on critical errors like invalid API key or quota issues.
            if (errorMessage.includes('API Key không hợp lệ') || errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('resource_exhausted')) {
                throw processedError;
            }

            // If it's not a retriable server error and we're out of retries, fail.
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');
            if (!isInternalError && attempt >= maxRetries) {
                throw processedError;
            }
        }
        
        // Wait before the next attempt, but not after the last one.
        if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.log(`Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // If the loop completes without returning, all retries have failed. Throw the last error.
    throw lastError || new Error("Gemini API call failed after all retries without returning a valid image.");
}

/**
 * Takes a user's prompt and asks a generative model to expand and enrich it.
 * @param userPrompt The user's original, potentially simple, prompt.
 * @returns A promise that resolves to a more descriptive and detailed prompt string.
 */
export async function enhancePrompt(userPrompt: string): Promise<string> {
    const metaPrompt = `Bạn là một chuyên gia viết prompt cho AI tạo ảnh như Imagen. Nhiệm vụ của bạn là lấy một prompt đơn giản từ người dùng và mở rộng nó thành một prompt có độ mô tả cao và hiệu quả để tạo ra một hình ảnh tuyệt đẹp. Hãy thêm các chi tiết phong phú về phong cách, ánh sáng, bố cục, tâm trạng và các kỹ thuật nghệ thuật. Đầu ra PHẢI bằng tiếng Việt.

Prompt của người dùng: "${userPrompt}"

**Đầu ra:** Chỉ xuất ra văn bản prompt đã được tinh chỉnh, không có bất kỳ cụm từ giới thiệu nào.`;
    
    try {
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: metaPrompt,
        });

        const text = response.text;
        if (text && text.trim()) {
            return text.trim();
        }
        // Fallback if the model returns an empty string
        return userPrompt;
    } catch (error) {
        // Process the error for logging/user feedback but return the original prompt as a safe fallback
        const processedError = processApiError(error);
        console.error("Error during prompt enhancement:", processedError);
        return userPrompt;
    }
}
