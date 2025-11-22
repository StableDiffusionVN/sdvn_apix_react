/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Type } from "@google/genai";
import ai from './client';
import { processApiError, parseDataUrl, getTextModel } from './baseService';

// --- TYPES ---
interface Scene {
    scene: number;
    startFrameDescription: string;
    animationDescription: string;
    endFrameDescription: string;
}

// NEW: Represents the initial high-level summary of the script
export interface ScriptSummary {
    title: string;
    characters: string;
    setting: string;
    style: string;
    duration: string;
    content: string;
    notes?: string;
    numberOfScenes?: number;
}

// Represents the full scenario with detailed scenes for visualization
export interface FullScenario {
    title: string;
    logline: string;
    scenes: Scene[];
}

interface StoryOptions {
    style: string;
    numberOfScenes: number;
    aspectRatio: string;
    notes?: string;
    keepClothing?: boolean;
    keepBackground?: boolean;
}

// --- DYNAMIC SCHEMAS ---
const getScriptSummarySchema = (language: 'vi' | 'en' | 'zh') => {
    const descriptions = {
        vi: {
            title: "Tiêu đề ngắn gọn cho câu chuyện.",
            characters: "Mô tả ngắn gọn các nhân vật chính.",
            setting: "Mô tả bối cảnh chính của câu chuyện.",
            style: "Mô tả phong cách hình ảnh (ví dụ: hoạt hình Ghibli, phim noir, cyberpunk).",
            duration: "Thời lượng ước tính của câu chuyện (ví dụ: 1 phút, 30 giây).",
            content: "Tóm tắt ngắn gọn nội dung, cốt truyện chính trong 1-2 câu."
        },
        en: {
            title: "A brief title for the story.",
            characters: "A short description of the main characters.",
            setting: "A description of the main setting of the story.",
            style: "A description of the visual style (e.g., Ghibli animation, film noir, cyberpunk).",
            duration: "The estimated duration of the story (e.g., 1 minute, 30 seconds).",
            content: "A brief summary of the main plot in 1-2 sentences."
        },
        zh: {
            title: "故事的简短标题。",
            characters: "主要角色的简短描述。",
            setting: "故事主要背景的描述。",
            style: "视觉风格的描述（例如，吉卜力动画，黑色电影，赛博朋克）。",
            duration: "故事的估计时长（例如，1分钟，30秒）。",
            content: "用1-2句话简要概括主要情节。"
        }
    };

    const lang_desc = descriptions[language];

    return {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: lang_desc.title },
            characters: { type: Type.STRING, description: lang_desc.characters },
            setting: { type: Type.STRING, description: lang_desc.setting },
            style: { type: Type.STRING, description: lang_desc.style },
            duration: { type: Type.STRING, description: lang_desc.duration },
            content: { type: Type.STRING, description: lang_desc.content }
        },
        required: ["title", "characters", "setting", "style", "duration", "content"]
    };
};

const getFullScenarioSchema = (language: 'vi' | 'en' | 'zh') => {
    return {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            logline: { type: Type.STRING },
            scenes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        scene: { type: Type.INTEGER },
                        startFrameDescription: { type: Type.STRING },
                        animationDescription: { type: Type.STRING },
                        endFrameDescription: { type: Type.STRING }
                    },
                    required: ["scene", "startFrameDescription", "animationDescription", "endFrameDescription"]
                }
            }
        },
        required: ["title", "logline", "scenes"]
    };
};

const getDetailedVideoPromptSchema = (language: 'vi' | 'en' | 'zh') => {
    const descriptions = {
        vi: {
            start_frame: 'Mô tả chi tiết, trực quan về khung hình đầu tiên của clip.',
            end_frame: 'Mô tả chi tiết, trực quan về khung hình cuối cùng của clip.',
            camera_movement: 'Mô tả chuyển động của máy quay một cách kỹ thuật (ví dụ: dolly zoom out, pan right, crane shot, handheld tracking).',
            visual_effects: 'Mô tả các hiệu ứng hình ảnh (ví dụ: slow motion, lens flare, cross-dissolve, glitch effect).',
            lighting: 'Mô tả phong cách ánh sáng (ví dụ: golden hour, high-key, low-key, moody neon).',
            framing: 'Loại khung hình (ví dụ: wide shot, medium shot, close-up, point of view).',
            narrative_prompt: 'Một prompt tường thuật, duy nhất, kết hợp tất cả các yếu tố trên thành một câu lệnh điện ảnh cho các mô hình AI tạo video.',
        },
        en: {
            start_frame: 'A detailed, visual description of the first frame of the clip.',
            end_frame: 'A detailed, visual description of the last frame of the clip.',
            camera_movement: 'A technical description of the camera movement (e.g., dolly zoom out, pan right, crane shot, handheld tracking).',
            visual_effects: 'Description of visual effects (e.g., slow motion, lens flare, cross-dissolve, glitch effect).',
            lighting: 'Description of the lighting style (e.g., golden hour, high-key, low-key, moody neon).',
            framing: 'The shot type (e.g., wide shot, medium shot, close-up, point of view).',
            narrative_prompt: 'A single, narrative prompt that combines all of the above elements into a cinematic command for AI video models.',
        },
        zh: {
            start_frame: '片段第一帧的详细视觉描述。',
            end_frame: '片段最后一帧的详细视觉描述。',
            camera_movement: '摄像机运动的技术描述（例如：推拉变焦、向右平移、吊臂拍摄、手持跟踪）。',
            visual_effects: '视觉效果的描述（例如：慢动作、镜头光晕、交叉溶解、故障效果）。',
            lighting: '灯光风格的描述（例如：黄金时刻、高调、低调、情绪霓虹灯）。',
            framing: '镜头类型（例如：远景、中景、特写、主观镜头）。',
            narrative_prompt: '一个单一的叙事性提示，将上述所有元素组合成一个用于AI视频模型的电影化命令。',
        }
    };

    const lang_desc = descriptions[language];

    return {
        type: Type.OBJECT,
        properties: {
            start_frame: { type: Type.STRING, description: lang_desc.start_frame },
            end_frame: { type: Type.STRING, description: lang_desc.end_frame },
            camera_movement: { type: Type.STRING, description: lang_desc.camera_movement },
            visual_effects: { type: Type.STRING, description: lang_desc.visual_effects },
            lighting: { type: Type.STRING, description: lang_desc.lighting },
            framing: { type: Type.STRING, description: lang_desc.framing },
            narrative_prompt: { type: Type.STRING, description: lang_desc.narrative_prompt },
        },
        required: ['start_frame', 'end_frame', 'camera_movement', 'visual_effects', 'lighting', 'framing', 'narrative_prompt']
    };
};

// --- PROMPT HELPERS ---
const getScriptSummaryBasePrompt = (language: 'vi' | 'en' | 'zh'): { P1: string, P2: string } => {
    if (language === 'zh') {
        return {
            P1: "你是一名专业的人工智能编剧。你的任务是分析提供的输入（一个想法、文本或音频转录），并生成一个简短的剧本摘要。",
            P2: "摘要必须包括以下字段：标题、角色、背景、风格、时长和内容（情节摘要）。每个字段都应简明扼要。以JSON格式回应。"
        };
    }
    if (language === 'vi') {
        return {
            P1: "Bạn là một AI biên kịch chuyên nghiệp. Nhiệm vụ của bạn là phân tích thông tin đầu vào (ý tưởng, văn bản, hoặc bản ghi âm) và tạo ra một bản tóm tắt kịch bản ngắn.",
            P2: "Bản tóm tắt phải bao gồm các mục sau: Tiêu đề, Nhân vật, Bối cảnh, Phong cách, Thời lượng, và Nội dung (tóm tắt cốt truyện). Mỗi mục phải ngắn gọn và súc tích. Trả lời bằng định dạng JSON."
        };
    }
    return {
        P1: "You are a professional AI scriptwriter. Your task is to analyze the provided input (an idea, text, or audio transcript) and generate a short script summary.",
        P2: "The summary must include the following fields: Title, Characters, Setting, Style, Duration, and Content (plot summary). Each field should be brief and concise. Respond in JSON format."
    };
};

const generateImageDescriptions = async (referenceImages: { mimeType: string; data: string }[]): Promise<string> => {
    if (referenceImages.length === 0) return "";

    const imageParts = referenceImages.map(img => ({ inlineData: img }));
    const prompt = "Briefly describe the key visual elements of each image provided, focusing on character appearance, setting, and overall mood. Combine the descriptions into a single paragraph.";
    
    try {
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts: [...imageParts, { text: prompt }] },
        });
        return `\n\nVisual Reference Context: ${response.text.trim()}`;
    } catch (error) {
        console.warn("Could not generate descriptions for reference images:", error);
        return "";
    }
};

// --- API FUNCTIONS ---
const executeScriptSummaryGeneration = async (prompt: string, parts: any[] = [], language: 'vi' | 'en' | 'zh'): Promise<ScriptSummary> => {
    const response = await ai.models.generateContent({
        model: getTextModel(),
        contents: { parts: [...parts, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: getScriptSummarySchema(language)
        }
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if (parsed.content) {
        return parsed;
    }
    throw new Error("AI returned an invalid script summary structure.");
};

export async function createScriptSummaryFromIdea(idea: string, referenceImagesData: { mimeType: string; data: string }[], options: StoryOptions, language: 'vi' | 'en' | 'zh', scriptType: 'auto' | 'dialogue' | 'action'): Promise<ScriptSummary> {
    try {
        const { P1, P2 } = getScriptSummaryBasePrompt(language);
        const refImageDescriptions = await generateImageDescriptions(referenceImagesData);
        
        const notesInstruction = options.notes ? (language === 'vi' ? `\n- Ghi chú bổ sung (Ưu tiên cao): "${options.notes}"` : (language === 'zh' ? `\n- 附加用户说明（高优先级）：“${options.notes}”` : `\n- Additional User Notes (High Priority): "${options.notes}"`)) : '';
        const finalStyle = options.style && options.style.trim() !== '' ? options.style : (language === 'vi' ? 'Tự động' : (language === 'zh' ? '自动' : 'Auto'));
        const scriptTypeInstruction = scriptType !== 'auto' 
            ? (language === 'vi' 
                ? `\n- Loại kịch bản: ${scriptType === 'dialogue' ? 'Hội thoại. Kịch bản phải xoay quanh các đoạn đối thoại. Phần \'content\' PHẢI bao gồm các câu thoại mẫu.' : 'Hành động. Kịch bản phải tập trung vào các hành động và chuyển động kịch tính.'}`
                : (language === 'zh'
                    ? `\n- 脚本类型：${scriptType === 'dialogue' ? '对话。剧本必须围绕对话展开。\'content\'字段必须包含示例对话。' : '动作。剧本必须专注于戏剧性的动作和运动。'}`
                    : `\n- Script Type: ${scriptType === 'dialogue' ? 'Dialogue. The script must revolve around dialogue exchanges. The \'content\' field MUST include sample dialogue lines.' : 'Action. The script must focus on dramatic actions and movements.'}`)) 
            : '';
        const numberOfScenesInstruction = language === 'vi' 
            ? `\n- Số cảnh: ${options.numberOfScenes === 0 ? 'Tự động' : options.numberOfScenes}`
            : (language === 'zh' 
                ? `\n- 场景数量：${options.numberOfScenes === 0 ? '自动' : options.numberOfScenes}`
                : `\n- Number of Scenes: ${options.numberOfScenes === 0 ? 'Auto' : options.numberOfScenes}`);

        const keepClothingInstruction = options.keepClothing ? (language === 'vi' ? '\n- Giữ lại trang phục: Kịch bản phải được thiết kế để phù hợp với trang phục của nhân vật trong ảnh tham chiếu.' : (language === 'zh' ? '\n- 保留服装：剧本设计必须与参考图像中角色的服装保持一致。' : '\n- Keep Clothing: The script must be designed to be consistent with the character\'s clothing in the reference images.')) : '';
        const keepBackgroundInstruction = options.keepBackground ? (language === 'vi' ? '\n- Giữ lại bối cảnh: Kịch bản phải diễn ra trong bối cảnh được thấy trong ảnh tham chiếu.' : (language === 'zh' ? '\n- 保留背景：剧本必须在参考图像中看到的背景下进行。' : '\n- Keep Background: The script must take place within the context of the background seen in the reference images.')) : '';

        let prompt: string;
        if (language === 'vi') {
            prompt = `${P1}\nĐầu vào là một ý tưởng câu chuyện: "${idea}"${refImageDescriptions}\n\n${P2}\n\n**Ràng buộc:**\n- Phong cách: ${finalStyle}\n- Tỷ lệ khung hình: ${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\nHãy đảm bảo bản tóm tắt được tạo ra tuân thủ nghiêm ngặt các ràng buộc này. Nếu một giá trị là "Tự động", bạn có quyền tự do sáng tạo cho trường đó.`;
        } else if (language === 'zh') {
            prompt = `${P1}\n输入是一个故事创意：“${idea}”${refImageDescriptions}\n\n${P2}\n\n**约束：**\n- 风格：${finalStyle}\n- 宽高比：${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\n请确保生成的摘要严格遵守这些约束。如果值为“自动”，则您对该字段有创作自由。`;
        } else {
            prompt = `${P1}\nInput is a story idea: "${idea}"${refImageDescriptions}\n\n${P2}\n\n**Constraints:**\n- Style: ${finalStyle}\n- Aspect Ratio: ${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\nMake sure the generated summary strictly follows these constraints. If a value is "Auto", you have creative freedom for that field.`;
        }
        
        const imageParts = referenceImagesData.map(img => ({ inlineData: img }));
        const summary = await executeScriptSummaryGeneration(prompt, imageParts, language);
        summary.notes = options.notes;
        summary.numberOfScenes = options.numberOfScenes;
        return summary;
    } catch (error) {
        console.error("Error creating script summary from idea:", error);
        throw processApiError(error);
    }
}

export async function createScriptSummaryFromText(script: string, referenceImagesData: { mimeType: string; data: string }[], options: StoryOptions, language: 'vi' | 'en' | 'zh', scriptType: 'auto' | 'dialogue' | 'action'): Promise<ScriptSummary> {
    try {
        const { P1, P2 } = getScriptSummaryBasePrompt(language);
        const refImageDescriptions = await generateImageDescriptions(referenceImagesData);

        const notesInstruction = options.notes ? (language === 'vi' ? `\n- Ghi chú bổ sung (Ưu tiên cao): "${options.notes}"` : (language === 'zh' ? `\n- 附加用户说明（高优先级）：“${options.notes}”` : `\n- Additional User Notes (High Priority): "${options.notes}"`)) : '';
        const finalStyle = options.style && options.style.trim() !== '' ? options.style : (language === 'vi' ? 'Tự động' : (language === 'zh' ? '自动' : 'Auto'));
        const scriptTypeInstruction = scriptType !== 'auto' 
            ? (language === 'vi' 
                ? `\n- Loại kịch bản: ${scriptType === 'dialogue' ? 'Hội thoại. Kịch bản phải xoay quanh các đoạn đối thoại. Phần \'content\' PHẢI bao gồm các câu thoại mẫu.' : 'Hành động. Kịch bản phải tập trung vào các hành động và chuyển động kịch tính.'}`
                : (language === 'zh'
                    ? `\n- 脚本类型：${scriptType === 'dialogue' ? '对话。剧本必须围绕对话展开。\'content\'字段必须包含示例对话。' : '动作。剧本必须专注于戏剧性的动作和运动。'}`
                    : `\n- Script Type: ${scriptType === 'dialogue' ? 'Dialogue. The script must revolve around dialogue exchanges. The \'content\' field MUST include sample dialogue lines.' : 'Action. The script must focus on dramatic actions and movements.'}`)) 
            : '';
        const numberOfScenesInstruction = language === 'vi' 
            ? `\n- Số cảnh: ${options.numberOfScenes === 0 ? 'Tự động' : options.numberOfScenes}`
            : (language === 'zh' 
                ? `\n- 场景数量：${options.numberOfScenes === 0 ? '自动' : options.numberOfScenes}`
                : `\n- Number of Scenes: ${options.numberOfScenes === 0 ? 'Auto' : options.numberOfScenes}`);
        
        const keepClothingInstruction = options.keepClothing ? (language === 'vi' ? '\n- Giữ lại trang phục: Kịch bản phải được thiết kế để phù hợp với trang phục của nhân vật trong ảnh tham chiếu.' : (language === 'zh' ? '\n- 保留服装：剧本设计必须与参考图像中角色的服装保持一致。' : '\n- Keep Clothing: The script must be designed to be consistent with the character\'s clothing in the reference images.')) : '';
        const keepBackgroundInstruction = options.keepBackground ? (language === 'vi' ? '\n- Giữ lại bối cảnh: Kịch bản phải diễn ra trong bối cảnh được thấy trong ảnh tham chiếu.' : (language === 'zh' ? '\n- 保留背景：剧本必须在参考图像中看到的背景下进行。' : '\n- Keep Background: The script must take place within the context of the background seen in the reference images.')) : '';

        let prompt: string;
        if (language === 'vi') {
            prompt = `${P1}\nĐầu vào là một kịch bản đầy đủ. Phân tích nó và tạo một bản tóm tắt.\n\n\`\`\`\n${script}\n\`\`\`${refImageDescriptions}\n\n${P2}\n\n**Ràng buộc:**\n- Phong cách: ${finalStyle}\n- Tỷ lệ khung hình: ${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\nHãy đảm bảo bản tóm tắt được tạo ra tuân thủ nghiêm ngặt các ràng buộc này. Nếu một giá trị là "Tự động", bạn có quyền tự do sáng tạo cho trường đó.`;
        } else if (language === 'zh') {
            prompt = `${P1}\n输入是完整的剧本。请分析它并创建一个摘要。\n\n\`\`\`\n${script}\n\`\`\`${refImageDescriptions}\n\n${P2}\n\n**约束：**\n- 风格：${finalStyle}\n- 宽高比：${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\n请确保生成的摘要严格遵守这些约束。如果值为“自动”，则您对该字段有创作自由。`;
        } else {
            prompt = `${P1}\nInput is a full script. Analyze it and create a summary.\n\n\`\`\`\n${script}\n\`\`\`${refImageDescriptions}\n\n${P2}\n\n**Constraints:**\n- Style: ${finalStyle}\n- Aspect Ratio: ${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\nMake sure the generated summary strictly follows these constraints. If a value is "Auto", you have creative freedom for that field.`;
        }
        
        const imageParts = referenceImagesData.map(img => ({ inlineData: img }));
        const summary = await executeScriptSummaryGeneration(prompt, imageParts, language);
        summary.notes = options.notes;
        summary.numberOfScenes = options.numberOfScenes;
        return summary;
    } catch (error) {
        console.error("Error creating script summary from text:", error);
        throw processApiError(error);
    }
}

export async function createScriptSummaryFromAudio(audio: { mimeType: string; data: string }, referenceImagesData: { mimeType: string; data: string }[], options: StoryOptions, language: 'vi' | 'en' | 'zh', scriptType: 'auto' | 'dialogue' | 'action'): Promise<ScriptSummary> {
    try {
        const { P1, P2 } = getScriptSummaryBasePrompt(language);
        const refImageDescriptions = await generateImageDescriptions(referenceImagesData);
        
        const notesInstruction = options.notes ? (language === 'vi' ? `\n- Ghi chú bổ sung (Ưu tiên cao): "${options.notes}"` : (language === 'zh' ? `\n- 附加用户说明（高优先级）：“${options.notes}”` : `\n- Additional User Notes (High Priority): "${options.notes}"`)) : '';
        const finalStyle = options.style && options.style.trim() !== '' ? options.style : (language === 'vi' ? 'Tự động' : (language === 'zh' ? '自动' : 'Auto'));
        const scriptTypeInstruction = scriptType !== 'auto' 
            ? (language === 'vi' 
                ? `\n- Loại kịch bản: ${scriptType === 'dialogue' ? 'Hội thoại. Kịch bản phải xoay quanh các đoạn đối thoại. Phần \'content\' PHẢI bao gồm các câu thoại mẫu.' : 'Hành động. Kịch bản phải tập trung vào các hành động và chuyển động kịch tính.'}`
                : (language === 'zh'
                    ? `\n- 脚本类型：${scriptType === 'dialogue' ? '对话。剧本必须围绕对话展开。\'content\'字段必须包含示例对话。' : '动作。剧本必须专注于戏剧性的动作和运动。'}`
                    : `\n- Script Type: ${scriptType === 'dialogue' ? 'Dialogue. The script must revolve around dialogue exchanges. The \'content\' field MUST include sample dialogue lines.' : 'Action. The script must focus on dramatic actions and movements.'}`)) 
            : '';
        const numberOfScenesInstruction = language === 'vi' 
            ? `\n- Số cảnh: ${options.numberOfScenes === 0 ? 'Tự động' : options.numberOfScenes}`
            : (language === 'zh' 
                ? `\n- 场景数量：${options.numberOfScenes === 0 ? '自动' : options.numberOfScenes}`
                : `\n- Number of Scenes: ${options.numberOfScenes === 0 ? 'Auto' : options.numberOfScenes}`);

        const keepClothingInstruction = options.keepClothing ? (language === 'vi' ? '\n- Giữ lại trang phục: Kịch bản phải được thiết kế để phù hợp với trang phục của nhân vật trong ảnh tham chiếu.' : (language === 'zh' ? '\n- 保留服装：剧本设计必须与参考图像中角色的服装保持一致。' : '\n- Keep Clothing: The script must be designed to be consistent with the character\'s clothing in the reference images.')) : '';
        const keepBackgroundInstruction = options.keepBackground ? (language === 'vi' ? '\n- Giữ lại bối cảnh: Kịch bản phải diễn ra trong bối cảnh được thấy trong ảnh tham chiếu.' : (language === 'zh' ? '\n- 保留背景：剧本必须在参考图像中看到的背景下进行。' : '\n- Keep Background: The script must take place within the context of the background seen in the reference images.')) : '';

        let prompt: string;
        if (language === 'vi') {
            prompt = `${P1}\nĐầu vào là một tệp âm thanh. Đầu tiên, hãy ghi lại âm thanh. Sau đó, dựa trên bản ghi, tạo bản tóm tắt kịch bản.${refImageDescriptions}\n\n${P2}\n\n**Ràng buộc:**\n- Phong cách: ${finalStyle}\n- Tỷ lệ khung hình: ${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\nHãy đảm bảo bản tóm tắt được tạo ra tuân thủ nghiêm ngặt các ràng buộc này. Nếu một giá trị là "Tự động", bạn có quyền tự do sáng tạo cho trường đó.`;
        } else if (language === 'zh') {
            prompt = `${P1}\n输入是一个音频文件。首先，转录音频。然后，根据转录内容创建剧本摘要。${refImageDescriptions}\n\n${P2}\n\n**约束：**\n- 风格：${finalStyle}\n- 宽高比：${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\n请确保生成的摘要严格遵守这些约束。如果值为“自动”，则您对该字段有创作自由。`;
        } else {
            prompt = `${P1}\nInput is an audio file. First, transcribe the audio. Then, based on the transcript, create the script summary.${refImageDescriptions}\n\n${P2}\n\n**Constraints:**\n- Style: ${finalStyle}\n- Aspect Ratio: ${options.aspectRatio}${numberOfScenesInstruction}${scriptTypeInstruction}${keepClothingInstruction}${keepBackgroundInstruction}${notesInstruction}\nMake sure the generated summary strictly follows these constraints. If a value is "Auto", you have creative freedom for that field.`;
        }
        
        const audioPart = { inlineData: audio };
        const imageParts = referenceImagesData.map(img => ({ inlineData: img }));
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: { parts: [audioPart, ...imageParts, { text: prompt }] },
             config: {
                responseMimeType: "application/json",
                responseSchema: getScriptSummarySchema(language)
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText) as ScriptSummary;
        if (parsed.content) {
            parsed.notes = options.notes;
            parsed.numberOfScenes = options.numberOfScenes;
            return parsed;
        }
        throw new Error("AI returned an invalid script summary structure from audio.");
    } catch (error) {
        console.error("Error creating script summary from audio:", error);
        throw processApiError(error);
    }
}

export async function developScenesFromSummary(summary: ScriptSummary, language: 'vi' | 'en' | 'zh', scriptType: 'auto' | 'dialogue' | 'action'): Promise<FullScenario> {
    const scriptTypeInstruction = scriptType !== 'auto' 
        ? (language === 'vi'
            ? `\n\n**LƯU Ý QUAN TRỌNG:** Kịch bản này tập trung vào ${scriptType === 'dialogue' ? 'HỘI THOẠI. Khi viết \'description\' cho mỗi cảnh, bạn BẮT BUỘC phải bao gồm các câu thoại cụ thể của nhân vật theo định dạng: **TÊN NHÂN VẬT: "Nội dung câu thoại."**' : 'HÀNH ĐỘNG. Hãy mô tả các chuyển động, hành động và biểu cảm một cách chi tiết.'}`
            : (language === 'zh'
                ? `\n\n**重要提示：** 此剧本专注于${scriptType === 'dialogue' ? '对话。在为每个场景编写“description”时，您必须使用以下格式包含特定的角色对话：**角色名称：“对话内容。”**' : '动作。请详细描述动作、移动和表情。'}`
                : `\n\n**IMPORTANT NOTE:** This script focuses on ${scriptType === 'dialogue' ? 'DIALOGUE. When writing the \'description\' for each scene, you MUST include specific character dialogue lines in the format: **CHARACTER NAME: "The dialogue content."**' : 'ACTION. Describe movements, actions, and expressions in detail.'}`))
        : '';

    const notesInstruction_vi = summary.notes ? `\n\n**YÊU CẦU BỔ SUNG QUAN TRỌNG:** Luôn tuân thủ các ghi chú sau đây khi mô tả từng cảnh: "${summary.notes}"` : '';
    let sceneCountInstruction_vi = 'hãy chia câu chuyện thành một số lượng cảnh (shot) phù hợp (tối thiểu 3).';
    if (summary.numberOfScenes && summary.numberOfScenes > 0) {
        sceneCountInstruction_vi = `hãy chia câu chuyện thành chính xác ${summary.numberOfScenes} cảnh (shot).`;
    }
    const prompt_vi = `Bạn là một AI đạo diễn hình ảnh. Dựa trên bản tóm tắt kịch bản sau, ${sceneCountInstruction_vi} Mỗi cảnh (shot) phải có 3 phần RÕ RỆT và logic với nhau:
- 'startFrameDescription': Mô tả chi tiết, tĩnh lặng của khoảnh khắc MỞ ĐẦU cảnh (một bức ảnh).
- 'animationDescription': Mô tả HÀNH ĐỘNG và CHUYỂN ĐỘNG (của nhân vật, đối tượng, và máy quay) diễn ra TRONG SUỐT cảnh để chuyển từ khung hình đầu sang khung hình cuối.
- 'endFrameDescription': Mô tả chi tiết, tĩnh lặng của khoảnh khắc KẾT THÚC cảnh (một bức ảnh).

Cảnh sau phải tiếp nối logic từ cảnh trước.${notesInstruction_vi}${scriptTypeInstruction}
    
    Tóm tắt kịch bản:
    \`\`\`json
    ${JSON.stringify(summary, null, 2)}
    \`\`\`
    
    Trả lời bằng định dạng JSON với cấu trúc { title: string, logline: string, scenes: [{ scene: number, startFrameDescription: string, animationDescription: string, endFrameDescription: string }] }. Giữ nguyên title và sử dụng 'content' làm 'logline'.`;
    
    const notesInstruction_en = summary.notes ? `\n\n**IMPORTANT ADDITIONAL REQUIREMENT:** Always adhere to the following notes when describing each scene: "${summary.notes}"` : '';
    let sceneCountInstruction_en = 'break the story down into an appropriate number of shots (minimum 3).';
    if (summary.numberOfScenes && summary.numberOfScenes > 0) {
        sceneCountInstruction_en = `break the story down into exactly ${summary.numberOfScenes} shots.`;
    }
    const prompt_en = `You are an AI director of photography. Based on the following script summary, ${sceneCountInstruction_en} Each shot must have 3 DISTINCT and logical parts:
- 'startFrameDescription': A detailed, static description of the OPENING moment of the scene (a single picture).
- 'animationDescription': Describes the ACTION and MOVEMENT (of characters, objects, and the camera) that occurs DURING the scene to transition from the start frame to the end frame.
- 'endFrameDescription': A detailed, static description of the CLOSING moment of the scene (a single picture).

Each shot should logically follow the previous one.${notesInstruction_en}${scriptTypeInstruction}

    Script Summary:
    \`\`\`json
    ${JSON.stringify(summary, null, 2)}
    \`\`\`
    
    Respond in JSON format with the structure { title: string, logline: string, scenes: [{ scene: number, startFrameDescription: string, animationDescription: string, endFrameDescription: string }] }. Keep the original title and use the 'content' field as the 'logline'.`;

    const notesInstruction_zh = summary.notes ? `\n\n**重要附加要求：** 在描述每个场景时，请始终遵守以下说明：“${summary.notes}”` : '';
    let sceneCountInstruction_zh = '将故事分解为适当数量的镜头（最少3个）。';
    if (summary.numberOfScenes && summary.numberOfScenes > 0) {
        sceneCountInstruction_zh = `将故事精确分解为 ${summary.numberOfScenes} 个镜头。`;
    }
    const prompt_zh = `你是一位人工智能摄影指导。根据以下剧本摘要，${sceneCountInstruction_zh}每个镜头必须包含3个明确且逻辑连贯的部分：
- 'startFrameDescription': 场景开始瞬间的详细静态描述（一张图片）。
- 'animationDescription': 描述场景期间发生的动作和运动（角色、物体和摄像机），以从开始画面过渡到结束画面。
- 'endFrameDescription': 场景结束瞬间的详细静态描述（一张图片）。

每个镜头应在逻辑上承接前一个镜头。${notesInstruction_zh}${scriptTypeInstruction}\n\n剧本摘要：\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n\n以JSON格式回应，结构为 { title: string, logline: string, scenes: [{ scene: number, startFrameDescription: string, animationDescription: string, endFrameDescription: string }] }。保留原始标题，并使用“content”字段作为“logline”。`;
    
    let prompt: string;
    switch (language) {
        case 'zh': prompt = prompt_zh; break;
        case 'en': prompt = prompt_en; break;
        case 'vi': default: prompt = prompt_vi; break;
    }

    try {
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: getFullScenarioSchema(language)
            }
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed.scenes && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
            return parsed;
        }
        throw new Error("AI failed to develop scenes from the summary.");

    } catch (error) {
        console.error("Error developing scenes:", error);
        throw processApiError(error);
    }
}

export async function refineSceneDescription(
    originalDescription: string,
    modificationRequest: string,
    language: 'vi' | 'en' | 'zh'
): Promise<string> {
    const prompt_vi = `Bạn là một AI biên kịch chuyên nghiệp. Nhiệm vụ của bạn là viết lại một "Prompt Gốc" dựa trên "Yêu cầu Chỉnh sửa" của người dùng.
    
    **Prompt Gốc:**
    \`\`\`
    ${originalDescription}
    \`\`\`

    **Yêu cầu Chỉnh sửa:**
    "${modificationRequest}"

    **Yêu cầu:**
    1.  Tạo ra một prompt mới, mạch lạc bằng tiếng Việt, kết hợp yêu cầu chỉnh sửa vào prompt gốc.
    2.  Prompt mới phải giữ lại ý tưởng cốt lõi của prompt gốc nhưng được cải tiến theo yêu cầu.
    3.  Chỉ xuất ra văn bản prompt cuối cùng, không có lời dẫn hay định dạng markdown.
    `;

    const prompt_en = `You are a professional AI scriptwriter. Your task is to rewrite an "Original Prompt" based on a user's "Modification Request".

    **Original Prompt:**
    \`\`\`
    ${originalDescription}
    \`\`\`

    **Modification Request:**
    "${modificationRequest}"

    **Requirements:**
    1.  Create a new, coherent prompt in English that incorporates the modification request into the original prompt.
    2.  The new prompt should retain the core idea of the original but be enhanced as requested.
    3.  Output only the final prompt text, without any introductory phrases or markdown formatting.
    `;

    const prompt_zh = `你是一位专业的人工智能编剧。你的任务是根据用户的“修改请求”重写一个“原始提示”。\n\n**原始提示：**\n\`\`\`\n${originalDescription}\n\`\`\`\n\n**修改请求：**\n"${modificationRequest}"\n\n**要求：**\n1. 创建一个新的、连贯的中文提示，将修改请求融入原始提示中。\n2. 新提示应保留原始提示的核心思想，但根据要求进行增强。\n3. 只输出最终的提示文本，不带任何介绍性短语或markdown格式。`;

    let prompt: string;
    switch (language) {
        case 'zh': prompt = prompt_zh; break;
        case 'en': prompt = prompt_en; break;
        case 'vi': default: prompt = prompt_vi; break;
    }

    try {
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: prompt,
        });

        const text = response.text.trim();
        if (!text) {
            throw new Error("AI did not return a refined description.");
        }
        return text;

    } catch (error) {
        console.error("Error refining scene description:", error);
        throw processApiError(error);
    }
}

export async function refineSceneTransition(
    originalTransition: string,
    modificationRequest: string,
    language: 'vi' | 'en' | 'zh'
): Promise<string> {
    const prompt_vi = `Bạn là một AI biên kịch chuyên nghiệp. Nhiệm vụ của bạn là viết lại một đoạn văn mô tả "Chuyển cảnh gốc" dựa trên "Yêu cầu Chỉnh sửa" của người dùng.
    
    **Chuyển cảnh gốc:**
    \`\`\`
    ${originalTransition}
    \`\`\`

    **Yêu cầu Chỉnh sửa:**
    "${modificationRequest}"

    **Yêu cầu:**
    1.  Tạo ra một mô tả chuyển cảnh mới, mạch lạc bằng tiếng Việt, kết hợp yêu cầu chỉnh sửa vào mô tả gốc.
    2.  Mô tả mới phải giữ lại ý tưởng cốt lõi của chuyển cảnh gốc nhưng được cải tiến theo yêu cầu.
    3.  Chỉ xuất ra văn bản mô tả cuối cùng, không có lời dẫn hay định dạng markdown.
    `;

    const prompt_en = `You are a professional AI scriptwriter. Your task is to rewrite a "Transition Description" based on a user's "Modification Request".

    **Original Transition:**
    \`\`\`
    ${originalTransition}
    \`\`\`

    **Modification Request:**
    "${modificationRequest}"

    **Requirements:**
    1.  Create a new, coherent transition description in English that incorporates the modification request into the original.
    2.  The new description should retain the core idea of the original transition but be enhanced as requested.
    3.  Output only the final description text, without any introductory phrases or markdown formatting.
    `;

    const prompt_zh = `你是一位专业的人工智能编剧。你的任务是根据用户的“修改请求”重写一个“原始转场描述”。\n\n**原始转场描述：**\n\`\`\`\n${originalTransition}\n\`\`\`\n\n**修改请求：**\n"${modificationRequest}"\n\n**要求：**\n1. 创建一个新的、连贯的中文转场描述，将修改请求融入原始描述中。\n2. 新描述应保留原始转场的核心思想，但根据要求进行增强。\n3. 只输出最终的描述文本，不带任何介绍性短语或markdown格式。`;
    
    let prompt: string;
    switch (language) {
        case 'zh': prompt = prompt_zh; break;
        case 'en': prompt = prompt_en; break;
        case 'vi': default: prompt = prompt_vi; break;
    }

    try {
        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: prompt,
        });

        const text = response.text.trim();
        if (!text) {
            throw new Error("AI did not return a refined transition.");
        }
        return text;

    } catch (error) {
        console.error("Error refining scene transition:", error);
        throw processApiError(error);
    }
}

export async function generateVideoPromptFromScenes(
    promptBefore: string,
    promptTransition: string,
    promptAfter: string,
    language: 'vi' | 'en' | 'zh',
    mode: 'auto' | 'start-end' | 'json',
    scriptType: 'auto' | 'dialogue' | 'action'
): Promise<string> {
    const scriptTypeInstruction = scriptType !== 'auto' 
        ? (language === 'vi' 
            ? `\n**Lưu ý kịch bản:** Kịch bản này tập trung vào ${scriptType === 'dialogue' ? 'HỘI THOẠI. Prompt video phải mô tả rõ hành động nhân vật đang nói chuyện, biểu cảm khuôn mặt và có thể trích dẫn một phần câu thoại quan trọng.' : 'HÀNH ĐỘNG. Prompt video phải mô tả chi tiết các chuyển động và hành động vật lý.'}`
            : (language === 'zh'
                ? `\n**剧本注意：** 此剧本专注于${scriptType === 'dialogue' ? '对话。视频提示必须清晰地描述角色说话的动作、面部表情，并可以引用对话的关键部分。' : '动作。视频提示必须详细描述物理运动和动作。'}`
                : `\n**Script Note:** This script focuses on ${scriptType === 'dialogue' ? 'DIALOGUE. The video prompt must clearly describe the character\'s action of speaking, their facial expressions, and may quote a key part of the dialogue.' : 'ACTION. The video prompt must describe physical movements and actions in detail.'}`))
        : '';
    
    try {
        let prompt: string;
        
        switch (mode) {
            case 'json':
                const prompts_json = {
                    vi: `Bạn là một AI đạo diễn và kỹ sư prompt video chuyên nghiệp. Dựa trên thông tin về Cảnh Trước, Chuyển Cảnh, và Cảnh Sau, hãy tạo ra một đối tượng JSON chi tiết, khoa học để điều khiển một mô hình tạo video AI. Phân tích kỹ lưỡng các yếu tố điện ảnh và điền vào tất cả các trường trong schema JSON được cung cấp.

**YÊU CẦU QUAN TRỌNG VỀ "narrative_prompt":**
- Trường "narrative_prompt" phải là một đoạn văn tường thuật **chi tiết và đầy đủ**, kết hợp tất cả các yếu tố khác (khung hình, máy quay, hiệu ứng, v.v.) thành một câu chuyện hình ảnh mạch lạc.
- Nếu kịch bản tập trung vào hội thoại, "narrative_prompt" phải mô tả rõ hành động nói, biểu cảm môi và khuôn mặt của nhân vật, và bối cảnh diễn ra cuộc hội thoại đó.

**Cảnh Trước (Điểm bắt đầu):** "${promptBefore}"
**Chuyển Cảnh (Hành động chính):** "${promptTransition}"
**Cảnh Sau (Điểm kết thúc):** "${promptAfter}"${scriptTypeInstruction}

Hãy tạo ra một JSON chi tiết theo schema. **QUAN TRỌNG: Tất cả giá trị văn bản trong JSON phải bằng tiếng Việt.**`,
                    en: `You are a professional AI director and video prompt engineer. Based on the information for the Scene Before, Transition, and Scene After, create a detailed, scientific JSON object to drive an AI video generation model. Thoroughly analyze the cinematic elements and fill in all fields of the provided JSON schema.

**CRITICAL REQUIREMENT for "narrative_prompt":**
- The "narrative_prompt" field must be a **detailed and complete** narrative paragraph that combines all other elements (frames, camera, effects, etc.) into a coherent visual story.
- If the script focuses on dialogue, the "narrative_prompt" must clearly describe the act of speaking, lip and facial expressions, and the context in which the dialogue occurs.

**Scene Before (Start Point):** "${promptBefore}"
**Transition (Main Action):** "${promptTransition}"
**Scene After (End Point):** "${promptAfter}"${scriptTypeInstruction}

Generate a detailed JSON according to the schema. **IMPORTANT: All text values in the JSON must be in English.**`,
                    zh: `你是一名专业的人工智能导演和视频提示工程师。根据前场景、转场和后场景的信息，创建一个详细的、科学的JSON对象，以驱动一个AI视频生成模型。彻底分析电影元素并填写所提供的JSON模式的所有字段。

**关于 "narrative_prompt" 的关键要求：**
- "narrative_prompt" 字段必须是一个**详细而完整**的叙述性段落，将所有其他元素（画面、摄像机、效果等）组合成一个连贯的视觉故事。
- 如果剧本侧重于对话，"narrative_prompt" 必须清晰地描述说话的动作、嘴唇和面部表情，以及对话发生的背景。

**前场景（起点）：** “${promptBefore}”
**转场（主要动作）：** “${promptTransition}”
**后场景（终点）：** “${promptAfter}”${scriptTypeInstruction}

根据模式生成一个详细的JSON。**重要提示：JSON中的所有文本值都必须是中文。**`,
                };
                
                const response = await ai.models.generateContent({
                    model: getTextModel(),
                    contents: prompts_json[language],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: getDetailedVideoPromptSchema(language),
                    },
                });
                const jsonText = response.text.trim();
                if (!jsonText) {
                    throw new Error("AI did not generate a JSON video prompt.");
                }
                const parsedJson = JSON.parse(jsonText);
                return JSON.stringify(parsedJson, null, 2);

            case 'start-end':
                const prompts_startend = {
                    vi: `Bạn là một AI chuyên viết prompt video. Dựa trên điểm bắt đầu và kết thúc của một cảnh, và mô tả chuyển cảnh, hãy tạo ra một prompt video duy nhất, tập trung vào hành động chuyển tiếp.\n\n**Điểm Bắt Đầu:** "${promptBefore}"\n**Hành Động Chuyển Tiếp:** "${promptTransition}"\n**Điểm Kết Thúc:** "${promptAfter}"${scriptTypeInstruction}\n\n**Yêu cầu:**\n1.  **Tạo một hành động liên tục:** Prompt của bạn phải mô tả một hành động duy nhất, không bị gián đoạn, bắt đầu từ bối cảnh của Điểm Bắt Đầu và kết thúc ở bối cảnh của Điểm Kết Thúc.\n2.  **Tập trung vào Chuyển Động:** Mô tả chủ yếu hành động, chuyển động camera, hoặc hiệu ứng được nêu trong "Hành Động Chuyển Tiếp".\n3.  **Định dạng:** Chỉ xuất ra văn bản prompt cuối cùng, không có lời dẫn.`,
                    en: `You are an expert video prompter. Based on a scene's start and end points, and a transition description, create a single video prompt focused on the transitional action.\n**Start Point:** "${promptBefore}"\n**Transitional Action:** "${promptTransition}"\n**End Point:** "${promptAfter}"${scriptTypeInstruction}\n**Requirements:**\n1.  **Create a Continuous Action:** Your prompt must describe a single, uninterrupted action that starts in the context of the Start Point and ends in the context of the End Point.\n2.  **Focus on Movement:** Primarily describe the action, camera movement, or effect mentioned in the "Transitional Action".\n3.  **Format:** Output only the final prompt text, without any introductory phrases.`,
                    zh: `你是一位专业的视频提示工程师。根据一个场景的起点和终点，以及转场描述，创建一个专注于过渡动作的单一视频提示。\n\n**起点：** "${promptBefore}"\n**过渡动作：** "${promptTransition}"\n**终点：** "${promptAfter}"${scriptTypeInstruction}\n\n**要求：**\n1. **创建一个连续的动作：** 你的提示必须描述一个单一的、不间断的动作，该动作在起点的背景下开始，在终点的背景下结束。\n2. **专注于运动：** 主要描述“过渡动作”中提到的动作、摄像机运动或效果。\n3. **格式：** 只输出最终的提示文本，不带任何介绍性短语。`,
                };
                prompt = prompts_startend[language];
                break;

            case 'auto':
            default:
                 const prompts_auto = {
                    vi: `Bạn là một AI chuyên viết prompt cho mô hình tạo video VEO. Nhiệm vụ của bạn là kết hợp mô tả của hai cảnh và một đoạn chuyển cảnh để tạo ra một prompt video duy nhất, liền mạch, đậm chất điện ảnh.\n\n**Cảnh Trước (Điểm bắt đầu):** "${promptBefore}"\n**Chuyển Cảnh (Hành động chính):** "${promptTransition}"\n**Cảnh Sau (Điểm kết thúc):** "${promptAfter}"${scriptTypeInstruction}\n\n**Yêu cầu:**\n1.  **Tạo một luồng kể chuyện bằng hình ảnh:** Viết một câu chuyện **hình ảnh** ngắn mô tả sự kiện diễn ra từ Cảnh Trước, qua Chuyển Cảnh, và kết thúc ở Cảnh Sau. Tập trung vào "show, don't tell".\n2.  **Mô tả chi tiết điện ảnh:** Bao gồm các chi tiết về hành động của nhân vật, **chuyển động camera** (ví dụ: "máy quay lia từ trái sang phải", "zoom cận cảnh vào khuôn mặt"), thay đổi ánh sáng, và các hiệu ứng hình ảnh (ví dụ: "chuyển cảnh mờ ảo", "hiệu ứng tua nhanh").\n3.  **Tập trung vào Chuyển Cảnh:** Hành động trong "Chuyển Cảnh" là phần quan trọng nhất của prompt.\n4.  **Định dạng:** Chỉ xuất ra văn bản prompt cuối cùng. Prompt phải là một đoạn văn duy nhất.`,
                    en: `You are an expert prompter for the VEO video generation model. Your task is to combine the descriptions of two scenes and a transition to create a single, seamless, cinematic video prompt.\n\n**Scene Before (Starting Point):** "${promptBefore}"\n**Transition (Main Action):** "${promptTransition}"\n**Scene After (Ending Point):** "${promptAfter}"${scriptTypeInstruction}\n\n**Requirements:**\n1.  **Create a Visual Narrative Flow:** Write a short **visual** story describing the event that unfolds from Scene Before, through the Transition, and ends at Scene After. Focus on "show, don't tell".\n2.  **Describe Cinematic Details:** Include specifics about character actions, **camera movements** (e.g., "the camera pans from left to right," "a close-up zoom on the face"), lighting changes, and visual effects (e.g., "a dreamy cross-dissolve," "a timelapse effect").\n3.  **Focus on the Transition:** The action in the "Transition" is the most critical part of the prompt.\n4.  **Format:** Output only the final prompt text. The prompt should be a single paragraph.`,
                    zh: `你是一位为VEO视频生成模型编写提示的专家。你的任务是结合两个场景和一个转场的描述，创建一个单一、无缝且具有电影感的视频提示。\n\n**前场景（起点）：** “${promptBefore}”\n**转场（主要动作）：** “${promptTransition}”\n**后场景（终点）：** “${promptAfter}”${scriptTypeInstruction}\n\n**要求：**\n1. **创建视觉叙事流：** 编写一个简短的**视觉**故事，描述从前场景开始，经过转场，到后场景结束的事件。专注于“展示，而非讲述”。\n2. **描述电影化细节：** 包括角色动作、**摄像机运动**（例如，“摄像机从左向右平移”，“面部特写变焦”）、灯光变化和视觉效果（例如，“梦幻般的交叉溶解”，“延时摄影效果”）的具体细节。\n3. **专注于转场：** “转场”中的动作是提示中最关键的部分。\n4. **格式：** 只输出最终的提示文本。提示应为单个段落。`,
                 };
                prompt = prompts_auto[language];
                break;
        }

        const response = await ai.models.generateContent({
            model: getTextModel(),
            contents: prompt,
        });
        const text = response.text.trim();
        if (!text) {
            throw new Error("AI did not generate a video prompt.");
        }
        return text;
        
    } catch (error) {
        console.error("Error generating video prompt from scenes:", error);
        throw processApiError(error);
    }
}