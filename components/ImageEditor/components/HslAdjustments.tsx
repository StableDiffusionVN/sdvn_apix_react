/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RangeSlider } from './RangeSlider';
import { type ColorChannel, type ColorAdjustments, type HSLAdjustment } from '../ImageEditor.types';
import { COLOR_CHANNELS } from '../ImageEditor.constants';
import { cn } from '../../../lib/utils';

interface HslAdjustmentsProps {
    activeColorTab: ColorChannel;
    setActiveColorTab: (tab: ColorChannel) => void;
    colorAdjustments: ColorAdjustments;
    setColorAdjustments: React.Dispatch<React.SetStateAction<ColorAdjustments>>;
    commitState: () => void;
    isSelectionActive: boolean;
    handleApplyAdjustmentsToSelection: () => void;
}

export const HslAdjustments: React.FC<HslAdjustmentsProps> = (props) => {
    const { activeColorTab, setActiveColorTab, colorAdjustments, setColorAdjustments, commitState, isSelectionActive, handleApplyAdjustmentsToSelection } = props;

    const handleColorAdjustmentChange = (channel: ColorChannel, type: keyof HSLAdjustment, value: number) => {
        setColorAdjustments(p => ({ ...p, [channel]: { ...p[channel], [type]: value }}));
    };

    const currentChannelAdjustments = colorAdjustments[activeColorTab];

    return (
        <div className="p-3 space-y-3">
            <div className="flex justify-center gap-4 py-2">
                {COLOR_CHANNELS.map(c => (
                    <button 
                        key={c.id} 
                        onClick={() => setActiveColorTab(c.id)} 
                        className={cn("w-6 h-6 rounded-full transition-transform", activeColorTab === c.id ? 'ring-2 ring-yellow-400 scale-110' : 'hover:scale-110')} 
                        style={{ backgroundColor: c.color }} 
                        aria-label={`Select ${c.name}`}
                    />
                ))}
            </div>
            <AnimatePresence mode="wait">
                <motion.div 
                    key={activeColorTab} 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 10 }} 
                    transition={{ duration: 0.15 }} 
                    className="space-y-3"
                >
                    <RangeSlider id={`${activeColorTab}-h`} label="Hue" value={currentChannelAdjustments.h} min={-180} max={180} step={1} onChange={v => handleColorAdjustmentChange(activeColorTab, 'h', v)} onReset={() => {handleColorAdjustmentChange(activeColorTab, 'h', 0); commitState();}} onCommit={commitState} />
                    <RangeSlider id={`${activeColorTab}-s`} label="Saturation" value={currentChannelAdjustments.s} min={-100} max={100} step={1} onChange={v => handleColorAdjustmentChange(activeColorTab, 's', v)} onReset={() => {handleColorAdjustmentChange(activeColorTab, 's', 0); commitState();}} onCommit={commitState} />
                    <RangeSlider id={`${activeColorTab}-l`} label="Luminance" value={currentChannelAdjustments.l} min={-100} max={100} step={1} onChange={v => handleColorAdjustmentChange(activeColorTab, 'l', v)} onReset={() => {handleColorAdjustmentChange(activeColorTab, 'l', 0); commitState();}} onCommit={commitState} />
                </motion.div>
            </AnimatePresence>

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