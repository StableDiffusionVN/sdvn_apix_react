/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import toast from 'react-hot-toast';
import { type ImageForZip, type VideoTask } from './uiTypes';
// FIX: Add missing React import.
import React, { type ChangeEvent } from 'react';

// Declare JSZip for creating zip files
declare const JSZip: any;

/**
 * Handles file input change events, reads the file as a Data URL, and executes a callback.
 * @param e The React change event from the file input.
 * @param callback A function to call with the resulting file data URL.
 */
export const handleFileUpload = (
    e: ChangeEvent<HTMLInputElement>,
    callback: (result: string) => void
) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                callback(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
};

/**
 * Triggers a browser download for a given URL, automatically determining the file extension.
 * @param url The URL of the file to download (can be a data URL or blob URL).
 * @param filenameWithoutExtension The desired name for the downloaded file, without the extension.
 */
export const downloadImage = (url: string, filenameWithoutExtension: string) => {
    if (!url) return;
    toast('Bắt đầu tải về...');

    // Determine extension from URL
    let extension = 'jpg'; // Default extension
    if (url.startsWith('data:image/png')) {
        extension = 'png';
    } else if (url.startsWith('data:image/jpeg')) {
        extension = 'jpg';
    } else if (url.startsWith('data:image/webp')) {
        extension = 'webp';
    } else if (url.startsWith('blob:')) {
        // This is likely a video from video generation or a blob from another source.
        // It's safer to assume mp4 for videos.
        extension = 'mp4';
    }

    const filename = `${filenameWithoutExtension}.${extension}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Triggers a browser download for a JSON object.
 * @param data The JavaScript object to download.
 * @param filenameWithExtension The desired filename, including the .json extension.
 */
export const downloadJson = (data: object, filenameWithExtension: string) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filenameWithExtension;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to create or download JSON file:", error);
        alert("Could not download settings file.");
    }
};


/**
 * Converts a data URL string to a Blob object.
 * @param dataurl The data URL to convert.
 * @returns A Blob object.
 */
export const dataURLtoBlob = async (dataurl: string): Promise<Blob> => {
    // Handle blob URLs directly
    if (dataurl.startsWith('blob:')) {
        const response = await fetch(dataurl);
        return await response.blob();
    }
    
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * Creates a zip file from a list of images and triggers a download.
 * @param images An array of ImageForZip objects.
 * @param zipFilename The desired name for the downloaded zip file.
 */
export const downloadAllImagesAsZip = async (images: ImageForZip[], zipFilename: string = 'results.zip') => {
    if (!images || images.length === 0) {
        toast.error('Không có ảnh nào để tải về.');
        return;
    }
    toast('Đang chuẩn bị file zip...');

    try {
        const zip = new JSZip();

        for (const img of images) {
            if (!img.url) continue;

            const blob = await dataURLtoBlob(img.url);
            let targetFolder = zip;
            if (img.folder) {
                targetFolder = zip.folder(img.folder) || zip;
            }
            
            const fileExtension = img.extension || (blob.type.split('/')[1] || 'jpg').toLowerCase();
            const baseFileName = img.filename.replace(/\s+/g, '-').toLowerCase();

            // Handle duplicates by appending a number
            let finalFilename = `${baseFileName}.${fileExtension}`;
            let count = 1;
            // Use the file method to check for existence within the target folder
            while (targetFolder.file(finalFilename)) {
                count++;
                finalFilename = `${baseFileName}-${count}.${fileExtension}`;
            }

            targetFolder.file(finalFilename, blob);
        }

        if (Object.keys(zip.files).length === 0) {
            toast.error('Không có ảnh hợp lệ nào để tải về.');
            return;
        }

        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error('Lỗi khi tạo file zip:', error);
        toast.error('Đã xảy ra lỗi khi tạo file zip.');
    }
};

/**
 * A centralized utility to process and download all generated assets (images and videos) as a zip file.
 * @param inputImages Array of input images for the zip.
 * @param historicalImages Array of generated images/videos. Can be simple URLs or objects with details for naming.
 * @param videoTasks The video generation task object to find completed videos.
 * @param zipFilename The final name for the downloaded zip file.
 * @param baseOutputFilename A base prefix for all generated output files.
 */
export const processAndDownloadAll = async ({
    inputImages = [],
    historicalImages = [],
    videoTasks = {},
    zipFilename,
    baseOutputFilename,
}: {
    inputImages?: ImageForZip[];
    historicalImages?: Array<string | { url: string; idea?: string; prompt?: string; }>;
    videoTasks?: Record<string, VideoTask>;
    zipFilename: string;
    baseOutputFilename: string;
}) => {
    const allItemsToZip: ImageForZip[] = [...inputImages];
    const processedUrls = new Set<string>();

    // Add historical images first
    historicalImages.forEach((item, index) => {
        const url = typeof item === 'string' ? item : item.url;
        if (processedUrls.has(url)) return;

        // Generate a descriptive filename part
        const namePartRaw = (typeof item !== 'string' && (item.idea || item.prompt))
            ? (item.idea || item.prompt!)
            : `${index + 1}`;
        
        // Sanitize the filename part
        const namePart = namePartRaw.substring(0, 30).replace(/[\s()]/g, '_').replace(/[^\w-]/g, '');
        
        const isVideo = url.startsWith('blob:');

        allItemsToZip.push({
            url,
            filename: `${baseOutputFilename}-${namePart}`,
            folder: 'output',
            extension: isVideo ? 'mp4' : undefined,
        });
        processedUrls.add(url);
    });

    // Add any completed videos from videoTasks that weren't already in historicalImages
    Object.values(videoTasks).forEach((task, index) => {
        if (task.status === 'done' && task.resultUrl && !processedUrls.has(task.resultUrl)) {
            allItemsToZip.push({
                url: task.resultUrl,
                filename: `${baseOutputFilename}-video-${index + 1}`,
                folder: 'output',
                extension: 'mp4',
            });
            processedUrls.add(task.resultUrl);
        }
    });

    if (allItemsToZip.length === inputImages.length) {
        toast.error('Không có ảnh hoặc video nào đã tạo để tải về.');
        return;
    }

    await downloadAllImagesAsZip(allItemsToZip, zipFilename);
};


// --- PNG Metadata Utilities for Import/Export ---

const crc32 = (function() {
    let table: number[] | undefined;

    function makeTable() {
        table = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }
    }

    return function(bytes: Uint8Array): number {
        if (!table) makeTable();
        let crc = -1;
        for (let i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ table![(crc ^ bytes[i]) & 0xFF];
        }
        return (crc ^ -1) >>> 0;
    };
})();

export const embedJsonInPng = async (imageDataUrl: string, jsonData: object, enabled: boolean): Promise<string> => {
    if (!enabled) {
        return imageDataUrl;
    }
    
    if (!imageDataUrl.startsWith('data:image/png;base64,')) {
        console.warn('Cannot embed JSON in non-PNG image. Returning original.');
        return imageDataUrl;
    }
    
    try {
        const blob = await dataURLtoBlob(imageDataUrl);
        const buffer = await blob.arrayBuffer();
        const view = new Uint8Array(buffer);

        const iendIndex = view.length - 12;

        const chunkType = new TextEncoder().encode('apIX');
        const chunkDataStr = JSON.stringify(jsonData);
        const chunkData = new TextEncoder().encode(chunkDataStr);
        const chunkLength = chunkData.length;

        const fullChunk = new Uint8Array(4 + 4 + chunkLength + 4);
        const chunkDataView = new DataView(fullChunk.buffer);
        
        chunkDataView.setUint32(0, chunkLength, false);
        fullChunk.set(chunkType, 4);
        fullChunk.set(chunkData, 8);
        
        const crcData = new Uint8Array(4 + chunkLength);
        crcData.set(chunkType);
        crcData.set(chunkData, 4);
        const crc = crc32(crcData);
        chunkDataView.setUint32(8 + chunkLength, crc, false);

        const newPngData = new Uint8Array(iendIndex + fullChunk.length + 12);
        newPngData.set(view.slice(0, iendIndex));
        newPngData.set(fullChunk, iendIndex);
        newPngData.set(view.slice(iendIndex), iendIndex + fullChunk.length);

        const newBlob = new Blob([newPngData], { type: 'image/png' });

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(newBlob);
        });
    } catch (error) {
        console.error("Failed to embed JSON in PNG:", error);
        return imageDataUrl;
    }
};

export const extractJsonFromPng = async (file: File): Promise<object | null> => {
    try {
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);

        if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
            console.error("Not a valid PNG file for extraction.");
            return null;
        }

        let offset = 8;
        while (offset < view.byteLength) {
            const length = view.getUint32(offset, false);
            const typeBytes = uint8View.slice(offset + 4, offset + 8);
            const type = new TextDecoder().decode(typeBytes);

            if (type === 'apIX') {
                const dataBytes = uint8View.slice(offset + 8, offset + 8 + length);
                const jsonString = new TextDecoder().decode(dataBytes);
                return JSON.parse(jsonString);
            }

            if (type === 'IEND') {
                break;
            }
            offset += 12 + length;
        }
    } catch (error) {
        console.error("Failed to extract JSON from PNG:", error);
    }
    return null;
};
// --- NEW: Image Combination Utility ---

interface CombineItem {
    url: string;
    label: string;
}

interface CombineOptions {
    layout: 'smart-grid' | 'horizontal' | 'vertical';
    mainTitle?: string;
    gap?: number;
    backgroundColor?: string;
    labels?: {
        enabled: boolean;
        fontColor?: string;
        backgroundColor?: string;
        baseFontSize?: number;
        fontFamily?: string;
    };
}

const loadImg = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url.substring(0, 50)}...`));
    img.src = url;
});

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    let testLine;
    for(let n = 0; n < words.length; n++) {
        testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
};

export const combineImages = async (items: CombineItem[], options: CombineOptions): Promise<string> => {
    const {
        layout = 'smart-grid',
        mainTitle = '',
        gap = 0,
        backgroundColor = '#ffffff',
        labels = { enabled: false, fontColor: '#000000', backgroundColor: '#ffffff', baseFontSize: 40, fontFamily: 'Be Vietnam Pro' }
    } = options;

    if (items.length === 0) throw new Error("No images provided to combine.");

    const loadedImages = await Promise.all(items.map(item => loadImg(item.url)));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create canvas context.");
    
    const BASE_CANVAS_WIDTH = 1536.0;

    let nativeContentWidth = 0;
    if (layout === 'horizontal') {
        const maxHeight = Math.max(...loadedImages.map(img => img.naturalHeight));
        nativeContentWidth = loadedImages.reduce((sum, img) => {
            const scale = maxHeight > 0 ? maxHeight / img.naturalHeight : 1;
            return sum + (img.naturalWidth * scale);
        }, 0) + (loadedImages.length > 1 ? (loadedImages.length - 1) * gap : 0);
    } else if (layout === 'vertical') {
        nativeContentWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
    } else { // smart-grid
        const numRows = items.length > 1 ? Math.floor(Math.sqrt(items.length)) : 1;
        const baseImagesPerRow = Math.floor(items.length / numRows);
        let remainder = items.length % numRows;
        const rowWidths: number[] = [];
        let currentImageIndex = 0;
        for (let i = 0; i < numRows; i++) {
            const rowSize = baseImagesPerRow + (remainder > 0 ? 1 : 0);
            const group = loadedImages.slice(currentImageIndex, currentImageIndex + rowSize);
            currentImageIndex += rowSize;
            if (remainder > 0) remainder--;
            if (group.length > 0) {
                const maxHeight = Math.max(...group.map(img => img.naturalHeight));
                const rowWidth = group.reduce((sum, img) => {
                     const scale = maxHeight > 0 ? maxHeight / img.naturalHeight : 1;
                     return sum + (img.naturalWidth * scale);
                }, 0) + (group.length > 1 ? (group.length - 1) * gap : 0);
                rowWidths.push(rowWidth);
            }
        }
        nativeContentWidth = Math.max(...rowWidths);
    }
    if (nativeContentWidth <= 0) nativeContentWidth = BASE_CANVAS_WIDTH;

    const scaleRatio = BASE_CANVAS_WIDTH / nativeContentWidth;
    const scaledGap = Math.round(gap * scaleRatio);
    
    const FONT_FAMILY = labels.fontFamily || '"Be Vietnam Pro", sans-serif';

    const finalMainTitleFontSize = Math.round(labels.baseFontSize || 40);
    const finalLabelFontSize = Math.round(finalMainTitleFontSize * 0.8);

    const labelFontSizeForContentCanvas = Math.round(finalLabelFontSize / scaleRatio);

    const mainTitleFont = `bold ${finalMainTitleFontSize}px ${FONT_FAMILY}`;
    const labelFont = `${labelFontSizeForContentCanvas}px ${FONT_FAMILY}`;
    
    const hasPerImageLabels = labels.enabled && items.some(i => i.label && i.label.trim() !== '');
    const hasMainTitle = labels.enabled && mainTitle && mainTitle.trim() !== '';

    // Dynamic padding based on font size. The vertical padding for a label area
    // will be equal to the font size on both top and bottom.
    const finalPadding = finalMainTitleFontSize;
    const contentCanvasPadding = labelFontSizeForContentCanvas;

    // The total height includes the font size itself plus top and bottom padding.
    const finalTitleHeight = hasMainTitle ? finalMainTitleFontSize + (finalPadding * 2) : 0;
    const perImageLabelHeight = hasPerImageLabels ? labelFontSizeForContentCanvas + (contentCanvasPadding * 2) : 0;
    
    const labelLineHeight = labelFontSizeForContentCanvas * 1.2;
    const mainTitleLineHeight = finalMainTitleFontSize * 1.2;
    
    let contentCanvas = document.createElement('canvas');
    const contentCtx = contentCanvas.getContext('2d');
    if (!contentCtx) throw new Error("Could not create content canvas context.");

    if (layout === 'horizontal') {
        const maxHeight = Math.max(...loadedImages.map(img => img.naturalHeight));
        const normalizedImages = loadedImages.map(img => {
            const scale = maxHeight > 0 ? maxHeight / img.naturalHeight : 1;
            return { img, w: img.naturalWidth * scale, h: maxHeight };
        });
        contentCanvas.width = normalizedImages.reduce((sum, item) => sum + item.w, 0) + (loadedImages.length - 1) * gap;
        contentCanvas.height = maxHeight + perImageLabelHeight;
        let currentX = 0;
        normalizedImages.forEach((item, index) => {
            contentCtx.drawImage(item.img, currentX, 0, item.w, item.h);
            const labelText = items[index]?.label;
            if (perImageLabelHeight > 0 && labelText && labelText.trim() !== '') {
                const labelY = maxHeight;
                contentCtx.fillStyle = labels.backgroundColor || '#ffffff';
                contentCtx.fillRect(currentX, labelY, item.w, perImageLabelHeight);
                contentCtx.fillStyle = labels.fontColor || '#000000';
                contentCtx.font = labelFont;
                contentCtx.textAlign = 'center';
                contentCtx.textBaseline = 'middle';
                wrapText(contentCtx, labelText, currentX + item.w / 2, labelY + perImageLabelHeight / 2, item.w - contentCanvasPadding * 2, labelLineHeight);
            }
            currentX += item.w + gap;
        });
    } else if (layout === 'vertical') {
        const maxWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
        const normalizedImages = loadedImages.map((img, index) => {
            const scale = maxWidth > 0 ? maxWidth / img.naturalWidth : 1;
            const labelText = items[index]?.label;
            const hasLabel = perImageLabelHeight > 0 && labelText && labelText.trim() !== '';
            return { img, w: maxWidth, h: img.naturalHeight * scale, labelHeight: hasLabel ? perImageLabelHeight : 0, label: labelText, };
        });
        contentCanvas.width = maxWidth;
        contentCanvas.height = normalizedImages.reduce((sum, item) => sum + item.h + item.labelHeight, 0) + (loadedImages.length > 1 ? (loadedImages.length - 1) * gap : 0);
        let currentY = 0;
        normalizedImages.forEach((item, index) => {
            contentCtx.drawImage(item.img, 0, currentY, item.w, item.h);
            if (item.labelHeight > 0) {
                const labelY = currentY + item.h;
                contentCtx.fillStyle = labels.backgroundColor || '#ffffff';
                contentCtx.fillRect(0, labelY, item.w, item.labelHeight);
                contentCtx.fillStyle = labels.fontColor || '#000000';
                contentCtx.font = labelFont;
                contentCtx.textAlign = 'center';
                contentCtx.textBaseline = 'middle';
                wrapText(contentCtx, item.label!, 0 + item.w / 2, labelY + item.labelHeight / 2, item.w - contentCanvasPadding * 2, labelLineHeight);
            }
            currentY += item.h + item.labelHeight;
            if (index < normalizedImages.length - 1) currentY += gap;
        });
    } else { // smart-grid
        const numRows = items.length > 1 ? Math.floor(Math.sqrt(items.length)) : 1;
        const baseImagesPerRow = Math.floor(items.length / numRows);
        let remainder = items.length % numRows;

        const rowGroups: HTMLImageElement[][] = [];
        let currentImageIndex = 0;
        for (let i = 0; i < numRows; i++) {
            const rowSize = baseImagesPerRow + (remainder > 0 ? 1 : 0);
            rowGroups.push(loadedImages.slice(currentImageIndex, currentImageIndex + rowSize));
            currentImageIndex += rowSize;
            if (remainder > 0) remainder--;
        }

        const rowCanvases = rowGroups.map((group, rowIndex) => {
            const rowCanvas = document.createElement('canvas');
            const rowCtx = rowCanvas.getContext('2d');
            if (!rowCtx) throw new Error("Context failed for row");
            if (group.length === 0) return rowCanvas;

            const maxHeight = Math.max(...group.map(img => img.naturalHeight));
            const normalizedImagesInRow = group.map(img => {
                const scale = maxHeight > 0 ? maxHeight / img.naturalHeight : 1;
                return { img, w: img.naturalWidth * scale, h: maxHeight };
            });

            rowCanvas.width = normalizedImagesInRow.reduce((sum, item) => sum + item.w, 0) + (group.length - 1) * gap;
            rowCanvas.height = maxHeight + perImageLabelHeight;

            let startIndex = 0;
            for(let i = 0; i < rowIndex; i++) { startIndex += rowGroups[i].length; }

            let currentX = 0;
            normalizedImagesInRow.forEach((item, indexInRow) => {
                rowCtx.drawImage(item.img, currentX, 0, item.w, item.h);
                const originalItemIndex = startIndex + indexInRow;
                const labelText = items[originalItemIndex]?.label;
                if (perImageLabelHeight > 0 && labelText && labelText.trim() !== '') {
                    const labelY = maxHeight;
                    rowCtx.fillStyle = labels.backgroundColor || '#ffffff';
                    rowCtx.fillRect(currentX, labelY, item.w, perImageLabelHeight);
                    rowCtx.fillStyle = labels.fontColor || '#000000';
                    rowCtx.font = labelFont;
                    rowCtx.textAlign = 'center';
                    rowCtx.textBaseline = 'middle';
                    wrapText(rowCtx, labelText, currentX + item.w / 2, labelY + perImageLabelHeight / 2, item.w - contentCanvasPadding * 2, labelLineHeight);
                }
                currentX += item.w + gap;
            });
            return rowCanvas;
        });

        const maxRowWidth = Math.max(...rowCanvases.map(c => c.width));
        if(maxRowWidth <= 0) throw new Error("Calculated grid width is zero.");

        const scaledRows = rowCanvases.map(rc => {
            if (rc.width === 0) return { canvas: rc, w: 0, h: 0 };
            const scale = maxRowWidth / rc.width;
            return { canvas: rc, w: maxRowWidth, h: rc.height * scale };
        });
        contentCanvas.width = maxRowWidth;
        contentCanvas.height = scaledRows.reduce((sum, item) => sum + item.h, 0) + (rowCanvases.length - 1) * gap;
        let currentY = 0;
        scaledRows.forEach(item => {
            contentCtx.drawImage(item.canvas, 0, currentY, item.w, item.h);
            currentY += item.h + gap;
        });
    }

    const finalContentWidth = contentCanvas.width * scaleRatio;
    const finalContentHeight = contentCanvas.height * scaleRatio;
    
    canvas.width = finalContentWidth + 2 * scaledGap;
    canvas.height = finalContentHeight + (hasMainTitle ? finalTitleHeight + scaledGap : 0) + 2 * scaledGap;
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const titleYOffset = scaledGap;
    if (hasMainTitle) {
        ctx.fillStyle = labels.backgroundColor || '#ffffff';
        ctx.fillRect(scaledGap, titleYOffset, finalContentWidth, finalTitleHeight);
        
        ctx.fillStyle = labels.fontColor || '#000000';
        ctx.font = mainTitleFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, mainTitle, scaledGap + finalContentWidth / 2, titleYOffset + finalTitleHeight / 2, finalContentWidth - finalPadding * 2, mainTitleLineHeight);
    }
    
    const contentYOffset = titleYOffset + (hasMainTitle ? finalTitleHeight + scaledGap : 0);
    ctx.drawImage(contentCanvas, scaledGap, contentYOffset, finalContentWidth, finalContentHeight);
    
    return canvas.toDataURL('image/png');
};

/**
 * Resizes an image from a data URL to a smaller thumbnail.
 * @param imageDataUrl The data URL of the source image.
 * @param maxWidth The maximum width of the thumbnail.
 * @param maxHeight The maximum height of the thumbnail.
 * @returns A promise that resolves to the data URL of the thumbnail (as JPEG for better compression).
 */
export const createThumbnailDataUrl = (
    imageDataUrl: string, 
    maxWidth: number = 128, 
    maxHeight: number = 128
): Promise<string> => {
    return new Promise((resolve) => {
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
            return resolve(imageDataUrl); // Return original if not a valid data URL
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                // Cannot create context, return original URL
                return resolve(imageDataUrl);
            }

            let { width, height } = img;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG for smaller size
        };
        img.onerror = () => resolve(imageDataUrl); // Fallback to original URL on error
        img.src = imageDataUrl;
    });
};