/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { type Point, type Rect, type CropResizeHandle, type Tool } from './ImageEditor.types';
import { getCursorForHandle, isPointInRect } from './ImageEditor.utils';
import { cn } from '../../lib/utils';
import { UndoIcon, RedoIcon, ZoomOutIcon, ZoomInIcon, HandIcon, LoadingSpinnerIcon } from '../icons';
import { OVERLAY_PADDING } from './ImageEditor.constants';

// --- Reusable Floating Toolbar ---
interface ImageEditorCanvasToolbarProps {
    zoomDisplay: number;
    activeTool: string | null;
    onHandToolSelect: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const ImageEditorCanvasToolbar: React.FC<ImageEditorCanvasToolbarProps> = ({
    zoomDisplay, onZoomIn, onZoomOut, onFit, onUndo, onRedo, canUndo, canRedo, activeTool, onHandToolSelect
}) => {
    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg">
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon className="h-5 w-5" strokeWidth={1.5} /></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon className="h-5 w-5" strokeWidth={1.5} /></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={onZoomOut} title="Zoom Out (-)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><ZoomOutIcon className="h-5 w-5" strokeWidth={2} /></button>
            <button onClick={onFit} className="px-3 py-2 text-sm font-semibold rounded-md hover:bg-neutral-700 transition-colors">{zoomDisplay}%</button>
            <button onClick={onZoomIn} title="Zoom In (+)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><ZoomInIcon className="h-5 w-5" strokeWidth={2} /></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button
                onClick={onHandToolSelect}
                title="Hand Tool (H, hold Space)"
                className={cn(
                    "p-2 rounded-md transition-colors",
                    activeTool === 'hand' ? 'bg-yellow-400 text-black' : 'hover:bg-neutral-700'
                )}
            >
                <HandIcon className="h-5 w-5" strokeWidth="1.5"/>
            </button>
        </div>
    );
};


// --- Main Canvas Component ---
interface ImageEditorCanvasProps {
    previewCanvasRef: React.RefObject<HTMLCanvasElement>;
    drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
    overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
    tempDrawingCanvasRef: React.RefObject<HTMLCanvasElement>;
    handleActionStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
    handleCanvasMouseMove: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
    handleActionEnd: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
    setIsCursorOverCanvas: (isOver: boolean) => void;
    setHoveredCropHandle: (handle: CropResizeHandle | null) => void;
    
    // State for rendering overlays
    activeTool: string | null;
    handleToolSelect: (tool: Tool) => void;
    isDrawing: boolean;
    isCursorOverCanvas: boolean;
    cursorPosition: Point | null;
    cropSelection: Rect | null;
    hoveredCropHandle: CropResizeHandle | null;
    brushSize: number;
    brushHardness: number;
    brushOpacity: number;
    brushColor: string;
    isLoading: boolean;
    isProcessing: boolean;
    
    // Selection related states for drawing overlays
    isSelectionActive: boolean;
    selectionPath: Path2D | null;
    interactionState: string;
    currentDrawingPointsRef: React.RefObject<Point[]>;
    marqueeRect: Rect | null;
    ellipseRect: Rect | null;
    penPathPoints: { anchor: Point, outHandle: Point, inHandle: Point }[];
    currentPenDrag: { start: Point, current: Point } | null;
    
    // Perspective crop states
    perspectiveCropPoints: Point[];
    hoveredPerspectiveHandleIndex: number | null;

    // Pan & Zoom props
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    zoomDisplay: number;
    canvasViewRef: React.RefObject<HTMLDivElement>;
    canvasDimensions: { width: number; height: number; };
    isSpacePanning: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    handleUndo: () => void;
    handleRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const ImageEditorCanvas: React.FC<ImageEditorCanvasProps> = (props) => {
    const {
        previewCanvasRef, drawingCanvasRef, overlayCanvasRef, tempDrawingCanvasRef,
        handleActionStart, handleCanvasMouseMove, handleActionEnd,
        setIsCursorOverCanvas, setHoveredCropHandle,
        activeTool, handleToolSelect, isDrawing, isCursorOverCanvas, cursorPosition, cropSelection, hoveredCropHandle,
        brushSize, brushHardness, brushOpacity, brushColor, isLoading, isProcessing,
        isSelectionActive, selectionPath, interactionState, currentDrawingPointsRef, marqueeRect,
        ellipseRect, penPathPoints, currentPenDrag, perspectiveCropPoints, hoveredPerspectiveHandleIndex,
        panX, panY, scale, zoomDisplay, canvasViewRef, canvasDimensions, isSpacePanning,
        onZoomIn, onZoomOut, onFit, handleUndo, handleRedo, canUndo, canRedo
    } = props;
    
    const marchingAntsOffsetRef = useRef(0);
    
    const getCursorStyle = () => {
        if (activeTool === 'hand' || isSpacePanning) return 'grab';
        if (activeTool === 'colorpicker') return 'crosshair';
        if (activeTool === 'brush' || activeTool === 'eraser') return 'none';
        if (activeTool === 'crop') {
            const handleCursor = getCursorForHandle(hoveredCropHandle);
            if (handleCursor) return handleCursor;
            if (cropSelection && cursorPosition && isPointInRect(cursorPosition, cropSelection)) return 'move';
            return 'crosshair';
        }
        if (activeTool === 'perspective-crop') {
            if (interactionState === 'placingPerspectivePoints') {
                return 'crosshair';
            }
            if (hoveredPerspectiveHandleIndex !== null) return 'grab';
            return 'default';
        }
        if (activeTool === 'selection' || activeTool === 'pen' || activeTool === 'marquee' || activeTool === 'ellipse') return 'crosshair';
        return 'default';
    };

    const handleCanvasMouseLeave = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsCursorOverCanvas(false);
        setHoveredCropHandle(null);
        handleActionEnd(e);
    };
    
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        const viewRect = canvasViewRef.current?.getBoundingClientRect();
        if (!viewRect) return;

        const currentZoom = scale.get();
        const delta = -e.deltaY * 0.002;
        const newZoom = currentZoom * Math.pow(2, delta);
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));

        if (clampedZoom === currentZoom) return;

        const mousePosInView = { x: e.clientX - viewRect.left, y: e.clientY - viewRect.top };
        const oldPan = { x: panX.get(), y: panY.get() };
        const scaleRatio = clampedZoom / currentZoom;

        const newPanX = mousePosInView.x * (1 - scaleRatio) + oldPan.x * scaleRatio;
        const newPanY = mousePosInView.y * (1 - scaleRatio) + oldPan.y * scaleRatio;

        scale.set(clampedZoom);
        panX.set(newPanX);
        panY.set(newPanY);
    };

    const cursorStyle = useMemo(() => {
        if (!isCursorOverCanvas || isDrawing || (activeTool !== 'brush' && activeTool !== 'eraser') || !cursorPosition) {
            return { display: 'none' };
        }
        const hardness = brushHardness / 100;
        const hardnessStop = Math.pow(hardness, 2) * 100;
        let cursorBackground: string, cursorBorder: string, cursorBoxShadow: string;
    
        if (activeTool === 'brush') {
            let color = brushColor;
            let transparentColor = 'transparent';
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
                transparentColor = `rgba(${r},${g},${b},0)`;
                color = `rgba(${r},${g},${b},${brushOpacity / 100 * 0.85})`;
            } else {
                 transparentColor = color.replace(/rgba?\((\d+,\s*\d+,\s*\d+)[^)]*\)/, 'rgba($1, 0)');
            }
            cursorBackground = `radial-gradient(circle, ${color} ${hardnessStop}%, ${transparentColor} 100%)`;
            cursorBorder = `1px solid rgba(255,255,255,0.8)`;
            cursorBoxShadow = `0 0 0 1px rgba(0,0,0,0.8)`;
    
        } else { // eraser
            cursorBackground = `radial-gradient(circle, rgba(255,255,255,${brushOpacity / 100 * 0.3}) ${hardnessStop}%, rgba(255,255,255,0) 100%)`;
            cursorBorder = `1px solid rgba(0,0,0,0.8)`;
            cursorBoxShadow = `0 0 0 1px rgba(255,255,255,0.8)`;
        }
        return {
            position: 'absolute' as 'absolute', borderRadius: '50%', pointerEvents: 'none' as 'none',
            left: `${cursorPosition.x}px`,
            top: `${cursorPosition.y}px`,
            width: `${brushSize}px`, height: `${brushSize}px`,
            transform: `translate(-50%, -50%)`,
            background: cursorBackground, border: cursorBorder, boxShadow: cursorBoxShadow,
        };
    }, [isCursorOverCanvas, isDrawing, activeTool, cursorPosition, brushSize, brushHardness, brushOpacity, brushColor]);

    useEffect(() => {
        let animId: number;
        const animate = () => {
            const overlay = overlayCanvasRef.current;
            if (overlay) {
                const ctx = overlay.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, overlay.width, overlay.height);

                    // --- DRAW BRUSH PREVIEW (un-translated) ---
                    // This is drawn directly onto the large overlay canvas without translation
                    // because the tempDrawingCanvas is also large and has the padding baked in.
                    if (isDrawing && (activeTool === 'brush' || activeTool === 'eraser') && tempDrawingCanvasRef.current) {
                        ctx.save();
                        ctx.globalAlpha = brushOpacity / 100;
                        ctx.drawImage(tempDrawingCanvasRef.current, 0, 0);
                        ctx.restore();
                    }

                    // --- DRAW EVERYTHING ELSE (translated) ---
                    // Translate the context so that (0,0) aligns with the top-left of the image area.
                    // All other drawing logic can use image-space coordinates directly.
                    ctx.save();
                    ctx.translate(OVERLAY_PADDING, OVERLAY_PADDING);
                    
                    if (isSelectionActive && selectionPath) {
                        ctx.save(); ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
                        ctx.lineDashOffset = -marchingAntsOffsetRef.current; ctx.stroke(selectionPath);
                        ctx.strokeStyle = 'black'; ctx.lineDashOffset = -marchingAntsOffsetRef.current + 5; ctx.stroke(selectionPath);
                        ctx.restore();
                    }
                    if (activeTool === 'perspective-crop' && perspectiveCropPoints.length > 0) {
                        const points = perspectiveCropPoints;
                        ctx.save();
                        ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
                        ctx.lineWidth = 2;
                        ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';

                        // Draw lines between placed points
                        ctx.beginPath();
                        ctx.moveTo(points[0].x, points[0].y);
                        for (let i = 1; i < points.length; i++) {
                            ctx.lineTo(points[i].x, points[i].y);
                        }

                        if (points.length === 4) {
                            ctx.closePath();
                            ctx.fill();
                        } else if (cursorPosition && interactionState === 'placingPerspectivePoints') {
                            // Draw rubber band line to cursor
                            ctx.lineTo(cursorPosition.x, cursorPosition.y);
                        }
                        ctx.stroke();

                        // Draw points/handles
                        points.forEach((p, i) => {
                            ctx.beginPath();
                            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                            ctx.fillStyle = (hoveredPerspectiveHandleIndex === i && points.length === 4) ? '#FBBF24' : 'white';
                            ctx.fill();
                            ctx.strokeStyle = '#333';
                            ctx.lineWidth = 1.5;
                            ctx.stroke();
                        });
                        ctx.restore();
                    }
                    if (interactionState === 'drawingSelection' && currentDrawingPointsRef.current && currentDrawingPointsRef.current.length > 1) {
                        ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(currentDrawingPointsRef.current[0].x, currentDrawingPointsRef.current[0].y);
                        for(let i = 1; i < currentDrawingPointsRef.current.length; i++) ctx.lineTo(currentDrawingPointsRef.current[i].x, currentDrawingPointsRef.current[i].y);
                        ctx.stroke(); ctx.restore();
                    }
                    if (interactionState === 'drawingMarquee' && marqueeRect) {
                        ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                        ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height); ctx.restore();
                    }
                    if (interactionState === 'drawingEllipse' && ellipseRect) {
                        ctx.save();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 3]);
                        ctx.beginPath();
                        ctx.ellipse(
                            ellipseRect.x + ellipseRect.width / 2,
                            ellipseRect.y + ellipseRect.height / 2,
                            ellipseRect.width / 2,
                            ellipseRect.height / 2,
                            0, 0, 2 * Math.PI
                        );
                        ctx.stroke();
                        ctx.restore();
                    }
                    if (activeTool === 'pen') {
                        // --- Styles for clarity (adapted from LayerComposer) ---
                        const pathColor = 'rgba(251, 191, 36, 1)'; // Solid Yellow
                        const handleColor = 'rgba(59, 130, 246, 1)'; // Solid Blue
                        const anchorColor = 'white';
                        const pathWidth = 1.5;
                        const handleLineWidth = 1;
                        const anchorSize = 8;
                        const handleSize = 6;
                        
                        ctx.save();
                
                        // 1. Draw committed path segments
                        if (penPathPoints.length > 0) {
                            ctx.strokeStyle = pathColor;
                            ctx.lineWidth = pathWidth;
                            ctx.beginPath();
                            ctx.moveTo(penPathPoints[0].anchor.x, penPathPoints[0].anchor.y);
                            for (let i = 0; i < penPathPoints.length - 1; i++) {
                                const p0 = penPathPoints[i];
                                const p1 = penPathPoints[i + 1];
                                ctx.bezierCurveTo(p0.outHandle.x, p0.outHandle.y, p1.inHandle.x, p1.inHandle.y, p1.anchor.x, p1.anchor.y);
                            }
                            ctx.stroke();
                        }
                
                        // 2. Draw preview segment to cursor or drag point
                        if (penPathPoints.length > 0) {
                            const lastNode = penPathPoints[penPathPoints.length - 1];
                            ctx.beginPath();
                            ctx.strokeStyle = pathColor;
                            
                            if (currentPenDrag) {
                                // Previewing a new CURVED segment while dragging
                                ctx.lineWidth = pathWidth;
                                ctx.setLineDash([]);
                                const p0 = lastNode;
                                const p3_anchor = currentPenDrag.start;
                                const p3_outHandle = currentPenDrag.current;
                                const p3_inHandle = { 
                                    x: p3_anchor.x - (p3_outHandle.x - p3_anchor.x), 
                                    y: p3_anchor.y - (p3_outHandle.y - p3_anchor.y) 
                                };
                                ctx.moveTo(p0.anchor.x, p0.anchor.y);
                                ctx.bezierCurveTo(p0.outHandle.x, p0.outHandle.y, p3_inHandle.x, p3_inHandle.y, p3_anchor.x, p3_anchor.y);
                            } else if (cursorPosition) {
                                // Previewing a new STRAIGHT segment while moving mouse
                                ctx.lineWidth = handleLineWidth;
                                ctx.setLineDash([4, 4]);
                                ctx.moveTo(lastNode.anchor.x, lastNode.anchor.y);
                                ctx.lineTo(cursorPosition.x, cursorPosition.y);
                            }
                            ctx.stroke();
                        }
                
                        // 3. Draw handles for committed points
                        penPathPoints.forEach(p => {
                            // Handle line
                            ctx.beginPath();
                            ctx.strokeStyle = handleColor;
                            ctx.lineWidth = handleLineWidth;
                            ctx.setLineDash([]);
                            ctx.moveTo(p.inHandle.x, p.inHandle.y);
                            ctx.lineTo(p.outHandle.x, p.outHandle.y);
                            ctx.stroke();
                            
                            // Handle circles
                            ctx.fillStyle = handleColor;
                            ctx.beginPath();
                            ctx.arc(p.inHandle.x, p.inHandle.y, handleSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(p.outHandle.x, p.outHandle.y, handleSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                        });
                
                        // 4. Draw handles for the point being created
                        if (currentPenDrag) {
                            const p_anchor = currentPenDrag.start;
                            const p_outHandle = currentPenDrag.current;
                            const p_inHandle = { 
                                x: p_anchor.x - (p_outHandle.x - p_anchor.x), 
                                y: p_anchor.y - (p_outHandle.y - p_anchor.y) 
                            };
                            
                            // Handle line
                            ctx.beginPath();
                            ctx.strokeStyle = handleColor;
                            ctx.lineWidth = handleLineWidth;
                            ctx.setLineDash([]);
                            ctx.moveTo(p_inHandle.x, p_inHandle.y);
                            ctx.lineTo(p_outHandle.x, p_outHandle.y);
                            ctx.stroke();
                            
                            // Handle circles
                            ctx.fillStyle = handleColor;
                            ctx.beginPath();
                            ctx.arc(p_inHandle.x, p_inHandle.y, handleSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(p_outHandle.x, p_outHandle.y, handleSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        // 5. Draw all anchor points on top
                        const drawAnchor = (p: Point) => {
                            ctx.fillStyle = anchorColor;
                            ctx.strokeStyle = handleColor;
                            ctx.lineWidth = handleLineWidth;
                            ctx.setLineDash([]);
                            ctx.fillRect(p.x - anchorSize / 2, p.y - anchorSize / 2, anchorSize, anchorSize);
                            ctx.strokeRect(p.x - anchorSize / 2, p.y - anchorSize / 2, anchorSize, anchorSize);
                        };
                        
                        penPathPoints.forEach(p => drawAnchor(p.anchor));
                
                        // Anchor point for the point being created
                        if (currentPenDrag) {
                             drawAnchor(currentPenDrag.start);
                        }
                
                        ctx.restore();
                    }
                    if (activeTool === 'colorpicker' && isCursorOverCanvas && cursorPosition) {
                        const previewCtx = previewCanvasRef.current?.getContext('2d', { willReadFrequently: true });
                        if (previewCtx) {
                            try {
                                const pixel = previewCtx.getImageData(cursorPosition.x, cursorPosition.y, 1, 1).data;
                                const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                                const circleRadius = 12, offset = 20;
                                ctx.save();
                                ctx.beginPath(); ctx.arc(cursorPosition.x + offset, cursorPosition.y + offset, circleRadius, 0, Math.PI * 2);
                                ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
                                ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
                            } catch (e) { console.warn("Could not get pixel data for color picker preview.", e); }
                        }
                    }
                    ctx.restore(); // Restore from the OVERLAY_PADDING translation

                    marchingAntsOffsetRef.current = (marchingAntsOffsetRef.current + 0.5) % 10;
                }
            }
            animId = requestAnimationFrame(animate);
        };
        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [isSelectionActive, selectionPath, interactionState, activeTool, penPathPoints, cursorPosition, currentPenDrag, isCursorOverCanvas, marqueeRect, ellipseRect, isDrawing, brushOpacity, perspectiveCropPoints, hoveredPerspectiveHandleIndex]);

    return (
        <div 
            ref={canvasViewRef} 
            className="image-editor-preview-container w-full h-full relative overflow-hidden" 
            onWheel={handleWheel}
            onPointerDown={handleActionStart}
            onPointerMove={handleCanvasMouseMove}
            onPointerUp={handleActionEnd}
            onPointerLeave={handleCanvasMouseLeave}
            onMouseEnter={() => setIsCursorOverCanvas(true)}
            style={{ touchAction: 'none', cursor: getCursorStyle() }}
        >
            <motion.div
                className="relative flex items-center justify-center"
                style={{
                    width: canvasDimensions.width,
                    height: canvasDimensions.height,
                    x: panX,
                    y: panY,
                    scale: scale,
                }}
            >
                <canvas ref={previewCanvasRef} className="image-editor-preview absolute" />
                <canvas ref={drawingCanvasRef} className="image-editor-preview absolute" />
                <canvas 
                    ref={overlayCanvasRef} 
                    className="absolute" 
                    style={{ 
                        pointerEvents: 'none',
                        left: -OVERLAY_PADDING,
                        top: -OVERLAY_PADDING,
                    }}
                />
                 {cropSelection && (
                    <div className="absolute pointer-events-none" style={{
                        left: cropSelection.x, top: cropSelection.y,
                        width: cropSelection.width, height: cropSelection.height, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.8)',
                    }} />
                )}
                 <div style={cursorStyle} aria-hidden="true" />
            </motion.div>

            <ImageEditorCanvasToolbar
                zoomDisplay={zoomDisplay}
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                onFit={onFit}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                activeTool={activeTool}
                onHandToolSelect={() => handleToolSelect('hand')}
            />
            
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-center text-white z-10 rounded-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingSpinnerIcon className="animate-spin h-10 w-10 text-yellow-400 mb-4" />
                        <p className="font-bold text-lg">Đang xử lý bằng AI...</p>
                        <p className="text-sm text-neutral-300">Quá trình này có thể mất một vài giây.</p>
                    </motion.div>
                )}
            </AnimatePresence>
             <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-center text-white z-10 rounded-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingSpinnerIcon className="animate-spin h-10 w-10 text-yellow-400 mb-4" />
                        <p className="font-bold text-lg">Đang xử lý...</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};