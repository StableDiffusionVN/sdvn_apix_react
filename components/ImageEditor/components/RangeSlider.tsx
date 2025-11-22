/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef } from 'react';

// --- Reusable Range Slider Component ---
interface RangeSliderProps {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    onReset: () => void;
    onCommit: () => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({ id, label, value, min, max, step, onChange, onReset, onCommit }) => {
    const mainContainerRef = useRef<HTMLDivElement>(null);
    const handleCommit = () => {
        onCommit();
        // Return focus to a non-input element so shortcuts work again
        (mainContainerRef.current?.closest('.image-editor-modal-content') as HTMLElement)?.focus();
    };

    return (
    <div className="w-full" ref={mainContainerRef}>
        <div className="flex justify-between items-center mb-1">
            <label htmlFor={id} className="base-font font-bold text-neutral-200 text-sm">{label}</label>
            <div className="flex items-center gap-2">
                <span className="text-xs font-mono w-8 text-right text-neutral-300">{value.toFixed(0)}</span>
                <button
                    onClick={onReset}
                    className="text-xs text-neutral-400 hover:text-yellow-400 transition-colors"
                    aria-label={`Reset ${label}`}
                >
                    Reset
                </button>
            </div>
        </div>
        <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
            className="slider-track"
        />
    </div>
    );
};
