/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Type } from "@google/genai";
import ai from './client'; // Import the shared client instance
import { 
    processApiError, 
    processImageInput, 
    callGeminiWithRetry, 
    processGeminiResponse,
    getTextModel
} from './baseService';

/**
 * Edits an image based on a text prompt.
 * @param imageDataUrl A data URL string of the source image to edit.
 * @param prompt The text prompt with editing instructions.
 * @param aspectRatio Optional target aspect ratio.
 * @param removeWatermark Optional boolean to request watermark removal.
 * @returns A promise that resolves to a base64-encoded image data URL of the edited image.
 */
export async function editImageWithPrompt(
    imageDataUrl: string,
    prompt: string,
    aspectRatio?: string,
    removeWatermark?: boolean
): Promise<string> {
    try {
        const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
        const imagePart = {
            inlineData: { mimeType, data: base64Data },
        };
        
        const hasAspectRatioChange = aspectRatio && aspectRatio !== 'Giữ nguyên';
        
        const promptParts = [];

        if (hasAspectRatioChange) {
            promptParts.push(
                `**YÊU CẦU ƯU TIÊN SỐ 1 - BỐ CỤC:**`,
                `1. Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là **${aspectRatio}**.`,
                `2. Hãy mở rộng bối cảnh, chi tiết, và môi trường xung quanh từ ảnh gốc một cách liền mạch để tạo ra một hình ảnh hoàn chỉnh theo tỷ lệ mới.`,
                ``,
                '**YÊU CẦU CHỈNH SỬA ẢNH - ƯU TIÊN SỐ 2:**',
                'Sau khi đã đáp ứng yêu cầu về bố cục ở trên, hãy thực hiện thêm yêu cầu chỉnh sửa sau đây trên nội dung của bức ảnh:',
                `"${prompt}"`
            );
        } else {
            promptParts.push(
                '**YÊU CẦU CHỈNH SỬA ẢNH - ƯU TIÊN CAO NHẤT:**',
                'Thực hiện chính xác và duy nhất chỉ một yêu cầu sau đây trên bức ảnh được cung cấp:',
                `"${prompt}"`,
                '**LƯU Ý QUAN TRỌNG:**',
                '- Không thực hiện bất kỳ thay đổi nào khác ngoài yêu cầu đã nêu.',
                '- Giữ nguyên các phần còn lại của bức ảnh.',
                '- Chỉ trả về hình ảnh đã được chỉnh sửa.'
            );
        }

        if (removeWatermark) {
            promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
        }
        
        const fullPrompt = promptParts.join('\n');
        const textPart = { text: fullPrompt };
        
        const config: any = {};
        const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '4:5', '3:2', '5:4', '21:9'];
        if (aspectRatio && aspectRatio !== 'Giữ nguyên' && validRatios.includes(aspectRatio)) {
            config.imageConfig = { aspectRatio };
        }

        const response = await callGeminiWithRetry([imagePart, textPart], config);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during image editing:", processedError);
        throw processedError;
    }
}

/**
 * Removes the background from an image, making it transparent.
 * @param imageDataUrl A data URL string of the source image.
 * @returns A promise resolving to a data URL of the image with a transparent background.
 */
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
    try {
        const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
        const imagePart = {
            inlineData: { mimeType, data: base64Data },
        };
        
        const prompt = [
            '**YÊU CẦU CỰC KỲ QUAN TRỌNG:**',
            'Xóa toàn bộ nền của hình ảnh này. Nền mới phải hoàn toàn TRONG SUỐT.',
            'Giữ nguyên chủ thể ở tiền cảnh một cách chính xác, không làm mất chi tiết.',
            'Trả về kết quả dưới dạng ảnh PNG có kênh alpha trong suốt.',
            'Chỉ trả về hình ảnh đã xử lý, không kèm theo bất kỳ văn bản nào.'
        ].join('\n');
        
        const textPart = { text: prompt };

        console.log("Attempting to remove image background...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during background removal:", processedError);
        throw processedError;
    }
}

export async function generateFromMultipleImages(
    imageDataUrls: string[],
    prompt: string,
    aspectRatio?: string,
    removeWatermark?: boolean
): Promise<string> {
    try {
        const imageParts = await Promise.all(
            imageDataUrls.map(async (url) => {
                const { mimeType, data } = await processImageInput(url);
                return { inlineData: { mimeType, data } };
            })
        );

        const promptParts = [
            `Bạn được cung cấp ${imageDataUrls.length} hình ảnh đầu vào, được sắp xếp theo thứ tự lựa chọn của người dùng.`,
            `Nhiệm vụ của bạn là sử dụng chúng làm ngữ cảnh, nguồn cảm hứng hoặc các yếu tố để kết hợp dựa trên chỉ dẫn sau đây để tạo ra một hình ảnh mới, duy nhất và gắn kết: "${prompt}"`,
        ];
        
        if (aspectRatio && aspectRatio !== 'Giữ nguyên') {
            promptParts.push(
                `**YÊU CẦU QUAN TRỌNG VỀ BỐ CỤC:** Kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${aspectRatio}.`
            );
        }

        if (removeWatermark) {
            promptParts.push('- **Yêu cầu đặc biệt:** Kết quả không được chứa bất kỳ watermark, logo, hay chữ ký nào.');
        }
        
        promptParts.push('Đầu ra cuối cùng chỉ được là một hình ảnh duy nhất.');

        const fullPrompt = promptParts.join('\n');
        const textPart = { text: fullPrompt };

        const allParts = [...imageParts, textPart];

        const config: any = {};
        const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '4:5', '3:2', '5:4', '21:9'];
        if (aspectRatio && aspectRatio !== 'Giữ nguyên' && validRatios.includes(aspectRatio)) {
            config.imageConfig = { aspectRatio: aspectRatio };
        }

        console.log("Attempting to generate image from multiple sources with config:", config);
        const response = await callGeminiWithRetry(allParts, config);
        return processGeminiResponse(response);

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during multi-image generation:", processedError);
        throw processedError;
    }
}


/**
 * Refines a user's prompt to be more descriptive, optionally using images for context.
 * @param userPrompt The user's original prompt.
 * @param imageDataUrls Optional array of image data URLs for context.
 * @returns A promise that resolves to the refined prompt string.
 */
export async function refinePrompt(userPrompt: string, imageDataUrls?: string[]): Promise<string> {
    let parts: any[] = [];
    let metaPrompt = '';

    if (imageDataUrls && imageDataUrls.length > 0) {
        const imageParts = await Promise.all(imageDataUrls.map(async url => {
            const { mimeType, data } = await processImageInput(url);
            return { inlineData: { mimeType, data } };
        }));
        parts.push(...imageParts);
        metaPrompt = `You are an expert prompt engineer for a generative AI model. Your task is to refine a user's prompt to make it more descriptive and effective, based on the context of the provided image(s).`;
    } else {
        metaPrompt = `You are an expert prompt engineer for a generative AI model. Your task is to take a user's potentially simple prompt and expand it into a highly descriptive and effective prompt for a generative AI model. Add details about style, lighting, composition, and mood.`;
    }

    metaPrompt += `\n\n**User's Prompt:** "${userPrompt}"\n\n**Instructions:**\n1. Generate a new, single, highly descriptive prompt in Vietnamese.\n2. **Output only the refined prompt text**, without any introductory phrases.`;
    
    parts.push({ text: metaPrompt });

    try {
        console.log("Attempting to refine prompt...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts },
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }

        console.warn("AI did not return text for prompt refinement. Falling back to user prompt.");
        return userPrompt;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt refinement:", processedError);
        // Fallback to the original prompt on error
        return userPrompt;
    }
}

/**
 * Refines a base prompt and user notes using an image for context.
 * @param basePrompt The template prompt from a preset.
 * @param userNotes The user's additional input.
 * @param imageDataUrls An array of data URLs for context images.
 * @returns A promise that resolves to the single, final, refined prompt.
 */
export async function refineImageAndPrompt(
  basePrompt: string,
  userNotes: string,
  imageDataUrls: string[]
): Promise<string> {
  const imageParts = await Promise.all(imageDataUrls.map(async url => {
    const { mimeType, data } = await processImageInput(url);
    return { inlineData: { mimeType, data } };
  }));

  const metaPrompt = `Bạn là một chuyên gia ra lệnh cho AI chỉnh sửa ảnh (image editing AI). Nhiệm vụ của bạn là chuyển đổi ý định của người dùng thành một câu lệnh **ngắn gọn, trực tiếp, và rõ ràng**.
Phân tích (các) "Ảnh đính kèm", "Prompt Gốc", và "Ghi chú của người dùng" để hiểu bối cảnh và yêu cầu.

**Prompt Gốc (Mục tiêu chính):** "${basePrompt}"
**Ghi chú của người dùng (Yêu cầu cụ thể, ưu tiên cao hơn):** "${userNotes}"
**Ảnh đính kèm:** (Được cung cấp làm ngữ cảnh)

**Yêu cầu:**
1.  Tạo ra một câu lệnh duy nhất bằng tiếng Việt.
2.  Câu lệnh phải ở dạng mệnh lệnh (imperative), ra lệnh cho AI thực hiện một hành động cụ thể trên (các) ảnh. Ví dụ: "thay đổi bầu trời thành dải ngân hà", "thêm một chiếc mũ cho nhân vật", "biến đổi phong cách thành tranh sơn dầu".
3.  **KHÔNG** sử dụng các cụm từ mô tả dài dòng như "một bức ảnh của...", "tạo ra một hình ảnh...". Tập trung vào hành động.
4.  Kết hợp các yêu cầu từ Ghi chú của người dùng vào lệnh cuối cùng một cách hợp lý.

**Đầu ra:** Chỉ xuất ra câu lệnh cuối cùng, không có lời dẫn.`;

  const parts: any[] = [...imageParts, { text: metaPrompt }];
  const fallbackPrompt = `${basePrompt}. ${userNotes}`.trim();

  try {
    console.log("Refining prompt with image context...");
    const response = await ai.models.generateContent({
      model: getTextModel(),
      contents: { parts },
    });
    
    const text = response.text;
    if (text) {
      return text.trim();
    }
    
    console.warn("AI did not return text for prompt refinement. Falling back to simple combination.");
    return fallbackPrompt;

  } catch (error) {
    const processedError = processApiError(error);
    console.error("Error during prompt refinement, falling back.", processedError);
    return fallbackPrompt;
  }
}

/**
 * Analyzes a user prompt to extract structured image generation parameters.
 * @param prompt The user's natural language prompt.
 * @returns A promise that resolves to an object with a refined prompt, aspect ratio, and number of images.
 */
export async function analyzePromptForImageGenerationParams(prompt: string): Promise<{ refinedPrompt: string; aspectRatio: string; numberOfImages: number; }> {
    const metaPrompt = `
        Analyze the user's prompt for an image generation task. Extract the core subject and refine it into a more descriptive prompt. Also, determine the most likely desired aspect ratio and the number of images requested.
        - Aspect ratio must be one of: '1:1', '3:4', '4:3', '9:16', '16:9'. Default to '1:1' if not specified.
        - Number of images must be an integer between 1 and 4. Default to 1 if not specified.
        - The refined prompt should be a clear, concise, and descriptive version of the user's intent, in Vietnamese.

        User's prompt: "${prompt}"
    `;

    try {
        console.log("Analyzing prompt for image generation parameters...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: metaPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        refinedPrompt: {
                            type: Type.STRING,
                            description: "The refined, descriptive prompt for the image generation model."
                        },
                        aspectRatio: {
                            type: Type.STRING,
                            description: "The aspect ratio, must be one of '1:1', '3:4', '4:3', '9:16', '16:9'."
                        },
                        numberOfImages: {
                            type: Type.INTEGER,
                            description: "The number of images to generate, from 1 to 4."
                        }
                    },
                    required: ["refinedPrompt", "aspectRatio", "numberOfImages"]
                }
            }
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);

        // Validate the response
        const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
        const aspectRatio = validRatios.includes(parsed.aspectRatio) ? parsed.aspectRatio : '1:1';
        const numberOfImages = Math.max(1, Math.min(4, parsed.numberOfImages || 1));
        
        return {
            refinedPrompt: parsed.refinedPrompt || prompt,
            aspectRatio,
            numberOfImages
        };

    } catch (error) {
        console.error("Error analyzing prompt for parameters, using defaults:", error);
        // Fallback to defaults on any error
        return {
            refinedPrompt: prompt,
            aspectRatio: '1:1',
            numberOfImages: 1
        };
    }
}