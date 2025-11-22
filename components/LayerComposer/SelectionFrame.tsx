/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { type Rect, type Handle } from './LayerComposer.types';

interface SelectionFrameProps {
    boundingBox: Rect;
    rotation: number;
    isMultiSelect: boolean;
    onHandlePointerDown: (e: React.PointerEvent<HTMLDivElement>, handle: Handle) => void;
    onRotatePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    scaleMV: MotionValue<number>;
    isInteracting: boolean;
}

export const SelectionFrame: React.FC<SelectionFrameProps> = ({ boundingBox, rotation, isMultiSelect, onHandlePointerDown, onRotatePointerDown, scaleMV, isInteracting }) => {
    const HANDLES: Handle[] = ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'];
    const ROTATION_CORNERS: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br'];

    const borderWidth = useTransform(scaleMV, (s: number) => 2 / s);
    const handleSize = useTransform(scaleMV, (s: number) => 12 / s);
    const handleOffset = useTransform(scaleMV, (s: number) => -6 / s);
    const handleBorderWidth = useTransform(scaleMV, (s: number) => 2 / s);
    const centeredOffset = useTransform(handleSize, (hs: number) => `calc(50% - ${hs / 2}px)`);
    const rotationHandleSize = useTransform(scaleMV, (s: number) => 12 / s);
    const rotationHandleOffset = useTransform(scaleMV, (s: number) => -15 / s);
    const rotationHandleBorderWidth = useTransform(scaleMV, (s: number) => 2 / s);
    
    const getHandleCursor = (handle: Handle) => {
        if (isMultiSelect) {
            if (handle === 'tl' || handle === 'br') return 'nwse-resize';
            if (handle === 'tr' || handle === 'bl') return 'nesw-resize';
            return 'default';
        }
        if (handle === 'tl' || handle === 'br') return 'nwse-resize';
        if (handle === 'tr' || handle === 'bl') return 'nesw-resize';
        if (handle === 't' || handle === 'b') return 'ns-resize';
        if (handle === 'l' || handle === 'r') return 'ew-resize';
        return 'default';
    }

    const getHandleMotionStyle = (handle: Handle) => {
        if (isMultiSelect && handle.length === 1) return { display: 'none' };
        const style: any = { position: 'absolute', width: handleSize, height: handleSize, borderStyle: 'solid', borderColor: '#FBBF24', borderWidth: handleBorderWidth, backgroundColor: '#171717', borderRadius: '2px', pointerEvents: 'auto', cursor: getHandleCursor(handle) };
        if (handle.includes('t')) style.top = handleOffset;
        if (handle.includes('b')) style.bottom = handleOffset;
        if (handle.includes('l')) style.left = handleOffset;
        if (handle.includes('r')) style.right = handleOffset;
        if (handle === 't' || handle === 'b') style.left = centeredOffset;
        if (handle === 'l' || handle === 'r') style.top = centeredOffset;
        return style;
    };

    const getRotationHandleStyle = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
        const style: any = { position: 'absolute', width: rotationHandleSize, height: rotationHandleSize, backgroundColor: '#FBBF24', borderStyle: 'solid', borderColor: '#171717', borderWidth: rotationHandleBorderWidth, borderRadius: '50%', pointerEvents: 'auto', cursor: 'alias' };
        if (corner === 'tl') { style.top = rotationHandleOffset; style.left = rotationHandleOffset; }
        if (corner === 'tr') { style.top = rotationHandleOffset; style.right = rotationHandleOffset; }
        if (corner === 'bl') { style.bottom = rotationHandleOffset; style.left = rotationHandleOffset; }
        if (corner === 'br') { style.bottom = rotationHandleOffset; style.right = rotationHandleOffset; }
        return style;
    };

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{ x: boundingBox.x, y: boundingBox.y, width: boundingBox.width, height: boundingBox.height, rotate: rotation, zIndex: 1000 }}
            transition={isInteracting ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 50 }}
        >
            <motion.div className="absolute inset-0 border-dashed border-yellow-400" style={{ borderWidth }} />
             {!isMultiSelect && ROTATION_CORNERS.map(corner => ( <motion.div key={`${corner}-rotate`} style={getRotationHandleStyle(corner)} onPointerDown={(e) => onRotatePointerDown(e)} /> ))}
            {HANDLES.map(handle => ( <motion.div key={handle} style={getHandleMotionStyle(handle)} onPointerDown={(e) => onHandlePointerDown(e, handle)} /> ))}
        </motion.div>
    );
};