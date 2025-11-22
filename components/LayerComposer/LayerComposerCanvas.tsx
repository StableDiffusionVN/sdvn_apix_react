/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useTransform, AnimatePresence } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer, type CanvasSettings, type Interaction, type Handle, type Rect, type MultiLayerAction, getBoundingBoxForLayers, type Guide, type CanvasTool } from './LayerComposer.types';
import { LayerItem } from './LayerItem';
import { SelectionFrame } from './SelectionFrame';
import { CanvasToolbar } from './CanvasToolbar';
import { FloatingLayerToolbar, type LayerAction } from './FloatingLayerToolbar';
import { FloatingMultiLayerToolbar } from './FloatingMultiLayerToolbar';
import { useAppControls } from '../uiUtils';

interface LayerComposerCanvasProps {
    canvasViewRef: React.RefObject<HTMLDivElement>;
    layers: Layer[];
    canvasSettings: CanvasSettings;
    isInfiniteCanvas: boolean;
    selectedLayerIds: string[];
    selectedLayers: Layer[];
    selectionBoundingBox: Rect | null;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    zoomDisplay: number;
    activeCanvasTool: CanvasTool;
    setActiveCanvasTool: (tool: CanvasTool) => void;
    isSpacePanning: boolean;
    interaction: Interaction | null;
    setInteraction: (interaction: Interaction | null) => void;
    panStartRef: React.MutableRefObject<{ pan: { x: number; y: number; }; pointer: { x: number; y: number; }; } | null>;
    canUndo: boolean;
    canRedo: boolean;
    handleUndo: () => void;
    handleRedo: () => void;
    onUpdateLayers: (updates: { id: string; props: Partial<Layer> }[], isFinalChange: boolean) => void;
    beginInteraction: () => void;
    duplicateLayer: (id: string) => Layer;
    exportSelectedLayer: () => void;
    deleteLayer: (id: string) => void;
    setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
    onFilesDrop: (files: FileList) => void;
    onMultiLayerAction: (action: MultiLayerAction) => void;
    onDuplicateForDrag: () => Layer[];
    handleMergeLayers: () => void;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
    deleteSelectedLayers: () => void;
    duplicateSelectedLayers: () => Layer[];
    handleExportSelectedLayers: () => Promise<void>;
    handleBakeSelectedLayer: () => Promise<void>;
    captureLayer: (layer: Layer) => Promise<string>;
    addLayer: (layer: Omit<Layer, 'id'>) => void;
    shapeFillColor: string;
}

const snap = (value: number, gridSize: number) => {
    return Math.round(value / gridSize) * gridSize;
};

const SNAP_THRESHOLD = 12;

export const LayerComposerCanvas: React.FC<LayerComposerCanvasProps> = ({
    canvasViewRef, layers, canvasSettings, isInfiniteCanvas, selectedLayerIds, selectedLayers, 
    selectionBoundingBox,
    panX, panY, scale, zoomDisplay,
    activeCanvasTool, setActiveCanvasTool, isSpacePanning,
    interaction, setInteraction, panStartRef,
    canUndo, canRedo, handleUndo, handleRedo,
    onUpdateLayers, beginInteraction, duplicateLayer, exportSelectedLayer, deleteLayer,
    setSelectedLayerIds, onFilesDrop, onMultiLayerAction,
    onDuplicateForDrag, handleMergeLayers, openImageEditor,
    deleteSelectedLayers, duplicateSelectedLayers, handleExportSelectedLayers, handleBakeSelectedLayer,
    captureLayer, addLayer, shapeFillColor
}) => {
    const { t } = useAppControls();
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
    const [cursorPosition, setCursorPosition] = useState<{x:number, y:number} | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [activeGuides, setActiveGuides] = useState<Guide[]>([]);
    const [isCommandKeyPressed, setIsCommandKeyPressed] = useState(false);

    const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                setIsCommandKeyPressed(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (!e.metaKey && !e.ctrlKey) {
                setIsCommandKeyPressed(false);
            }
        };
        const handleBlur = () => {
            setIsCommandKeyPressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    const getPointerInCanvas = useCallback((e: React.PointerEvent) => {
        const view = canvasViewRef.current;
        if (!view) return null;
        
        const viewRect = view.getBoundingClientRect();
        const style = window.getComputedStyle(view);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        
        const pointerXInContent = e.clientX - viewRect.left - paddingLeft;
        const pointerYInContent = e.clientY - viewRect.top - paddingTop;
        
        const contentWidth = view.clientWidth;
        const contentHeight = view.clientHeight;
        
        const currentScale = scale.get();
        const currentPanX = panX.get();
        const currentPanY = panY.get();
    
        const ptr_x_rel_view_center = pointerXInContent - (contentWidth / 2);
        const ptr_y_rel_view_center = pointerYInContent - (contentHeight / 2);
    
        const ptr_x_rel_canvas_center = (ptr_x_rel_view_center - currentPanX) / currentScale;
        const ptr_y_rel_canvas_center = (ptr_y_rel_view_center - currentPanY) / currentScale;
        
        return { x: ptr_x_rel_canvas_center + canvasSettings.width / 2, y: ptr_y_rel_canvas_center + canvasSettings.height / 2 };
    }, [scale, panX, panY, canvasSettings.width, canvasSettings.height]);

    const getPointerInView = (e: React.PointerEvent) => {
        const viewRect = canvasViewRef.current?.getBoundingClientRect();
        if (!viewRect) return null;
        return { x: e.clientX - viewRect.left, y: e.clientY - viewRect.top };
    };

    const onToolbarAction = (action: LayerAction) => {
        if (!selectedLayer) return;
        const layer = selectedLayer;
        switch (action) {
            case 'delete':
                deleteLayer(layer.id);
                break;
            case 'duplicate':
                duplicateLayer(layer.id);
                break;
            case 'export':
                exportSelectedLayer();
                break;
            case 'bake':
                handleBakeSelectedLayer();
                break;
            case 'edit':
                if (layer.type === 'image' && layer.url) {
                    openImageEditor(layer.url, (newUrl) => {
                        const img = new Image();
                        img.onload = () => {
                            const newAspectRatio = img.naturalWidth / img.naturalHeight;
                            const newHeight = layer.width / newAspectRatio;
                            onUpdateLayers([{
                                id: layer.id,
                                props: { url: newUrl, width: layer.width, height: newHeight }
                            }], true);
                        };
                        img.src = newUrl;
                    });
                }
                break;
        }
    };

    const findGuides = (movingBox: Rect, targets: Rect[]): { guides: Guide[], snapOffset: {x: number, y: number} } => {
        const guides: Guide[] = [];
        let snapOffsetX = 0;
        let snapOffsetY = 0;
        let minSnapX = Infinity;
        let minSnapY = Infinity;

        const movingPoints = {
            l: movingBox.x,
            cx: movingBox.x + movingBox.width / 2,
            r: movingBox.x + movingBox.width,
            t: movingBox.y,
            cy: movingBox.y + movingBox.height / 2,
            b: movingBox.y + movingBox.height,
        };

        targets.forEach(target => {
            const targetPoints = {
                l: target.x,
                cx: target.x + target.width / 2,
                r: target.x + target.width,
                t: target.y,
                cy: target.y + target.height / 2,
                b: target.y + target.height,
            };

            const checks = [
                { moving: movingPoints.l, target: targetPoints.l, axis: 'x' },
                { moving: movingPoints.l, target: targetPoints.cx, axis: 'x' },
                { moving: movingPoints.l, target: targetPoints.r, axis: 'x' },
                { moving: movingPoints.cx, target: targetPoints.l, axis: 'x' },
                { moving: movingPoints.cx, target: targetPoints.cx, axis: 'x' },
                { moving: movingPoints.cx, target: targetPoints.r, axis: 'x' },
                { moving: movingPoints.r, target: targetPoints.l, axis: 'x' },
                { moving: movingPoints.r, target: targetPoints.cx, axis: 'x' },
                { moving: movingPoints.r, target: targetPoints.r, axis: 'x' },
                { moving: movingPoints.t, target: targetPoints.t, axis: 'y' },
                { moving: movingPoints.t, target: targetPoints.cy, axis: 'y' },
                { moving: movingPoints.t, target: targetPoints.b, axis: 'y' },
                { moving: movingPoints.cy, target: targetPoints.t, axis: 'y' },
                { moving: movingPoints.cy, target: targetPoints.cy, axis: 'y' },
                { moving: movingPoints.cy, target: targetPoints.b, axis: 'y' },
                { moving: movingPoints.b, target: targetPoints.t, axis: 'y' },
                { moving: movingPoints.b, target: targetPoints.cy, axis: 'y' },
                { moving: movingPoints.b, target: targetPoints.b, axis: 'y' },
            ];

            checks.forEach(check => {
                const diff = check.target - check.moving;
                const absDiff = Math.abs(diff);

                if (absDiff < SNAP_THRESHOLD / scale.get()) {
                    if (check.axis === 'x') {
                        if (absDiff < minSnapX) {
                            minSnapX = absDiff;
                            snapOffsetX = diff;
                        }
                    } else {
                        if (absDiff < minSnapY) {
                            minSnapY = absDiff;
                            snapOffsetY = diff;
                        }
                    }
                }
            });
        });

        // After finding best snaps, generate guide lines
        if (minSnapX !== Infinity) {
             const finalMovingXPoints = {
                l: movingPoints.l + snapOffsetX,
                cx: movingPoints.cx + snapOffsetX,
                r: movingPoints.r + snapOffsetX
            };
            targets.forEach(target => {
                const targetPoints = { l: target.x, cx: target.x + target.width / 2, r: target.x + target.width };
                for (const mKey of ['l', 'cx', 'r'] as const) {
                    for (const tKey of ['l', 'cx', 'r'] as const) {
                        if (Math.abs(finalMovingXPoints[mKey] - targetPoints[tKey]) < 0.1) {
                            guides.push({ axis: 'x', position: targetPoints[tKey], start: Math.min(movingBox.y, target.y), end: Math.max(movingBox.y + movingBox.height, target.y + target.height) });
                        }
                    }
                }
            });
        }
         if (minSnapY !== Infinity) {
            const finalMovingYPoints = {
                t: movingPoints.t + snapOffsetY,
                cy: movingPoints.cy + snapOffsetY,
                b: movingPoints.b + snapOffsetY
            };
            targets.forEach(target => {
                const targetPoints = { t: target.y, cy: target.y + target.height / 2, b: target.y + target.height };
                for (const mKey of ['t', 'cy', 'b'] as const) {
                    for (const tKey of ['t', 'cy', 'b'] as const) {
                        if (Math.abs(finalMovingYPoints[mKey] - targetPoints[tKey]) < 0.1) {
                            guides.push({ axis: 'y', position: targetPoints[tKey], start: Math.min(movingBox.x, target.x), end: Math.max(movingBox.x + movingBox.width, target.x + target.width) });
                        }
                    }
                }
            });
        }


        return { guides, snapOffset: { x: snapOffsetX, y: snapOffsetY } };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        setCursorPosition(getPointerInCanvas(e));
        if (panStartRef.current) {
            const pointer = getPointerInView(e);
            if (pointer) {
                panX.set(panStartRef.current.pan.x + (pointer.x - panStartRef.current.pointer.x));
                panY.set(panStartRef.current.pan.y + (pointer.y - panStartRef.current.pointer.y));
            }
            return;
        }
        
        let currentInteraction = interaction;

        if (currentInteraction?.type === 'duplicate-move' && !currentInteraction.hasActionStarted) {
            const newLayers = onDuplicateForDrag();
            if (newLayers && newLayers.length > 0) {
                const updatedInteraction = {
                    ...currentInteraction,
                    type: 'move' as const,
                    initialLayers: newLayers.map(l => ({ ...l })),
                    hasActionStarted: true,
                };
                setInteraction(updatedInteraction);
                currentInteraction = updatedInteraction;
            } else {
                setInteraction(null);
                currentInteraction = null;
            }
        }
        
        if (!currentInteraction) return;
        const currentPointer = getPointerInCanvas(e);
        if (!currentPointer) return;

        if (currentInteraction.type === 'move' && currentInteraction.initialLayers) {
            let dx = currentPointer.x - currentInteraction.initialPointer.x;
            let dy = currentPointer.y - currentInteraction.initialPointer.y;
            
            // Axis lock logic
            if (e.shiftKey && !currentInteraction.lockedAxis) {
                const initialDx = currentPointer.x - currentInteraction.initialPointer.x;
                const initialDy = currentPointer.y - currentInteraction.initialPointer.y;
                if (Math.abs(initialDx) > 5 || Math.abs(initialDy) > 5) {
                    const newLockedAxis = Math.abs(initialDx) > Math.abs(initialDy) ? 'x' : 'y';
                    setInteraction({ ...currentInteraction, lockedAxis: newLockedAxis });
                    currentInteraction.lockedAxis = newLockedAxis;
                }
            }
            if (currentInteraction.lockedAxis === 'x') dy = 0;
            else if (currentInteraction.lockedAxis === 'y') dx = 0;
            
            let finalGuides: Guide[] = [];
            const bbox = getBoundingBoxForLayers(currentInteraction.initialLayers);
            if(bbox) {
                const movingBox: Rect = { x: bbox.x + dx, y: bbox.y + dy, width: bbox.width, height: bbox.height };
                
                if (canvasSettings.guides.enabled && !e.altKey) {
                    const otherLayers = layers.filter(l => !selectedLayerIds.includes(l.id) && l.isVisible);
                    let targets: Rect[] = otherLayers.map(l => ({ x: l.x, y: l.y, width: l.width, height: l.height }));
                    if (!isInfiniteCanvas) {
                        targets.push({ x: 0, y: 0, width: canvasSettings.width, height: 0 }); // Top Edge
                        targets.push({ x: 0, y: canvasSettings.height / 2, width: canvasSettings.width, height: 0 }); // V Center
                        targets.push({ x: 0, y: canvasSettings.height, width: canvasSettings.width, height: 0 }); // Bottom Edge
                        targets.push({ x: 0, y: 0, width: 0, height: canvasSettings.height }); // Left Edge
                        targets.push({ x: canvasSettings.width / 2, y: 0, width: 0, height: canvasSettings.height }); // H Center
                        targets.push({ x: canvasSettings.width, y: 0, width: 0, height: canvasSettings.height }); // Right Edge
                    }
                    const { guides, snapOffset } = findGuides(movingBox, targets);
                    dx += snapOffset.x;
                    dy += snapOffset.y;
                    finalGuides = guides;
                }
                
                if (canvasSettings.grid.snap && !e.altKey && finalGuides.length === 0) {
                    const initialBbox = currentInteraction.initialBoundingBox;
                    if(initialBbox) {
                        const newBboxX = initialBbox.x + dx;
                        const newBboxY = initialBbox.y + dy;
                        const snappedX = snap(newBboxX, canvasSettings.grid.size);
                        const snappedY = snap(newBboxY, canvasSettings.grid.size);
                        dx = snappedX - initialBbox.x;
                        dy = snappedY - initialBbox.y;
                    }
                }
            }
            setActiveGuides(finalGuides);
            const updates = currentInteraction.initialLayers.map(layer => ({ id: layer.id, props: { x: layer.x + dx, y: layer.y + dy } }));
            onUpdateLayers(updates, false);

        } else if (currentInteraction.type === 'resize' && currentInteraction.handle && currentInteraction.initialBoundingBox && currentInteraction.initialLayers) {
            const { initialLayers, handle, initialBoundingBox: bbox } = currentInteraction;
            const dx = currentPointer.x - currentInteraction.initialPointer.x;
            const dy = currentPointer.y - currentInteraction.initialPointer.y;
            const maintainAspectRatio = e.shiftKey;
            const scaleFromCenter = e.altKey;

            let newX = bbox.x, newY = bbox.y, newWidth = bbox.width, newHeight = bbox.height;

            if (scaleFromCenter) {
                if (handle.includes('l')) { newWidth = bbox.width - 2 * dx; }
                if (handle.includes('r')) { newWidth = bbox.width + 2 * dx; }
                if (handle.includes('t')) { newHeight = bbox.height - 2 * dy; }
                if (handle.includes('b')) { newHeight = bbox.height + 2 * dy; }
            } else {
                if (handle.includes('l')) { newWidth = bbox.width - dx; }
                if (handle.includes('r')) { newWidth = bbox.width + dx; }
                if (handle.includes('t')) { newHeight = bbox.height - dy; }
                if (handle.includes('b')) { newHeight = bbox.height + dy; }
            }

            if (maintainAspectRatio && bbox.width > 0 && bbox.height > 0) {
                const aspectRatio = bbox.width / bbox.height;
                const widthDrivenChange = handle.includes('l') || handle.includes('r');
                const heightDrivenChange = handle.includes('t') || handle.includes('b');
                if (widthDrivenChange && !heightDrivenChange) { newHeight = newWidth / aspectRatio; } 
                else if (heightDrivenChange && !widthDrivenChange) { newWidth = newHeight * aspectRatio; } 
                else { const newAspectRatio = newHeight > 0 ? newWidth / newHeight : 0; if (newAspectRatio > aspectRatio) { newHeight = newWidth / aspectRatio; } else { newWidth = newHeight * aspectRatio; } }
            }

            if (scaleFromCenter) {
                const deltaW = newWidth - bbox.width;
                const deltaH = newHeight - bbox.height;
                newX = bbox.x - deltaW / 2;
                newY = bbox.y - deltaH / 2;
            } else {
                if (handle.includes('l')) { newX = bbox.x + bbox.width - newWidth; }
                if (handle.includes('t')) { newY = bbox.y + bbox.height - newHeight; }
            }

            let newBboxForSnapping: Rect = { x: newX, y: newY, width: newWidth, height: newHeight };
            let finalGuides: Guide[] = [];
            if (canvasSettings.guides.enabled && !e.altKey) {
                const otherLayers = layers.filter(l => !selectedLayerIds.includes(l.id) && l.isVisible);
                const targets: Rect[] = otherLayers.map(l => ({ x: l.x, y: l.y, width: l.width, height: l.height }));
                if (!isInfiniteCanvas) { targets.push( { x: 0, y: 0, width: canvasSettings.width, height: 0 }, { x: 0, y: canvasSettings.height / 2, width: canvasSettings.width, height: 0 }, { x: 0, y: canvasSettings.height, width: canvasSettings.width, height: 0 }, { x: 0, y: 0, width: 0, height: canvasSettings.height }, { x: canvasSettings.width / 2, y: 0, width: 0, height: canvasSettings.height }, { x: canvasSettings.width, y: 0, width: 0, height: canvasSettings.height } ); }
                const { guides, snapOffset } = findGuides(newBboxForSnapping, targets);
                finalGuides = guides;
                newBboxForSnapping.x += snapOffset.x;
                newBboxForSnapping.y += snapOffset.y;
            }
            setActiveGuides(finalGuides);

            const scaleX = bbox.width > 0 ? newBboxForSnapping.width / bbox.width : 1;
            const scaleY = bbox.height > 0 ? newBboxForSnapping.height / bbox.height : 1;
            const updates = initialLayers.map(layer => {
                const relativeX = layer.x - bbox.x;
                const relativeY = layer.y - bbox.y;
                const newLayerX = newBboxForSnapping.x + relativeX * scaleX;
                const newLayerY = newBboxForSnapping.y + relativeY * scaleY;
                let newLayerWidth = layer.width * scaleX;
                let newLayerHeight = layer.height * scaleY;
                if (canvasSettings.grid.snap && !e.altKey && finalGuides.length === 0) {
                    newLayerWidth = snap(newLayerWidth, canvasSettings.grid.size);
                    newLayerHeight = snap(newLayerHeight, canvasSettings.grid.size);
                }
                const newProps: Partial<Layer> = { x: newLayerX, y: newLayerY, width: newLayerWidth, height: newLayerHeight };
                return { id: layer.id, props: newProps };
            });
            onUpdateLayers(updates, false);
            
        } else if (currentInteraction.type === 'rotate' && selectedLayer && currentInteraction.initialLayers) {
            const { initialLayers, initialCenter, initialAngle } = currentInteraction;
            if (!initialCenter || initialAngle === undefined || initialLayers.length !== 1) return;
            const currentAngle = Math.atan2(currentPointer.y - initialCenter.y, currentPointer.x - initialCenter.x);
            const angleDiff = currentAngle - initialAngle;
            let newRotation = initialLayers[0].rotation + (angleDiff * 180 / Math.PI);
            if (e.shiftKey) { // Snap rotation to 15-degree increments
                newRotation = Math.round(newRotation / 15) * 15;
            }
            onUpdateLayers([{id: initialLayers[0].id, props: { rotation: newRotation }}], false);
        } else if (currentInteraction.type === 'marquee') {
            if (!currentInteraction.hasActionStarted) {
                // @ts-ignore
                currentInteraction.hasActionStarted = true;
            }
            const { initialPointer, initialSelectedIds, isShift } = currentInteraction;
            const newMarqueeRect = {
                x: Math.min(initialPointer.x, currentPointer.x),
                y: Math.min(initialPointer.y, currentPointer.y),
                width: Math.abs(initialPointer.x - currentPointer.x),
                height: Math.abs(initialPointer.y - currentPointer.y),
            };
            setMarqueeRect(newMarqueeRect);

            const layersInMarqueeIds = layers.filter(layer => {
                if (layer.isLocked) return false;
                const layerRect = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
                return !(
                    layerRect.x > newMarqueeRect.x + newMarqueeRect.width ||
                    layerRect.x + layerRect.width < newMarqueeRect.x ||
                    layerRect.y > newMarqueeRect.y + newMarqueeRect.height ||
                    layerRect.y + layerRect.height < newMarqueeRect.y
                );
            }).map(l => l.id);

            if (isShift) {
                const newIds = new Set<string>(initialSelectedIds || []);
                layersInMarqueeIds.forEach(id => newIds.add(id));
                setSelectedLayerIds(Array.from(newIds));
            } else {
                setSelectedLayerIds(layersInMarqueeIds);
            }
        } else if (currentInteraction.type === 'drawingShape') {
            const { initialPointer, isShift, isAlt } = currentInteraction;
            
            const x1 = initialPointer.x;
            const y1 = initialPointer.y;
            const x2 = currentPointer.x;
            const y2 = currentPointer.y;
        
            let finalX, finalY, finalWidth, finalHeight;
        
            if (isAlt) { // from center
                const dx = Math.abs(x1 - x2);
                const dy = Math.abs(y1 - y2);
                if (isShift) { // square/circle
                    const side = Math.max(dx, dy) * 2;
                    finalWidth = side;
                    finalHeight = side;
                } else {
                    finalWidth = dx * 2;
                    finalHeight = dy * 2;
                }
                finalX = x1 - finalWidth / 2;
                finalY = y1 - finalHeight / 2;
            } else { // from corner
                finalX = Math.min(x1, x2);
                finalY = Math.min(y1, y2);
                finalWidth = Math.abs(x1 - x2);
                finalHeight = Math.abs(y1 - y2);
        
                if (isShift) {
                    finalWidth = finalHeight = Math.max(finalWidth, finalHeight);
                    if (x2 < x1) finalX = x1 - finalWidth;
                    if (y2 < y1) finalY = y1 - finalHeight;
                }
            }
            setMarqueeRect({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (panStartRef.current) panStartRef.current = null;
        setActiveGuides([]); // Clear guides on mouse up
        if (interaction) {
            if (interaction.type === 'marquee') {
                if (!interaction.hasActionStarted) {
                    setSelectedLayerIds([]);
                }
                setMarqueeRect(null);
            } else if (interaction.type === 'drawingShape') {
                if (marqueeRect && marqueeRect.width > 5 && marqueeRect.height > 5) {
                    const tool = interaction.tool;
                    if (tool === 'rectangle' || tool === 'ellipse') {
                        addLayer({
                            type: 'shape',
                            shapeType: tool,
                            fillColor: shapeFillColor,
                            borderRadius: 0,
                            x: marqueeRect.x,
                            y: marqueeRect.y,
                            width: marqueeRect.width,
                            height: marqueeRect.height,
                            rotation: 0,
                            opacity: 100,
                            blendMode: 'source-over',
                            isVisible: true,
                            isLocked: false,
                            fontWeight: 'normal',
                            fontStyle: 'normal',
                            textTransform: 'none',
                        });
                    }
                }
                setMarqueeRect(null);
                setActiveCanvasTool('select');
            } else if (interaction.type === 'move' || interaction.type === 'resize' || interaction.type === 'rotate') {
                const updatedLayers = selectedLayerIds.map(id => ({ id, props: layers.find(layer => layer.id === id) || {} }));
                onUpdateLayers(updatedLayers, true);
            }
            setInteraction(null);
        }
    };
    
    const handleLayerPointerDown = (e: React.PointerEvent<HTMLDivElement>, layerId: string) => {
        if (activeCanvasTool !== 'select' || isSpacePanning) return;
        e.stopPropagation();
        
        const layer = layers.find(l => l.id === layerId);
        if (!layer || layer.isLocked) {
            if (!e.shiftKey) setSelectedLayerIds([]);
            return;
        }
        
        const pointer = getPointerInCanvas(e);
        if (!pointer) return;

        let newSelectedIds = [...selectedLayerIds];
        if (e.shiftKey) {
            newSelectedIds = selectedLayerIds.includes(layerId)
                ? selectedLayerIds.filter(id => id !== layerId)
                : [...selectedLayerIds, layerId];
        } else if (!selectedLayerIds.includes(layerId)) {
            newSelectedIds = [layerId];
        }
        setSelectedLayerIds(newSelectedIds);

        const currentSelectedLayers = layers.filter(l => newSelectedIds.includes(l.id));

        if(currentSelectedLayers.length > 0) {
            beginInteraction();
            const bbox = getBoundingBoxForLayers(currentSelectedLayers);
            if (e.altKey) {
                setInteraction({ type: 'duplicate-move', initialLayers: currentSelectedLayers.map(l => ({...l})), initialBoundingBox: bbox, initialPointer: pointer, hasActionStarted: false });
            } else {
                setInteraction({ type: 'move', initialLayers: currentSelectedLayers.map(l => ({...l})), initialBoundingBox: bbox, initialPointer: pointer });
            }
        }
    };
    
    const handleHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>, handle: Handle) => {
        e.stopPropagation();
        const pointer = getPointerInCanvas(e);
        if (pointer && selectionBoundingBox) {
            beginInteraction();
            setInteraction({ type: 'resize', handle, initialLayers: selectedLayers.map(l => ({...l})), initialPointer: pointer, initialBoundingBox: selectionBoundingBox });
        }
    };

    const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const pointer = getPointerInCanvas(e);
        if (selectedLayer && !selectedLayer.isLocked && pointer) {
            beginInteraction();
            const centerX = selectedLayer.x + selectedLayer.width / 2;
            const centerY = selectedLayer.y + selectedLayer.height / 2;
            const initialAngle = Math.atan2(pointer.y - centerY, pointer.x - centerX);
            setInteraction({ type: 'rotate', initialLayers: [{...selectedLayer}], initialPointer: pointer, initialCenter: { x: centerX, y: centerY }, initialAngle });
        }
    };
    
    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (activeCanvasTool === 'hand' || isSpacePanning) {
            const pointer = getPointerInView(e);
            if (pointer) {
                panStartRef.current = { pan: { x: panX.get(), y: panY.get() }, pointer };
                e.currentTarget.style.cursor = 'grabbing';
            }
        } else if (activeCanvasTool === 'select') {
            const coords = getPointerInCanvas(e);
            if (!coords) return;
            setInteraction({
                type: 'marquee',
                initialPointer: coords,
                isShift: e.shiftKey,
                initialSelectedIds: selectedLayerIds,
                hasActionStarted: false,
            });
        } else if (activeCanvasTool === 'rectangle' || activeCanvasTool === 'ellipse') {
            const coords = getPointerInCanvas(e);
            if (!coords) return;
            
            beginInteraction();
            setInteraction({
                type: 'drawingShape',
                tool: activeCanvasTool,
                initialPointer: coords,
                isShift: e.shiftKey,
                isAlt: e.altKey,
            });
            setMarqueeRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
        }
    };

    const handleFitCanvas = useCallback(() => {
        if (canvasViewRef.current) {
            const { clientWidth: viewWidth, clientHeight: viewHeight } = canvasViewRef.current;
            const { width: canvasWidth, height: canvasHeight } = canvasSettings;
            if (viewWidth > 0 && viewHeight > 0 && canvasWidth > 0 && canvasHeight > 0) {
                const newZoom = Math.min(viewWidth / canvasWidth, viewHeight / canvasHeight) * 0.95;
                scale.set(newZoom); panX.set(0); panY.set(0);
            }
        }
    }, [canvasSettings.width, canvasSettings.height, scale, panX, panY, canvasViewRef]);

    const handleZoomChange = (direction: 'in' | 'out') => {
        const viewRect = canvasViewRef.current?.getBoundingClientRect(); if (!viewRect) return;
        const currentZoom = scale.get(); const newZoom = Math.max(0.1, Math.min(direction === 'in' ? currentZoom * 1.2 : currentZoom / 1.2, 5));
        const viewCenter = { x: viewRect.width / 2, y: viewRect.height / 2 }; const oldPan = { x: panX.get(), y: panY.get() };
        const scaleRatio = newZoom / currentZoom;
        panX.set(viewCenter.x * (1 - scaleRatio) + oldPan.x * scaleRatio);
        panY.set(viewCenter.y * (1 - scaleRatio) + oldPan.y * scaleRatio);
        scale.set(newZoom);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const viewRect = canvasViewRef.current?.getBoundingClientRect(); if (!viewRect) return;
        const currentZoom = scale.get(); 
        const newZoom = Math.max(0.1, Math.min(currentZoom * Math.pow(2, -e.deltaY * 0.002), 10));
        if (newZoom === currentZoom) return;
        const mousePosInView = { x: e.clientX - viewRect.left, y: e.clientY - viewRect.top }; const oldPan = { x: panX.get(), y: panY.get() };
        const scaleRatio = newZoom / currentZoom;
        panX.set(mousePosInView.x * (1 - scaleRatio) + oldPan.x * scaleRatio);
        panY.set(mousePosInView.y * (1 - scaleRatio) + oldPan.y * scaleRatio);
        scale.set(newZoom);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); onFilesDrop(e.dataTransfer.files); };

    useEffect(() => {
        handleFitCanvas();
    }, [canvasSettings, handleFitCanvas]);

    // This effect resizes the preview canvas to match the viewport size.
    useEffect(() => {
        const view = canvasViewRef.current;
        const canvas = previewCanvasRef.current;
        if (!view || !canvas) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;
                }
            }
        });

        resizeObserver.observe(view);
        return () => resizeObserver.disconnect();
    }, [canvasViewRef, previewCanvasRef]);

    const redrawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        const view = canvasViewRef.current;
        if (!canvas || !view) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(view.clientWidth / 2, view.clientHeight / 2);
        ctx.translate(panX.get(), panY.get());
        const s = scale.get();
        ctx.scale(s, s);
        ctx.translate(-canvasSettings.width / 2, -canvasSettings.height / 2);
        
        if (marqueeRect && (interaction?.type === 'marquee' || interaction?.type === 'drawingShape')) {
            ctx.save();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
            ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
            ctx.lineWidth = 1 / s;
            ctx.setLineDash([4 / s, 4 / s]);

            if (interaction?.tool === 'ellipse' && interaction.type === 'drawingShape') {
                ctx.beginPath();
                ctx.ellipse(
                    marqueeRect.x + marqueeRect.width / 2,
                    marqueeRect.y + marqueeRect.height / 2,
                    marqueeRect.width / 2,
                    marqueeRect.height / 2,
                    0, 0, 2 * Math.PI
                );
                ctx.stroke();
                ctx.fill();
            } else { // marquee and rectangle
                ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height);
                ctx.fillRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height);
            }
            ctx.restore();
        }

        ctx.restore();
    }, [marqueeRect, canvasSettings, interaction, canvasViewRef, panX, panY, scale]);

    useEffect(() => {
        let animId: number;
        const animate = () => {
            redrawPreview();
            animId = requestAnimationFrame(animate);
        };
        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [redrawPreview]);
    
    const gridStyle = useMemo(() => {
        if (isInfiniteCanvas || !canvasSettings.grid.visible) return {};
        return {
            width: canvasSettings.width,
            height: canvasSettings.height,
            backgroundImage: `
                linear-gradient(${canvasSettings.grid.color} 1px, transparent 1px),
                linear-gradient(90deg, ${canvasSettings.grid.color} 1px, transparent 1px)
            `,
            backgroundSize: `${canvasSettings.grid.size}px ${canvasSettings.grid.size}px`,
        };
    }, [isInfiniteCanvas, canvasSettings]);
    
    const inverseScale = useTransform(scale, (s: number) => 1 / s);
    const yOffset = useTransform(scale, (s: number) => 10 / s);
    const xOffset = useTransform(scale, (s: number) => 10 / s);

    return (
        <main
            ref={canvasViewRef}
            className={cn(
                "flex-1 flex items-center justify-center p-6 bg-neutral-800/30 overflow-hidden relative",
                isInfiniteCanvas && "infinite-canvas-bg"
            )}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={(e) => { handlePointerUp(e); setCursorPosition(null); }}
            onWheel={handleWheel}
            style={{ cursor: interaction?.type === 'rotate' ? 'alias' : (activeCanvasTool === 'hand' || isSpacePanning) ? 'grab' : 'default' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <motion.div
                id="canvas-wrapper"
                className="relative shadow-lg flex-shrink-0"
                style={{
                    width: canvasSettings.width,
                    height: canvasSettings.height,
                    backgroundColor: isInfiniteCanvas ? 'transparent' : canvasSettings.background,
                    x: panX,
                    y: panY,
                    scale
                }}
            >
                {activeGuides.map((guide, index) => (
                    <div
                        key={`guide-${index}`}
                        className="absolute pointer-events-none"
                        style={{
                            backgroundColor: canvasSettings.guides.color,
                            ...(guide.axis === 'x'
                                ? {
                                    left: guide.position,
                                    top: guide.start,
                                    height: guide.end - guide.start,
                                    width: 1 / scale.get()
                                  }
                                : {
                                    top: guide.position,
                                    left: guide.start,
                                    width: guide.end - guide.start,
                                    height: 1 / scale.get()
                                  })
                        }}
                    />
                ))}
                {!isInfiniteCanvas && canvasSettings.grid.visible && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={gridStyle}
                    />
                )}
                {layers.map((layer, index) => {
                    return (
                        <LayerItem
                            key={layer.id}
                            layer={layer}
                            isInteracting={!!interaction}
                            captureLayer={captureLayer}
                            activeCanvasTool={activeCanvasTool}
                            isSpacePanning={isSpacePanning}
                            onLayerPointerDown={handleLayerPointerDown}
                            zIndex={layers.length - 1 - index}
                        />
                    );
                })}
                
                {(selectionBoundingBox && (selectedLayers.length > 0) && !(selectedLayers.length === 1 && selectedLayers[0].isLocked)) && (
                    <SelectionFrame 
                        boundingBox={selectionBoundingBox} 
                        rotation={(selectedLayer ? selectedLayer.rotation : 0)}
                        isMultiSelect={selectedLayers.length > 1}
                        scaleMV={scale} 
                        onHandlePointerDown={handleHandlePointerDown} 
                        onRotatePointerDown={handleRotatePointerDown}
                        isInteracting={!!interaction}
                    />
                )}
                
                {selectedLayers.length === 1 && selectedLayer && !selectedLayer.isLocked && <FloatingLayerToolbar layer={selectedLayer} onAction={onToolbarAction} scaleMV={scale} />}
                {selectedLayers.length > 1 && selectionBoundingBox && <FloatingMultiLayerToolbar 
                    boundingBox={selectionBoundingBox}
                    scaleMV={scale}
                    onAction={onMultiLayerAction}
                    selectedLayerCount={selectedLayers.length}
                />}
                <AnimatePresence>
                    {isCommandKeyPressed && selectionBoundingBox && selectedLayers.length > 0 && (
                        <>
                            {/* Width Label */}
                            <motion.div
                                className="absolute z-[1003] flex items-center justify-center bg-yellow-400 text-black text-sm font-bold font-mono px-2 py-1 rounded-md pointer-events-none shadow-lg"
                                style={{
                                    scale: inverseScale,
                                    left: selectionBoundingBox.x + selectionBoundingBox.width / 2,
                                    top: selectionBoundingBox.y + selectionBoundingBox.height,
                                    x: '-50%',
                                    y: yOffset,
                                }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.1 }}
                            >
                                {Math.round(selectionBoundingBox.width)}
                            </motion.div>
                            
                            {/* Height Label */}
                            <motion.div
                                className="absolute z-[1003] flex items-center justify-center bg-yellow-400 text-black text-sm font-bold font-mono px-2 py-1 rounded-md pointer-events-none shadow-lg"
                                style={{
                                    scale: inverseScale,
                                    left: selectionBoundingBox.x + selectionBoundingBox.width,
                                    top: selectionBoundingBox.y + selectionBoundingBox.height / 2,
                                    x: xOffset,
                                    y: '-50%',
                                }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.1 }}
                            >
                                {Math.round(selectionBoundingBox.height)}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Preview Canvas for ephemeral drawings like marquee, pen path preview etc. */}
            <canvas 
                ref={previewCanvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                style={{ zIndex: 1002 }} 
            />

            <CanvasToolbar zoomDisplay={zoomDisplay} activeTool={activeCanvasTool} isLayerSelected={!!selectedLayer} onZoomIn={() => handleZoomChange('in')} onZoomOut={() => handleZoomChange('out')} onFit={handleFitCanvas} onToolSelect={setActiveCanvasTool} onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} />
             <AnimatePresence>
                {isDraggingOver && (
                    <motion.div
                        className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="text-2xl font-bold text-yellow-400">{t('layerComposer_dropPrompt')}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
};