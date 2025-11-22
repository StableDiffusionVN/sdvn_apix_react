/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type Point, type Rect, type CropResizeHandle } from './ImageEditor.types';
import { HANDLE_SIZE } from './ImageEditor.constants';

/**
 * Creates a canvas with a feathered (blurred) selection mask.
 * @param selectionPath The Path2D of the selection.
 * @param width The width of the canvas.
 * @param height The height of the canvas.
 * @param featherAmount The blur radius for the feathering effect.
 * @returns An HTMLCanvasElement containing the feathered mask.
 */
export const createFeatheredMask = (
    selectionPath: Path2D,
    width: number,
    height: number,
    featherAmount: number
): HTMLCanvasElement => {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');

    if (!maskCtx) return maskCanvas;

    // If no feathering, just draw the sharp mask directly.
    if (featherAmount <= 0) {
        maskCtx.fillStyle = 'white';
        maskCtx.fill(selectionPath);
        return maskCanvas;
    }

    // --- NEW LOGIC for smooth edge feathering ---
    // The padding should be large enough to contain the full blur effect.
    // A blur radius corresponds to the standard deviation of the Gaussian function.
    // 3 * radius covers ~99.7% of the effect. Let's use 2x for safety and performance.
    const padding = Math.ceil(featherAmount * 2);

    // Create a temporary canvas that is larger than the original
    // to give the blur effect space to render without being clipped at the edges.
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = width + padding * 2;
    sharpCanvas.height = height + padding * 2;
    const sharpCtx = sharpCanvas.getContext('2d');
    if (!sharpCtx) return maskCanvas; // Fallback to an empty mask if context fails

    // Draw the selection shape onto the padded canvas, offset by the padding amount.
    sharpCtx.translate(padding, padding);
    sharpCtx.fillStyle = 'white';
    sharpCtx.fill(selectionPath);
    sharpCtx.translate(-padding, -padding); // Reset transform

    // Now, draw the padded, sharp-edged canvas onto the final mask canvas.
    // Apply the blur filter *here*. The blur will have space to expand into the padding
    // and then we crop it back to the original size by drawing with a negative offset.
    maskCtx.filter = `blur(${featherAmount}px)`;
    maskCtx.drawImage(sharpCanvas, -padding, -padding);
    maskCtx.filter = 'none'; // Always clean up the filter.
    
    return maskCanvas;
};


export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
}

export const isPointInRect = (point: Point, rect: Rect) => (
    point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height
);

export const getRatioValue = (ratioStr: string, image: HTMLImageElement | null): number | null => {
    if (ratioStr === 'Free') return null;
    if (ratioStr === 'Original' && image) return image.naturalWidth / image.naturalHeight;
    const parts = ratioStr.split(':');
    if (parts.length !== 2) return null;
    const [w, h] = parts.map(Number);
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return w / h;
};

export const getHandleAtPoint = (point: Point, selection: Rect): CropResizeHandle | null => {
    const { x, y, width, height } = selection;
    const right = x + width;
    const bottom = y + height;
    const checkRadius = HANDLE_SIZE / 2;

    const onTopEdge = Math.abs(point.y - y) < checkRadius;
    const onBottomEdge = Math.abs(point.y - bottom) < checkRadius;
    const onLeftEdge = Math.abs(point.x - x) < checkRadius;
    const onRightEdge = Math.abs(point.x - right) < checkRadius;
    const withinY = point.y > y - checkRadius && point.y < bottom + checkRadius;
    const withinX = point.x > x - checkRadius && point.x < right + checkRadius;

    if (onTopEdge && onLeftEdge) return 'topLeft';
    if (onTopEdge && onRightEdge) return 'topRight';
    if (onBottomEdge && onLeftEdge) return 'bottomLeft';
    if (onBottomEdge && onRightEdge) return 'bottomRight';
    if (onTopEdge && withinX) return 'top';
    if (onBottomEdge && withinX) return 'bottom';
    if (onLeftEdge && withinY) return 'left';
    if (onRightEdge && withinY) return 'right';

    return null;
}

export const getCursorForHandle = (handle: CropResizeHandle | null): string => {
    switch (handle) {
        case 'topLeft': case 'bottomRight': return 'nwse-resize';
        case 'topRight': case 'bottomLeft': return 'nesw-resize';
        case 'top': case 'bottom': return 'ns-resize';
        case 'left': case 'right': return 'ew-resize';
        default: return '';
    }
}

export const approximateCubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, t_steps: number = 20): Point[] => {
    const points: Point[] = [];
    for (let i = 0; i <= t_steps; i++) {
        const t = i / t_steps;
        const u = 1 - t; const tt = t * t; const uu = u * u;
        const uuu = uu * u; const ttt = tt * t;
        const p = {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
        };
        points.push(p);
    }
    return points;
};

export function hexToRgba(hex: string, opacity: number): string {
    if (!hex.startsWith('#')) return hex;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${opacity / 100})`;
}

// --- NEW: Perspective Transform Utilities ---

/**
 * Calculates the inverse of a 3x3 matrix.
 * @param m A 9-element array representing the row-major 3x3 matrix.
 * @returns A 9-element array of the inverted matrix, or null if not invertible.
 */
function getInverse(m: number[]): number[] | null {
    if (m.length !== 9) return null;
    const a = m[0], b = m[1], c = m[2];
    const d = m[3], e = m[4], f = m[5];
    const g = m[6], h = m[7], i = m[8];

    const det = a * (e * i - f * h) -
                b * (d * i - f * g) +
                c * (d * h - e * g);

    if (Math.abs(det) < 1e-10) {
        return null; // Matrix is not invertible or is singular
    }
    
    const invDet = 1 / det;

    const result = [
        (e * i - f * h) * invDet,
        (c * h - b * i) * invDet,
        (b * f - c * e) * invDet,
        (f * g - d * i) * invDet,
        (a * i - c * g) * invDet,
        (c * d - a * f) * invDet,
        (d * h - e * g) * invDet,
        (b * g - a * h) * invDet,
        (a * e - b * d) * invDet
    ];

    return result;
}

export function getPerspectiveTransform(src: Point[], dest: Point[]): number[] | null {
    const a = [], b = [];
    for (let i = 0; i < 4; i++) {
        a.push([src[i].x, src[i].y, 1, 0, 0, 0, -src[i].x * dest[i].x, -src[i].y * dest[i].x]);
        b.push(dest[i].x);
        a.push([0, 0, 0, src[i].x, src[i].y, 1, -src[i].x * dest[i].y, -src[i].y * dest[i].y]);
        b.push(dest[i].y);
    }

    const h = solveSystem(a, b);
    if (!h) return null;

    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function solveSystem(a: number[][], b: number[]): number[] | null {
    const n = 8;
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(a[j][i]) > Math.abs(a[maxRow][i])) {
                maxRow = j;
            }
        }
        [a[i], a[maxRow]] = [a[maxRow], a[i]];
        [b[i], b[maxRow]] = [b[maxRow], b[i]];
        if (Math.abs(a[i][i]) <= 1e-10) return null;
        for (let j = i + 1; j < n; j++) {
            const factor = a[j][i] / a[i][i];
            b[j] -= factor * b[i];
            for (let k = i; k < n; k++) {
                a[j][k] -= factor * a[i][k];
            }
        }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += a[i][j] * x[j];
        }
        x[i] = (b[i] - sum) / a[i][i];
    }
    return x;
}

export function warpPerspective(srcImage: HTMLImageElement, destCanvas: HTMLCanvasElement, transform: number[]): void {
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcImage.naturalWidth;
    srcCanvas.height = srcImage.naturalHeight;
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) return;
    srcCtx.drawImage(srcImage, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, srcImage.naturalWidth, srcImage.naturalHeight).data;

    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) return;
    const destImageData = destCtx.createImageData(destCanvas.width, destCanvas.height);
    const destData = destImageData.data;

    const invTransform = getInverse(transform);
    if (!invTransform) return;
    const inv = invTransform; // for brevity

    const srcWidth = srcImage.naturalWidth;
    const srcHeight = srcImage.naturalHeight;
    const destWidth = destCanvas.width;

    for (let y = 0; y < destCanvas.height; y++) {
        for (let x = 0; x < destCanvas.width; x++) {
            const denominator = inv[6] * x + inv[7] * y + inv[8];
            const srcX = (inv[0] * x + inv[1] * y + inv[2]) / denominator;
            const srcY = (inv[3] * x + inv[4] * y + inv[5]) / denominator;

            // Use bilinear interpolation for better quality
            if (srcX >= 0 && srcX < srcWidth - 1 && srcY >= 0 && srcY < srcHeight - 1) {
                const sx = Math.floor(srcX);
                const sy = Math.floor(srcY);
                const fracX = srcX - sx;
                const fracY = srcY - sy;

                const idx00 = (sy * srcWidth + sx) * 4;
                const idx10 = idx00 + 4;
                const idx01 = ((sy + 1) * srcWidth + sx) * 4;
                const idx11 = idx01 + 4;

                const destIndex = (y * destWidth + x) * 4;

                for (let c = 0; c < 4; c++) { // R, G, B, A
                    const c00 = srcData[idx00 + c];
                    const c10 = srcData[idx10 + c];
                    const c01 = srcData[idx01 + c];
                    const c11 = srcData[idx11 + c];
                    
                    const top = c00 * (1 - fracX) + c10 * fracX;
                    const bottom = c01 * (1 - fracX) + c11 * fracX;
                    
                    destData[destIndex + c] = Math.round(top * (1 - fracY) + bottom * fracY);
                }
            }
        }
    }
    destCtx.putImageData(destImageData, 0, 0);
}
