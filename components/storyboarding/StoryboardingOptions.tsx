/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAppControls } from '../uiUtils';
import SearchableSelect from '../SearchableSelect';

interface StoryboardingOptionsProps {
    style: string;
    setStyle: (style: string) => void;
    styleOptions: any[]; // Can now be strings or groups
    numberOfScenes: number;
    setNumberOfScenes: (num: number) => void;
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    aspectRatioOptions: string[];
    notes: string;
    setNotes: (notes: string) => void;
}

const StoryboardingOptions: React.FC<StoryboardingOptionsProps> = (props) => {
    const { t } = useAppControls();
    const {
        style, setStyle, styleOptions,
        numberOfScenes, setNumberOfScenes,
        aspectRatio, setAspectRatio, aspectRatioOptions,
        notes, setNotes
    } = props;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label htmlFor="storyboard-num-scenes" className="text-sm font-medium text-neutral-300">{t('storyboarding_numberOfScenes')}</label>
                    <input
                        id="storyboard-num-scenes"
                        type="number"
                        min="0"
                        value={numberOfScenes}
                        onChange={e => setNumberOfScenes(Number(e.target.value))}
                        className="form-input !text-xs w-full mt-1"
                        title="0 = Tự động"
                    />
                </div>
                 <div>
                    <label className="text-sm font-medium text-neutral-300">{t('storyboarding_aspectRatio')}</label>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="form-input !text-xs w-full mt-1">
                        {aspectRatioOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            </div>
             <div>
                <label className="text-sm font-medium text-neutral-300">{t('storyboarding_style')}</label>
                <div className="mt-1">
                    <SearchableSelect
                        id="storyboard-style"
                        label=""
                        options={styleOptions}
                        value={style}
                        onChange={setStyle}
                        placeholder={t('storyboarding_style_placeholder')}
                    />
                </div>
            </div>
            <div>
                <label className="text-sm font-medium text-neutral-300">{t('storyboarding_notes_label')}</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t('storyboarding_notes_placeholder')}
                    className="form-input !text-xs w-full mt-1 h-24"
                    rows={3}
                />
            </div>
        </div>
    );
};

export default StoryboardingOptions;
