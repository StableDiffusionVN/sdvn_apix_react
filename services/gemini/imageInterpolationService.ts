/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Type } from "@google/genai";
import ai from './client'; // Import the shared client instance
import { 
    processApiError, 
    processImageInput,
    getTextModel
} from './baseService';

/**
 * Analyzes a pair of images to generate a descriptive prompt for the transformation.
 * @param inputImageDataUrl Data URL of the "before" image.
 * @param outputImageDataUrl Data URL of the "after" image.
 * @returns A promise resolving to the generated text prompt.
 */
export async function analyzeImagePairForPrompt(inputImageDataUrl: string, outputImageDataUrl: string): Promise<{ mainPrompt: string; suggestions: string; }> {
    const { mimeType: inputMime, data: inputData } = await processImageInput(inputImageDataUrl);
    const { mimeType: outputMime, data: outputData } = await processImageInput(outputImageDataUrl);

    const inputImagePart = { inlineData: { mimeType: inputMime, data: inputData } };
    const outputImagePart = { inlineData: { mimeType: outputMime, data: outputData } };

    const prompt = `
        Bạn là một AI chuyên gia. So sánh 'Ảnh 1' (Trước) và 'Ảnh 2' (Sau). Tạo ra một câu lệnh ngắn gọn, mô tả **phương pháp** để biến đổi 'Ảnh 1' thành 'Ảnh 2'.

        **YÊU CẦU:**
        1.  Bắt đầu bằng "Chuyển đổi bức ảnh bằng cách...".
        2.  Tập trung vào hành động thay đổi chính về phong cách. Ví dụ: "bằng cách áp dụng phong cách tranh màu nước", "bằng cách thay đổi thành tông màu phim cổ điển".
        3.  Không mô tả chi tiết ảnh. Chỉ mô tả hành động.

        **ĐẦU RA (JSON):**
        - **mainPrompt**: Câu lệnh mô tả phương pháp biến đổi.
        - **suggestions**: Một mảng gồm 2 đến 4 chuỗi gợi ý ngắn gọn để làm cho prompt chi tiết hơn.
    `;
    const textPart = { text: prompt };
    
    try {
        console.log("Attempting to analyze image pair for prompt...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts: [textPart, inputImagePart, outputImagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainPrompt: { type: Type.STRING, description: "Câu lệnh tổng quát mô tả sự biến đổi." },
                        suggestions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Một mảng các chuỗi gợi ý để mở rộng prompt." 
                        },
                    },
                    required: ["mainPrompt", "suggestions"],
                }
            }
        });
        
        const jsonText = response.text.trim();
        if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const suggestionsString = Array.isArray(parsed.suggestions) ? parsed.suggestions.join('\n') : '';
            return {
                mainPrompt: parsed.mainPrompt || '',
                suggestions: suggestionsString,
            };
        }

        console.error("API did not return text. Response:", response);
        throw new Error("The AI model did not return a valid JSON response.");

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt generation from image pair:", processedError);
        throw processedError;
    }
}

/**
 * Analyzes a pair of images to generate a DETAILED descriptive prompt for the transformation.
 * @param inputImageDataUrl Data URL of the "before" image.
 * @param outputImageDataUrl Data URL of the "after" image.
 * @returns A promise resolving to an object with the detailed main prompt and suggestions.
 */
export async function analyzeImagePairForPromptDeep(inputImageDataUrl: string, outputImageDataUrl: string): Promise<{ mainPrompt: string; suggestions: string; }> {
    const { mimeType: inputMime, data: inputData } = await processImageInput(inputImageDataUrl);
    const { mimeType: outputMime, data: outputData } = await processImageInput(outputImageDataUrl);

    const inputImagePart = { inlineData: { mimeType: inputMime, data: inputData } };
    const outputImagePart = { inlineData: { mimeType: outputMime, data: outputData } };

    const prompt = `
        Bạn là một AI chuyên gia. So sánh 'Ảnh 1' (Trước) và 'Ảnh 2' (Sau). Tạo ra một câu lệnh chi tiết, mô tả **phương pháp** để biến đổi 'Ảnh 1' thành 'Ảnh 2'.

        **YÊU CẦU:**
        1.  Bắt đầu bằng "Để chuyển đổi bức ảnh, hãy...".
        2.  Mô tả cụ thể các hành động thay đổi về:
            *   **Phong cách:** (ví dụ: "áp dụng phong cách nghệ thuật kỹ thuật số").
            *   **Nội dung:** (ví dụ: "thêm những đám mây vào bầu trời").
            *   **Màu sắc & Ánh sáng:** (ví dụ: "điều chỉnh sang tông màu ấm áp hơn và ánh sáng hoàng hôn").

        **ĐẦU RA (JSON):**
        - **mainPrompt**: Câu lệnh chi tiết mô tả phương pháp.
        - **suggestions**: Một mảng gồm 2 đến 4 chuỗi gợi ý sáng tạo ngắn gọn để thay đổi hoặc mở rộng prompt.
    `;
    const textPart = { text: prompt };
    
    try {
        console.log("Attempting to analyze image pair for DETAILED prompt...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts: [textPart, inputImagePart, outputImagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainPrompt: { type: Type.STRING, description: "Câu lệnh chi tiết mô tả sự biến đổi." },
                        suggestions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Một mảng các chuỗi gợi ý sáng tạo để mở rộng prompt."
                        },
                    },
                    required: ["mainPrompt", "suggestions"],
                }
            }
        });
        
        const jsonText = response.text.trim();
        if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const suggestionsString = Array.isArray(parsed.suggestions) ? parsed.suggestions.join('\n') : '';
            return {
                mainPrompt: parsed.mainPrompt || '',
                suggestions: suggestionsString,
            };
        }

        console.error("API did not return text. Response:", response);
        throw new Error("The AI model did not return a valid JSON response.");

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during detailed prompt generation from image pair:", processedError);
        throw processedError;
    }
}

/**
 * Analyzes a pair of images to generate an EXPERT-LEVEL, highly precise prompt for the transformation.
 * @param inputImageDataUrl Data URL of the "before" image.
 * @param outputImageDataUrl Data URL of the "after" image.
 * @returns A promise resolving to an object with the detailed main prompt and suggestions.
 */
export async function analyzeImagePairForPromptExpert(inputImageDataUrl: string, outputImageDataUrl: string): Promise<{ mainPrompt: string; suggestions: string; }> {
    const { mimeType: inputMime, data: inputData } = await processImageInput(inputImageDataUrl);
    const { mimeType: outputMime, data: outputData } = await processImageInput(outputImageDataUrl);

    const inputImagePart = { inlineData: { mimeType: inputMime, data: inputData } };
    const outputImagePart = { inlineData: { mimeType: outputMime, data: outputData } };

    const prompt = `
        Bạn là một chuyên gia chỉnh sửa ảnh và kỹ sư prompt bậc thầy. Nhiệm vụ của bạn là viết một bản hướng dẫn chi tiết, một "công thức" kỹ thuật, để biến đổi 'Ảnh 1' (ảnh gốc) thành 'Ảnh 2' (ảnh kết quả).

        **YÊU CẦU CỐT LÕI:**
        1.  Câu lệnh cuối cùng PHẢI bắt đầu bằng một cụm từ chỉ thị rõ ràng, ví dụ: "Để biến đổi ảnh gốc thành ảnh kết quả, hãy..." hoặc "Thực hiện các bước sau để chuyển đổi ảnh:".
        2.  **Không mô tả 'Ảnh 1'**. Chỉ tập trung vào các **hành động** và **thay đổi** cần áp dụng lên nó.
        3.  **Mô tả phương pháp biến đổi** một cách chi tiết, sử dụng thuật ngữ kỹ thuật:
            *   **Thay đổi về Bố cục & Phối cảnh:** (ví dụ: "thay đổi góc máy thành góc cao", "áp dụng hiệu ứng ống kính mắt cá").
            *   **Thay đổi về Ánh sáng & Màu sắc:** (ví dụ: "chuyển ánh sáng ban ngày thành ánh sáng hoàng hôn ấm áp", "tăng độ tương phản và khử bão hòa màu xanh lá").
            *   **Thay đổi về Phong cách & Kết cấu:** (ví dụ: "áp dụng phong cách tranh sơn dầu với nét cọ dày", "thêm hiệu ứng nhiễu hạt phim (film grain) và các vết xước nhẹ").
            *   **Thay đổi về Nội dung:** (ví dụ: "thêm những đám mây kịch tính vào bầu trời", "thay đổi quần áo của nhân vật thành áo giáp").
        4.  Kết hợp tất cả các bước thành một câu lệnh mạch lạc, duy nhất.

        **ĐẦU RA (JSON):**
        - **mainPrompt**: Câu lệnh mô tả phương pháp biến đổi.
        - **suggestions**: Một mảng gồm 2 đến 4 chuỗi gợi ý kỹ thuật ngắn gọn để tinh chỉnh các thông số trong prompt.
    `;
    const textPart = { text: prompt };
    
    try {
        console.log("Attempting to analyze image pair for EXPERT prompt...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts: [textPart, inputImagePart, outputImagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainPrompt: { type: Type.STRING, description: "Câu lệnh cực kỳ chi tiết mô tả sự biến đổi." },
                        suggestions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Một mảng các chuỗi gợi ý kỹ thuật để tinh chỉnh các thông số trong prompt."
                        },
                    },
                    required: ["mainPrompt", "suggestions"],
                }
            }
        });
        
        const jsonText = response.text.trim();
        if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const suggestionsString = Array.isArray(parsed.suggestions) ? parsed.suggestions.join('\n') : '';
            return {
                mainPrompt: parsed.mainPrompt || '',
                suggestions: suggestionsString,
            };
        }

        console.error("API did not return text. Response:", response);
        throw new Error("The AI model did not return a valid JSON response.");

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during expert prompt generation from image pair:", processedError);
        throw processedError;
    }
}


/**
 * Merges a base prompt with user's notes into a new, cohesive prompt.
 * @param basePrompt The initial prompt generated from image analysis.
 * @param userNotes The user's additional modification requests.
 * @returns A promise that resolves to the new, merged prompt.
 */
export async function interpolatePrompts(basePrompt: string, userNotes: string): Promise<string> {
    const prompt = `
        Bạn là một trợ lý AI chuyên tinh chỉnh các câu lệnh tạo ảnh.
        Nhiệm vụ của bạn là hợp nhất "Yêu cầu Chỉnh sửa của Người dùng" vào "Prompt Gốc" để tạo ra một prompt mới, mạch lạc bằng tiếng Việt.

        - **Prompt Gốc (mô tả một sự biến đổi cơ bản):** "${basePrompt}"
        - **Yêu cầu Chỉnh sửa của Người dùng (CÓ ƯU TIÊN CAO HƠN):** "${userNotes}"

        **Quy tắc quan trọng:**
        1.  **Ưu tiên yêu cầu của người dùng:** Prompt mới phải ưu tiên thực hiện yêu cầu của người dùng. Nếu có sự mâu thuẫn, yêu cầu của người dùng sẽ ghi đè lên các phần tương ứng trong Prompt Gốc.
        2.  **Giữ lại ý chính:** Giữ lại bản chất của sự biến đổi từ Prompt Gốc, trừ khi nó bị thay đổi trực tiếp bởi yêu cầu của người dùng.
        3.  **Tích hợp hợp lý:** Tích hợp các thay đổi một cách tự nhiên vào prompt, tạo thành một câu lệnh hoàn chỉnh.

        **Ví dụ:**
        - **Prompt Gốc:** "biến ảnh thành tranh màu nước"
        - **Yêu cầu người dùng:** "sử dụng tông màu chủ đạo là xanh dương và vàng"
        - **Prompt Mới:** "biến ảnh thành tranh màu nước, sử dụng bảng màu chủ đạo là xanh dương và vàng"

        - **Prompt Gốc:** "thêm một chiếc mũ phù thủy nhỏ màu đỏ cho con mèo"
        - **Yêu cầu người dùng:** "thay mũ bằng vương miện và làm cho mắt mèo phát sáng"
        - **Prompt Mới:** "đội một chiếc vương miện cho con mèo và làm cho mắt nó phát sáng"

        Bây giờ, hãy tạo prompt mới dựa trên các đầu vào được cung cấp. Chỉ xuất ra văn bản prompt cuối cùng bằng tiếng Việt. Không thêm bất kỳ cụm từ giới thiệu nào.
    `;

    try {
        console.log("Attempting to interpolate prompts with prioritization...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: prompt,
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }
        
        console.error("API did not return text for prompt interpolation. Response:", response);
        throw new Error("The AI model did not return a valid text prompt for interpolation.");

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt interpolation:", processedError);
        throw processedError;
    }
}

/**
 * Adapts a base prompt to be more contextually relevant to a reference image.
 * @param imageDataUrl The data URL of the reference image.
 * @param basePrompt The initial prompt describing a transformation.
 * @returns A promise that resolves to the new, contextually-aware prompt.
 */
export async function adaptPromptToContext(imageDataUrl: string, basePrompt: string): Promise<string> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptText = `Nhiệm vụ của bạn là một chuyên gia tinh chỉnh prompt cho AI tạo ảnh. Tôi sẽ cung cấp cho bạn: 1. Một "Ảnh Tham Chiếu". 2. Một "Prompt Gốc" mô tả một sự biến đổi. Yêu cầu của bạn là viết lại "Prompt Gốc" thành một "Prompt Mới" sao cho phù hợp hơn với bối cảnh, chủ thể, và phong cách của "Ảnh Tham Chiếu". Sự biến đổi cốt lõi phải được giữ nguyên. Ví dụ: - Ảnh Tham Chiếu: ảnh một con chó thật. - Prompt Gốc: "biến thành nhân vật hoạt hình" - Prompt Mới: "biến con chó trong ảnh thành nhân vật hoạt hình theo phong cách Pixar". - Ảnh Tham Chiếu: ảnh một toà nhà cổ kính. - Prompt Gốc: "thêm các chi tiết cyberpunk" - Prompt Mới: "thêm các chi tiết máy móc và đèn neon theo phong cách cyberpunk vào toà nhà cổ kính, giữ lại kiến trúc gốc". - Ảnh Tham Chiếu: một bức tranh phong cảnh màu nước. - Prompt Gốc: "thay đổi bầu trời thành dải ngân hà" - Prompt Mới: "vẽ lại bầu trời thành một dải ngân hà rực rỡ theo phong cách màu nước, hoà hợp với phần còn lại của bức tranh". Prompt Gốc hiện tại là: "${basePrompt}". Hãy phân tích Ảnh Tham Chiếu và tạo ra Prompt Mới bằng tiếng Việt. Chỉ trả về nội dung của prompt, không có các cụm từ giới thiệu như "Đây là prompt mới:".`;
    const textPart = { text: promptText };
    
    try {
        console.log("Attempting to adapt prompt to image context...");
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts: [imagePart, textPart] },
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }

        console.warn("API did not return text for context adaptation. Falling back to base prompt. Response:", response);
        return basePrompt;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt context adaptation. Falling back to base prompt.", processedError);
        return basePrompt;
    }
}