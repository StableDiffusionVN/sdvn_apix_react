/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Tool } from './ImageEditor.types';
import { CROP_ASPECT_RATIO_OPTIONS } from './ImageEditor.constants';
import { BasicAdjustments } from './components/BasicAdjustments';
import { HslAdjustments } from './components/HslAdjustments';
import { EffectsAdjustments } from './components/EffectsAdjustments';
import { MagicTools } from './components/MagicTools';
import { BrushEraserSettings } from './components/BrushEraserSettings';
import { RangeSlider } from './components/RangeSlider';
import { type ImageEditorState } from './useImageEditorState';

type ImageEditorControlsProps = ImageEditorState;

const SelectionControls: React.FC<ImageEditorControlsProps> = (props) => {
    const {
        featherAmount, setFeatherAmount, commitState,
        invertSelection, deselect, deleteImageContentInSelection, fillSelection,
    } = props;

    const buttonClasses = "btn btn-secondary btn-sm !text-xs !py-1 !px-3 flex-1";

    return (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border border-neutral-700 rounded-lg">
            <div className="p-3 space-y-3">
                <h4 className="base-font font-bold text-neutral-200">Selection</h4>
                <RangeSlider id="feather" label="Feather" value={featherAmount} min={0} max={50} step={1} onChange={setFeatherAmount} onReset={() => setFeatherAmount(0)} onCommit={() => {}} />
                <div className="flex gap-2 justify-between pt-2 border-t border-neutral-700/50">
                    <button onClick={invertSelection} className={buttonClasses} aria-label="Invert Selection (Cmd/Ctrl+Shift+I)">Invert</button>
                    <button onClick={deselect} className={buttonClasses} aria-label="Deselect (Cmd/Ctrl+D)">Deselect</button>
                    <button onClick={deleteImageContentInSelection} className={buttonClasses} aria-label="Delete content in selection (Delete/Backspace)">Delete</button>
                    <button onClick={fillSelection} className={buttonClasses} aria-label="Fill selection (Cmd/Ctrl+Delete)">Fill</button>
                </div>
            </div>
        </motion.div>
    );
};

export const ImageEditorControls: React.FC<ImageEditorControlsProps> = (props) => {
    const { activeTool, openSection, setOpenSection, cropAspectRatio, setCropAspectRatio, handleCancelCrop, handleApplyCrop, cropSelection, isSelectionActive, handleCancelPerspectiveCrop, handleApplyPerspectiveCrop, perspectiveCropPoints } = props;
    const { activeTool: _unused, ...restProps } = props;

    const accordionHeaderClasses = "w-full flex justify-between items-center p-3 bg-neutral-700 hover:bg-neutral-600 transition-colors";

    return (
        <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
            {/* --- Magic Tools (Always Open at the top) --- */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
                <div className="w-full flex justify-between items-center p-3 bg-neutral-700">
                    <h4 className="base-font font-bold text-neutral-200">Magic</h4>
                </div>
                <MagicTools {...props} />
            </div>

            <AnimatePresence>
                {isSelectionActive && <SelectionControls {...props} />}
            </AnimatePresence>
            <AnimatePresence>
                {activeTool === 'crop' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border border-neutral-700 rounded-lg">
                        <div className="p-3 space-y-3">
                            <h4 className="base-font font-bold text-neutral-200">Crop Settings</h4>
                            <div>
                                <label htmlFor="crop-aspect-ratio" className="block text-left base-font font-bold text-sm text-neutral-200 mb-2">Aspect Ratio</label>
                                <select id="crop-aspect-ratio" value={cropAspectRatio} onChange={(e) => setCropAspectRatio(e.target.value)} className="form-input !py-1.5 !text-sm">
                                    {CROP_ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={handleCancelCrop} className="btn btn-secondary btn-sm !text-xs !py-1 !px-3">Cancel</button>
                                <button onClick={handleApplyCrop} className="btn btn-primary btn-sm !text-xs !py-1 !px-3" disabled={!cropSelection}>Apply</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeTool === 'perspective-crop' && perspectiveCropPoints.length === 4 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border border-neutral-700 rounded-lg">
                        <div className="p-3 space-y-3">
                            <h4 className="base-font font-bold text-neutral-200">Perspective Crop</h4>
                            <div className="flex gap-2 justify-end">
                                <button onClick={handleCancelPerspectiveCrop} className="btn btn-secondary btn-sm !text-xs !py-1 !px-3">Cancel</button>
                                <button onClick={handleApplyPerspectiveCrop} className="btn btn-primary btn-sm !text-xs !py-1 !px-3" disabled={perspectiveCropPoints.length !== 4}>Apply</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {(activeTool === 'brush' || activeTool === 'eraser') && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border border-neutral-700 rounded-lg">
                       <BrushEraserSettings {...restProps} activeTool={activeTool} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="border border-neutral-700 rounded-lg overflow-hidden">
                <button onClick={() => setOpenSection(s => s === 'adj' ? null : 'adj')} className={accordionHeaderClasses} aria-expanded={openSection === 'adj'}>
                    <h4 className="base-font font-bold text-neutral-200">Basic</h4>
                    <motion.div animate={{ rotate: openSection === 'adj' ? 180 : 0 }}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></motion.div>
                </button>
                <AnimatePresence>
                    {openSection === 'adj' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <BasicAdjustments {...props} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
                <button onClick={() => setOpenSection(s => s === 'hls' ? null : 'hls')} className={accordionHeaderClasses} aria-expanded={openSection === 'hls'}>
                    <h4 className="base-font font-bold text-neutral-200">Color (HSL)</h4>
                    <motion.div animate={{ rotate: openSection === 'hls' ? 180 : 0 }}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></motion.div>
                </button>
                <AnimatePresence>
                    {openSection === 'hls' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                           <HslAdjustments {...props} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="border border-neutral-700 rounded-lg overflow-hidden">
                <button onClick={() => setOpenSection(s => s === 'effects' ? null : 'effects')} className={accordionHeaderClasses} aria-expanded={openSection === 'effects'}>
                    <h4 className="base-font font-bold text-neutral-200">Effects</h4>
                    <motion.div animate={{ rotate: openSection === 'effects' ? 180 : 0 }}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></motion.div>
                </button>
                <AnimatePresence>
                    {openSection === 'effects' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <EffectsAdjustments {...props} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};