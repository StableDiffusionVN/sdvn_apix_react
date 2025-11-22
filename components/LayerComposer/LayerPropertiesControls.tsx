/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { useAppControls } from '../uiUtils';
import { type Layer, type BlendMode } from './LayerComposer.types';

const BLEND_MODES: BlendMode[] = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];

interface LayerPropertiesControlsProps {
    selectedLayers: Layer[];
    onUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    beginInteraction: () => void;
    onResize: (dimension: 'width' | 'height', newValue: number) => void;
}

export const LayerPropertiesControls: React.FC<LayerPropertiesControlsProps> = ({ selectedLayers, onUpdate, beginInteraction, onResize }) => {
    const { t } = useAppControls();
    const layer = selectedLayers[0]; // The first selected layer is used for single-value properties like ID

    const [widthInput, setWidthInput] = useState('');
    const [heightInput, setHeightInput] = useState('');

    useEffect(() => {
        if (selectedLayers.length === 1) {
            setWidthInput(Math.round(selectedLayers[0].width).toString());
            setHeightInput(Math.round(selectedLayers[0].height).toString());
        } else if (selectedLayers.length > 1) {
            // For multiple layers, show the value if they are all the same, otherwise show blank.
            const firstWidth = Math.round(selectedLayers[0].width);
            const allSameWidth = selectedLayers.every(l => Math.round(l.width) === firstWidth);
            setWidthInput(allSameWidth ? firstWidth.toString() : '');

            const firstHeight = Math.round(selectedLayers[0].height);
            const allSameHeight = selectedLayers.every(l => Math.round(l.height) === firstHeight);
            setHeightInput(allSameHeight ? firstHeight.toString() : '');
        } else {
            // No selection
            setWidthInput('');
            setHeightInput('');
        }
    }, [selectedLayers]); // Rerun when selection changes

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWidthInput(e.target.value);
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHeightInput(e.target.value);
    };

    const handleCommitWidth = () => {
        const newWidth = parseInt(widthInput, 10);
        if (!isNaN(newWidth) && newWidth > 0) {
            onResize('width', newWidth);
        } else {
            // Revert to original if input is invalid
            // The useEffect will handle this automatically when the parent state update (or lack thereof) propagates back.
            if (selectedLayers.length === 1) {
                setWidthInput(Math.round(selectedLayers[0].width).toString());
            } else if (selectedLayers.length > 1) {
                const firstWidth = Math.round(selectedLayers[0].width);
                const allSameWidth = selectedLayers.every(l => Math.round(l.width) === firstWidth);
                setWidthInput(allSameWidth ? firstWidth.toString() : '');
            }
        }
    };

    const handleCommitHeight = () => {
        const newHeight = parseInt(heightInput, 10);
        if (!isNaN(newHeight) && newHeight > 0) {
            onResize('height', newHeight);
        } else {
            // Revert
            if (selectedLayers.length === 1) {
                setHeightInput(Math.round(selectedLayers[0].height).toString());
            } else if (selectedLayers.length > 1) {
                const firstHeight = Math.round(selectedLayers[0].height);
                const allSameHeight = selectedLayers.every(l => Math.round(l.height) === firstHeight);
                setHeightInput(allSameHeight ? firstHeight.toString() : '');
            }
        }
    };

    const handleMultiUpdate = (props: Partial<Layer>, isFinal: boolean) => {
        if (isFinal) beginInteraction();
        selectedLayers.forEach(l => {
            onUpdate(l.id, props, isFinal);
        });
    };
    
    const hasMultipleOpacities = new Set(selectedLayers.map(l => l.opacity)).size > 1;
    const hasMultipleBlendModes = new Set(selectedLayers.map(l => l.blendMode)).size > 1;
    const isSingleShape = selectedLayers.length === 1 && selectedLayers[0].type === 'shape';
    
    return (
        <div className="p-3 space-y-4">
             <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <label htmlFor={`layer-width-${layer.id}`}>{t('layerComposer_width')}</label>
                    <input
                        id={`layer-width-${layer.id}`}
                        type="number"
                        min="1"
                        placeholder={widthInput === '' ? 'Multiple' : ''}
                        value={widthInput}
                        onChange={handleWidthChange}
                        onBlur={handleCommitWidth}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="form-input !p-1.5 !text-sm"
                    />
                </div>
                <div>
                    <label htmlFor={`layer-height-${layer.id}`}>{t('layerComposer_height')}</label>
                    <input
                        id={`layer-height-${layer.id}`}
                        type="number"
                        min="1"
                        placeholder={heightInput === '' ? 'Multiple' : ''}
                        value={heightInput}
                        onChange={handleHeightChange}
                        onBlur={handleCommitHeight}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="form-input !p-1.5 !text-sm"
                    />
                </div>
            </div>

            <div>
                <label htmlFor={`opacity-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_opacity')}</label>
                <input
                    id={`opacity-${layer.id}`}
                    type="range"
                    min="0"
                    max="100"
                    value={hasMultipleOpacities ? 100 : layer.opacity}
                    onMouseDown={e => { e.stopPropagation(); beginInteraction(); }}
                    onInput={(e) => handleMultiUpdate({ opacity: Number((e.target as HTMLInputElement).value) }, false)}
                    onChange={(e) => handleMultiUpdate({ opacity: Number((e.target as HTMLInputElement).value) }, true)}
                    onClick={e => e.stopPropagation()}
                    className="slider-track"
                />
            </div>
            <div>
                 <label htmlFor={`blend-mode-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_blendMode')}</label>
                 <select
                    id={`blend-mode-${layer.id}`}
                    onClick={(e) => e.stopPropagation()}
                    value={hasMultipleBlendModes ? 'multiple' : layer.blendMode}
                    onMouseDown={(e) => { e.stopPropagation(); beginInteraction(); }}
                    onChange={(e) => handleMultiUpdate({ blendMode: e.target.value as BlendMode }, true)}
                    className="form-input !p-2 !text-sm w-full"
                >
                    {hasMultipleBlendModes && <option value="multiple" disabled>-- Multiple Values --</option>}
                    {BLEND_MODES.map(mode => <option key={mode} value={mode}>{(mode === 'source-over' ? 'Normal' : mode.charAt(0).toUpperCase() + mode.slice(1))}</option>)}
                </select>
            </div>

            {isSingleShape && (
                <div className="pt-4 border-t border-neutral-700/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor={`fill-color-${layer.id}`} className="text-sm font-medium text-neutral-300">Fill Color</label>
                        <div className="relative h-6 w-6 rounded-full border-2 border-white/20 shadow-inner">
                            <input
                                id={`fill-color-${layer.id}`}
                                type="color"
                                value={layer.fillColor || '#FFFFFF'}
                                onMouseDown={beginInteraction}
                                onChange={(e) => onUpdate(layer.id, { fillColor: e.target.value }, true)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full h-full rounded-full pointer-events-none" style={{ backgroundColor: layer.fillColor }}></div>
                        </div>
                    </div>
                    {layer.shapeType === 'rectangle' && (
                        <div>
                            <label htmlFor={`border-radius-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">Border Radius</label>
                            <input
                                id={`border-radius-${layer.id}`}
                                type="range"
                                min="0"
                                max={Math.min(layer.width, layer.height) / 2}
                                value={layer.borderRadius || 0}
                                onMouseDown={beginInteraction}
                                onInput={(e) => onUpdate(layer.id, { borderRadius: Number((e.target as HTMLInputElement).value) }, false)}
                                onChange={(e) => onUpdate(layer.id, { borderRadius: Number((e.target as HTMLInputElement).value) }, true)}
                                className="slider-track"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};