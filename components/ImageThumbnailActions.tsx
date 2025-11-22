/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { VisibleIcon, EditorIcon, DeleteIcon } from './icons';

interface ImageThumbnailActionsProps {
    isSelectionMode: boolean;
    isVideo: boolean;
    onEdit?: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onQuickView?: (e: React.MouseEvent) => void;
}

export const ImageThumbnailActions: React.FC<ImageThumbnailActionsProps> = ({
    isSelectionMode,
    isVideo,
    onEdit,
    onDelete,
    onQuickView,
}) => {
    if (isSelectionMode) {
        return null;
    }

    return (
        <div className="thumbnail-actions">
            {onQuickView && (
                <button onClick={onQuickView} className="thumbnail-action-btn" aria-label="Xem nhanh" title="Xem nhanh">
                    <VisibleIcon className="h-4 w-4" strokeWidth={2} />
                </button>
            )}
            {!isVideo && onEdit && (
                <button onClick={onEdit} className="thumbnail-action-btn" aria-label="Sửa ảnh" title="Sửa ảnh">
                    <EditorIcon className="h-4 w-4" />
                </button>
            )}
            <button onClick={onDelete} className="thumbnail-action-btn hover:!bg-red-600 focus:!ring-red-500" aria-label="Xóa ảnh" title="Xóa ảnh">
                <DeleteIcon className="h-4 w-4" />
            </button>
        </div>
    );
};