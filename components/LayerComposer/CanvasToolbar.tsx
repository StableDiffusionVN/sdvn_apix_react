/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '../../lib/utils';
import { type CanvasTool } from './LayerComposer.types';
import { UndoIcon, RedoIcon, ZoomOutIcon, ZoomInIcon, HandIcon, RectangleIcon, EllipseIcon } from '../icons';

interface CanvasToolbarProps {
    zoomDisplay: number;
    activeTool: CanvasTool;
    isLayerSelected: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onToolSelect: (tool: CanvasTool) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ 
    zoomDisplay, activeTool, onZoomIn, onZoomOut, onFit, onToolSelect, onUndo, onRedo, canUndo, canRedo,
}) => {
    return (
        <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg"
            onPointerDown={e => e.stopPropagation()}
        >
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon className="h-5 w-5" strokeWidth={1.5} /></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon className="h-5 w-5" strokeWidth={1.5} /></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={onZoomOut} title="Zoom Out (-)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><ZoomOutIcon className="h-5 w-5" strokeWidth={2} /></button>
            <button onClick={onFit} className="px-3 py-2 text-sm font-semibold rounded-md hover:bg-neutral-700 transition-colors">{zoomDisplay}%</button>
            <button onClick={onZoomIn} title="Zoom In (+)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><ZoomInIcon className="h-5 w-5" strokeWidth={2} /></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={() => onToolSelect('select')} title="Select Tool (V)" className={cn("p-2 rounded-md transition-colors", activeTool === 'select' && 'bg-neutral-700')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
            <button onClick={() => onToolSelect('hand')} title="Hand Tool (H, hold Space)" className={cn("p-2 rounded-md transition-colors", activeTool === 'hand' && 'bg-neutral-700')}><HandIcon className="h-5 w-5" strokeWidth="1.5" /></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={() => onToolSelect('rectangle')} title="Rectangle Tool" className={cn("p-2 rounded-md transition-colors", activeTool === 'rectangle' && 'bg-neutral-700')}>
                <RectangleIcon className="h-5 w-5" strokeWidth="1.5" />
            </button>
            <button onClick={() => onToolSelect('ellipse')} title="Ellipse Tool" className={cn("p-2 rounded-md transition-colors", activeTool === 'ellipse' && 'bg-neutral-700')}>
                <EllipseIcon className="h-5 w-5" strokeWidth="1.5" />
            </button>
        </div>
    );
};