/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type { Chat, GenerateContentResponse, Part } from "@google/genai";
import ai from './client';
import { processApiError, processImageInput, getTextModel } from './baseService';

/**
 * Sends a message to a chat session, creating one if it doesn't exist.
 * This function is designed to be stateful within a component's lifecycle via a ref.
 * @param chatSession The current chat session object, or null to create a new one.
 * @param prompt The text prompt to send.
 * @param imageDataUrls Optional array of data URLs of images to include in the message.
 * @param language The desired response language.
 * @returns A promise resolving to an object containing the AI's text response and the updated chat session.
 */
export async function sendChatMessage(
    chatSession: Chat | null,
    prompt: string,
    imageDataUrls?: string[],
    language: 'vi' | 'en' = 'vi'
): Promise<{ responseText: string; updatedChat: Chat }> {
    
    let chat = chatSession;
    if (!chat) {
        console.log(`Initializing new chat session in ${language}.`);

        const systemInstruction_vi = "Bạn là một trợ lý AI hữu ích và sáng tạo cho một ứng dụng canvas thiết kế trực quan. **YÊU CẦU QUAN TRỌNG NHẤT: BẠN PHẢI LUÔN TRẢ LỜI BẰNG TIẾNG VIỆT.** Câu trả lời của bạn PHẢI ngắn gọn và đi thẳng vào vấn đề. Khi phân tích hình ảnh, hãy mô tả phong cách, nội dung, bố cục và bảng màu của nó. Khi được yêu cầu ý tưởng prompt, hãy cung cấp các tùy chọn đa dạng và sáng tạo. Luôn coi (các) hình ảnh được cung cấp là bối cảnh chính cho câu hỏi của người dùng. Nếu nhiều hình ảnh được cung cấp, bạn có thể thực hiện phân tích so sánh, kết hợp hoặc chuyển đổi phong cách dựa trên prompt của người dùng. Bạn có thể và nên sử dụng Markdown để định dạng. Các định dạng được hỗ trợ bao gồm: tiêu đề (#, ##), danh sách (* hoặc 1.), in đậm (**văn bản**), in nghiêng (*văn bản*), liên kết ([văn bản](url)), và trích dẫn khối (>). Khi bạn cung cấp một prompt để người dùng sao chép, bạn PHẢI định dạng nó trong một khối mã Markdown như sau: ```một phong cảnh đẹp``` để rõ ràng.";
        const systemInstruction_en = "You are a helpful and creative AI assistant for a visual design canvas application. **MOST IMPORTANT REQUIREMENT: YOU MUST ALWAYS RESPOND IN ENGLISH.** Your answers MUST be concise and to the point. When analyzing an image, describe its style, content, composition, and color palette. When asked for prompt ideas, provide diverse and creative options. Always treat a provided image (or multiple images) as the primary context for the user's question. If multiple images are provided, you can perform comparison, combination, or style transfer analysis based on the user's prompt. You can and should use Markdown for formatting. Supported formats include: headings (#, ##), lists (* or 1.), bold (**text**), italic (*text*), links ([text](url)), and blockquotes (>). When you provide a prompt for the user to copy, you MUST format it in a Markdown code block like this: ```a beautiful landscape``` for clarity.";

        chat = ai.chats.create({
            model: getTextModel(),
            config: {
                systemInstruction: language === 'vi' ? systemInstruction_vi : systemInstruction_en,
            },
        });
    }

    const parts: Part[] = [];
    
    if (imageDataUrls && imageDataUrls.length > 0) {
        for (const url of imageDataUrls) {
            const { mimeType, data } = await processImageInput(url);
            parts.push({ inlineData: { mimeType, data } });
        }
    }
    
    // Always add the text part, even if it's just for context with an image.
    parts.push({ text: prompt });


    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message: parts });
        return { responseText: response.text, updatedChat: chat };
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error sending chat message:", processedError);
        throw processedError;
    }
}