/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { ImageThumbnailActions } from './ImageThumbnailActions';

interface ImageThumbnailProps {
    index: number;
    imageUrl: string;
    isSelectionMode: boolean;
    isSelected: boolean;
    onSelect: (index: number) => void;
    onEdit?: (index: number, e: React.MouseEvent) => void;
    onDelete: (index: number, e: React.MouseEvent) => void;
    onQuickView?: (index: number, e: React.MouseEvent) => void;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
    index,
    imageUrl,
    isSelectionMode,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onQuickView,
}) => {
    const isVideo = imageUrl.startsWith('blob:');

    return (
        <motion.div
            className={cn(
                "gallery-grid-item group",
                isSelectionMode ? 'cursor-pointer' : ''
            )}
            onClick={() => onSelect(index)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: index * 0.03 }}
            layout
        >
            {isVideo ? (
                <video src={imageUrl} autoPlay loop muted playsInline className="w-full h-auto block" />
            ) : (
                <img src={imageUrl} alt={`Generated image ${index + 1}`} loading="lazy" />
            )}

            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                            "absolute inset-0 transition-all duration-200 pointer-events-none",
                            isSelected ? 'ring-4 ring-yellow-400 ring-inset' : 'bg-black/60 opacity-0 group-hover:opacity-100'
                        )}
                    >
                        {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black border-2 border-black/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <ImageThumbnailActions
                isSelectionMode={isSelectionMode}
                isVideo={isVideo}
                onQuickView={onQuickView ? (e) => onQuickView(index, e) : undefined}
                onEdit={onEdit ? (e) => onEdit(index, e) : undefined}
                onDelete={(e) => onDelete(index, e)}
            />
        </motion.div>
    );
};