/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { memo, type DragEvent, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAppControls } from './uiUtils';
import { 
    LoadingSpinnerIcon, 
    ErrorIcon, 
    PlaceholderPersonIcon, 
    PlaceholderArchitectureIcon, 
    PlaceholderClothingIcon, 
    PlaceholderMagicIcon, 
    PlaceholderStyleIcon, 
    FullscreenIcon, 
    EditorIcon, 
    SwapIcon, 
    GalleryIcon, 
    WebcamIcon, 
    RegenerateIcon, 
    DownloadIcon,
    CloudUploadIcon,
    DeleteIcon,
} from './icons';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    mediaUrl?: string;
    caption: string;
    status: ImageStatus;
    error?: string;
    onShake?: (caption: string) => void;
    onDownload?: (caption: string) => void;
    onEdit?: (caption: string) => void;
    onClear?: () => void;
    onSwapImage?: () => void;
    onSelectFromGallery?: () => void;
    onCaptureFromWebcam?: () => void;
    isMobile?: boolean;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
    onClick?: () => void;
    isDraggingOver?: boolean;
    onDragOver?: (e: DragEvent) => void;
    onDragLeave?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent) => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <LoadingSpinnerIcon className="animate-spin h-8 w-8 text-neutral-400" />
    </div>
);

const ErrorDisplay = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ErrorIcon className="h-10 w-10 text-red-400 mb-2 flex-shrink-0" />
        {message && <p className="text-sm text-red-300 max-w-full break-words base-font">{message}</p>}
    </div>
);

// FIX: Modified Placeholder to safely handle `type` as a string, preventing type errors.
const Placeholder = ({ type = 'person' }: { type?: string }) => {
    const icons = {
        person: <PlaceholderPersonIcon className="w-full h-full" />,
        architecture: <PlaceholderArchitectureIcon className="w-full h-full" />,
        clothing: <PlaceholderClothingIcon className="w-full h-full" />,
        magic: <PlaceholderMagicIcon className="w-full h-full" />,
        style: <PlaceholderStyleIcon className="w-full h-full" />,
    };
    
    type IconKey = keyof typeof icons;
    const key: IconKey = (type && Object.prototype.hasOwnProperty.call(icons, type)) ? type as IconKey : 'person';

    return (
        <div className="flex items-center justify-center h-full p-8 placeholder-icon-wrapper">
            {icons[key]}
        </div>
    );
};


const PolaroidCard: React.FC<PolaroidCardProps> = ({ mediaUrl, caption, status, error, onShake, onDownload, onEdit, onClear, onSwapImage, onSelectFromGallery, onCaptureFromWebcam, isMobile, placeholderType = 'person', onClick, isDraggingOver, onDragOver, onDragLeave, onDrop }) => {
    const { t } = useAppControls();
    const hasMedia = status === 'done' && mediaUrl;
    const isVideo = hasMedia && mediaUrl!.startsWith('blob:');
    const isClickable = !!onClick;

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        if (isClickable && onClick) {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }
    };

    return (
        <div 
            className={cn("polaroid-card", isClickable && "cursor-pointer")} 
            onClick={handleClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className={cn(
                "polaroid-image-container group",
                !hasMedia && 'aspect-square',
                hasMedia && 'has-image'
            )}>
                {status === 'pending' && <LoadingSpinner />}
                {status === 'error' && <ErrorDisplay message={error} />}
                {hasMedia && (
                    <>
                        {isClickable && (
                            <div className="absolute inset-0 z-10 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <FullscreenIcon className="h-10 w-10 text-white" strokeWidth="1.5" />
                            </div>
                        )}
                        {isVideo ? (
                            <video
                                key={mediaUrl}
                                src={mediaUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-auto md:w-auto md:h-full block"
                            />
                        ) : (
                            <img
                                key={mediaUrl}
                                src={mediaUrl}
                                alt={caption}
                                loading="lazy"
                                className="w-full h-auto md:w-auto md:h-full block"
                            />
                        )}
                    </>
                )}
                {status === 'done' && !mediaUrl && <Placeholder type={placeholderType} />}

                {/* --- BUTTON CONTAINER --- */}
                <div className={cn(
                    "absolute top-2 right-2 z-20 flex flex-col gap-2 transition-opacity duration-300",
                    (hasMedia || onSelectFromGallery || onCaptureFromWebcam) ? (!isMobile ? 'opacity-0 group-hover:opacity-100' : '') : 'opacity-0 pointer-events-none'
                )}>
                     {hasMedia && onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(caption);
                            }}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label={`${t('common_edit')} ${caption}`}
                        >
                           <EditorIcon className="h-5 w-5" />
                        </button>
                    )}
                     {hasMedia && onClear && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            className="p-2 bg-red-500/60 rounded-full text-white hover:bg-red-600/80 focus:outline-none focus:ring-2 focus:ring-red-400"
                            aria-label={t('common_clearImage')}
                        >
                           <DeleteIcon className="h-5 w-5" />
                        </button>
                    )}
                     {hasMedia && onSwapImage && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSwapImage();
                            }}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label={`${t('common_swapImage')} ${caption}`}
                        >
                            <SwapIcon className="h-5 w-5" strokeWidth={2} />
                        </button>
                    )}
                    {onSelectFromGallery && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectFromGallery();
                            }}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label={t('common_selectFromGallery')}
                        >
                            <GalleryIcon className="h-5 w-5" strokeWidth={2} />
                        </button>
                    )}
                    {onCaptureFromWebcam && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCaptureFromWebcam();
                            }}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label={t('common_captureFromWebcam')}
                        >
                            <WebcamIcon 
                                className="h-5 w-5" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </button>
                    )}
                     {hasMedia && onShake && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShake(caption);
                            }}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label={`${t('common_regenerate')} ${caption}`}
                        >
                            <RegenerateIcon className="h-5 w-5" />
                        </button>
                    )}
                    {hasMedia && onDownload && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownload(caption);
                            }}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label={`${t('common_download')} ${caption}`}
                        >
                            <DownloadIcon className="h-5 w-5" strokeWidth={2} />
                        </button>
                    )}
                </div>
            </div>
             <AnimatePresence>
                {isDraggingOver && (
                    <motion.div
                        className="absolute inset-0 z-30 bg-black/70 border-4 border-dashed border-yellow-400 rounded-md flex flex-col items-center justify-center pointer-events-none p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <CloudUploadIcon className="h-12 w-12 text-yellow-400 mb-4" strokeWidth={1}/>
                        <p className="text-xl font-bold text-yellow-400 text-center base-font">{t('polaroid_dropPrompt')}</p>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="absolute bottom-4 left-4 right-4 text-center px-2">
                <p className={cn(
                    "polaroid-caption",
                    status === 'done' && mediaUrl ? 'text-black' : 'text-neutral-800'
                )}>
                    {caption}
                </p>
            </div>
        </div>
    );
};

export default memo(PolaroidCard);