/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, Switch, type GenerationHistoryEntry } from '../uiUtils';
import { type Layer, type CanvasSettings, type CanvasTool, type AIPreset } from './LayerComposer.types';
import { LayerList } from './LayerList';
import { TextLayerControls } from './TextLayerControls';
import { LayerPropertiesControls } from './LayerPropertiesControls';
import { cn } from '../../lib/utils';
import { AccordionArrowIcon, AddTextIcon, AddIcon, InfoIcon, ChatIcon, NewFileIcon } from '../icons';
import { PresetControls } from './PresetControls';

interface LayerComposerSidebarProps {
    layers: Layer[];
    canvasSettings: CanvasSettings;
    isInfiniteCanvas: boolean;
    setIsInfiniteCanvas: (isInfinite: boolean) => void;
    selectedLayerId: string | null;
    selectedLayerIds: string[];
    selectedLayers: Layer[];
    runningJobCount: number;
    error: string | null;
    aiPrompt: string;
    setAiPrompt: (prompt: string) => void;
    presets: AIPreset[];
    aiPreset: string;
    setAiPreset: (preset: string) => void;
    isSimpleImageMode: boolean;
    setIsSimpleImageMode: (isSimple: boolean) => void;
    onGenerateAILayer: () => void;
    onCancelGeneration: () => void;
    onLayersReorder: (reorderedLayers: Layer[]) => void;
    onLayerUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    onLayerDelete: (id: string) => void;
    onLayerSelect: (id: string) => void;
    onCanvasSettingsChange: React.Dispatch<React.SetStateAction<CanvasSettings>>;
    onAddImage: () => void;
    onAddText: () => void;
    onSave: () => void;
    onClose: () => void;
    onHide: () => void;
    onNew: () => void;
    beginInteraction: () => void;
    hasAiLog: boolean;
    isLogVisible: boolean;
    setIsLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
    loadedPreset: any | null;
    setLoadedPreset: React.Dispatch<React.SetStateAction<any | null>>;
    onPresetFileLoad: (file: File) => void;
    onGenerateFromPreset: () => void;
    selectedLayersForPreset: Layer[];
    onResizeSelectedLayers: (dimension: 'width' | 'height', newValue: number) => void;
    activeCanvasTool: CanvasTool;
    shapeFillColor: string;
    setShapeFillColor: (color: string) => void;
    generationHistory: GenerationHistoryEntry[];
    onOpenChatbot: () => void;
    aiNumberOfImages: number;
    setAiNumberOfImages: (num: number) => void;
    aiAspectRatio: string;
    setAiAspectRatio: (ratio: string) => void;
}

const AccordionHeader: React.FC<{ title: string; isOpen: boolean; onClick: () => void; children?: React.ReactNode; rightContent?: React.ReactNode; }> = ({ title, isOpen, onClick, rightContent }) => {
    return (
        <button onClick={onClick} className="w-full flex justify-between items-center p-3 bg-neutral-800 hover:bg-neutral-700/80 transition-colors rounded-t-lg" aria-expanded={isOpen}>
            <h4 className="font-semibold text-neutral-200">{title}</h4>
            <div className="flex items-center gap-2">
                {rightContent}
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                    <AccordionArrowIcon className="h-5 w-5" />
                </motion.div>
            </div>
        </button>
    );
};

export const LayerComposerSidebar: React.FC<LayerComposerSidebarProps> = (props) => {
    const {
        layers, canvasSettings, isInfiniteCanvas, setIsInfiniteCanvas, selectedLayerId, selectedLayerIds, selectedLayers, runningJobCount, error, aiPrompt, setAiPrompt, onGenerateAILayer,
        onCancelGeneration, onLayersReorder, onLayerUpdate, onLayerDelete, onLayerSelect, onCanvasSettingsChange, onAddImage, onAddText, onSave, onClose, onHide, onNew,
        beginInteraction,
        presets,
        isSimpleImageMode, setIsSimpleImageMode, aiPreset, setAiPreset,
        hasAiLog, isLogVisible, setIsLogVisible,
        loadedPreset, setLoadedPreset, onPresetFileLoad, onGenerateFromPreset, selectedLayersForPreset,
        onResizeSelectedLayers,
        activeCanvasTool, shapeFillColor, setShapeFillColor, generationHistory,
        onOpenChatbot,
        aiNumberOfImages, setAiNumberOfImages, aiAspectRatio, setAiAspectRatio
    } = props;
    const { t, language } = useAppControls();
    const [openSection, setOpenSection] = useState<'ai' | 'preset' | 'canvas' | 'layers' | null>('ai');
    const [activeTab, setActiveTab] = useState<'properties' | 'text'>('properties');
    const selectedLayer = selectedLayers[0];
    const isGenerating = runningJobCount > 0;
    const hasImageInput = selectedLayers.length > 0;
    const ASPECT_RATIO_OPTIONS: string[] = t('aspectRatioOptions');

    useEffect(() => {
        if (selectedLayer) {
            setActiveTab(selectedLayer.type === 'text' ? 'text' : 'properties');
        }
    }, [selectedLayer?.id, selectedLayer?.type]);

    const toggleSection = (section: 'ai' | 'preset' |'canvas' | 'layers') => { setOpenSection(prev => prev === section ? null : section); };

    return (
        <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="base-font font-bold text-2xl text-yellow-400">{t('layerComposer_title')}</h3>
                <button onClick={onHide} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-4">
                <AnimatePresence>
                    {(activeCanvasTool === 'rectangle' || activeCanvasTool === 'ellipse') && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border border-neutral-700 rounded-lg">
                            <div className="p-3 bg-neutral-800/50 space-y-2">
                                <h4 className="font-semibold text-neutral-200">Shape Tool Options</h4>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="shape-color" className="text-sm font-medium text-neutral-300">Fill Color</label>
                                    <div className="relative h-6 w-6 rounded-full border-2 border-white/20 shadow-inner">
                                        <input id="shape-color" type="color" value={shapeFillColor} onChange={(e) => setShapeFillColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="w-full h-full rounded-full pointer-events-none" style={{ backgroundColor: shapeFillColor }}></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="border border-neutral-700 rounded-lg overflow-hidden flex-shrink-0 mb-2">
                    <AccordionHeader title={t('layerComposer_aiGeneration')} isOpen={openSection === 'ai'} onClick={() => toggleSection('ai')} />
                    <AnimatePresence>
                        {openSection === 'ai' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50">
                                <div className="p-3 space-y-3">
                                    
                                    {selectedLayers.length === 0 ? (
                                        <p className="text-xs text-neutral-400 text-center">{t('layerComposer_ai_note_canvas')}</p>
                                    ) : isSimpleImageMode ? (
                                        <div className="space-y-2">
                                            {selectedLayers.map((layer, index) => (
                                                <div key={layer.id} className="text-sm bg-neutral-900/50 p-2 rounded-md flex items-center gap-3">
                                                    {layer.type === 'image' && layer.url ? (
                                                        <img src={layer.url} alt={`Input ${index + 1}`} className="w-10 h-10 object-cover rounded-sm flex-shrink-0 bg-neutral-700" />
                                                    ) : (
                                                        <div className="w-10 h-10 flex-shrink-0 bg-neutral-700 rounded-sm flex items-center justify-center text-neutral-300 font-bold" style={{ fontFamily: 'Asimovian', fontSize: '1.5rem', color: layer.color || '#FFFFFF' }}>
                                                            {layer.type === 'text' ? 'T' : 'S'}
                                                        </div>
                                                    )}
                                                    <div className="flex-grow min-w-0">
                                                        <span className="font-semibold text-neutral-300 block">Input {index + 1}</span>
                                                        <span className="text-green-400 text-xs truncate block">
                                                            {layer.text || `Layer #${layer.id.substring(0,4)}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm bg-neutral-900/50 p-3 rounded-md">
                                            <p className="font-semibold text-green-400">{t('layerComposer_ai_batchMode')}</p>
                                            <p className="text-xs text-neutral-400 mt-1">
                                                {t('layerComposer_ai_batchMode_desc_count', selectedLayers.length)}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label htmlFor="ai-preset-select" className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_ai_preset')}</label>
                                        <select
                                            id="ai-preset-select"
                                            value={aiPreset}
                                            onChange={(e) => setAiPreset(e.target.value)}
                                            className="form-input !p-2 !text-sm w-full"
                                        >
                                            {presets.map(preset => (
                                                <option key={preset.id} value={preset.id} title={preset.description[language as keyof typeof preset.description]}>
                                                    {preset.name[language as keyof typeof preset.name]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <textarea 
                                        value={aiPrompt} 
                                        onChange={e => setAiPrompt(e.target.value)} 
                                        placeholder={t('layerComposer_ai_promptPlaceholder')} 
                                        className="form-input !p-2 !text-sm !h-24" 
                                        rows={4}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                e.preventDefault();
                                                if (aiPreset !== 'default' || aiPrompt.trim()) {
                                                    onGenerateAILayer();
                                                }
                                            }
                                        }}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="ai-num-images" className="block text-sm font-medium text-neutral-300 mb-1">
                                                {t('freeGeneration_numImagesLabel')}
                                            </label>
                                            <select
                                                id="ai-num-images"
                                                value={aiNumberOfImages}
                                                onChange={(e) => setAiNumberOfImages(Number(e.target.value))}
                                                className="form-input !p-2 !text-sm w-full"
                                            >
                                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="ai-aspect-ratio" className="block text-sm font-medium text-neutral-300 mb-1">
                                                {t('common_aspectRatio')}
                                            </label>
                                            <select
                                                id="ai-aspect-ratio"
                                                value={aiAspectRatio}
                                                onChange={(e) => setAiAspectRatio(e.target.value)}
                                                className="form-input !p-2 !text-sm w-full"
                                            >
                                                {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-3 border-t border-neutral-700/50">
                                        <div className="flex items-center justify-center gap-3">
                                            <span className={cn( "text-sm font-bold transition-colors", !isSimpleImageMode ? "text-yellow-400" : "text-neutral-500" )}>
                                                {t('layerComposer_ai_batchMode')}
                                            </span>
                                            <Switch
                                                id="simple-image-mode"
                                                checked={isSimpleImageMode}
                                                onChange={setIsSimpleImageMode}
                                                disabled={isGenerating}
                                            />
                                            <span className={cn( "text-sm font-bold transition-colors", isSimpleImageMode ? "text-yellow-400" : "text-neutral-500" )}>
                                                {t('layerComposer_ai_multiInputMode')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-500 text-center mt-2">
                                            {isSimpleImageMode ? t('layerComposer_ai_multiInputMode_desc') : t('layerComposer_ai_batchMode_desc')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={onOpenChatbot}
                                            className="btn btn-secondary btn-sm flex-grow flex items-center justify-center gap-2"
                                            title={t('layerComposer_chatbot_title')}
                                        >
                                            <ChatIcon className="h-4 w-4" />
                                            Trợ lý
                                        </button>
                                        <button 
                                            onClick={onGenerateAILayer} 
                                            className="btn btn-primary btn-sm flex-grow" 
                                            disabled={aiPreset === 'default' && !aiPrompt.trim()}
                                            title={t('layerComposer_ai_generate_tooltip')}
                                        >
                                            {isGenerating ? t('layerComposer_ai_generating_count', runningJobCount) : t('layerComposer_ai_generate')}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {hasAiLog && (
                                                <button
                                                    onClick={() => setIsLogVisible(v => !v)}
                                                    className="btn btn-secondary btn-sm flex-grow"
                                                >
                                                    {isLogVisible ? t('layerComposer_ai_hideLog') : t('layerComposer_ai_showLog')}
                                                </button>
                                            )}
                                            {isGenerating && (
                                                 <button
                                                    onClick={onCancelGeneration}
                                                    className="btn btn-secondary btn-sm !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white flex-grow"
                                                >
                                                    {t('layerComposer_ai_cancel')}
                                                </button>
                                            )}
                                        </div>
                                        
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden flex-shrink-0 mb-2">
                    <AccordionHeader title={t('layerComposer_preset_title')} isOpen={openSection === 'preset'} onClick={() => toggleSection('preset')} />
                     <AnimatePresence>
                        {openSection === 'preset' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50">
                               <PresetControls
                                    loadedPreset={loadedPreset}
                                    setLoadedPreset={setLoadedPreset}
                                    onPresetFileLoad={onPresetFileLoad}
                                    onGenerateFromPreset={onGenerateFromPreset}
                                    runningJobCount={runningJobCount}
                                    selectedLayersForPreset={selectedLayersForPreset}
                                    t={t}
                                    isSimpleImageMode={isSimpleImageMode}
                                    setIsSimpleImageMode={setIsSimpleImageMode}
                                    onCancelGeneration={onCancelGeneration}
                                    hasAiLog={hasAiLog}
                                    isLogVisible={isLogVisible}
                                    setIsLogVisible={setIsLogVisible}
                                    generationHistory={generationHistory}
                               />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                    <AccordionHeader title={t('layerComposer_canvasSettings')} isOpen={openSection === 'canvas'} onClick={() => toggleSection('canvas')} />
                     <AnimatePresence> {openSection === 'canvas' && ( <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50"> <div className="p-3 space-y-4"> <div className={cn("grid grid-cols-3 gap-3 text-sm items-end transition-opacity", isInfiniteCanvas && "opacity-50 pointer-events-none")}> <div><label htmlFor="canvas-w">{t('layerComposer_width')}</label><input id="canvas-w" type="number" value={canvasSettings.width} onChange={e => onCanvasSettingsChange(s => ({...s, width: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm" disabled={isInfiniteCanvas}/></div> <div><label htmlFor="canvas-h">{t('layerComposer_height')}</label><input id="canvas-h" type="number" value={canvasSettings.height} onChange={e => onCanvasSettingsChange(s => ({...s, height: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm" disabled={isInfiniteCanvas}/></div> <div className="flex justify-center items-center h-full pb-1"> <div className="relative w-8 h-8" title={t('layerComposer_background')}> <input id="canvas-bg" type="color" value={canvasSettings.background} onChange={e => onCanvasSettingsChange(s => ({...s, background: e.target.value}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isInfiniteCanvas}/> <div className="w-full h-full rounded-full border-2 border-white/20 shadow-inner pointer-events-none" style={{ backgroundColor: canvasSettings.background }} /> </div> </div> </div> <div className="flex items-center justify-between mt-2"> <label htmlFor="infinite-canvas-toggle" className="text-sm font-medium text-neutral-200">{t('layerComposer_infiniteCanvas')}</label> <Switch id="infinite-canvas-toggle" checked={isInfiniteCanvas} onChange={setIsInfiniteCanvas} /> </div>
                        <div className="space-y-3 pt-3 border-t border-neutral-700/50">
                            <div className="flex items-center justify-between">
                                <label htmlFor="smart-guides-toggle" className="text-sm font-medium text-neutral-200">Smart Guides</label>
                                <Switch id="smart-guides-toggle" checked={canvasSettings.guides.enabled} onChange={v => onCanvasSettingsChange(s => ({...s, guides: {...s.guides, enabled: v}}))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="show-grid-toggle" className="text-sm font-medium text-neutral-200">Hiển thị Lưới</label>
                                <Switch id="show-grid-toggle" checked={canvasSettings.grid.visible} onChange={v => onCanvasSettingsChange(s => ({...s, grid: {...s.grid, visible: v}}))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="snap-grid-toggle" className="text-sm font-medium text-neutral-200">Bắt dính vào Lưới</label>
                                <Switch id="snap-grid-toggle" checked={canvasSettings.grid.snap} onChange={v => onCanvasSettingsChange(s => ({...s, grid: {...s.grid, snap: v}}))} />
                            </div>
                        </div>
                     </div> </motion.div> )} </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                     <AccordionHeader title={t('layerComposer_layers')} isOpen={openSection === 'layers'} onClick={() => toggleSection('layers')} rightContent={ <> <button onClick={(e) => { e.stopPropagation(); onAddText(); }} className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors" aria-label={t('layerComposer_addText')} title={t('layerComposer_addText')} > <AddTextIcon className="h-4 w-4" /> </button> <button onClick={(e) => { e.stopPropagation(); onAddImage(); }} className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors" aria-label={t('layerComposer_addImage')} title={t('layerComposer_addImage')} > <AddIcon className="h-4 w-4" strokeWidth={2.5} /> </button> </> } />
                     <AnimatePresence> {openSection === 'layers' && ( <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50"> <div className="p-3"> <LayerList layers={layers} selectedLayerId={selectedLayerId} onLayersReorder={onLayersReorder} onLayerUpdate={onLayerUpdate} onLayerDelete={onLayerDelete} onLayerSelect={onLayerSelect} beginInteraction={beginInteraction} /> </div> </motion.div> )} </AnimatePresence>
                </div>
                 {selectedLayers.length > 0 && ( <div className="mt-2 border border-neutral-700 rounded-lg"> <div className="flex border-b border-neutral-700 bg-neutral-800 rounded-t-lg"> <button onClick={() => setActiveTab('properties')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'properties' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} > {t('layerComposer_tab_properties')} </button> {selectedLayer?.type === 'text' && ( <button onClick={() => setActiveTab('text')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'text' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} > {t('layerComposer_tab_text')} </button> )} </div> <div className="bg-neutral-800/50"> <AnimatePresence mode="wait"> <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} > {activeTab === 'properties' && ( <LayerPropertiesControls selectedLayers={selectedLayers} onUpdate={onLayerUpdate} beginInteraction={beginInteraction} onResize={onResizeSelectedLayers} /> )} {activeTab === 'text' && selectedLayer?.type === 'text' && ( <TextLayerControls layer={selectedLayer} onUpdate={onLayerUpdate} beginInteraction={beginInteraction} /> )} </motion.div> </AnimatePresence> </div> </div> )}
            </div>
            
            <div className="flex-shrink-0 pt-6 border-t border-white/10">
                {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                <div className="flex items-center gap-2">
                    <button onClick={onNew} className="btn btn-secondary btn-sm p-2.5" title="New Canvas">
                        <NewFileIcon className="h-5 w-5" />
                    </button>
                    <button onClick={onClose} className="btn btn-secondary btn-sm flex-grow"> {t('common_cancel')} </button>
                    <button onClick={onSave} className="btn btn-primary btn-sm flex-grow" disabled={(layers.length === 0 && !isInfiniteCanvas) || isGenerating} title={isInfiniteCanvas ? t('layerComposer_exportJsonTooltip') : t('layerComposer_saveTooltip')} > {isGenerating ? t('layerComposer_saving') : (isInfiniteCanvas ? t('layerComposer_exportJson') : t('layerComposer_save'))} </button>
                </div>
            </div>
        </aside>
    );
};
