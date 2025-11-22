/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Rect, type MultiLayerAction } from './LayerComposer.types';
import { 
    AlignLeftIcon, 
    AlignCenterIcon, 
    AlignRightIcon, 
    AlignTopIcon, 
    AlignMiddleIcon, 
    AlignBottomIcon, 
    DistributeHorizontalIcon, 
    DistributeVerticalIcon,
    DistributeHorizontalScaleIcon,
    DistributeVerticalScaleIcon,
    MergeIcon, 
    DownloadIcon, 
    DuplicateIcon, 
    DeleteIcon 
} from '../icons';

interface FloatingMultiLayerToolbarProps {
    boundingBox: Rect;
    onAction: (action: MultiLayerAction) => void;
    scaleMV: MotionValue<number>;
    selectedLayerCount: number;
}

const ToolButton: React.FC<{
    label: string;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, disabled = false, onClick, children }) => (
    <button
        onClick={onClick}
        className={cn(
            "p-2 rounded-md transition-colors",
            'bg-neutral-800 hover:bg-neutral-700 text-white',
            disabled && 'opacity-50 cursor-not-allowed hover:bg-neutral-800'
        )}
        aria-label={label}
        title={label}
        disabled={disabled}
    >
        {children}
    </button>
);

export const FloatingMultiLayerToolbar: React.FC<FloatingMultiLayerToolbarProps> = ({ boundingBox, onAction, scaleMV, selectedLayerCount }) => {
    
    const inverseScale = useTransform(scaleMV, (s: number) => 1 / s);
    const yOffset = useTransform(scaleMV, (s: number) => -45 / s);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
                position: 'absolute',
                top: boundingBox.y,
                left: boundingBox.x + boundingBox.width / 2,
                x: '-50%',
                y: yOffset,
                scale: inverseScale,
                transformOrigin: 'center top',
                zIndex: 1001,
            }}
            className="flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg"
            onPointerDown={e => e.stopPropagation()}
        >
            <ToolButton label="Căn lề trái" onClick={() => onAction('align-left')}>
                <AlignLeftIcon className="h-5 w-5" />
            </ToolButton>
            <ToolButton label="Căn giữa ngang" onClick={() => onAction('align-center')}>
                <AlignCenterIcon className="h-5 w-5" />
            </ToolButton>
            <ToolButton label="Căn lề phải" onClick={() => onAction('align-right')}>
                <AlignRightIcon className="h-5 w-5" />
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
            <ToolButton label="Căn lề trên" onClick={() => onAction('align-top')}>
                <AlignTopIcon className="h-5 w-5" />
            </ToolButton>
            <ToolButton label="Căn giữa dọc" onClick={() => onAction('align-middle')}>
                <AlignMiddleIcon className="h-5 w-5" />
            </ToolButton>
            <ToolButton label="Căn lề dưới" onClick={() => onAction('align-bottom')}>
                <AlignBottomIcon className="h-5 w-5" />
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
             <ToolButton label="Phân phối ngang" onClick={() => onAction('distribute-horizontal')}>
                <DistributeHorizontalIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>
            <ToolButton label="Phân phối dọc" onClick={() => onAction('distribute-vertical')}>
                <DistributeVerticalIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>
            <ToolButton label="Dàn ngang (cùng chiều cao)" onClick={() => onAction('distribute-and-scale-horizontal')}>
                <DistributeHorizontalScaleIcon className="h-5 w-5" />
            </ToolButton>
            <ToolButton label="Dàn dọc (cùng chiều rộng)" onClick={() => onAction('distribute-and-scale-vertical')}>
                <DistributeVerticalScaleIcon className="h-5 w-5" />
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
             <ToolButton label="Gộp Layer" onClick={() => onAction('merge')} disabled={selectedLayerCount < 2}>
                <MergeIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>
            <ToolButton label="Xuất" onClick={() => onAction('export')}>
                <DownloadIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>

            <div className="w-px h-5 bg-white/20 mx-1 self-center" />

            <ToolButton label="Nhân bản" onClick={() => onAction('duplicate')}>
                <DuplicateIcon className="h-5 w-5" strokeWidth="1.5" />
            </ToolButton>
            <ToolButton label="Xoá" onClick={() => onAction('delete')}>
                 <DeleteIcon className="h-5 w-5" />
            </ToolButton>
        </motion.div>
    );
};