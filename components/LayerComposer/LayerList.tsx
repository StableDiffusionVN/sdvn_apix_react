/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Reorder } from 'framer-motion';
import { useAppControls } from '../uiUtils';
import { type Layer } from './LayerComposer.types';
import { LayerListItem } from './LayerListItem';

interface LayerListProps {
    layers: Layer[];
    selectedLayerId: string | null;
    onLayersReorder: (reorderedLayers: Layer[]) => void;
    onLayerUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    onLayerDelete: (id: string) => void;
    onLayerSelect: (id: string) => void;
    beginInteraction: () => void;
}

export const LayerList: React.FC<LayerListProps> = ({
    layers, selectedLayerId, onLayersReorder, onLayerUpdate, onLayerDelete, onLayerSelect, beginInteraction
}) => {
    const { t } = useAppControls();

    if (layers.length === 0) {
        return ( <p className="text-sm text-neutral-500 text-center py-4"> {t('layerComposer_empty')} </p> );
    }
    
    return (
        <Reorder.Group axis="y" values={layers} onReorder={onLayersReorder} className="space-y-2">
            {layers.map(layer => (
                <LayerListItem
                    key={layer.id}
                    layer={layer}
                    onUpdate={onLayerUpdate}
                    onLayerDelete={onLayerDelete}
                    onSelect={onLayerSelect}
                    isSelected={selectedLayerId === layer.id}
                    beginInteraction={beginInteraction}
                />
            ))}
        </Reorder.Group>
    );
};