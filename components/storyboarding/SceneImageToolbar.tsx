/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { EditorIcon, DownloadIcon, GalleryIcon, CloudUploadIcon, DeleteIcon } from '../icons';
import { useAppControls } from '../uiContexts';

interface SceneImageToolbarProps {
    onEdit: () => void;
    onDownload: () => void;
    onSelectFromGallery: () => void;
    onUpload: () => void;
    onClear: () => void;
}

const SceneImageToolbar: React.FC<SceneImageToolbarProps> = ({ onEdit, onDownload, onSelectFromGallery, onUpload, onClear }) => {
    const { t } = useAppControls();

    return (
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('storyboarding_editImage')}
                title={t('storyboarding_editImage')}
            >
                <EditorIcon className="h-5 w-5" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onSelectFromGallery(); }}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('common_selectFromGallery')}
                title={t('common_selectFromGallery')}
            >
                <GalleryIcon className="h-5 w-5" strokeWidth={2}/>
            </button>
             <button
                onClick={(e) => { e.stopPropagation(); onUpload(); }}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('storyboarding_uploadImage')}
                title={t('storyboarding_uploadImage')}
            >
                <CloudUploadIcon className="h-5 w-5" strokeWidth={1.5}/>
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('storyboarding_downloadImage')}
                title={t('storyboarding_downloadImage')}
            >
                <DownloadIcon className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="p-2 bg-red-500/60 rounded-full text-white hover:bg-red-600/80 focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label={t('common_clearImage')}
                title={t('common_clearImage')}
            >
               <DeleteIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

export default SceneImageToolbar;