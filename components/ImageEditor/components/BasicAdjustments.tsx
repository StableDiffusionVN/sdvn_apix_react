/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { RangeSlider } from './RangeSlider';

interface BasicAdjustmentsProps {
    luminance: number; setLuminance: (v: number) => void;
    contrast: number; setContrast: (v: number) => void;
    temp: number; setTemp: (v: number) => void;
    tint: number; setTint: (v: number) => void;
    vibrance: number; setVibrance: (v: number) => void;
    saturation: number; setSaturation: (v: number) => void;
    hue: number; setHue: (v: number) => void;
    commitState: () => void;
    isSelectionActive: boolean;
    handleApplyAdjustmentsToSelection: () => void;
}

export const BasicAdjustments: React.FC<BasicAdjustmentsProps> = (props) => {
    const {
        luminance, setLuminance, contrast, setContrast, temp, setTemp,
        tint, setTint, vibrance, setVibrance, saturation, setSaturation, hue, setHue,
        commitState, isSelectionActive, handleApplyAdjustmentsToSelection,
    } = props;

    return (
        <div className="p-3 space-y-3">
            <RangeSlider id="luminance" label="Exposure" value={luminance} min={-100} max={100} step={1} onChange={setLuminance} onReset={() => {setLuminance(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="contrast" label="Contrast" value={contrast} min={-100} max={100} step={1} onChange={setContrast} onReset={() => {setContrast(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="temp" label="Temperature" value={temp} min={-100} max={100} step={1} onChange={setTemp} onReset={() => {setTemp(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="tint" label="Tint" value={tint} min={-100} max={100} step={1} onChange={setTint} onReset={() => {setTint(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="vibrance" label="Vibrance" value={vibrance} min={-100} max={100} step={1} onChange={setVibrance} onReset={() => {setVibrance(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="saturation" label="Saturation" value={saturation} min={-100} max={100} step={1} onChange={setSaturation} onReset={() => {setSaturation(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="hue" label="Hue" value={hue} min={-180} max={180} step={1} onChange={setHue} onReset={() => {setHue(0); commitState();}} onCommit={commitState} />

            <div className="border-t border-neutral-700/50 mt-3 pt-3">
                <button
                    onClick={handleApplyAdjustmentsToSelection}
                    disabled={!isSelectionActive}
                    className="w-full btn btn-primary btn-sm !text-xs !py-1.5 disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:transform-none"
                    aria-label="Apply adjustments to selection and reset sliders"
                >
                    Apply to Selection
                </button>
                <p className="text-xs text-neutral-500 text-center mt-1 px-1">
                    {!isSelectionActive ? "Make a selection to enable." : "Bake adjustments and reset sliders."}
                </p>
            </div>
        </div>
    );
};