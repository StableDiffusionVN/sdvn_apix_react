/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '../../lib/utils';
import { type Tool } from './ImageEditor.types';
import { 
    CropIcon, 
    PerspectiveCropIcon, 
    RotateIcon, 
    FlipHorizontalIcon, 
    FlipVerticalIcon, 
    SelectionIcon, 
    MarqueeIcon, 
    EllipseIcon, 
    PenIcon, 
    BrushIcon, 
    EraserIcon, 
    ColorPickerIcon 
} from '../icons';

interface ImageEditorToolbarProps {
    activeTool: Tool | null;
    handleToolSelect: (tool: Tool) => void;
    handleRotateCanvas: () => void;
    commitState: () => void;
    setFlipHorizontal: (value: boolean | ((prev: boolean) => boolean)) => void;
    setFlipVertical: (value: boolean | ((prev: boolean) => boolean)) => void;
    brushColor: string;
    setBrushColor: (color: string) => void;
    showTooltip: (id: string, e: React.MouseEvent) => void;
    hideTooltip: () => void;
}

export const ImageEditorToolbar: React.FC<ImageEditorToolbarProps> = (props) => {
    const {
        activeTool, handleToolSelect, handleRotateCanvas, commitState,
        setFlipHorizontal, setFlipVertical, brushColor, setBrushColor,
        showTooltip, hideTooltip
    } = props;

    const toolButtonClasses = "p-2 rounded-lg transition-colors aspect-square flex items-center justify-center";
    const activeToolButtonClasses = "bg-yellow-400 text-black";
    const inactiveToolButtonClasses = "bg-neutral-800 hover:bg-neutral-700 text-white";

    return (
        <div className="flex flex-row md:flex-col gap-2 p-2 bg-neutral-900/50 rounded-lg md:h-full justify-start order-first md:order-none">
            <div className='flex flex-col gap-2'>
                <button onMouseEnter={(e) => showTooltip('crop', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('crop')} className={cn(toolButtonClasses, activeTool === 'crop' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Crop Tool"><CropIcon className="h-5 w-5" strokeWidth={1.5} /></button>
                <button onMouseEnter={(e) => showTooltip('perspective-crop', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('perspective-crop')} className={cn(toolButtonClasses, activeTool === 'perspective-crop' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Perspective Crop Tool (Alt+C)"><PerspectiveCropIcon className="h-5 w-5" strokeWidth={1.5} /></button>
                <button onMouseEnter={(e) => showTooltip('rotate', e)} onMouseLeave={hideTooltip} onClick={handleRotateCanvas} className={cn(toolButtonClasses, inactiveToolButtonClasses)} aria-label="Xoay ảnh (R)"><RotateIcon className="h-5 w-5" strokeWidth={1.5} /></button>
                <button onMouseEnter={(e) => showTooltip('flipH', e)} onMouseLeave={hideTooltip} onClick={() => {setFlipHorizontal(f => !f); commitState();}} className={cn(toolButtonClasses, inactiveToolButtonClasses)} aria-label="Flip Horizontal"><FlipHorizontalIcon className="h-5 w-5" strokeWidth={1.5} /></button>
                <button onMouseEnter={(e) => showTooltip('flipV', e)} onMouseLeave={hideTooltip} onClick={() => {setFlipVertical(f => !f); commitState();}} className={cn(toolButtonClasses, inactiveToolButtonClasses)} aria-label="Flip Vertical"><FlipVerticalIcon className="h-5 w-5" strokeWidth={1.5} /></button>
            </div>
            <div className="w-full h-[1px] bg-neutral-700 my-1 hidden md:block"></div><div className="h-full w-[1px] bg-neutral-700 mx-1 block md:hidden"></div>
            <div className='flex flex-col gap-2'>
                <button onMouseEnter={(e) => showTooltip('selection', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('selection')} className={cn(toolButtonClasses, activeTool === 'selection' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Selection Tool">
                    <SelectionIcon width="20" height="20" />
                </button>
                <button onMouseEnter={(e) => showTooltip('marquee', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('marquee')} className={cn(toolButtonClasses, activeTool === 'marquee' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Rectangular Marquee Tool"><MarqueeIcon className="h-5 w-5" strokeWidth={1.5} /></button>
                <button onMouseEnter={(e) => showTooltip('ellipse', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('ellipse')} className={cn(toolButtonClasses, activeTool === 'ellipse' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Elliptical Marquee Tool">
                    <EllipseIcon className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button onMouseEnter={(e) => showTooltip('pen', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('pen')} className={cn(toolButtonClasses, activeTool === 'pen' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Pen Tool">
                    <PenIcon width="20" height="20" />
                </button>
            </div>
            <div className="w-full h-[1px] bg-neutral-700 my-1 hidden md:block"></div><div className="h-full w-[1px] bg-neutral-700 mx-1 block md:hidden"></div>
            <div className='flex flex-col gap-2'>
                <button onMouseEnter={(e) => showTooltip('brush', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('brush')} className={cn(toolButtonClasses, activeTool === 'brush' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Brush Tool">
                    <BrushIcon width="20" height="20" />
                </button>
                <button onMouseEnter={(e) => showTooltip('eraser', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('eraser')} className={cn(toolButtonClasses, activeTool === 'eraser' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Eraser Tool"><EraserIcon className="h-5 w-5" /></button>
                <button onMouseEnter={(e) => showTooltip('colorpicker', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('colorpicker')} className={cn(toolButtonClasses, activeTool === 'colorpicker' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Color Picker Tool">
                    <ColorPickerIcon width="20" height="20" />
                </button>
            </div>
            <div className="mt-auto flex flex-col items-center gap-2">
                <div className="relative" onMouseEnter={(e) => showTooltip('colorSwatch', e)} onMouseLeave={hideTooltip}>
                    <label htmlFor="editor-color-picker" className="cursor-pointer block p-1 rounded-lg hover:bg-neutral-700 transition-colors" title="Chọn màu">
                        <div className="w-8 h-8 rounded-full border-2 border-white/50 shadow-lg" style={{ backgroundColor: brushColor }} />
                        <input id="editor-color-picker" type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
                    </label>
                </div>
            </div>
        </div>
    );
};