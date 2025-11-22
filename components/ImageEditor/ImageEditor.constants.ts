/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ToolId, type ColorChannel } from './ImageEditor.types';

export const CROP_ASPECT_RATIO_OPTIONS = ['Free', 'Original', '1:1', '2:3', '3:2', '4:5', '5:4', '3:4', '4:3', '9:16', '16:9'];
export const HANDLE_SIZE = 10;
export const OVERLAY_PADDING = 1000; // Padding to allow drawing outside canvas bounds

export const TOOLTIPS: Record<ToolId, { name: string; description: string }> = {
    rotate: { name: 'Xoay ảnh (R)', description: 'Xoay ảnh 90 độ theo chiều kim đồng hồ.' },
    flipH: { name: 'Lật ngang', description: 'Lật ảnh theo chiều ngang.' },
    flipV: { name: 'Lật dọc', description: 'Lật ảnh theo chiều dọc.' },
    crop: { name: 'Cắt ảnh (C)', description: 'Chọn một vùng chữ nhật để cắt ảnh.' },
    'perspective-crop': { name: 'Cắt phối cảnh (Alt+C)', description: 'Chọn 4 điểm để cắt và chỉnh sửa phối cảnh.' },
    hand: { name: 'Di chuyển (H, giữ Space)', description: 'Di chuyển và kéo canvas.' },
    selection: { name: 'Chọn vùng (L)', description: 'Vẽ tự do để tạo vùng chọn. Giữ Shift để thêm, Alt để trừ.' },
    marquee: { name: 'Chọn vùng Chữ nhật (M)', description: 'Vẽ một hình chữ nhật để tạo vùng chọn. Giữ Shift để thêm, Alt để trừ.' },
    ellipse: { name: 'Chọn vùng Elip', description: 'Vẽ một hình elip để tạo vùng chọn. Giữ Shift để thêm, Alt để trừ.' },
    pen: { name: 'Bút (P)', description: 'Tạo vùng chọn chính xác bằng cách nhấp hoặc nhấp-và-kéo để tạo đường cong.' },
    colorpicker: { name: 'Chấm màu (I)', description: 'Chọn một màu từ ảnh để sử dụng cho cọ vẽ.' },
    brush: { name: 'Cọ vẽ (B)', description: 'Vẽ lên ảnh bằng màu đã chọn.' },
    eraser: { name: 'Tẩy (E)', description: 'Xóa các nét đã vẽ.' },
    undo: { name: 'Hoàn tác (Undo)', description: 'Quay lại hành động cuối cùng.' },
    redo: { name: 'Làm lại (Redo)', description: 'Thực hiện lại hành động đã hoàn tác.' },
    colorSwatch: { name: 'Màu cọ vẽ', description: 'Nhấn để chọn màu cho cọ vẽ của bạn.' },
};

export const COLOR_CHANNELS: { id: ColorChannel, name: string, center: number, color: string }[] = [
    { id: 'reds',     name: 'Reds',     center: 0,    color: '#ef4444' },
    { id: 'yellows',  name: 'Yellows',  center: 60,   color: '#f59e0b' },
    { id: 'greens',   name: 'Greens',   center: 120,  color: '#22c55e' },
    { id: 'aquas',    name: 'Aquas',    center: 180,  color: '#22d3ee' },
    { id: 'blues',    name: 'Blues',    center: 240,  color: '#3b82f6' },
    { id: 'magentas', name: 'Magentas', center: 300,  color: '#d946ef' },
];

export const INITIAL_COLOR_ADJUSTMENTS = Object.fromEntries(
    COLOR_CHANNELS.map(channel => [channel.id, { h: 0, s: 0, l: 0 }])
) as Record<ColorChannel, { h: number; s: number; l: number }>;