/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer, type CanvasTool } from './LayerComposer.types';

interface LayerItemProps {
    layer: Layer;
    onLayerPointerDown: (e: React.PointerEvent<HTMLDivElement>, layerId: string) => void;
    zIndex: number;
    activeCanvasTool: CanvasTool;
    isSpacePanning: boolean;
    isInteracting: boolean;
    captureLayer: (layer: Layer) => Promise<string>;
}

export const LayerItem: React.FC<LayerItemProps> = React.memo(({
    layer, zIndex,
    activeCanvasTool, isSpacePanning,
    onLayerPointerDown,
    isInteracting,
}) => {
    
    const isHandToolActive = activeCanvasTool === 'hand' || isSpacePanning;

    if (!layer.isVisible) {
        return null;
    }

    return (
        <motion.div
            onPointerDown={(e) => onLayerPointerDown(e, layer.id)}
            className={cn(
                "absolute",
                layer.isLocked ? 'cursor-default' : (isHandToolActive ? 'cursor-grab' : 'cursor-move')
            )}
            style={{
                x: layer.x,
                y: layer.y,
                width: layer.width,
                height: layer.height,
                rotate: layer.rotation,
                mixBlendMode: (layer.blendMode === 'source-over' ? 'normal' : layer.blendMode) as any,
                opacity: layer.opacity / 100,
                zIndex: zIndex,
            }}
            transition={isInteracting ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 50 }}
        >
             {layer.type === 'image' && layer.url ? (
                <img
                    src={layer.url}
                    className="w-full h-full pointer-events-none"
                    alt=""
                    loading="lazy"
                />
            ) : layer.type === 'text' ? (
                <div 
                    className="w-full h-full pointer-events-none p-1 box-border"
                    style={{
                        fontFamily: layer.fontFamily,
                        fontSize: `${layer.fontSize}px`,
                        fontWeight: layer.fontWeight,
                        fontStyle: layer.fontStyle,
                        color: layer.color,
                        textAlign: layer.textAlign,
                        lineHeight: layer.lineHeight,
                        textTransform: layer.textTransform,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {layer.text}
                </div>
            ) : layer.type === 'shape' ? (
                <div
                    className="w-full h-full pointer-events-none"
                    style={{
                        backgroundColor: layer.fillColor || '#FFFFFF',
                        borderRadius: layer.shapeType === 'ellipse' ? '50%' : `${layer.borderRadius || 0}px`,
                    }}
                />
            ) : null}
        </motion.div>
    );
});