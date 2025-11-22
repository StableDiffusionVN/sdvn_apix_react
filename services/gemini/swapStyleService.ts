/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError,
    processImageInput, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

interface SwapStyleOptions {
    style: string;
    styleStrength: string; // Used for both style strength and faithfulness
    notes?: string;
    removeWatermark?: boolean;
    convertToReal?: boolean;
}

async function convertImageToRealistic(imageDataUrl: string, options: SwapStyleOptions): Promise<string> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Nhiệm vụ của bạn là chuyển đổi hình ảnh được cung cấp thành một bức ảnh SIÊU THỰC (hyper-realistic), chi tiết và sống động như thật. Kết quả cuối cùng phải không thể phân biệt được với một bức ảnh được chụp bằng máy ảnh DSLR cao cấp.',
        '**YÊU CẦU BẮT BUỘC:**'
    ];
    
    // NOTE: styleStrength is used as faithfulness here
    const faithfulnessMapping: { [key: string]: string } = {
        'Rất yếu': '1. **Mức độ giữ nét (Rất Yếu):** Bạn có quyền tự do sáng tạo cao nhất. Chỉ cần giữ lại chủ đề chính, bạn có thể thay đổi đáng kể bố cục, góc nhìn và các chi tiết.',
        'Yếu': '1. **Mức độ giữ nét (Yếu):** Bạn có thể thay đổi bố cục và thêm/bớt các yếu tố phụ, nhưng phải giữ lại chủ thể và tư thế chính.',
        'Trung bình': '1. **Mức độ giữ nét (Trung bình):** Giữ lại bố cục và các yếu tố chính, nhưng bạn có thể diễn giải lại các chi tiết nhỏ và kết cấu vật liệu.',
        'Mạnh': '1. **Mức độ giữ nét (Mạnh):** Bám sát chặt chẽ với bố cục và các chi tiết trong ảnh gốc. Chỉ thay đổi phong cách nghệ thuật sang ảnh thật.',
        'Rất mạnh': '1. **Mức độ giữ nét (Rất Mạnh):** SAO CHÉP CHÍNH XÁC. Phải giữ lại TẤT CẢ các chi tiết, hình dạng, vị trí và bố cục từ ảnh gốc một cách tuyệt đối. Nhiệm vụ duy nhất là biến nó thành ảnh thật.',
    };

    if (options.styleStrength && faithfulnessMapping[options.styleStrength]) {
        promptParts.push(faithfulnessMapping[options.styleStrength]);
    } else {
        promptParts.push('1. **Mức độ giữ nét (Tự động):** Giữ nguyên chủ thể, bố cục, và các yếu tố chính của ảnh gốc. Diễn giải một cách hợp lý để tạo ra kết quả chân thực nhất.');
    }

    promptParts.push(
        '2. **Thay đổi phong cách:** Biến đổi hoàn toàn phong cách nghệ thuật (ví dụ: vẽ tay, hoạt hình, 3D) thành một bức ảnh trông như được chụp bằng máy ảnh kỹ thuật số hiện đại.',
        '3. **Chân thực đến kinh ngạc:** Hãy đặc biệt chú ý đến ánh sáng tự nhiên, bóng đổ phức tạp, kết cấu vật liệu chi tiết (da, vải, kim loại, gỗ), và các chi tiết nhỏ nhất để tạo ra một kết quả chân thực.'
    );
    
    if (options.notes) {
        promptParts.push(`- **Ghi chú từ người dùng:** "${options.notes}".`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push('Chỉ trả về hình ảnh đã được chuyển đổi, không kèm theo văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during image to real conversion:", processedError);
        throw processedError;
    }
}

export async function swapImageStyle(imageDataUrl: string, options: SwapStyleOptions): Promise<string> {
    
    if (options.convertToReal) {
        return convertImageToRealistic(imageDataUrl, options);
    }

    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Nhiệm vụ của bạn là một nghệ sĩ bậc thầy, biến đổi hình ảnh được cung cấp theo một phong cách nghệ thuật cụ thể.',
        '**YÊU CẦU BẮT BUỘC:**'
    ];
    
    if (options.style && options.style.trim() !== '' && options.style.trim().toLowerCase() !== 'tự động') {
        promptParts.push(`1. **Áp dụng phong cách:** Chuyển đổi hoàn toàn hình ảnh gốc sang phong cách nghệ thuật **"${options.style}"**.`);
    } else {
        promptParts.push('1. **Áp dụng phong cách:** Hãy tự động lựa chọn một phong cách nghệ thuật ngẫu nhiên, độc đáo và ấn tượng (ví dụ: Tranh sơn dầu, Cyberpunk, Art Deco, v.v.) và chuyển đổi hoàn toàn hình ảnh gốc sang phong cách đó.');
    }

    const strengthMapping: { [key: string]: string } = {
        'Rất yếu': '2. **Mức độ ảnh hưởng Style (Rất Yếu):** Áp dụng "lớp da" phong cách mới một cách tinh tế. Giữ lại gần như TOÀN BỘ các chi tiết, hình dạng, và bố cục từ ảnh gốc.',
        'Yếu': '2. **Mức độ ảnh hưởng Style (Yếu):** Bám sát chặt chẽ với bố cục và các chi tiết trong ảnh gốc. Chỉ thay đổi phong cách nghệ thuật, giữ nguyên vẹn nội dung.',
        'Trung bình': '2. **Mức độ ảnh hưởng Style (Trung bình):** Giữ lại bố cục và các yếu tố chính của ảnh gốc, nhưng có thể diễn giải lại các chi tiết nhỏ và kết cấu vật liệu theo phong cách mới.',
        'Mạnh': '2. **Mức độ ảnh hưởng Style (Mạnh):** Có thể thay đổi một vài chi tiết phụ và kết cấu, nhưng phải giữ lại chủ thể và bố cục chính của ảnh gốc để phù hợp hơn với style mới.',
        'Rất mạnh': '2. **Mức độ ảnh hưởng Style (Rất Mạnh):** Tự do sáng tạo cao nhất. Chỉ cần giữ lại chủ đề chính, bạn có thể thay đổi đáng kể bố cục, góc nhìn và các chi tiết để phù hợp nhất với phong cách đã chọn.',
    };
    
    promptParts.push(strengthMapping[options.styleStrength]);

    promptParts.push(
        '3. **Kết quả chất lượng cao:** Bức ảnh cuối cùng phải là một tác phẩm nghệ thuật hoàn chỉnh, chất lượng cao, thể hiện rõ nét đặc trưng của phong cách đã chọn.'
    );
    
    if (options.notes) {
        promptParts.push(`- **Ghi chú từ người dùng:** "${options.notes}".`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push('Chỉ trả về hình ảnh đã được chuyển đổi, không kèm theo văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to swap image style...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during style swap:", processedError);
        throw processedError;
    }
}