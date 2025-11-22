/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { RangeSlider } from './RangeSlider';

interface EffectsAdjustmentsProps {
    grain: number; setGrain: (v: number) => void;
    clarity: number; setClarity: (v: number) => void;
    dehaze: number; setDehaze: (v: number) => void;
    blur: number; setBlur: (v: number) => void;
    commitState: () => void;
    isSelectionActive: boolean;
    handleApplyAdjustmentsToSelection: () => void;
}

export const EffectsAdjustments: React.FC<EffectsAdjustmentsProps> = (props) => {
    const { grain, setGrain, clarity, setClarity, dehaze, setDehaze, blur, setBlur, commitState, isSelectionActive, handleApplyAdjustmentsToSelection } = props;

    return (
        <div className="p-3 space-y-3">
            <RangeSlider id="grain" label="Grain" value={grain} min={0} max={100} step={1} onChange={setGrain} onReset={() => {setGrain(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="clarity" label="Clarity" value={clarity} min={-100} max={100} step={1} onChange={setClarity} onReset={() => {setClarity(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="dehaze" label="Dehaze" value={dehaze} min={-100} max={100} step={1} onChange={setDehaze} onReset={() => {setDehaze(0); commitState();}} onCommit={commitState} />
            <RangeSlider id="blur" label="Blur" value={blur} min={0} max={20} step={1} onChange={setBlur} onReset={() => {setBlur(0); commitState();}} onCommit={commitState} />

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