/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import type { ScriptSummary } from '../../services/geminiService';

interface StoryboardingSummaryProps {
    scriptSummary: ScriptSummary;
    onSummaryChange: (field: keyof ScriptSummary, value: string) => void;
}

const StoryboardingSummary: React.FC<StoryboardingSummaryProps> = ({
    scriptSummary,
    onSummaryChange,
}) => {
    return (
        <div className="space-y-4 flex-grow flex flex-col">
            <div className="space-y-4 overflow-y-auto pr-2 -mr-2">
                <div><label className="font-bold text-neutral-300 text-sm">Tiêu đề</label><input type="text" value={scriptSummary.title} onChange={e => onSummaryChange('title', e.target.value)} className="form-input !text-sm w-full mt-1" /></div>
                <div><label className="font-bold text-neutral-300 text-sm">Nội dung</label><textarea value={scriptSummary.content} onChange={e => onSummaryChange('content', e.target.value)} className="form-input !text-sm w-full mt-1" rows={3} /></div>
                <div><label className="font-bold text-neutral-300 text-sm">Nhân vật</label><textarea value={scriptSummary.characters} onChange={e => onSummaryChange('characters', e.target.value)} className="form-input !text-sm w-full mt-1" rows={2} /></div>
                <div><label className="font-bold text-neutral-300 text-sm">Bối cảnh</label><textarea value={scriptSummary.setting} onChange={e => onSummaryChange('setting', e.target.value)} className="form-input !text-sm w-full mt-1" rows={2} /></div>
            </div>
        </div>
    );
};

export default StoryboardingSummary;