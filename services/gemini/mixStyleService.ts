/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import ai from './client'; // Import the shared client instance
import { 
    processApiError,
    processImageInput, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

interface MixStyleOptions {
    styleStrength: string;
    notes?: string;
    removeWatermark?: boolean;
}

/**
 * Analyzes a style image and returns a text description of its artistic style.
 * @param styleImageDataUrl The data URL of the image to analyze.
 * @returns A promise that resolves to a string describing the style.
 */
async function analyzeStyle(styleImageDataUrl: string): Promise<string> {
    const { mimeType, data } = await processImageInput(styleImageDataUrl);
    const imagePart = { inlineData: { mimeType, data } };

    const prompt = `Phân tích hình ảnh này và mô tả phong cách nghệ thuật, bảng màu, kết cấu, chất liệu, và không khí chung của nó một cách tổng quát, chính xác và súc tích. Chỉ tập trung vào các đặc điểm phong cách có thể áp dụng lại, không mô tả nội dung cụ thể (con người, đồ vật). Ví dụ: "Phong cách tranh sơn dầu với nét cọ dày, bảng màu ấm áp với tông vàng và cam, ánh sáng dịu nhẹ, không khí hoài cổ."`;
    
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
        console.error("Error in analyzeStyle:", error);
        throw new Error("Lỗi khi phân tích ảnh phong cách.");
    }
}

export async function mixImageStyle(contentImageDataUrl: string, styleImageDataUrl: string, options: MixStyleOptions): Promise<{ resultUrl: string; finalPrompt: string; }> {
    try {
        console.log("Step 1: Analyzing style image...");
        const styleDescription = await analyzeStyle(styleImageDataUrl);
        console.log("Style analysis result:", styleDescription);

        const { mimeType: contentMime, data: contentData } = await processImageInput(contentImageDataUrl);
        const contentImagePart = { inlineData: { mimeType: contentMime, data: contentData } };

        const promptParts = [
            'Bạn là một nghệ sĩ AI chuyên nghiệp, nhiệm vụ của bạn là vẽ lại hình ảnh được cung cấp theo một phong cách nghệ thuật đã được phân tích.',
            '**YÊU CẦU CỐT LÕI:**',
            '1. **Bảo toàn Nội dung:** Phải giữ lại TOÀN BỘ bố cục, chủ thể, và các đối tượng chính từ ảnh gốc. Không được thêm, bớt, hay thay đổi các yếu tố cốt lõi này.',
            `2. **Áp dụng Phong cách:** Biến đổi hình ảnh gốc để nó mang phong cách được mô tả chi tiết sau đây: "${styleDescription}"`
        ];
        
        const strengthMapping: { [key: string]: string } = {
            'Rất yếu': 'Mức độ ảnh hưởng phong cách (Rất Yếu): Chỉ áp dụng nhẹ nhàng màu sắc và không khí chung, giữ lại gần như toàn bộ chi tiết gốc.',
            'Yếu': 'Mức độ ảnh hưởng phong cách (Yếu): Áp dụng màu sắc và kết cấu cơ bản, giữ lại các chi tiết chính.',
            'Trung bình': 'Mức độ ảnh hưởng phong cách (Trung bình): Kết hợp hài hòa, vẽ lại các chi tiết bằng phong cách mới nhưng vẫn giữ hình dạng cốt lõõi.',
            'Mạnh': 'Mức độ ảnh hưởng phong cách (Mạnh): Ưu tiên phong cách mới, biến đổi sâu sắc các chi tiết và kết cấu.',
            'Rất mạnh': 'Mức độ ảnh hưởng phong cách (Rất Mạnh): Áp dụng tối đa phong cách mới, vẽ lại toàn bộ cảnh như một tác phẩm mới.',
        };
        promptParts.push(`3. **${strengthMapping[options.styleStrength]}**`);

        if (options.notes) {
            promptParts.push(`4. **Ghi chú bổ sung từ người dùng (Ưu tiên cao):** "${options.notes}". Phải tích hợp yêu cầu này một cách hợp lý vào phong cách đã mô tả.`);
        }
        
        if (options.removeWatermark) {
            promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
        }
        
        promptParts.push('Chỉ trả về hình ảnh kết quả cuối cùng, không kèm theo văn bản giải thích.');

        const finalPrompt = promptParts.join('\n');
        const textPart = { text: finalPrompt };
        console.log("Step 2: Constructed final prompt for image generation:", finalPrompt);

        // This call uses the vision model `gemini-2.5-flash-image-preview`
        const response = await callGeminiWithRetry([contentImagePart, textPart]);
        const resultUrl = processGeminiResponse(response);
        return { resultUrl, finalPrompt };

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during style mix:", processedError);
        throw processedError;
    }
}