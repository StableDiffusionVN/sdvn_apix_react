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

interface ImageToRealOptions {
    faithfulness: string;
    notes?: string;
    removeWatermark?: boolean;
}

export async function convertImageToRealistic(imageDataUrl: string, options: ImageToRealOptions): Promise<string> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Nhiệm vụ của bạn là chuyển đổi hình ảnh được cung cấp thành một bức ảnh SIÊU THỰC (hyper-realistic), chi tiết và sống động như thật. Kết quả cuối cùng phải không thể phân biệt được với một bức ảnh được chụp bằng máy ảnh DSLR cao cấp.',
        '**YÊU CẦU BẮT BUỘC:**'
    ];
    
    const faithfulnessMapping: { [key: string]: string } = {
        'Rất yếu': '1. **Mức độ giữ nét (Rất Yếu):** Bạn có quyền tự do sáng tạo cao nhất. Chỉ cần giữ lại chủ đề chính, bạn có thể thay đổi đáng kể bố cục, góc nhìn và các chi tiết.',
        'Yếu': '1. **Mức độ giữ nét (Yếu):** Bạn có thể thay đổi bố cục và thêm/bớt các yếu tố phụ, nhưng phải giữ lại chủ thể và tư thế chính.',
        'Trung bình': '1. **Mức độ giữ nét (Trung bình):** Giữ lại bố cục và các yếu tố chính, nhưng bạn có thể diễn giải lại các chi tiết nhỏ và kết cấu vật liệu.',
        'Mạnh': '1. **Mức độ giữ nét (Mạnh):** Bám sát chặt chẽ với bố cục và các chi tiết trong ảnh gốc. Chỉ thay đổi phong cách nghệ thuật sang ảnh thật.',
        'Rất mạnh': '1. **Mức độ giữ nét (Rất Mạnh):** SAO CHÉP CHÍNH XÁC. Phải giữ lại TẤT CẢ các chi tiết, hình dạng, vị trí và bố cục từ ảnh gốc một cách tuyệt đối. Nhiệm vụ duy nhất là biến nó thành ảnh thật.',
    };

    if (options.faithfulness && options.faithfulness !== 'Tự động') {
        promptParts.push(faithfulnessMapping[options.faithfulness]);
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
        console.log("Attempting to convert image to realistic with new prompt...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during image to real conversion:", processedError);
        throw processedError;
    }
}
