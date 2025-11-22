/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import ai from './client';
import {
    processApiError,
    processImageInput,
    callGeminiWithRetry,
    processGeminiResponse
} from './baseService';

/**
 * Estimates the age group of a child in an image.
 * @param imageDataUrl The data URL of the image to analyze.
 * @returns A promise that resolves to an age group keyword.
 */
export async function estimateAgeGroup(imageDataUrl: string): Promise<'newborn' | 'toddler' | 'preschool' | 'child'> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };
    
    const prompt = "Analyze the image of the child and estimate their age group. Respond with only ONE of the following keywords: 'newborn' (0-1 year), 'toddler' (1-3 years), 'preschool' (3-5 years), 'child' (5-10 years).";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
        });

        const text = response.text.toLowerCase().trim();
        if (text.includes('newborn')) return 'newborn';
        if (text.includes('toddler')) return 'toddler';
        if (text.includes('preschool')) return 'preschool';
        if (text.includes('child')) return 'child';

        console.warn(`Unexpected age estimation response: "${text}". Defaulting to 'toddler'.`);
        return 'toddler';

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during age estimation:", processedError);
        throw processedError;
    }
}

function getPrimaryPrompt(idea: string, customPrompt?: string, removeWatermark?: boolean, aspectRatio?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu chỉnh sửa bổ sung: "${customPrompt}".` : '';
    const watermarkText = removeWatermark ? ' Yêu cầu quan trọng: Kết quả cuối cùng không được chứa bất kỳ watermark, logo, hay chữ ký nào.' : '';
    const aspectRatioText = (aspectRatio && aspectRatio !== 'Giữ nguyên') ? `Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${aspectRatio}.` : '';

    return `${aspectRatioText}\nTạo một bức ảnh chụp chân thật và tự nhiên của em bé trong ảnh gốc, trong bối cảnh concept "${idea}".${modificationText}${watermarkText} YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của em bé trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt. Bức ảnh phải có chất lượng cao, sắc nét, như được chụp bởi một nhiếp ảnh gia chuyên nghiệp. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.`;
}

function getFallbackPrompt(idea: string, customPrompt?: string, removeWatermark?: boolean, aspectRatio?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu bổ sung: "${customPrompt}".` : '';
    const watermarkText = removeWatermark ? ' Yêu cầu thêm: Không có watermark, logo, hay chữ ký trên ảnh.' : '';
    const aspectRatioText = (aspectRatio && aspectRatio !== 'Giữ nguyên') ? `Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${aspectRatio}.` : '';

    return `${aspectRatioText}\nTạo một bức ảnh chụp chân dung của em bé trong ảnh này với chủ đề "${idea}".${modificationText}${watermarkText} Bức ảnh cần trông thật và tự nhiên. YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt của em bé trong ảnh gốc. Không được thay đổi khuôn mặt.`;
}

async function analyzeBabyConceptImage(styleImageDataUrl: string): Promise<string> {
    const { mimeType, data } = await processImageInput(styleImageDataUrl);
    const imagePart = { inlineData: { mimeType, data } };

    const prompt = `Phân tích bức ảnh em bé này và mô tả concept sáng tạo của nó. Tập trung vào chủ đề, đạo cụ, ánh sáng, và bảng màu. Mô tả phải phù hợp để hướng dẫn AI tái tạo một concept tương tự cho một em bé khác.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
        });
        const text = response.text;
        if (!text) {
             throw new Error("AI không thể phân tích được concept từ ảnh.");
        }
        return text.trim();
    } catch (error) {
        console.error("Error in analyzeBabyConceptImage:", error);
        throw new Error("Lỗi khi phân tích ảnh concept.");
    }
}

/**
 * Generates a concept-based photo for a baby.
 * @param imageDataUrl A data URL string of the source image.
 * @param idea The creative idea string.
 * @param customPrompt Optional additional instructions for modification.
 * @param removeWatermark Optional boolean to request watermark removal.
 * @param aspectRatio Optional target aspect ratio.
 * @param styleReferenceImageDataUrl Optional data URL for a style reference image, which overrides the 'idea'.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateBabyPhoto(
    imageDataUrl: string, 
    idea: string, 
    customPrompt?: string, 
    removeWatermark?: boolean, 
    aspectRatio?: string,
    styleReferenceImageDataUrl?: string | null
): Promise<string> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    let finalIdea = idea;
    if (styleReferenceImageDataUrl) {
        finalIdea = await analyzeBabyConceptImage(styleReferenceImageDataUrl);
    }

    const config: any = {};
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '4:5', '3:2', '5:4', '21:9'];
    if (aspectRatio && aspectRatio !== 'Giữ nguyên' && validRatios.includes(aspectRatio)) {
        config.imageConfig = { aspectRatio };
    }

    try {
        console.log("Attempting baby photo generation with primary prompt...");
        const prompt = getPrimaryPrompt(finalIdea, customPrompt, removeWatermark, aspectRatio);
        const textPart = { text: prompt };
        const response = await callGeminiWithRetry([imagePart, textPart], config);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        const errorMessage = processedError.message;
        
        if (errorMessage.includes("API key not valid") || errorMessage.includes("Ứng dụng tạm thời")) {
            throw processedError;
        }
        const isNoImageError = errorMessage.includes("The AI model responded with text instead of an image");

        if (isNoImageError) {
            console.warn(`Primary prompt was likely blocked for idea: ${finalIdea}. Trying a fallback prompt.`);
            try {
                const fallbackPrompt = getFallbackPrompt(finalIdea, customPrompt, removeWatermark, aspectRatio);
                const fallbackTextPart = { text: fallbackPrompt };
                const fallbackResponse = await callGeminiWithRetry([imagePart, fallbackTextPart], config);
                return processGeminiResponse(fallbackResponse);
            } catch (fallbackError) {
                console.error("Fallback prompt also failed.", fallbackError);
                const processedFallbackError = processApiError(fallbackError);
                throw new Error(`The AI model failed with both primary and fallback prompts. Last error: ${processedFallbackError.message}`);
            }
        } else {
            console.error("Error during baby photo generation:", processedError);
            throw processedError;
        }
    }
}