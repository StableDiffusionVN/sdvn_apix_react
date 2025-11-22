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

interface PhotoRestorationOptions {
    type: string;
    gender: string;
    age: string;
    nationality: string;
    notes?: string;
    removeWatermark?: boolean;
    removeStains?: boolean;
    colorizeRgb?: boolean;
}

export async function restoreOldPhoto(imageDataUrl: string, options: PhotoRestorationOptions): Promise<string> {
    const { mimeType, data: base64Data } = await processImageInput(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Bạn là một chuyên gia phục chế ảnh cũ. Nhiệm vụ của bạn là phục chế bức ảnh được cung cấp.',
        '**HƯỚNG DẪN QUAN TRỌNG NHẤT:**'
    ];
    
    // Make colorization the absolute first command if requested.
    if (options.colorizeRgb) {
        promptParts.push(
            '1. **TÔ MÀU ẢNH (ƯU TIÊN SỐ 1):** Đây là ảnh đen trắng hoặc ảnh màu đã cũ. BẠN BẮT BUỘC PHẢI tô màu lại cho bức ảnh này. Sử dụng một bảng màu đầy đủ, rực rỡ và chân thực. Màu sắc phải trông tự nhiên và sống động như một bức ảnh kỹ thuật số hiện đại. **ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT.**'
        );
    } else {
        promptParts.push(
            '1. **Tô màu (Tự nhiên/Cổ điển):** Nếu ảnh là đen trắng hoặc màu đã phai, hãy tô màu một cách tinh tế. Sử dụng tông màu tự nhiên, phù hợp với thời đại của bức ảnh gốc để giữ lại nét hoài cổ (ví dụ: tông màu sepia nhẹ, màu film cũ).'
        );
    }

    if (options.removeStains) {
        promptParts.push('2. **Sửa chữa triệt để:** Loại bỏ HOÀN TOÀN các vết xước, nếp gấp, vết ố, phai màu, và các hư hỏng vật lý khác.');
    } else {
        promptParts.push('2. **Sửa chữa cơ bản:** Sửa các vết rách và nếp gấp lớn, nhưng giữ lại kết cấu và các vết ố nhỏ để duy trì nét cổ điển của ảnh.');
    }

    promptParts.push(
        '3. **Tăng cường chi tiết:** Làm sắc nét hình ảnh và khôi phục các chi tiết bị mất, đặc biệt là trên khuôn mặt.',
        '4. **Giữ nguyên bản chất:** KHÔNG thay đổi các đặc điểm trên khuôn mặt, bố cục, hay nội dung gốc của ảnh.',
        '',
        '**THÔNG TIN BỔ SUNG ĐỂ CÓ KẾT QUẢ TỐT NHẤT:**'
    );

    if (options.type) {
        promptParts.push(`- **Loại ảnh:** ${options.type}.`);
    }
    if (options.gender && options.gender !== 'Tự động') {
        promptParts.push(`- **Giới tính người trong ảnh:** ${options.gender}.`);
    }
    if (options.age) {
        promptParts.push(`- **Độ tuổi ước tính:** ${options.age}.`);
    }
    if (options.nationality) {
        promptParts.push(`- **Quốc tịch:** ${options.nationality}. Điều này quan trọng để có màu da và trang phục phù hợp.`);
    }

    if (options.notes) {
        promptParts.push(`- **Ghi chú từ người dùng:** "${options.notes}".`);
    }
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }

    promptParts.push('', 'Chỉ trả về hình ảnh đã được phục chế, không kèm theo văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to restore old photo with new stronger prompt...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during photo restoration:", processedError);
        throw processedError;
    }
}