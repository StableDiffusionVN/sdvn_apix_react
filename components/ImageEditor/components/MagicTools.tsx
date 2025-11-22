/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { type ImageEditorState } from '../useImageEditorState';
import { useAppControls } from '../../uiUtils';
import { LoadingSpinnerIcon, MagicWandIcon, InvertIcon } from '../../icons';

interface MagicToolsProps extends Pick<
    ImageEditorState,
    'isLoading' | 
    'handleRemoveBackground' | 
    'handleInvertColors' | 
    'aiEditPrompt' | 
    'setAiEditPrompt' | 
    'handleAiEdit' | 
    'isSelectionActive'
> {}

const Spinner = () => (
    <LoadingSpinnerIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
);


export const MagicTools: React.FC<MagicToolsProps> = ({ 
    isLoading, 
    handleRemoveBackground, 
    handleInvertColors,
    aiEditPrompt,
    setAiEditPrompt,
    handleAiEdit,
    isSelectionActive
}) => {
    const { t } = useAppControls();
    const buttonClasses = "flex-1 p-2 bg-neutral-700 text-neutral-200 rounded-md hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2 text-sm !w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-700";
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAiEdit();
    };

    return (
        <div className="p-3 space-y-2">
            <button onClick={handleRemoveBackground} className={buttonClasses} disabled={isLoading}>
                 {isLoading ? <Spinner /> : (
                    <MagicWandIcon className="h-4 w-4" />
                )}
                {isLoading ? 'Đang xử lý...' : 'Xóa nền'}
            </button>
            <button onClick={handleInvertColors} className={buttonClasses} disabled={isLoading}>
                <InvertIcon className="h-4 w-4" />
                Đảo màu
            </button>
            <div className="border-t border-neutral-700/50 mt-3 pt-3 space-y-2">
                <form onSubmit={handleFormSubmit}>
                    <label htmlFor="ai-edit-prompt" className="base-font font-bold text-neutral-200 text-sm mb-1 block">{t('imageEditor_aiEdit_title')}</label>
                    <textarea
                        id="ai-edit-prompt"
                        value={aiEditPrompt}
                        onChange={(e) => setAiEditPrompt(e.target.value)}
                        placeholder={t('imageEditor_aiEdit_placeholder')}
                        className="form-input !h-20 !text-sm"
                        rows={3}
                        disabled={isLoading}
                    />
                    {isSelectionActive && (
                        <p className="text-xs text-yellow-300/80 mt-1">
                            {t('imageEditor_aiEdit_selectionNote')}
                        </p>
                    )}
                    <button type="submit" className="w-full btn btn-primary btn-sm mt-2 flex items-center justify-center" disabled={isLoading || !aiEditPrompt.trim()}>
                        {isLoading && <Spinner />}
                        {isLoading ? t('imageEditor_aiEdit_loading') : t('imageEditor_aiEdit_button')}
                    </button>
                </form>
            </div>
        </div>
    );
};