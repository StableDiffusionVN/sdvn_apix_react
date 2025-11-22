/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Modality } from "@google/genai";
import ai from './client'; // Import the shared client instance
import { 
    processApiError, 
    processImageInput, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

export async function generateFreeImage(
    prompt: string,
    numberOfImages: number,
    aspectRatio: string,
    imageDataUrl1?: string,
    imageDataUrl2?: string,
    imageDataUrl3?: string,
    imageDataUrl4?: string,
    removeWatermark?: boolean
): Promise<string[]> {
    try {
        const allImageUrls = [imageDataUrl1, imageDataUrl2, imageDataUrl3, imageDataUrl4].filter(Boolean) as string[];
        
        const results: string[] = [];

        for (let i = 0; i < numberOfImages; i++) {
            const parts: object[] = [];

            if (allImageUrls.length > 0) {
                for (const url of allImageUrls) {
                    const { mimeType, data } = await processImageInput(url);
                    parts.push({ inlineData: { mimeType, data } });
                }
            }

            const promptParts = [prompt];
            if (allImageUrls.length > 0) {
                promptParts.push('Thực hiện yêu cầu trong prompt để tạo ra một bức ảnh mới dựa trên (các) hình ảnh đã cho.');
            }
            if (removeWatermark) {
                promptParts.push('Yêu cầu đặc biệt: Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
            }
            const fullPrompt = promptParts.join('\n');
            parts.push({ text: fullPrompt });
            
            const validRatios: string[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
            const config: any = {};
            
            let finalAspectRatio = aspectRatio;
            if (aspectRatio === 'Giữ nguyên' && allImageUrls.length === 0) {
                finalAspectRatio = '1:1'; // Default for text-to-image
            }
            
            if (finalAspectRatio !== 'Giữ nguyên' && validRatios.includes(finalAspectRatio)) {
                config.imageConfig = { aspectRatio: finalAspectRatio };
            }

            const response = await callGeminiWithRetry(parts, config);
            results.push(processGeminiResponse(response));
        }

        return results;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during free image generation:", processedError);
        throw processedError;
    }
}