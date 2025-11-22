/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import ai from './client';
import { 
    processApiError,
    processImageInput, 
    callGeminiWithRetry, 
    processGeminiResponse,
    getTextModel
} from './baseService';

interface ArchitectureOptions {
    context: string;
    style: string;
    color: string;
    lighting: string;
    notes?: string;
    removeWatermark?: boolean;
}

async function analyzeArchitecturalStyle(styleImageDataUrl: string): Promise<string> {
    const { mimeType, data } = await processImageInput(styleImageDataUrl);
    const imagePart = { inlineData: { mimeType, data } };

    const prompt = `Phân tích hình ảnh này và mô tả ngắn gọn các yếu tố kiến trúc và không khí chính của nó trong một đoạn văn. Tập trung vào bốn khía cạnh sau:
1.  **Bối cảnh:** Môi trường xung quanh (ví dụ: "trong một khu rừng rậm," "trên một con phố thành phố tương lai," "trên một ngọn núi tuyết").
2.  **Phong cách kiến trúc:** Ngôn ngữ thiết kế (ví dụ: "Brutalist," "Modern Scandinavian," "Gothic Revival").
3.  **Bảng màu:** Các màu sắc chủ đạo và tâm trạng (ví dụ: "một bảng màu ấm của đất nung và màu be," "một bảng màu đơn sắc của các màu xám lạnh").
4.  **Ánh sáng:** Thời gian trong ngày và chất lượng ánh sáng (ví dụ: "ánh sáng hoàng hôn kịch tính," "ánh sáng ban ngày dịu, u ám").

Không mô tả hình dạng của tòa nhà, chỉ mô tả phong cách và bối cảnh của nó.`;
    
    try {
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts: [imagePart, {text: prompt}] },
        });

        const text = response.text;
        if (!text) {
             throw new Error("AI không thể phân tích được phong cách của ảnh.");
        }
        return text.trim();
    } catch (error) {
        console.error("Error in analyzeArchitecturalStyle:", error);
        throw new Error("Lỗi khi phân tích ảnh phong cách.");
    }
}

/**
 * Generates a realistic architectural image from a sketch.
 * @param imageDataUrl A data URL string of the source sketch image.
 * @param options The user-selected architectural options.
 * @param styleReferenceImageDataUrl Optional data URL for a style reference image.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateArchitecturalImage(
    imageDataUrl: string, 
    options: ArchitectureOptions,
    styleReferenceImageDataUrl?: string | null
): Promise<string> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);

    const sketchImagePart = {
        inlineData: { mimeType, data: base64Data },
    };
    
    const requestParts: object[] = [sketchImagePart];
    const promptParts: string[] = [];

    if (styleReferenceImageDataUrl) {
        console.log("Generating with style reference from image, but only sending sketch to API.");
        const styleDescription = await analyzeArchitecturalStyle(styleReferenceImageDataUrl);
        console.log("Analyzed style description:", styleDescription);

        promptParts.push(
            'Biến ảnh phác thảo kiến trúc này thành một bức ảnh chân thực, chất lượng cao.',
            'Áp dụng phong cách, bối cảnh, màu sắc và ánh sáng được mô tả chi tiết sau đây:',
            `--- MÔ TẢ PHONG CÁCH ---`,
            styleDescription,
            `--- KẾT THÚC MÔ TẢ ---`
        );

        if (options.notes) {
            promptParts.push(`- **Ghi chú bổ sung của người dùng (Ưu tiên cao):** "${options.notes}". Tích hợp yêu cầu này trong khi vẫn tuân thủ mô tả phong cách ở trên.`);
        }

    } else {
        promptParts.push(
            'Biến ảnh phác thảo kiến trúc này thành một bức ảnh chân thực, chất lượng cao.',
            'Dựa vào các tùy chọn sau để tạo ra kết quả:'
        );

        const optionMapping = {
            context: 'Bối cảnh (Context)',
            style: 'Phong cách kiến trúc (Architectural Style)',
            color: 'Tông màu chủ đạo (Color Palette)',
            lighting: 'Ánh sáng (Lighting)'
        };

        let optionsSelected = false;
        for (const [key, label] of Object.entries(optionMapping)) {
            const value = options[key as keyof typeof optionMapping];
            if (value && value !== 'Tự động') {
                promptParts.push(`- **${label}:** ${value}.`);
                optionsSelected = true;
            }
        }

        if (!optionsSelected) {
            promptParts.push('- Hãy tự động lựa chọn bối cảnh, phong cách, màu sắc và ánh sáng phù hợp nhất để tạo ra một tác phẩm ấn tượng.');
        }

        if (options.notes) {
            promptParts.push(`- **Ghi chú bổ sung từ người dùng:** "${options.notes}".`);
        }
    }


    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }

    promptParts.push(
        'YÊU CẦU QUAN TRỌNG: Giữ lại cấu trúc, bố cục và các yếu tố thiết kế cốt lõi từ bản phác thảo gốc. Kết quả phải là một bức ảnh chân thực, không phải là ảnh render 3D hay tranh vẽ.'
    );

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };
    requestParts.push(textPart);

    try {
        console.log("Attempting to generate architectural image with dynamic prompt...");
        const response = await callGeminiWithRetry(requestParts);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during architectural image generation:", processedError);
        throw processedError;
    }
}

/**
 * Refines a user's prompt to be more descriptive for architectural image generation.
 * @param userPrompt The user's original prompt.
 * @param imageDataUrls Optional array of image data URLs for context.
 * @returns A promise that resolves to the refined prompt string.
 */
export async function refineArchitecturePrompt(basePrompt: string, userPrompt: string, imageDataUrls: string[]): Promise<string> {
    const imageParts = await Promise.all(imageDataUrls.map(async url => {
        const { mimeType, data } = await processImageInput(url);
        return { inlineData: { mimeType, data } };
    }));

    const metaPrompt = `
        Bạn là một chuyên gia ra lệnh cho AI chỉnh sửa ảnh kiến trúc. Nhiệm vụ của bạn là kết hợp các yêu cầu để tạo ra một câu lệnh **ngắn gọn, trực tiếp, và rõ ràng** để biến đổi (các) ảnh phác thảo/3D thành ảnh kiến trúc chân thực.

        **Ảnh ngữ cảnh:** (Được cung cấp)
        **Mục tiêu chính (từ Preset):** "${basePrompt}"
        **Yêu cầu của người dùng (ưu tiên hơn):** "${userPrompt}"

        **Yêu cầu:**
        1.  Tạo ra một câu lệnh duy nhất bằng tiếng Việt.
        2.  Câu lệnh phải ở dạng mệnh lệnh, ra lệnh cho AI thực hiện một hành động. Ví dụ: "biến phác thảo này thành một toà nhà bê tông theo phong cách brutalist vào buổi hoàng hôn", "thêm vật liệu gỗ và nhiều cây xanh cho công trình này".
        3.  Câu lệnh phải yêu cầu AI **giữ lại bố cục và hình khối cốt lõi** từ (các) ảnh ngữ cảnh.
        4.  **KHÔNG** sử dụng các cụm từ mô tả dài dòng như "một bức ảnh của...", "tạo ra một hình ảnh...". Tập trung vào hành động.
        5.  Kết hợp các yêu cầu một cách tự nhiên.

        **Đầu ra:** Chỉ xuất ra câu lệnh cuối cùng, không có lời dẫn.
    `;
    
    const parts: any[] = [...imageParts, { text: metaPrompt }];
    const fallbackPrompt = `${basePrompt}. ${userPrompt}`.trim();

    try {
        console.log("Attempting to refine architecture prompt...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts },
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }

        console.warn("AI did not return text for architecture prompt refinement. Falling back to simple combination.");
        return fallbackPrompt;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during architecture prompt refinement:", processedError);
        return fallbackPrompt; // Fallback on error
    }
}