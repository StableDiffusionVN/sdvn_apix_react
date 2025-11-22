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

interface BeautyOptions {
    notes: string;
    removeWatermark: boolean;
    aspectRatio: string;
}

async function analyzeBeautyConceptImage(styleImageDataUrl: string): Promise<string> {
    const { mimeType, data } = await processImageInput(styleImageDataUrl);
    const imagePart = { inlineData: { mimeType, data } };

    const prompt = `Phân tích hình ảnh này và mô tả chi tiết concept beauty của nó. Tập trung vào các yếu tố sau:
1.  **Bố cục & Tư thế:** Chụp cận, bán thân hay toàn thân? Người mẫu tạo dáng như thế nào?
2.  **Cảm xúc & Tâm trạng:** Kịch tính, thanh tao, vui vẻ, mạnh mẽ?
3.  **Phong cách ánh sáng:** Softbox, ánh sáng tự nhiên, bóng đổ gay gắt, ánh sáng ven (rim light)?
4.  **Màu sắc & Chỉnh màu:** Tông màu ấm, lạnh, đơn sắc, bão hòa cao?
5.  **Trang điểm & Tạo kiểu:** Tự nhiên, quyến rũ, avant-garde?
6.  **Phong cách nhiếp ảnh tổng thể:** Điện ảnh, biên tập thời trang, studio sạch sẽ?
Chỉ trả lời bằng một đoạn văn mô tả liền mạch, súc tích.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
        });

        const text = response.text;
        if (!text) {
             throw new Error("AI không thể phân tích được phong cách của ảnh.");
        }
        return text.trim();
    } catch (error) {
        console.error("Error in analyzeBeautyConceptImage:", error);
        throw new Error("Lỗi khi phân tích ảnh concept.");
    }
}

export async function analyzeForBeautyConcepts(
    imageDataUrl: string,
    categories: { category: string; key: string; ideas: string[] }[]
): Promise<string[]> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const categoryNames = categories.map(c => c.category);

    const prompt = `Phân tích người trong ảnh chân dung được cung cấp. Dựa trên giới tính, biểu cảm, và phong thái chung, hãy chọn ra 1 đến 2 danh mục phù hợp nhất từ danh sách sau đây cho một bộ ảnh beauty.

    Các danh mục có sẵn:
    ${categoryNames.join('\n')}

    Phản hồi của bạn phải là một đối tượng JSON có một khóa duy nhất "suggested_categories" là một mảng chuỗi chứa các danh mục đã chọn. Các chuỗi trong mảng phải khớp chính xác với danh sách được cung cấp.
    `;

    try {
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
        
        console.warn("AI returned no valid beauty categories, using fallback.");
        const shuffled = categoryNames.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 1);

    } catch (error) {
        console.error("Error analyzing for beauty concepts:", error);
        const shuffled = categoryNames.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 1);
    }
}

export async function generateBeautyImage(
    imageDataUrl: string,
    idea: string,
    options: BeautyOptions,
    styleReferenceImageDataUrl?: string | null
): Promise<string> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const portraitImagePart = { inlineData: { mimeType, data: base64Data } };

    const requestParts: object[] = [portraitImagePart];
    const promptParts: string[] = [];
    
    let finalIdea = idea;

    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên') {
        promptParts.push(`**YÊU CẦU BỐ CỤC:** Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${options.aspectRatio}.`);
    }

    promptParts.push(
        'Tạo một bức ảnh chân dung beauty chuyên nghiệp, chất lượng cao của người trong ảnh gốc.',
        '**YÊU CẦU QUAN TRỌNG NHẤT:** Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của người trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt.'
    );

    if (styleReferenceImageDataUrl) {
        finalIdea = await analyzeBeautyConceptImage(styleReferenceImageDataUrl);
         promptParts.push(
            'Áp dụng concept, phong cách và cảm xúc được mô tả chi tiết sau đây:',
            `--- MÔ TẢ CONCEPT ---`,
            finalIdea,
            `--- KẾT THÚC MÔ TẢ ---`
        );
    } else if (finalIdea) {
        promptParts.push(`Áp dụng concept beauty sau đây: "${finalIdea}".`);
    } else {
        promptParts.push('Hãy tự sáng tạo một concept beauty phù hợp (ví dụ: studio, tự nhiên, thời trang cao cấp) để làm nổi bật người trong ảnh.');
    }

    if (options.notes) {
        promptParts.push(`- **Ghi chú bổ sung của người dùng (Ưu tiên cao):** "${options.notes}".`);
    }

    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }

    promptParts.push(
        'Bức ảnh phải có chất lượng như ảnh tạp chí, với ánh sáng chuyên nghiệp, trang điểm hoàn hảo, và làn da mịn màng. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.'
    );

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };
    requestParts.push(textPart);

    const config: any = {};
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '4:5', '3:2', '5:4', '21:9'];
    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên' && validRatios.includes(options.aspectRatio)) {
        config.imageConfig = { aspectRatio: options.aspectRatio };
    }

    try {
        const response = await callGeminiWithRetry(requestParts, config);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during beauty image generation:", processedError);
        throw processedError;
    }
}
