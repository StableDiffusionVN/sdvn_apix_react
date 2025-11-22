/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Types & Constants ---
export type Tool = 'brush' | 'eraser' | 'crop' | 'selection' | 'pen' | 'colorpicker' | 'marquee' | 'ellipse' | 'perspective-crop' | 'hand';
export type TransformToolId = 'rotate' | 'flipH' | 'flipV';
export type HistoryToolId = 'undo' | 'redo';
export type ColorToolId = 'colorSwatch';
export type ToolId = Tool | TransformToolId | HistoryToolId | ColorToolId;

export type ColorChannel = 'reds' | 'yellows' | 'greens' | 'aquas' | 'blues' | 'magentas';
export interface HSLAdjustment { h: number; s: number; l: number; }
export type ColorAdjustments = Record<ColorChannel, HSLAdjustment>;
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type CropResizeHandle = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'top' | 'right' | 'bottom' | 'left';
export type CropAction = 'drawing' | 'moving' | 'resizing';
export type Interaction = 'none' | 'drawingSelection' | 'drawingPen' | 'drawingMarquee' | 'drawingEllipse' | 'resizingPerspective' | 'placingPerspectivePoints';
export interface EditorStateSnapshot {
    imageUrl: string;
    luminance: number; contrast: number; temp: number; tint: number; saturation: number; vibrance: number; hue: number;
    grain: number; clarity: number; dehaze: number; rotation: number; flipHorizontal: boolean; flipVertical: boolean;
    blur: number;
    isInverted: boolean;
    brushHardness: number;
    brushOpacity: number;
    colorAdjustments: ColorAdjustments; drawingCanvasDataUrl: string | null;
}
export type SelectionStroke = { points: Point[]; op: 'add' | 'subtract' };
export type PenNode = { anchor: Point; inHandle: Point; outHandle: Point };