/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Type } from "@google/genai";
import ai from './client';
import {
    processApiError,
    processImageInput,
    callGeminiWithRetry,
    processGeminiResponse
} from './baseService';

function getPrimaryPrompt(idea: string, customPrompt?: string, removeWatermark?: boolean, aspectRatio?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu chỉnh sửa bổ sung: "${customPrompt}".` : '';
    const watermarkText = removeWatermark ? ' Yêu cầu quan trọng: Kết quả cuối cùng không được chứa bất kỳ watermark, logo, hay chữ ký nào.' : '';
    const aspectRatioText = (aspectRatio && aspectRatio !== 'Giữ nguyên') ? `Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${aspectRatio}.` : '';

    return `${aspectRatioText}\nTạo một bức ảnh chân dung doanh nhân chuyên nghiệp, chụp trong studio của người trong ảnh gốc, theo concept "${idea}".${modificationText}${watermarkText} YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của người trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt. Bức ảnh phải có chất lượng cao, sắc nét, ánh sáng chuyên nghiệp như ảnh profile cho tạp chí Forbes hoặc LinkedIn. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.`;
}

function getFallbackPrompt(idea: string, customPrompt?: string, removeWatermark?: boolean, aspectRatio?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu bổ sung: "${customPrompt}".` : '';
    const watermarkText = removeWatermark ? ' Yêu cầu thêm: Không có watermark, logo, hay chữ ký trên ảnh.' : '';
    const aspectRatioText = (aspectRatio && aspectRatio !== 'Giữ nguyên') ? `Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${aspectRatio}.` : '';

    return `${aspectRatioText}\nTạo một bức ảnh chân dung của người trong ảnh này với chủ đề doanh nhân là "${idea}".${modificationText}${watermarkText} Bức ảnh cần trông thật và tự nhiên. YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt của người trong ảnh gốc. Không được thay đổi khuôn mặt.`;
}

async function analyzeEntrepreneurConceptImage(styleImageDataUrl: string): Promise<string> {
    const { mimeType, data } = await processImageInput(styleImageDataUrl);
    const imagePart = { inlineData: { mimeType, data } };

    const prompt = `Phân tích bức ảnh chân dung này và mô tả concept chuyên nghiệp/doanh nhân của nó. Tập trung vào bối cảnh, ánh sáng, trang phục, tư thế và thần thái chung (ví dụ: tự tin, sáng tạo, quyền lực).`;
    
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
        console.error("Error in analyzeEntrepreneurConceptImage:", error);
        throw new Error("Lỗi khi phân tích ảnh concept.");
    }
}

export async function generateEntrepreneurImage(
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
        finalIdea = await analyzeEntrepreneurConceptImage(styleReferenceImageDataUrl);
    }

    const config: any = {};
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '4:5', '3:2', '5:4', '21:9'];
    if (aspectRatio && aspectRatio !== 'Giữ nguyên' && validRatios.includes(aspectRatio)) {
        config.imageConfig = { aspectRatio };
    }

    try {
        console.log("Attempting entrepreneur image generation with primary prompt...");
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
            console.error("Error during entrepreneur image generation:", processedError);
            throw processedError;
        }
    }
}


export async function analyzeForEntrepreneurConcepts(
    imageDataUrl: string,
    categories: { category: string; ideas: string[] }[]
): Promise<string[]> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const categoryNames = categories.map(c => c.category);

    const prompt = `Phân tích người trong ảnh được cung cấp. Dựa trên trang phục, biểu cảm, và phong thái chung, hãy chọn ra từ 1 đến 3 danh mục phù hợp nhất từ danh sách sau đây cho một bộ ảnh chân dung doanh nhân.

    Các danh mục có sẵn:
    ${categoryNames.join('\n')}

    Phản hồi của bạn phải là một đối tượng JSON có một khóa duy nhất "suggested_categories" là một mảng chuỗi chứa các danh mục đã chọn. Các chuỗi trong mảng phải khớp chính xác với danh sách được cung cấp.
    `;

    try {
        console.log("Analyzing image for entrepreneur concept suggestions...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggested_categories: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                    required: ["suggested_categories"],
                }
            }
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        if (parsed.suggested_categories && Array.isArray(parsed.suggested_categories)) {
            const validCategories = parsed.suggested_categories.filter((cat: string) => categoryNames.includes(cat));
            if (validCategories.length > 0) {
                return validCategories;
            }
        }
        
        console.warn("AI returned no valid categories, using fallback.");
        const shuffled = categoryNames.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 2);

    } catch (error) {
        console.error("Error analyzing for concepts:", error);
        const shuffled = categoryNames.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 2);
    }
}