/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer } from './LayerComposer.types';
import { EditorIcon, BakeIcon, DownloadIcon, DuplicateIcon, DeleteIcon } from '../icons';

export type LayerAction = 'duplicate' | 'delete' | 'export' | 'edit' | 'bake';

interface FloatingLayerToolbarProps {
    layer: Layer;
    onAction: (action: LayerAction) => void;
    scaleMV: MotionValue<number>;
}

const ToolButton: React.FC<{
    label: string;
    isActive?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, disabled = false, onClick, children }) => (
    <button
        onClick={onClick}
        className={cn( "p-2 rounded-md transition-colors", 'bg-neutral-800 hover:bg-neutral-700 text-white', disabled && 'opacity-50 cursor-not-allowed hover:bg-neutral-800' )}
        aria-label={label}
        title={label}
        disabled={disabled}
    >
        {children}
    </button>
);

export const FloatingLayerToolbar: React.FC<FloatingLayerToolbarProps> = ({ layer, onAction, scaleMV }) => {
    
    const inverseScale = useTransform(scaleMV, (s: number) => 1 / s);
    const yOffset = useTransform(scaleMV, (s: number) => -45 / s);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute', top: layer.y, left: layer.x + layer.width / 2, x: '-50%', y: yOffset, scale: inverseScale, transformOrigin: 'center top', zIndex: 1001 }}
            className="flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg"
            onPointerDown={e => e.stopPropagation()}
        >
            {layer.type === 'image' && (
                 <>
                    <ToolButton label="Chỉnh sửa Layer" onClick={() => onAction('edit')}>
                        <EditorIcon className="h-5 w-5" />
                    </ToolButton>
                    <div className="w-px h-5 bg-white/20 mx-1 self-center" />
                </>
            )}
            <ToolButton label="Nung Layer (Bake Layer)" onClick={() => onAction('bake')}>
                <BakeIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>
            <ToolButton label="Xuất Layer (PNG)" onClick={() => onAction('export')}>
                <DownloadIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
            <ToolButton label="Nhân bản Layer" onClick={() => onAction('duplicate')}>
                <DuplicateIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>
            <ToolButton label="Xoá Layer" onClick={() => onAction('delete')}>
                 <DeleteIcon className="h-5 w-5" />
            </ToolButton>
        </motion.div>
    );
};