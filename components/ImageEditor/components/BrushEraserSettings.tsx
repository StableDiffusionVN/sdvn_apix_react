/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { RangeSlider } from './RangeSlider';

interface BrushEraserSettingsProps {
    activeTool: 'brush' | 'eraser';
    brushSize: number; setBrushSize: (v: number) => void;
    brushHardness: number; setBrushHardness: (v: number) => void;
    brushOpacity: number; setBrushOpacity: (v: number) => void;
    handleClearDrawings: () => void;
    commitState: () => void;
}

export const BrushEraserSettings: React.FC<BrushEraserSettingsProps> = (props) => {
    const { 
        activeTool, brushSize, setBrushSize, brushHardness, setBrushHardness, 
        brushOpacity, setBrushOpacity, handleClearDrawings, commitState 
    } = props;

    return (
        <div className="p-3 space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="base-font font-bold text-neutral-200">{activeTool === 'brush' ? 'Brush' : 'Eraser'} Settings</h4>
                <button onClick={handleClearDrawings} className="text-xs text-neutral-400 hover:text-yellow-400">Clear Drawings</button>
            </div>
            <RangeSlider id="brush-size" label="Size" value={brushSize} min={1} max={200} step={1} onChange={setBrushSize} onReset={() => setBrushSize(20)} onCommit={commitState} />
            <RangeSlider id="brush-hardness" label="Hardness" value={brushHardness} min={0} max={100} step={1} onChange={setBrushHardness} onReset={() => { setBrushHardness(50); commitState(); }} onCommit={commitState} />
            <RangeSlider id="brush-opacity" label="Opacity" value={brushOpacity} min={1} max={100} step={1} onChange={setBrushOpacity} onReset={() => { setBrushOpacity(50); commitState(); }} onCommit={commitState} />
        </div>
    );
};