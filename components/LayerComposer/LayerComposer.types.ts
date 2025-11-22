/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Shared Types ---
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

// --- Canvas & Interaction Types ---
export interface CanvasSettings {
    width: number;
    height: number;
    background: string | null;
    grid: {
        visible: boolean;
        snap: boolean;
        size: number;
        color: string;
    };
    guides: {
        enabled: boolean;
        color: string;
    };
}

export type CanvasTool = 'select' | 'hand' | 'rectangle' | 'ellipse';
export type Handle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

export type Interaction = {
    type: 'move' | 'resize' | 'rotate' | 'duplicate-move' | 'copy-selection-move' | 'marquee' | 'drawingShape';
    handle?: Handle;
    initialLayers?: Layer[];
    initialPointer: Point;
    initialBoundingBox?: Rect | null;
    initialCenter?: Point;
    initialAngle?: number;
    hasActionStarted?: boolean;
    initialSelectedIds?: string[];
    tool?: CanvasTool;
    lockedAxis?: 'x' | 'y' | null;
    isShift?: boolean;
    isAlt?: boolean;
};

// --- Layer Types ---
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface Layer {
    id: string;
    type: 'image' | 'text' | 'shape';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    blendMode: BlendMode;
    isVisible: boolean;
    isLocked: boolean;
    // Image-specific
    url?: string;
    // Text-specific
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: 'normal' | 'italic';
    textTransform?: 'none' | 'uppercase';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    lineHeight?: number;
    // Shape-specific
    shapeType?: 'rectangle' | 'ellipse';
    fillColor?: string;
    borderRadius?: number;
}



export type Guide = {
    axis: 'x' | 'y';
    position: number;
    start: number;
    end: number;
};

export type MultiLayerAction = 
    | 'align-left' | 'align-center' | 'align-right'
    | 'align-top' | 'align-middle' | 'align-bottom'
    | 'distribute-horizontal' | 'distribute-vertical'
    | 'distribute-and-scale-horizontal' | 'distribute-and-scale-vertical'
    | 'merge' | 'delete' | 'duplicate' | 'export';

// --- AI & Preset Types ---
export type AIPreset = {
    id: string;
    name: { vi: string; en: string };
    description: { vi: string; en: string };
    requiresImageContext: boolean;
    refine: boolean;
    promptTemplate: { vi: string; en: string };
};

// --- Utility Function ---
export const getBoundingBoxForLayers = (layers: Layer[]): Rect | null => {
    if (!layers || layers.length === 0) {
        return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    layers.forEach(layer => {
        const { x, y, width, height, rotation } = layer;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const points = [
            { x: x, y: y }, // Top-left
            { x: x + width, y: y }, // Top-right
            { x: x + width, y: y + height }, // Bottom-right
            { x: x, y: y + height }, // Bottom-left
        ];

        points.forEach(point => {
            // Translate point to origin
            const translatedX = point.x - centerX;
            const translatedY = point.y - centerY;
            // Rotate point
            const rotatedX = translatedX * cos - translatedY * sin;
            const rotatedY = translatedX * sin + translatedY * cos;
            // Translate point back
            const finalX = rotatedX + centerX;
            const finalY = rotatedY + centerY;

            minX = Math.min(minX, finalX);
            minY = Math.min(minY, finalY);
            maxX = Math.max(maxX, finalX);
            maxY = Math.max(maxY, finalY);
        });
    });

    if (minX === Infinity) {
        return null;
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
};