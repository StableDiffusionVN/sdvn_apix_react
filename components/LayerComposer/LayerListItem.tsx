/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer } from './LayerComposer.types';
import { DragHandleIcon, LockIcon, UnlockIcon, VisibleIcon, HiddenIcon } from '../icons';

interface LayerListItemProps {
    layer: Layer;
    onUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    onLayerDelete: (id: string) => void;
    onSelect: (id: string) => void;
    isSelected: boolean;
    beginInteraction: () => void;
}

export const LayerListItem: React.FC<LayerListItemProps> = ({
    layer, onUpdate, onLayerDelete, onSelect, isSelected, beginInteraction
}) => {
    const dragControls = useDragControls();

    const getLayerName = () => {
        switch(layer.type) {
            case 'image': return 'Image Layer';
            case 'text': return layer.text || 'Text Layer';
            case 'shape': return `${layer.shapeType === 'rectangle' ? 'Rectangle' : 'Ellipse'} Shape`;
            default: return 'Layer';
        }
    }

    return (
        <Reorder.Item
            value={layer}
            dragListener={layer.isLocked ? false : true}
            dragControls={dragControls}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
            className={cn( "bg-neutral-800 rounded-lg border", isSelected ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-neutral-700 hover:border-neutral-600' )}
        >
            <div className="p-2 cursor-pointer" onClick={() => onSelect(layer.id)} >
                <div className="flex items-center gap-3">
                    <div className={cn("text-neutral-500", !layer.isLocked && "cursor-grab hover:text-white")} onPointerDown={(e) => { if (!layer.isLocked) { e.stopPropagation(); dragControls.start(e); } }} >
                        <DragHandleIcon className="h-5 w-5" />
                    </div>
                    <div className="w-10 h-10 flex-shrink-0">
                        {layer.type === 'image' && layer.url ? ( <img src={layer.url} className="w-full h-full object-cover rounded-md" alt="Layer thumbnail"/>
                        ) : layer.type === 'text' ? ( <div className="w-full h-full flex items-center justify-center bg-neutral-700 rounded-md p-1 overflow-hidden" style={{ fontFamily: 'Asimovian', color: layer.color }} > <span className="text-2xl font-bold">T</span> </div>
                        ) : layer.type === 'shape' ? (
                            <div 
                                className="w-full h-full rounded-md"
                                style={{
                                    backgroundColor: layer.fillColor || '#FFFFFF',
                                    borderRadius: layer.shapeType === 'ellipse' ? '50%' : '3px'
                                }}
                            />
                        ) : null}
                    </div>
                    <div className="flex-grow min-w-0"> <p className="text-sm font-bold text-white truncate">{getLayerName()}</p> <p className="text-xs text-neutral-400 capitalize"> {(layer.blendMode === 'source-over' ? 'Normal' : layer.blendMode)} </p> </div>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); beginInteraction(); onUpdate(layer.id, { isLocked: !layer.isLocked }, true)}} className={cn("hover:text-white p-1 rounded-full", layer.isLocked ? 'text-yellow-400' : 'text-neutral-500')} title={layer.isLocked ? 'Mở khoá Layer' : 'Khoá Layer'}>
                           {layer.isLocked ? ( <LockIcon className="h-5 w-5" /> ) : ( <UnlockIcon className="h-5 w-5" /> )}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); beginInteraction(); onUpdate(layer.id, { isVisible: !layer.isVisible }, true)}} className={cn("transition-colors p-1 rounded-full", layer.isVisible ? 'text-white hover:text-neutral-300' : 'text-neutral-500 hover:text-white')} title={layer.isVisible ? 'Ẩn Layer' : 'Hiện Layer'}>
                            {layer.isVisible ? ( <VisibleIcon className="h-5 w-5" /> ) : ( <HiddenIcon className="h-5 w-5" /> )}
                        </button>
                    </div>
                </div>
            </div>
        </Reorder.Item>
    );
};