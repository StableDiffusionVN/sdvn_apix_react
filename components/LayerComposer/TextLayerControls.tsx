/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { type Layer } from './LayerComposer.types';
import { useAppControls } from '../uiUtils';
import { cn } from '../../lib/utils';
import { BoldIcon, ItalicIcon, UppercaseIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from '../icons';

interface TextLayerControlsProps {
    layer: Layer;
    onUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    beginInteraction: () => void;
}

const FONT_FAMILIES = [ 'Be Vietnam Pro', 'Asimovian', 'Playwrite AU SA', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Comic Sans MS' ];
const FONT_WEIGHTS: { label: string, value: string }[] = [ { label: 'Thin', value: '100' }, { label: 'Extra Light', value: '200' }, { label: 'Light', value: '300' }, { label: 'Normal', value: '400' }, { label: 'Medium', value: '500' }, { label: 'Semi Bold', value: '600' }, { label: 'Bold', value: '700' }, { label: 'Extra Bold', value: '800' }, { label: 'Black', value: '900' }, ];

export const TextLayerControls: React.FC<TextLayerControlsProps> = ({ layer, onUpdate, beginInteraction }) => {
    const { t } = useAppControls();

    return (
        <div className="p-3 space-y-4">
            <div>
                <label htmlFor={`text-content-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_textControls_content')}</label>
                <textarea id={`text-content-${layer.id}`} value={layer.text || ''} onMouseDown={beginInteraction} onChange={(e) => onUpdate(layer.id, { text: e.target.value }, true)} className="form-input !p-2 !text-sm" rows={3} />
            </div>
            <div>
                <label htmlFor={`font-family-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_textControls_fontFamily')}</label>
                <select id={`font-family-${layer.id}`} value={layer.fontFamily} onMouseDown={beginInteraction} onChange={(e) => onUpdate(layer.id, { fontFamily: e.target.value }, true)} className="form-input !p-2 !text-sm" >
                    {FONT_FAMILIES.map(font => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor={`font-size-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_textControls_fontSize')}</label>
                    <input id={`font-size-${layer.id}`} type="number" min="1" value={layer.fontSize} onMouseDown={beginInteraction} onChange={(e) => onUpdate(layer.id, { fontSize: Number(e.target.value) }, true)} className="form-input !p-2 !text-sm" />
                </div>
                 <div>
                    <label htmlFor={`font-weight-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_textControls_fontWeight')}</label>
                    <select id={`font-weight-${layer.id}`} value={layer.fontWeight} onMouseDown={beginInteraction} onChange={(e) => onUpdate(layer.id, { fontWeight: e.target.value }, true)} className="form-input !p-2 !text-sm" >
                        {FONT_WEIGHTS.map(weight => <option key={weight.value} value={weight.value}>{weight.label}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-1 bg-neutral-700/50 p-1 rounded-md">
                    <button onClick={() => { beginInteraction(); onUpdate(layer.id, { fontWeight: layer.fontWeight === '700' ? '400' : '700' }, true); }} className={cn("p-1.5 rounded", layer.fontWeight === '700' ? 'bg-yellow-400 text-black' : 'hover:bg-neutral-600')} title={t('layerComposer_textControls_bold')}>
                        <BoldIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => { beginInteraction(); onUpdate(layer.id, { fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' }, true); }} className={cn("p-1.5 rounded", layer.fontStyle === 'italic' ? 'bg-yellow-400 text-black' : 'hover:bg-neutral-600')} title={t('layerComposer_textControls_italic')}>
                        <ItalicIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => { beginInteraction(); onUpdate(layer.id, { textTransform: layer.textTransform === 'uppercase' ? 'none' : 'uppercase' }, true); }} className={cn("p-1.5 rounded", layer.textTransform === 'uppercase' ? 'bg-yellow-400 text-black' : 'hover:bg-neutral-600')} title={t('layerComposer_textControls_uppercase')}>
                        <UppercaseIcon className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex items-center gap-1 bg-neutral-700/50 p-1 rounded-md">
                     <button onClick={() => { beginInteraction(); onUpdate(layer.id, { textAlign: 'left' }, true); }} className={cn("p-1.5 rounded", layer.textAlign === 'left' ? 'bg-yellow-400 text-black' : 'hover:bg-neutral-600')} title="Align Left"> <AlignLeftIcon className="h-4 w-4" /> </button>
                    <button onClick={() => { beginInteraction(); onUpdate(layer.id, { textAlign: 'center' }, true); }} className={cn("p-1.5 rounded", layer.textAlign === 'center' ? 'bg-yellow-400 text-black' : 'hover:bg-neutral-600')} title="Align Center"> <AlignCenterIcon className="h-4 w-4" /> </button>
                    <button onClick={() => { beginInteraction(); onUpdate(layer.id, { textAlign: 'right' }, true); }} className={cn("p-1.5 rounded", layer.textAlign === 'right' ? 'bg-yellow-400 text-black' : 'hover:bg-neutral-600')} title="Align Right"> <AlignRightIcon className="h-4 w-4" /> </button>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor={`color-${layer.id}`} className="text-sm font-medium text-neutral-300 sr-only">{t('layerComposer_textControls_color')}</label>
                    <div className="relative h-6 w-6 rounded-full border-2 border-white/20 shadow-inner">
                        <input id={`color-${layer.id}`} type="color" value={layer.color} onMouseDown={beginInteraction} onChange={(e) => onUpdate(layer.id, { color: e.target.value }, true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="w-full h-full rounded-full pointer-events-none" style={{ backgroundColor: layer.color }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};