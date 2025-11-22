/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAppControls } from './uiUtils';
import { CloseIcon, CloudUploadIcon } from './icons';

interface GalleryToolbarProps {
    isSelectionMode: boolean;
    selectedCount: number;
    imageCount: number;
    title: string;
    isCombining?: boolean;
    onToggleSelectionMode: () => void;
    onDeleteSelected: () => void;
    onClose: () => void;
    onUploadClick?: () => void;
    onDownloadAll?: () => void; // Optional for contexts where download isn't needed
    onCombineHorizontal?: () => void;
    onCombineVertical?: () => void;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
    isSelectionMode,
    selectedCount,
    imageCount,
    title,
    isCombining,
    onToggleSelectionMode,
    onDeleteSelected,
    onClose,
    onUploadClick,
    onDownloadAll,
    onCombineHorizontal,
    onCombineVertical,
}) => {
    const { t } = useAppControls();

    if (isSelectionMode) {
        return (
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="base-font font-bold text-2xl text-yellow-400">{t('galleryToolbar_selected', selectedCount)}</h3>
                <div className="flex items-center gap-2">
                    {onCombineHorizontal && (
                        <button onClick={onCombineHorizontal} className="btn btn-secondary btn-sm" disabled={selectedCount < 2 || isCombining}>
                            {isCombining ? t('galleryToolbar_combining') : t('galleryToolbar_combineHorizontal')}
                        </button>
                    )}
                    {onCombineVertical && (
                         <button onClick={onCombineVertical} className="btn btn-secondary btn-sm" disabled={selectedCount < 2 || isCombining}>
                             {isCombining ? t('galleryToolbar_combining') : t('galleryToolbar_combineVertical')}
                        </button>
                    )}
                    <div className="w-px h-5 bg-white/20" />
                    <button onClick={onDeleteSelected} className="btn btn-secondary btn-sm !bg-red-500/20 !border-red-500/80 hover:!bg-red-500" disabled={selectedCount === 0 || isCombining}>
                        {t('common_delete')}
                    </button>
                    <button onClick={onToggleSelectionMode} className="btn btn-secondary btn-sm" aria-label={t('common_cancel')} disabled={isCombining}>
                       {t('common_cancel')}
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="base-font font-bold text-2xl text-yellow-400">{title}</h3>
            <div className="flex items-center gap-2">
               {onUploadClick && (
                    <button onClick={onUploadClick} className="btn btn-secondary btn-sm" title={t('galleryToolbar_uploadTooltip')}>
                        {t('galleryToolbar_upload')}
                    </button>
                )}
               {onDownloadAll && <button onClick={onDownloadAll} className="btn btn-secondary btn-sm" disabled={imageCount === 0}>{t('common_downloadAll')}</button>}
               <button onClick={onToggleSelectionMode} className="btn btn-secondary btn-sm" disabled={imageCount === 0}>{t('common_select')}</button>
               <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label={t('galleryToolbar_close')}>
                   <CloseIcon className="h-6 w-6" strokeWidth={2} />
               </button>
            </div>
       </div>
    );
};