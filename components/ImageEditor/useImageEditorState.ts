
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { useMotionValue, useMotionValueEvent } from 'framer-motion';
import { handleFileUpload, type ImageToEdit } from '../uiUtils';
import { removeImageBackground, editImageWithPrompt } from '../../services/geminiService';
import { 
    type Tool, type EditorStateSnapshot, type Point, type Rect, type CropResizeHandle, type CropAction,
    type Interaction, type SelectionStroke, type PenNode, type ColorChannel,
    type ColorAdjustments,
} from './ImageEditor.types';
import { INITIAL_COLOR_ADJUSTMENTS, COLOR_CHANNELS, HANDLE_SIZE, OVERLAY_PADDING } from './ImageEditor.constants';
import { 
    rgbToHsl, hslToRgb, isPointInRect, getRatioValue, getHandleAtPoint, 
    getCursorForHandle, approximateCubicBezier, getPerspectiveTransform, warpPerspective, hexToRgba,
    createFeatheredMask
} from './ImageEditor.utils';


export const useImageEditorState = (
    imageToEdit: ImageToEdit | null,
    canvasViewRef: React.RefObject<HTMLDivElement>
) => {
    // --- State & Refs ---
    const [internalImageUrl, setInternalImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // History states
    const [history, setHistory] = useState<EditorStateSnapshot[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Filter states
    const [luminance, setLuminance] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [temp, setTemp] = useState(0);
    const [tint, setTint] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [vibrance, setVibrance] = useState(0);
    const [hue, setHue] = useState(0);
    const [grain, setGrain] = useState(0);
    const [clarity, setClarity] = useState(0);
    const [dehaze, setDehaze] = useState(0);
    const [blur, setBlur] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    const [isInverted, setIsInverted] = useState(false);
    const [colorAdjustments, setColorAdjustments] = useState<ColorAdjustments>(INITIAL_COLOR_ADJUSTMENTS);
    
    // UI states
    const [openSection, setOpenSection] = useState<'adj' | 'hls' | 'effects' | 'magic' | null>('magic');
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    const [isWebcamModalOpen, setIsWebcamModalOpen] = useState(false);
    const [activeColorTab, setActiveColorTab] = useState<ColorChannel>(Object.keys(INITIAL_COLOR_ADJUSTMENTS)[0] as ColorChannel);
    const [isShowingOriginal, setIsShowingOriginal] = useState(false);

    // Tool states
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [brushHardness, setBrushHardness] = useState(50);
    const [brushOpacity, setBrushOpacity] = useState(50);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [isDrawing, setIsDrawing] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
    const [isCursorOverCanvas, setIsCursorOverCanvas] = useState(false);
    const [aiEditPrompt, setAiEditPrompt] = useState('');

    // Crop-specific states
    const [cropSelection, setCropSelection] = useState<Rect | null>(null);
    const [cropAspectRatio, setCropAspectRatio] = useState('Free');
    const [cropAction, setCropAction] = useState<CropAction | null>(null);
    const [hoveredCropHandle, setHoveredCropHandle] = useState<CropResizeHandle | null>(null);
    const [perspectiveCropPoints, setPerspectiveCropPoints] = useState<Point[]>([]);
    const [hoveredPerspectiveHandleIndex, setHoveredPerspectiveHandleIndex] = useState<number | null>(null);


    // Selection tool states
    const [interactionState, setInteractionState] = useState<Interaction>('none');
    const [selectionStrokes, setSelectionStrokes] = useState<SelectionStroke[]>([]);
    const [isSelectionInverted, setIsSelectionInverted] = useState(false);
    const [penPathPoints, setPenPathPoints] = useState<PenNode[]>([]);
    const [currentPenDrag, setCurrentPenDrag] = useState<{start: Point, current: Point} | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
    const [ellipseRect, setEllipseRect] = useState<Rect | null>(null);
    const [featherAmount, setFeatherAmount] = useState(0);

    const panX = useMotionValue(0);
    const panY = useMotionValue(0);
    const scale = useMotionValue(1);
    const [zoomDisplay, setZoomDisplay] = useState(100);
    useMotionValueEvent(scale, "change", (latest) => {
        setZoomDisplay(Math.round(latest * 100));
    });
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
    const [isSpacePanning, setIsSpacePanning] = useState(false);

    // Refs
    const sourceImageRef = useRef<HTMLImageElement | null>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const tempDrawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const interactionStartRef = useRef<{ mouse: Point; selection?: Rect, handle?: CropResizeHandle | null | number } | null>(null);
    const selectionModifierRef = useRef<'new' | 'add' | 'subtract'>('new');
    const currentDrawingPointsRef = useRef<Point[]>([]);
    const previousToolRef = useRef<Tool | null>(null);
    const lastPointRef = useRef<Point | null>(null);
    const drawAdjustedImageRef = useRef<(() => void) | null>(null);
    const panStartRef = useRef<{ pan: {x: number, y: number}, pointer: Point } | null>(null);

    const isOpen = imageToEdit !== null;

    // --- Memoized Derived State ---
    const selectionPath = useMemo(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas || (selectionStrokes.length === 0 && !isSelectionInverted)) return null;
        const finalPath = new Path2D();
        const addPolygonToPath = (points: Point[], path: Path2D) => {
            if (points.length < 2) return;
            path.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
            if (points.length > 2) path.closePath();
        };
        if (isSelectionInverted) {
            finalPath.rect(0, 0, canvas.width, canvas.height);
            selectionStrokes.forEach(stroke => addPolygonToPath(stroke.op === 'add' ? [...stroke.points].reverse() : stroke.points, finalPath));
        } else {
            selectionStrokes.forEach(stroke => addPolygonToPath(stroke.op === 'subtract' ? [...stroke.points].reverse() : stroke.points, finalPath));
        }
        return finalPath;
    }, [selectionStrokes, isSelectionInverted, canvasDimensions]);

    const isSelectionActive = useMemo(() => selectionPath !== null, [selectionPath]);
    
    // --- Core Functions ---
    const deselect = useCallback(() => {
        setSelectionStrokes([]);
        setIsSelectionInverted(false);
        setPenPathPoints([]);
        setMarqueeRect(null);
        setEllipseRect(null);
    }, []);

    const captureState = useCallback((): EditorStateSnapshot => ({
        luminance, contrast, temp, tint, saturation, vibrance, hue, grain, clarity, dehaze, blur,
        rotation, flipHorizontal, flipVertical, isInverted, colorAdjustments, brushHardness, brushOpacity,
        drawingCanvasDataUrl: drawingCanvasRef.current?.toDataURL('image/png') ?? null,
        imageUrl: internalImageUrl!,
    }), [
        luminance, contrast, temp, tint, saturation, vibrance, hue, grain, clarity, dehaze, blur,
        rotation, flipHorizontal, flipVertical, isInverted, colorAdjustments, brushHardness, brushOpacity, internalImageUrl
    ]);

    const pushHistory = useCallback((newState: EditorStateSnapshot) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const lastState = newHistory[newHistory.length - 1];
        if (lastState && JSON.stringify(lastState) === JSON.stringify(newState)) return;
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const restoreState = useCallback((snapshot: EditorStateSnapshot) => {
        setLuminance(snapshot.luminance); setContrast(snapshot.contrast); setTemp(snapshot.temp); setTint(snapshot.tint);
        setSaturation(snapshot.saturation); setVibrance(snapshot.vibrance); setHue(snapshot.hue); setGrain(snapshot.grain);
        setClarity(snapshot.clarity); setDehaze(snapshot.dehaze); setBlur(snapshot.blur); setRotation(snapshot.rotation);
        setFlipHorizontal(snapshot.flipHorizontal); setFlipVertical(snapshot.flipVertical);
        setIsInverted(snapshot.isInverted);
        setBrushHardness(snapshot.brushHardness);
        setBrushOpacity(snapshot.brushOpacity);
        setColorAdjustments(snapshot.colorAdjustments);
        
        if (internalImageUrl !== snapshot.imageUrl) {
            setInternalImageUrl(snapshot.imageUrl);
        }

        const drawingCanvas = drawingCanvasRef.current;
        if (drawingCanvas) {
            const ctx = drawingCanvas.getContext('2d');
            ctx?.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            if (snapshot.drawingCanvasDataUrl) {
                const img = new Image();
                img.onload = () => ctx?.drawImage(img, 0, 0);
                img.src = snapshot.drawingCanvasDataUrl;
            }
        }
    }, [internalImageUrl, setLuminance, setContrast, setTemp, setTint, setSaturation, setVibrance, setHue, setGrain, setClarity, setDehaze, setBlur, setRotation, setFlipHorizontal, setFlipVertical, setIsInverted, setBrushHardness, setBrushOpacity, setColorAdjustments, setInternalImageUrl]);

    const commitState = useCallback(() => {
        if (!internalImageUrl) return;
        const snapshot = captureState();
        pushHistory(snapshot);
    }, [captureState, pushHistory, internalImageUrl]);

    const resetAll = useCallback((keepImage = false) => {
        // Reset all adjustments and tool states
        setLuminance(0); setContrast(0); setTemp(0); setTint(0); setSaturation(0); setVibrance(0); setHue(0);
        setRotation(0); setFlipHorizontal(false); setFlipVertical(false); setIsInverted(false); setGrain(0); setClarity(0); setDehaze(0); setBlur(0);
        setColorAdjustments(INITIAL_COLOR_ADJUSTMENTS); setActiveColorTab(Object.keys(INITIAL_COLOR_ADJUSTMENTS)[0] as keyof typeof INITIAL_COLOR_ADJUSTMENTS); setOpenSection('magic');
        setActiveTool(null); setBrushSize(20); setBrushHardness(50); setBrushOpacity(50); setBrushColor('#ffffff');
        setCropSelection(null); setCropAspectRatio('Free'); setCropAction(null);
        setPerspectiveCropPoints([]); setHoveredPerspectiveHandleIndex(null);
        deselect(); setInteractionState('none'); setFeatherAmount(0);
        setAiEditPrompt('');
        
        // Clear drawing canvas
        if (drawingCanvasRef.current) {
            const ctx = drawingCanvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
        }

        // Logic for handling image and history reset
        if (keepImage) {
            // This case is for the "Reset All" button in the UI.
            // Restore the original image and reset history to its initial state.
            if (originalImageRef.current?.src) {
                const originalUrl = originalImageRef.current.src;
                setInternalImageUrl(originalUrl);

                const initialSnapshot: EditorStateSnapshot = {
                    imageUrl: originalUrl,
                    luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0,
                    grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false,
                    isInverted: false, brushHardness: 50, brushOpacity: 50, colorAdjustments: INITIAL_COLOR_ADJUSTMENTS,
                    drawingCanvasDataUrl: null,
                };
                setHistory([initialSnapshot]);
                setHistoryIndex(0);
            }
        } else {
            // This case is for when the modal is opened, to clear previous state.
            setInternalImageUrl(null);
            setHistory([]);
            setHistoryIndex(-1);
        }
    }, [deselect]);
    
    const setupNewImage = useCallback((newUrl: string) => {
        resetAll(false);
        setInternalImageUrl(newUrl);

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = newUrl;
        image.onload = () => {
            originalImageRef.current = image;
        };
        
        const initialSnapshot: EditorStateSnapshot = {
            imageUrl: newUrl,
            luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0,
            grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false,
            isInverted: false, brushHardness: 50, brushOpacity: 50,
            colorAdjustments: INITIAL_COLOR_ADJUSTMENTS,
            drawingCanvasDataUrl: null,
        };
        setHistory([initialSnapshot]);
        setHistoryIndex(0);
    }, [resetAll]);

    // NEW function to handle a File object directly
    const handleFile = useCallback((file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setupNewImage(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    }, [setupNewImage]);
    
    // --- Canvas & Drawing Logic ---
    const applyPixelAdjustments = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, options: { ignoreSelection?: boolean } = {}) => {
        const sourceImageData = ctx.getImageData(0, 0, width, height);
        const originalData = new Uint8ClampedArray(sourceImageData.data);
        const data = sourceImageData.data;
    
        // Create a selection mask if a selection is active
        let selectionMask: Uint8ClampedArray | null = null;
        if (!options.ignoreSelection && isSelectionActive && selectionPath) {
            const maskCanvas = createFeatheredMask(selectionPath, width, height, featherAmount);
            const maskCtx = maskCanvas.getContext('2d');
            if (maskCtx) {
                selectionMask = maskCtx.getImageData(0, 0, width, height).data;
            }
        }
    
        const contrastFactor = (100 + contrast) / 100;
        const clarityFactor = clarity / 200;
        const dehazeFactor = dehaze / 100;
        const grainAmount = grain * 2.55;
    
        for (let i = 0; i < data.length; i += 4) {
            const blendFactor = selectionMask ? (selectionMask[i + 3] / 255) : 1;
            
            if (blendFactor < 0.001 && !options.ignoreSelection) {
                continue;
            }
    
            let r = originalData[i], g = originalData[i + 1], b = originalData[i + 2];
            
            if (isInverted) { r = 255 - r; g = 255 - g; b = 255 - b; }
            r = (r - 127.5) * contrastFactor + 127.5; g = (g - 127.5) * contrastFactor + 127.5; b = (b - 127.5) * contrastFactor + 127.5;
            r += temp / 2.5; g += tint / 2.5; b -= temp / 2.5;
            let [h, s, l] = rgbToHsl(r, g, b);
            
            const vibranceAmount = vibrance / 100;
            if (vibranceAmount !== 0) {
                 const max_rgb = Math.max(r, g, b); 
                 const avg_rgb = (r + g + b) / 3;
                 const sat_delta = max_rgb - avg_rgb;
                 // Vibrance should have less effect on saturated colors.
                 // We create a multiplier that is close to 1 for low saturation and close to 0 for high saturation.
                 // sat_delta is a proxy for saturation, ranging roughly from 0 to 170.
                 const vibrance_mult = 1 - (sat_delta / 200); // Normalize roughly to 0-1 range and invert
                 s += (vibranceAmount * 100) * vibrance_mult;
            }

            h = (h + hue) % 360; l += luminance / 2; s += saturation;

            if (clarity !== 0) l += (l - 50) * clarityFactor;
            if (dehaze !== 0) { l = l - (50 - l) * dehazeFactor; s = s + s * (1 - s/100) * dehazeFactor * 0.5; }

            // --- NEW: Smooth HSL color adjustments ---
            let totalHueAdj = 0, totalSatAdj = 0, totalLumAdj = 0;
            // The influence of a color channel extends 60 degrees on either side of its center.
            const HUE_RANGE_WIDTH = 60; 

            for (const channel of COLOR_CHANNELS) {
                const center = channel.center;
                // Calculate the shortest distance on the color wheel (0-360 degrees)
                const dist = Math.min(Math.abs(h - center), 360 - Math.abs(h - center));
                
                // If the hue is within the influence range...
                if (dist < HUE_RANGE_WIDTH) {
                    // Calculate the influence factor (1 at center, 0 at edge)
                    const influence = 1 - (dist / HUE_RANGE_WIDTH);
                    const adj = colorAdjustments[channel.id];
                    
                    // Add the weighted adjustment to the totals
                    totalHueAdj += adj.h * influence;
                    totalSatAdj += adj.s * influence;
                    totalLumAdj += adj.l * influence;
                }
            }
            h += totalHueAdj;
            s += totalSatAdj;
            l += totalLumAdj;

            if (h < 0) h += 360;
            s = Math.max(0, Math.min(100, s)); l = Math.max(0, Math.min(100, l));
            [r, g, b] = hslToRgb(h, s, l);
            if (grain > 0) { const noise = (Math.random() - 0.5) * grainAmount; r += noise; g += noise; b += noise; }
    
            data[i] = originalData[i] * (1 - blendFactor) + r * blendFactor;
            data[i+1] = originalData[i+1] * (1 - blendFactor) + g * blendFactor;
            data[i+2] = originalData[i+2] * (1 - blendFactor) + b * blendFactor;
        }
        ctx.putImageData(sourceImageData, 0, 0);
    }, [luminance, contrast, temp, tint, saturation, vibrance, hue, colorAdjustments, grain, clarity, dehaze, isInverted, isSelectionActive, selectionPath, featherAmount]);

    const drawAdjustedImage = useCallback(() => {
        if (!previewCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const image = isShowingOriginal ? originalImageRef.current : sourceImageRef.current;
        
        if (!image || !image.complete || image.naturalWidth === 0) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // If showing original, just draw it and return. No transforms/adjustments.
        if (isShowingOriginal) {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return;
        }
    
        // --- Draw transformed image without any filters ---
        const isSwapped = rotation === 90 || rotation === 270;
        const drawWidth = isSwapped ? canvas.height : canvas.width;
        const drawHeight = isSwapped ? canvas.width : canvas.height;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
    
        // --- Apply selective HSL/etc adjustments ---
        applyPixelAdjustments(ctx, canvas.width, canvas.height);
    
        // --- Apply selective (or global) blur ---
        if (blur > 0) {
            const unblurredCanvas = document.createElement('canvas');
            unblurredCanvas.width = canvas.width;
            unblurredCanvas.height = canvas.height;
            const unblurredCtx = unblurredCanvas.getContext('2d');
            if (!unblurredCtx) return;
            unblurredCtx.drawImage(canvas, 0, 0); // Capture the state after adjustments
    
            const blurredCanvas = document.createElement('canvas');
            blurredCanvas.width = canvas.width;
            blurredCanvas.height = canvas.height;
            const blurredCtx = blurredCanvas.getContext('2d');
            if (!blurredCtx) return;
    
            blurredCtx.filter = `blur(${blur}px)`;
            blurredCtx.drawImage(unblurredCanvas, 0, 0);
    
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (isSelectionActive && selectionPath) {
                // If there's a selection, composite blurred and unblurred versions using a feathered mask.
                const maskCanvas = createFeatheredMask(selectionPath, canvas.width, canvas.height, featherAmount);

                // Start with the unblurred image on the main canvas
                ctx.drawImage(unblurredCanvas, 0, 0);

                // Now, "cut out" the blurred image using the feathered mask
                blurredCtx.globalCompositeOperation = 'destination-in';
                blurredCtx.drawImage(maskCanvas, 0, 0);

                // Finally, draw the masked blurred image on top of the unblurred one.
                ctx.drawImage(blurredCanvas, 0, 0);

            } else {
                // No selection, just draw the fully blurred image.
                ctx.drawImage(blurredCanvas, 0, 0);
            }
        }
    }, [rotation, flipHorizontal, flipVertical, applyPixelAdjustments, blur, isSelectionActive, selectionPath, isShowingOriginal, featherAmount]);

    useEffect(() => {
        if(drawAdjustedImageRef) {
            drawAdjustedImageRef.current = drawAdjustedImage;
        }
    }, [drawAdjustedImage]);
    
    // --- Canvas & Event Handlers ---
    const getPointerInView = (e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement | HTMLDivElement>) => {
        if (!canvasViewRef.current) return null;
        const view = canvasViewRef.current;
        const rect = view.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };
    
    const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement | HTMLDivElement>) => {
        const viewRect = canvasViewRef.current?.getBoundingClientRect();
        if (!viewRect || canvasDimensions.width === 0) return null;

        const currentScale = scale.get();
        const currentPanX = panX.get();
        const currentPanY = panY.get();
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const ptr_x_rel_view_center = clientX - (viewRect.left + viewRect.width / 2);
        const ptr_y_rel_view_center = clientY - (viewRect.top + viewRect.height / 2);

        const ptr_x_rel_canvas_center = (ptr_x_rel_view_center - currentPanX) / currentScale;
        const ptr_y_rel_canvas_center = (ptr_y_rel_view_center - currentPanY) / currentScale;
        
        const canvasX = ptr_x_rel_canvas_center + canvasDimensions.width / 2;
        const canvasY = ptr_y_rel_canvas_center + canvasDimensions.height / 2;

        return { x: canvasX, y: canvasY };
    }, [scale, panX, panY, canvasDimensions.width, canvasDimensions.height, canvasViewRef]);
    
    const drawBrushPoint = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
        const radius = brushSize / 2;
        if (radius <= 0) return;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        
        // For eraser, the color doesn't matter for the gradient, only the alpha channel.
        // For brush, we use the selected color.
        const color = (activeTool === 'brush') ? brushColor : '#000000';
        
        // We need RGBA strings to manipulate alpha for the gradient stops.
        const colorOpaque = hexToRgba(color, 100);
        const colorTransparent = hexToRgba(color, 0);
        
        // A linear hardness value (0-1) provides predictable control over the feather size.
        const hardness = brushHardness / 100;
        
        gradient.addColorStop(0, colorOpaque);
        gradient.addColorStop(hardness, colorOpaque);
        gradient.addColorStop(1, colorTransparent);
        
        ctx.fillStyle = gradient;
        // Use arc to draw a circular brush shape instead of a square.
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }, [brushSize, brushHardness, brushColor, activeTool]);

    const handleActionStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        const isPanning = activeTool === 'hand' || isSpacePanning;
        
        if (isPanning) {
            const pointer = getPointerInView(e);
            if (pointer && canvasViewRef.current) {
                panStartRef.current = { pan: { x: panX.get(), y: panY.get() }, pointer };
                canvasViewRef.current.style.cursor = 'grabbing';
            }
            return;
        }

        let coords = getCanvasCoords(e); 
        if (!coords) {
            return; // Click was outside the canvas viewport
        }

        // Allow pen tool to place points outside the canvas boundaries.
        // Other tools will still be constrained.
        if (activeTool !== 'pen') {
            if (coords.x < 0 || coords.x > canvasDimensions.width || coords.y < 0 || coords.y > canvasDimensions.height) {
                return; // Click was outside the canvas content area for non-pen tools
            }
        }
        
        const nativeEvent = e.nativeEvent as MouseEvent;

        if (activeTool === null) {
            setIsShowingOriginal(true);
            return;
        }

        if (activeTool === 'colorpicker') {
            const previewCtx = previewCanvasRef.current?.getContext('2d', { willReadFrequently: true });
            if (!previewCtx) return;
            const pixel = previewCtx.getImageData(coords.x, coords.y, 1, 1).data;
            const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
            setBrushColor(`#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`);
            return;
        }

        if (activeTool === 'brush' || activeTool === 'eraser') {
            setIsDrawing(true);
            lastPointRef.current = coords;
            if (!tempDrawingCanvasRef.current) tempDrawingCanvasRef.current = document.createElement('canvas');
            const tempCanvas = tempDrawingCanvasRef.current;
            const mainCanvas = overlayCanvasRef.current;
            if (mainCanvas) { tempCanvas.width = mainCanvas.width; tempCanvas.height = mainCanvas.height; }
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx?.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        } else if (activeTool === 'crop') {
            setIsDrawing(false);
            const handle = cropSelection ? getHandleAtPoint(coords, cropSelection) : null;
            if (handle) {
                setCropAction('resizing');
                interactionStartRef.current = { mouse: coords, selection: cropSelection, handle: handle };
            } else if (cropSelection && isPointInRect(coords, cropSelection)) {
                setCropAction('moving');
                interactionStartRef.current = { mouse: coords, selection: cropSelection };
            } else {
                setCropAction('drawing');
                interactionStartRef.current = { mouse: coords };
            }
        } else if (activeTool === 'perspective-crop') {
            setIsDrawing(false);
            if (interactionState === 'placingPerspectivePoints') {
                const newPoints = [...perspectiveCropPoints, coords];
                setPerspectiveCropPoints(newPoints);
                if (newPoints.length === 4) {
                    setInteractionState('none');
                }
                return;
            }
            if (perspectiveCropPoints.length === 4) {
                let handleIndex = -1;
                for (let i = 0; i < 4; i++) {
                    const dist = Math.hypot(coords.x - perspectiveCropPoints[i].x, coords.y - perspectiveCropPoints[i].y);
                    if (dist < HANDLE_SIZE) {
                        handleIndex = i;
                        break;
                    }
                }
                if (handleIndex !== -1) {
                    setInteractionState('resizingPerspective');
                    interactionStartRef.current = { mouse: coords, handle: handleIndex };
                }
            }
        } else if (activeTool === 'selection') {
            setIsDrawing(false);
            selectionModifierRef.current = nativeEvent.altKey ? 'subtract' : nativeEvent.shiftKey ? 'add' : 'new';
            if (selectionModifierRef.current === 'new') deselect();
            setInteractionState('drawingSelection');
            currentDrawingPointsRef.current = [coords];
        } else if (activeTool === 'marquee') {
            setIsDrawing(false);
            selectionModifierRef.current = nativeEvent.altKey ? 'subtract' : nativeEvent.shiftKey ? 'add' : 'new';
            if (selectionModifierRef.current === 'new') deselect();
            setInteractionState('drawingMarquee');
            interactionStartRef.current = { mouse: coords };
        } else if (activeTool === 'ellipse') {
            setIsDrawing(false);
            selectionModifierRef.current = nativeEvent.altKey ? 'subtract' : nativeEvent.shiftKey ? 'add' : 'new';
            if (selectionModifierRef.current === 'new') deselect();
            setInteractionState('drawingEllipse');
            interactionStartRef.current = { mouse: coords };
        } else if (activeTool === 'pen') {
            setIsDrawing(false);
            setInteractionState('drawingPen');
            if (penPathPoints.length === 0) {
                 selectionModifierRef.current = nativeEvent.altKey ? 'subtract' : nativeEvent.shiftKey ? 'add' : 'new';
                 if (selectionModifierRef.current === 'new') deselect();
            }
            const firstPoint = penPathPoints[0];
            const clickThreshold = 10;
            if (penPathPoints.length > 2 && Math.hypot(coords.x - firstPoint.anchor.x, coords.y - firstPoint.anchor.y) < clickThreshold) {
                let allPoints: Point[] = [];
                for (let i = 0; i < penPathPoints.length; i++) {
                    const p0 = penPathPoints[i].anchor; const p1 = penPathPoints[i].outHandle;
                    const nextNode = penPathPoints[(i + 1) % penPathPoints.length];
                    const p2 = nextNode.inHandle; const p3 = nextNode.anchor;
                    allPoints.push(...approximateCubicBezier(p0, p1, p2, p3));
                }
                
                // Snap all points to the canvas boundary upon finalizing the selection.
                const snappedPoints = allPoints.map(p => ({
                    x: Math.max(0, Math.min(p.x, canvasDimensions.width)),
                    y: Math.max(0, Math.min(p.y, canvasDimensions.height)),
                }));

                const op = selectionModifierRef.current === 'subtract' ? 'subtract' : 'add';
                setSelectionStrokes(prev => [...prev, { points: snappedPoints, op }]);
                setPenPathPoints([]);
            } else {
                 setCurrentPenDrag({ start: coords, current: coords });
            }
        } else {
            setIsDrawing(false);
        }
    };
    
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();

        if (panStartRef.current) {
            const pointer = getPointerInView(e);
            if (pointer) {
                const newX = panStartRef.current.pan.x + (pointer.x - panStartRef.current.pointer.x);
                const newY = panStartRef.current.pan.y + (pointer.y - panStartRef.current.pointer.y);
                panX.set(newX);
                panY.set(newY);
            }
            return;
        }

        const coords = getCanvasCoords(e); 
        setCursorPosition(coords); 
        if (!coords) return;
        
        if (isDrawing && (activeTool === 'brush' || activeTool === 'eraser')) {
            const tempCtx = tempDrawingCanvasRef.current?.getContext('2d');
            if (!tempCtx || !lastPointRef.current) return;
            
            const dist = Math.hypot(coords.x - lastPointRef.current.x, coords.y - lastPointRef.current.y);
            const angle = Math.atan2(coords.y - lastPointRef.current.y, coords.x - lastPointRef.current.x);

            const step = Math.max(1, brushSize / 8);

            // Interpolate points for a continuous line
            for (let i = 0; i < dist; i += step) {
                const x = lastPointRef.current.x + Math.cos(angle) * i;
                const y = lastPointRef.current.y + Math.sin(angle) * i;
                drawBrushPoint(tempCtx, x + OVERLAY_PADDING, y + OVERLAY_PADDING);
            }
            // Draw the final point to ensure the line reaches the cursor
            drawBrushPoint(tempCtx, coords.x + OVERLAY_PADDING, coords.y + OVERLAY_PADDING);
            
            lastPointRef.current = coords;
        } else if (activeTool === 'crop' && interactionStartRef.current) {
            const startInfo = interactionStartRef.current;
            const canvas = drawingCanvasRef.current; if (!canvas) return;
            if (cropAction === 'moving' && startInfo.selection) {
                const dx = coords.x - startInfo.mouse.x; const dy = coords.y - startInfo.mouse.y;
                const newX = Math.max(0, Math.min(startInfo.selection.x + dx, canvas.width - startInfo.selection.width));
                const newY = Math.max(0, Math.min(startInfo.selection.y + dy, canvas.height - startInfo.selection.height));
                setCropSelection({ ...startInfo.selection, x: newX, y: newY });
            } else if (cropAction === 'drawing') {
                const startPoint = startInfo.mouse; let rectWidth = coords.x - startPoint.x; let rectHeight = coords.y - startPoint.y;
                const ratio = getRatioValue(cropAspectRatio, sourceImageRef.current);
                if (ratio) {
                    if (Math.abs(rectWidth) > Math.abs(rectHeight) * ratio) rectHeight = rectWidth / ratio;
                    else rectWidth = rectHeight * ratio;
                }
                setCropSelection({ x: rectWidth > 0 ? startPoint.x : startPoint.x + rectWidth, y: rectHeight > 0 ? startPoint.y : startPoint.y + rectHeight, width: Math.abs(rectWidth), height: Math.abs(rectHeight), });
            } else if (cropAction === 'resizing' && startInfo.selection && startInfo.handle) {
                if (typeof startInfo.handle !== 'string') return;
                const { handle, selection: startSelection } = startInfo; const ratio = getRatioValue(cropAspectRatio, sourceImageRef.current);
                let newRect = { ...startSelection }; const right = startSelection.x + startSelection.width; const bottom = startSelection.y + startSelection.height;
                if (handle.includes('right')) newRect.width = Math.max(0, coords.x - startSelection.x);
                if (handle.includes('bottom')) newRect.height = Math.max(0, coords.y - startSelection.y);
                if (handle.includes('left')) { const newWidth = Math.max(0, right - coords.x); newRect.x = right - newWidth; newRect.width = newWidth; }
                if (handle.includes('top')) { const newHeight = Math.max(0, bottom - coords.y); newRect.y = bottom - newHeight; newRect.height = newHeight; }
                if (ratio) {
                    if (handle === 'top' || handle === 'bottom' || handle === 'left' || handle === 'right') {
                        const centerX = startSelection.x + startSelection.width / 2; const centerY = startSelection.y + startSelection.height / 2;
                        if (handle === 'top' || handle === 'bottom') { newRect.width = newRect.height * ratio; newRect.x = centerX - newRect.width / 2; }
                        else { newRect.height = newRect.width / ratio; newRect.y = centerY - newRect.height / 2; }
                    } else {
                        if (handle.includes('right') || handle.includes('left')) { const newH = newRect.width / ratio; if (handle.includes('top')) { newRect.y = bottom - newH; } newRect.height = newH; }
                        else { const newW = newRect.height * ratio; if (handle.includes('left')) { newRect.x = right - newW; } newRect.width = newW; }
                    }
                }
                setCropSelection(newRect);
            }
        } else if (activeTool === 'crop' && cropSelection && !cropAction) {
            setHoveredCropHandle(getHandleAtPoint(coords, cropSelection));
        } else if (activeTool === 'perspective-crop') {
            if (interactionState === 'resizingPerspective' && interactionStartRef.current && typeof interactionStartRef.current.handle === 'number') {
                const index = interactionStartRef.current.handle;
                setPerspectiveCropPoints(prev => {
                    if (!prev || prev.length !== 4) return prev;
                    const newPoints = [...prev];
                    newPoints[index] = coords;
                    return newPoints;
                });
            } else if (perspectiveCropPoints.length === 4) {
                let handleIndex = -1;
                for(let i = 0; i < 4; i++) {
                    const dist = Math.hypot(coords.x - perspectiveCropPoints[i].x, coords.y - perspectiveCropPoints[i].y);
                    if (dist < HANDLE_SIZE) {
                        handleIndex = i;
                        break;
                    }
                }
                setHoveredPerspectiveHandleIndex(handleIndex !== -1 ? handleIndex : null);
            }
        } else if (activeTool === 'selection' && interactionState === 'drawingSelection') {
            currentDrawingPointsRef.current.push(coords);
        } else if (activeTool === 'marquee' && interactionState === 'drawingMarquee' && interactionStartRef.current) {
            const startPoint = interactionStartRef.current.mouse; const rectWidth = coords.x - startPoint.x; const rectHeight = coords.y - startPoint.y;
            setMarqueeRect({ x: rectWidth > 0 ? startPoint.x : coords.x, y: rectHeight > 0 ? startPoint.y : coords.y, width: Math.abs(rectWidth), height: Math.abs(rectHeight), });
        } else if (activeTool === 'ellipse' && interactionState === 'drawingEllipse' && interactionStartRef.current) {
            const startPoint = interactionStartRef.current.mouse;
            const rectWidth = coords.x - startPoint.x;
            const rectHeight = coords.y - startPoint.y;
            setEllipseRect({
                x: rectWidth > 0 ? startPoint.x : coords.x,
                y: rectHeight > 0 ? startPoint.y : coords.y,
                width: Math.abs(rectWidth),
                height: Math.abs(rectHeight),
            });
        } else if (activeTool === 'pen' && interactionState === 'drawingPen' && currentPenDrag) {
            setCurrentPenDrag(p => ({ ...p!, current: coords }));
        }
    };

    const handleActionEnd = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        if (panStartRef.current) {
            panStartRef.current = null;
        }

        setIsShowingOriginal(false);
        if (isDrawing) {
            setIsDrawing(false); lastPointRef.current = null;
            if ((activeTool === 'brush' || activeTool === 'eraser') && tempDrawingCanvasRef.current) {
                const mainCtx = drawingCanvasRef.current?.getContext('2d');
                if (mainCtx) {
                    mainCtx.save();
                    if (isSelectionActive) mainCtx.clip(selectionPath!, 'nonzero');
                    mainCtx.globalAlpha = brushOpacity / 100;
                    mainCtx.globalCompositeOperation = activeTool === 'brush' ? 'source-over' : 'destination-out';
                    mainCtx.drawImage(tempDrawingCanvasRef.current, -OVERLAY_PADDING, -OVERLAY_PADDING);
                    mainCtx.restore();
                }
                commitState();
            }
        }
        if (cropAction) { setCropAction(null); interactionStartRef.current = null; }
        if (interactionState === 'resizingPerspective') {
            interactionStartRef.current = null;
        }
        if (interactionState === 'drawingSelection') {
            const points = currentDrawingPointsRef.current;
            if (points.length > 2) {
                const modifier = selectionModifierRef.current;
                if (modifier === 'new') { setSelectionStrokes([{ points, op: 'add' }]); setIsSelectionInverted(false); } 
                else if (modifier === 'add') setSelectionStrokes(prev => [...prev, { points, op: 'add' }]);
                else if (modifier === 'subtract') setSelectionStrokes(prev => [...prev, { points, op: 'subtract' }]);
            }
            currentDrawingPointsRef.current = [];
        } else if (interactionState === 'drawingMarquee' && marqueeRect) {
            if (marqueeRect.width > 1 && marqueeRect.height > 1) {
                const { x, y, width, height } = marqueeRect;
                const points: Point[] = [ { x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height } ];
                const op = selectionModifierRef.current === 'subtract' ? 'subtract' : 'add';
                setSelectionStrokes(prev => [...prev, { points, op }]);
            }
            setMarqueeRect(null);
        } else if (interactionState === 'drawingEllipse' && ellipseRect) {
            if (ellipseRect.width > 1 && ellipseRect.height > 1) {
                const { x, y, width, height } = ellipseRect;
                const cx = x + width / 2;
                const cy = y + height / 2;
                const rx = width / 2;
                const ry = height / 2;
                const points: Point[] = [];
                const steps = Math.max(30, Math.floor(width + height) / 4);
                for (let i = 0; i < steps; i++) {
                    const angle = (i / steps) * 2 * Math.PI;
                    points.push({
                        x: cx + rx * Math.cos(angle),
                        y: cy + ry * Math.sin(angle),
                    });
                }
                const op = selectionModifierRef.current === 'subtract' ? 'subtract' : 'add';
                setSelectionStrokes(prev => [...prev, { points, op }]);
            }
            setEllipseRect(null);
        } else if (interactionState === 'drawingPen' && currentPenDrag) {
            const { start, current } = currentPenDrag; const dragDistance = Math.hypot(current.x - start.x, current.y - start.y);
            let newNode: PenNode;
            if (dragDistance < 5) { newNode = { anchor: start, inHandle: start, outHandle: start }; } 
            else { const inHandle = { x: start.x - (current.x - start.x), y: start.y - (current.y - start.y) }; newNode = { anchor: start, inHandle: inHandle, outHandle: current }; }
            setPenPathPoints(prev => [...prev, newNode]);
            setCurrentPenDrag(null);
        }
        // Only reset interaction state if it's not a multi-step process
        if (interactionState !== 'placingPerspectivePoints') {
            setInteractionState('none');
        }
    };
    
    // --- Lifecycle & Side Effects ---
    const handleUndo = useCallback(() => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); restoreState(history[newIndex]); } }, [history, historyIndex, restoreState]);
    const handleRedo = useCallback(() => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setHistoryIndex(newIndex); restoreState(history[newIndex]); } }, [history, historyIndex, restoreState]);
    
    useEffect(() => {
        if (isOpen) {
            const url = imageToEdit?.url ?? null; resetAll(false); setInternalImageUrl(url);
            if (url) {
                const image = new Image(); image.crossOrigin = "anonymous"; image.src = url;
                image.onload = () => {
                    originalImageRef.current = image;
                    const initialSnapshot: EditorStateSnapshot = { luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0, grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false, isInverted: false, brushHardness: 50, brushOpacity: 50, colorAdjustments: INITIAL_COLOR_ADJUSTMENTS, drawingCanvasDataUrl: null, imageUrl: url };
                    setHistory([initialSnapshot]);
                    setHistoryIndex(0);
                };
            }
        } else {
            originalImageRef.current = null;
        }
    }, [isOpen, imageToEdit?.url, resetAll]);
    
    const setupCanvas = useCallback(() => {
        if (!internalImageUrl || !previewCanvasRef.current || !drawingCanvasRef.current || !overlayCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        const drawingCanvas = drawingCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const container = canvasViewRef.current;
        if (!container) return;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = internalImageUrl;
        image.onload = () => {
            sourceImageRef.current = image;
            const containerRect = container.getBoundingClientRect();
            if (containerRect.width <= 0 || containerRect.height <= 0) return;

            // Use a high max dimension for good quality on current screens (4K screens etc)
            const maxDimension = 5056; // Updated from 2500
            let canvasWidth = image.naturalWidth;
            let canvasHeight = image.naturalHeight;

            if (canvasWidth > maxDimension || canvasHeight > maxDimension) {
                const ratio = canvasWidth / canvasHeight;
                if (canvasWidth > canvasHeight) {
                    canvasWidth = maxDimension;
                    canvasHeight = Math.round(maxDimension / ratio);
                } else {
                    canvasHeight = maxDimension;
                    canvasWidth = Math.round(maxDimension * ratio);
                }
            }

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            drawingCanvas.width = canvasWidth;
            drawingCanvas.height = canvasHeight;
            overlayCanvas.width = canvasWidth + OVERLAY_PADDING * 2;
            overlayCanvas.height = canvasHeight + OVERLAY_PADDING * 2;
            setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
        };
    }, [internalImageUrl, canvasViewRef]);

    useEffect(() => {
        if (isOpen && internalImageUrl) {
            const handleResize = () => setupCanvas();
            const timeoutId = setTimeout(handleResize, 50);
            window.addEventListener('resize', handleResize);
            return () => { clearTimeout(timeoutId); window.removeEventListener('resize', handleResize); };
        }
    }, [isOpen, internalImageUrl, setupCanvas]);

    useEffect(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if(drawAdjustedImageRef.current) {
            animationFrameRef.current = requestAnimationFrame(drawAdjustedImageRef.current);
        }
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) };
    }, [drawAdjustedImage, canvasDimensions]);

    const getFinalImage = useCallback((): Promise<string | null> => {
        return new Promise((resolve, reject) => {
            if (!sourceImageRef.current || !drawingCanvasRef.current) {
                resolve(null);
                return;
            }
            
            setTimeout(() => {
                try {
                    const image = sourceImageRef.current!;
                    const drawingCanvas = drawingCanvasRef.current!;

                    const isSwapped = rotation === 90 || rotation === 270;
                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = isSwapped ? image.naturalHeight : image.naturalWidth;
                    finalCanvas.height = isSwapped ? image.naturalWidth : image.naturalHeight;
                    const finalCtx = finalCanvas.getContext('2d');
                    if (!finalCtx) throw new Error("Could not get final canvas context");

                    // 1. Draw transformed source image
                    const drawWidth = isSwapped ? finalCanvas.height : finalCanvas.width;
                    const drawHeight = isSwapped ? finalCanvas.width : finalCanvas.height;
                    finalCtx.save();
                    finalCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
                    finalCtx.rotate(rotation * Math.PI / 180);
                    finalCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
                    finalCtx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                    finalCtx.restore();

                    // 2. Apply pixel adjustments (filters) to the full-res canvas
                    // We pass ignoreSelection: true because saving applies to the whole image.
                    applyPixelAdjustments(finalCtx, finalCanvas.width, finalCanvas.height, { ignoreSelection: true });

                    // 3. Apply blur effect
                    if (blur > 0) {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = finalCanvas.width;
                        tempCanvas.height = finalCanvas.height;
                        const tempCtx = tempCanvas.getContext('2d');
                        if (!tempCtx) throw new Error("Could not get temp canvas context for blur");
                        tempCtx.drawImage(finalCanvas, 0, 0);
                        finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
                        finalCtx.filter = `blur(${blur}px)`;
                        finalCtx.drawImage(tempCanvas, 0, 0);
                        finalCtx.filter = 'none';
                    }

                    // 4. Draw brush strokes, scaled up
                    const drawScaleX = finalCanvas.width / drawingCanvas.width;
                    const drawScaleY = finalCanvas.height / drawingCanvas.height;
                    finalCtx.save();
                    finalCtx.scale(drawScaleX, drawScaleY);
                    finalCtx.drawImage(drawingCanvas, 0, 0);
                    finalCtx.restore();

                    // 5. Resolve with high-quality PNG
                    resolve(finalCanvas.toDataURL('image/png'));
                } catch (error) {
                    console.error("Error creating final image:", error);
                    reject(error);
                }
            }, 50);
        });
    }, [
        rotation, flipHorizontal, flipVertical, applyPixelAdjustments, blur,
        luminance, contrast, temp, tint, saturation, vibrance, hue, colorAdjustments, grain, clarity, dehaze, isInverted
    ]);
    
    // --- More Logic (Shortcuts, Actions) ---
    const handleCancelPerspectiveCrop = useCallback(() => {
        setPerspectiveCropPoints([]);
        setActiveTool(null);
        setHoveredPerspectiveHandleIndex(null);
        setInteractionState('none');
    }, []);

    const handleApplyPerspectiveCrop = useCallback(() => {
        if (perspectiveCropPoints.length !== 4 || !sourceImageRef.current || !previewCanvasRef.current) return;
        commitState();
    
        const image = sourceImageRef.current;
        const previewCanvas = previewCanvasRef.current;
        const scaleX = image.naturalWidth / previewCanvas.width;
        const scaleY = image.naturalHeight / previewCanvas.height;
    
        const srcPoints = perspectiveCropPoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
        
        const [tl, tr, br, bl] = srcPoints;
    
        const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
        const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        const destWidth = Math.max(widthA, widthB);
    
        const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
        const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
        const destHeight = Math.max(heightA, heightB);
    
        const destPoints: [Point, Point, Point, Point] = [
            { x: 0, y: 0 },
            { x: destWidth, y: 0 },
            { x: destWidth, y: destHeight },
            { x: 0, y: destHeight }
        ];
    
        const transform = getPerspectiveTransform(srcPoints, destPoints);
        if (!transform) {
            alert("Could not apply perspective crop. The points might not form a valid quadrilateral.");
            return;
        }
    
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.round(destWidth);
        cropCanvas.height = Math.round(destHeight);
        
        warpPerspective(image, cropCanvas, transform);
    
        const newDataUrl = cropCanvas.toDataURL('image/png');
        
        const postCropState: EditorStateSnapshot = {
            imageUrl: newDataUrl,
            luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0,
            grain: 0, clarity: 0, dehaze: 0, blur: 0,
            rotation: 0, flipHorizontal: false, flipVertical: false, isInverted: false,
            brushHardness: brushHardness, brushOpacity: brushOpacity,
            colorAdjustments: INITIAL_COLOR_ADJUSTMENTS, drawingCanvasDataUrl: null,
        };
    
        pushHistory(postCropState);
        restoreState(postCropState);
        handleCancelPerspectiveCrop();
    
    }, [perspectiveCropPoints, commitState, handleCancelPerspectiveCrop, pushHistory, restoreState, brushHardness, brushOpacity]);

    const handleApplyAllAdjustments = useCallback(() => {
        if (!internalImageUrl || !sourceImageRef.current || !previewCanvasRef.current || !drawingCanvasRef.current) return;
        setIsProcessing(true);
        setTimeout(() => {
            try {
                const image = sourceImageRef.current!;
                const previewCanvas = previewCanvasRef.current!;
                const drawingCanvas = drawingCanvasRef.current!;
                let sourceForFinal: HTMLCanvasElement | HTMLImageElement = image;
                let finalWidth = image.naturalWidth;
                let finalHeight = image.naturalHeight;
                if (cropSelection && cropSelection.width > 1 && cropSelection.height > 1) {
                    const scaleX = image.naturalWidth / previewCanvas.width;
                    const scaleY = image.naturalHeight / previewCanvas.height;
                    const sx = cropSelection.x * scaleX; const sy = cropSelection.y * scaleY;
                    const sWidth = cropSelection.width * scaleX; const sHeight = cropSelection.height * scaleY;
                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = sWidth; cropCanvas.height = sHeight;
                    const cropCtx = cropCanvas.getContext('2d');
                    if (!cropCtx) throw new Error("Could not get crop canvas context");
                    cropCtx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
                    sourceForFinal = cropCanvas;
                    finalWidth = sWidth;
                    finalHeight = sHeight;
                }
                const isSwapped = rotation === 90 || rotation === 270;
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = isSwapped ? finalHeight : finalWidth;
                finalCanvas.height = isSwapped ? finalWidth : finalHeight;
                const finalCtx = finalCanvas.getContext('2d');
                if (!finalCtx) throw new Error("Could not get final canvas context");
                finalCtx.save();
                finalCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
                finalCtx.rotate(rotation * Math.PI / 180);
                finalCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
                finalCtx.drawImage(sourceForFinal, -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight);
                finalCtx.restore();
                applyPixelAdjustments(finalCtx, finalCanvas.width, finalCanvas.height, { ignoreSelection: true });
                if (blur > 0) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = finalCanvas.width;
                    tempCanvas.height = finalCanvas.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    if(!tempCtx) throw new Error("Could not get temp canvas context for blur");
                    tempCtx.drawImage(finalCanvas, 0, 0);
                    finalCtx.clearRect(0,0,finalCanvas.width, finalCanvas.height);
                    finalCtx.filter = `blur(${blur}px)`;
                    finalCtx.drawImage(tempCanvas, 0, 0);
                    finalCtx.filter = 'none';
                }
                const drawScaleX = finalCanvas.width / drawingCanvas.width;
                const drawScaleY = finalCanvas.height / drawingCanvas.height;
                finalCtx.save();
                finalCtx.scale(drawScaleX, drawScaleY);
                finalCtx.drawImage(drawingCanvas, 0, 0);
                finalCtx.restore();
                const newDataUrl = finalCanvas.toDataURL('image/png');
                const resetAndApply = () => {
                    setLuminance(0); setContrast(0); setTemp(0); setTint(0); setSaturation(0); setVibrance(0); setHue(0);
                    setGrain(0); setClarity(0); setDehaze(0); setBlur(0); setColorAdjustments(INITIAL_COLOR_ADJUSTMENTS);
                    setRotation(0); setFlipHorizontal(false); setFlipVertical(false); setIsInverted(false);
                    setCropSelection(null); setActiveTool(null); deselect();
                    if (drawingCanvasRef.current) {
                        drawingCanvasRef.current.getContext('2d')?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                    }
                    setInternalImageUrl(newDataUrl);
                    const appliedState: EditorStateSnapshot = {
                        imageUrl: newDataUrl, luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0,
                        grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false, isInverted: false,
                        brushHardness: brushHardness, brushOpacity: brushOpacity, colorAdjustments: INITIAL_COLOR_ADJUSTMENTS, drawingCanvasDataUrl: null,
                    };
                    pushHistory(appliedState);
                };
    
                const newImage = new Image();
                newImage.onload = () => requestAnimationFrame(resetAndApply);
                newImage.src = newDataUrl;
            } catch (error) {
                console.error("Error applying adjustments:", error);
                alert("An error occurred while applying adjustments.");
            } finally {
                setIsProcessing(false);
            }
        }, 50);
    }, [ internalImageUrl, sourceImageRef, previewCanvasRef, drawingCanvasRef, cropSelection, rotation, flipHorizontal, flipVertical, blur, applyPixelAdjustments, pushHistory, deselect, brushHardness, brushOpacity ]);

    const handleApplyAdjustmentsToSelection = useCallback(() => {
        if (!isSelectionActive || !selectionPath || !previewCanvasRef.current || !drawingCanvasRef.current || !sourceImageRef.current) return;
        setIsProcessing(true);
        setTimeout(() => {
            try {
                const previewCanvas = previewCanvasRef.current!;
                const drawingCanvas = drawingCanvasRef.current!;
                const sourceImage = sourceImageRef.current!;
                const bakeCanvas = document.createElement('canvas');
                bakeCanvas.width = previewCanvas.width;
                bakeCanvas.height = previewCanvas.height;
                const bakeCtx = bakeCanvas.getContext('2d');
                if (!bakeCtx) throw new Error("Could not create bake canvas context");

                // 1. Draw the "before" state (current image + drawings).
                bakeCtx.save();
                bakeCtx.translate(bakeCanvas.width / 2, bakeCanvas.height / 2);
                bakeCtx.rotate(rotation * Math.PI / 180);
                bakeCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
                const isSwapped = rotation === 90 || rotation === 270;
                const drawWidth = isSwapped ? bakeCanvas.height : bakeCanvas.width;
                const drawHeight = isSwapped ? bakeCanvas.width : bakeCanvas.height;
                bakeCtx.drawImage(sourceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                bakeCtx.restore();
                bakeCtx.drawImage(drawingCanvas, 0, 0);

                // 2. Create the feathered mask.
                const maskCanvas = createFeatheredMask(selectionPath, bakeCanvas.width, bakeCanvas.height, featherAmount);

                // 3. Create a temporary canvas for the "after" state (the adjusted image).
                const adjustedLayerCanvas = document.createElement('canvas');
                adjustedLayerCanvas.width = bakeCanvas.width;
                adjustedLayerCanvas.height = bakeCanvas.height;
                const adjustedLayerCtx = adjustedLayerCanvas.getContext('2d');
                if (!adjustedLayerCtx) throw new Error("Could not create adjusted layer context");

                // 4. Draw the adjusted image (from the live preview) AND drawings onto this temporary layer.
                adjustedLayerCtx.drawImage(previewCanvas, 0, 0);
                adjustedLayerCtx.drawImage(drawingCanvas, 0, 0);

                // 5. Use the mask to "cut out" the adjusted parts.
                adjustedLayerCtx.globalCompositeOperation = 'destination-in';
                adjustedLayerCtx.drawImage(maskCanvas, 0, 0);

                // 6. Draw the masked adjusted layer on top of the "before" state.
                bakeCtx.drawImage(adjustedLayerCanvas, 0, 0);
                
                const newDataUrl = bakeCanvas.toDataURL('image/png');
    
                const resetAndBake = () => {
                    setLuminance(0); setContrast(0); setTemp(0); setTint(0); setSaturation(0); setVibrance(0); setHue(0);
                    setGrain(0); setClarity(0); setDehaze(0); setBlur(0); setColorAdjustments(INITIAL_COLOR_ADJUSTMENTS);
                    setRotation(0); setFlipHorizontal(false); setFlipVertical(false); setIsInverted(false);
                    if (drawingCanvasRef.current) {
                        drawingCanvasRef.current.getContext('2d')?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                    }
                    setInternalImageUrl(newDataUrl);
                    const bakedState: EditorStateSnapshot = {
                        imageUrl: newDataUrl, luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0,
                        grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false, isInverted: false,
                        brushHardness: brushHardness, brushOpacity: brushOpacity, colorAdjustments: INITIAL_COLOR_ADJUSTMENTS, drawingCanvasDataUrl: null,
                    };
                    pushHistory(bakedState);
                };
    
                const newImage = new Image();
                newImage.onload = () => requestAnimationFrame(resetAndBake);
                newImage.src = newDataUrl;
            } catch (error) {
                console.error("Error applying adjustments to selection:", error);
            } finally {
                setIsProcessing(false);
            }
        }, 50);
    }, [isSelectionActive, selectionPath, previewCanvasRef, drawingCanvasRef, sourceImageRef, rotation, flipHorizontal, flipVertical, pushHistory, brushHardness, brushOpacity, featherAmount]);
    
    const handleToolSelect = useCallback((tool: Tool) => {
        if (activeTool === 'pen' && tool !== 'pen') {
            setPenPathPoints([]);
            setCurrentPenDrag(null);
        }
        if (tool === 'perspective-crop') {
            setInteractionState('placingPerspectivePoints');
            setPerspectiveCropPoints([]); // Reset points on tool selection
        }
        setActiveTool(prev => (prev === tool ? null : tool));
    }, [activeTool]);
    const handleCancelCrop = useCallback(() => { setCropSelection(null); setActiveTool(null); }, []);
    const handleApplyCrop = useCallback(() => {
        if (!cropSelection || !sourceImageRef.current || !previewCanvasRef.current) return;
        commitState();
        const image = sourceImageRef.current; const previewCanvas = previewCanvasRef.current;
        if (cropSelection.width < 1 || cropSelection.height < 1) { handleCancelCrop(); return; }
        const scaleX = image.naturalWidth / previewCanvas.width; const scaleY = image.naturalHeight / previewCanvas.height;
        const sx = cropSelection.x * scaleX; const sy = cropSelection.y * scaleY;
        const sWidth = cropSelection.width * scaleX; const sHeight = cropSelection.height * scaleY;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sWidth; cropCanvas.height = sHeight;
        const cropCtx = cropCanvas.getContext('2d'); if (!cropCtx) return;
        cropCtx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        const newDataUrl = cropCanvas.toDataURL('image/png');
        const postCropState: EditorStateSnapshot = { imageUrl: newDataUrl, luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0, grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false, isInverted: false, brushHardness: brushHardness, brushOpacity: brushOpacity, colorAdjustments: INITIAL_COLOR_ADJUSTMENTS, drawingCanvasDataUrl: null, };
        pushHistory(postCropState);
        restoreState(postCropState); setCropSelection(null); setActiveTool(null);
    }, [cropSelection, commitState, handleCancelCrop, pushHistory, restoreState, brushHardness, brushOpacity]);
    
    const deleteImageContentInSelection = useCallback(() => {
        if (!selectionPath || !previewCanvasRef.current || !drawingCanvasRef.current) return;
        setIsProcessing(true);
        setTimeout(() => {
            try {
                const previewCanvas = previewCanvasRef.current!;
                const drawingCanvas = drawingCanvasRef.current!;
                const combinedCanvas = document.createElement('canvas');
                combinedCanvas.width = previewCanvas.width;
                combinedCanvas.height = previewCanvas.height;
                const ctx = combinedCanvas.getContext('2d');
                if (!ctx) throw new Error("Could not create combined canvas context");
                ctx.drawImage(previewCanvas, 0, 0);
                ctx.drawImage(drawingCanvas, 0, 0);

                const maskCanvas = createFeatheredMask(selectionPath!, combinedCanvas.width, combinedCanvas.height, featherAmount);
                
                ctx.globalCompositeOperation = 'destination-out';
                ctx.drawImage(maskCanvas, 0, 0);

                const newDataUrl = combinedCanvas.toDataURL('image/png');
                const bakedState: EditorStateSnapshot = { imageUrl: newDataUrl, luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0, grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false, isInverted: false, brushHardness: brushHardness, brushOpacity: brushOpacity, colorAdjustments: INITIAL_COLOR_ADJUSTMENTS, drawingCanvasDataUrl: null, };
                pushHistory(bakedState); restoreState(bakedState); deselect();
            } catch (error) { console.error("Error deleting content:", error); alert("An error occurred while deleting the selected content."); } 
            finally { setIsProcessing(false); }
        }, 50);
    }, [selectionPath, featherAmount, pushHistory, restoreState, deselect, previewCanvasRef, drawingCanvasRef, brushHardness, brushOpacity]);
    
    const fillSelection = useCallback(() => {
        if (!selectionPath || !drawingCanvasRef.current) return;
        const ctx = drawingCanvasRef.current.getContext('2d'); if (!ctx) return;
        
        const maskCanvas = createFeatheredMask(selectionPath, drawingCanvasRef.current.width, drawingCanvasRef.current.height, featherAmount);
        
        const fillCanvas = document.createElement('canvas');
        fillCanvas.width = drawingCanvasRef.current.width;
        fillCanvas.height = drawingCanvasRef.current.height;
        const fillCtx = fillCanvas.getContext('2d');
        if (fillCtx) {
            fillCtx.fillStyle = brushColor;
            fillCtx.fillRect(0, 0, fillCanvas.width, fillCanvas.height);
            fillCtx.globalCompositeOperation = 'destination-in';
            fillCtx.drawImage(maskCanvas, 0, 0);
        }
        
        ctx.save();
        ctx.globalAlpha = brushOpacity / 100;
        ctx.drawImage(fillCanvas, 0, 0);
        ctx.restore();
        commitState();
    }, [selectionPath, brushColor, brushOpacity, featherAmount, commitState]);

    const invertSelection = useCallback(() => setIsSelectionInverted(prev => !prev), []);
    
    const handleCreateBlank = useCallback(() => {
        const createBlankCanvasDataUrl = (width: number, height: number, color: string): string => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, width, height);
            }
            return canvas.toDataURL('image/png');
        };
        const newUrl = createBlankCanvasDataUrl(2000, 2000, '#FFFFFF');
        setupNewImage(newUrl);
    }, [setupNewImage]);

    const handleAiEdit = useCallback(async () => {
        if (!aiEditPrompt.trim() || !internalImageUrl) return;
        setIsLoading(true);

        try {
            let imageToSendUrl: string;
            let promptToSend = aiEditPrompt;

            const currentImageAsUrl = await getFinalImage();
            if (!currentImageAsUrl) throw new Error("Could not get current image data.");

            if (isSelectionActive && selectionPath) {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                const img = new Image();

                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = (err) => reject(new Error("Failed to load image for masking."));
                    img.src = currentImageAsUrl;
                });
                
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                if (!tempCtx) throw new Error("Could not get temp canvas context");

                tempCtx.drawImage(img, 0, 0);

                const previewCanvas = previewCanvasRef.current;
                if (!previewCanvas) throw new Error("Preview canvas not found");
                const scaleX = img.naturalWidth / previewCanvas.width;
                const scaleY = img.naturalHeight / previewCanvas.height;
                
                tempCtx.save();
                tempCtx.scale(scaleX, scaleY);
                tempCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                tempCtx.fill(selectionPath);
                tempCtx.restore();

                imageToSendUrl = tempCanvas.toDataURL('image/png');
                promptToSend = `${aiEditPrompt}. **HƯỚNG DẪN DÀNH CHO AI:** Vùng được tô màu đỏ mờ trên ảnh là khu vực duy nhất bạn được phép chỉnh sửa. Vùng màu đỏ này chỉ là một MẶT NẠ (MASK) để chỉ định khu vực, không phải là một phần của ảnh. **YÊU CẦU QUAN TRỌNG NHẤT:** Kết quả cuối cùng TUYỆT ĐỐI không được chứa bất kỳ vùng màu đỏ mờ nào.`;

            } else {
                imageToSendUrl = currentImageAsUrl;
            }

            const resultUrl = await editImageWithPrompt(imageToSendUrl, promptToSend);
            
            const resetAndApply = () => {
                setLuminance(0); setContrast(0); setTemp(0); setTint(0); setSaturation(0); setVibrance(0); setHue(0);
                setGrain(0); setClarity(0); setDehaze(0); setBlur(0); setColorAdjustments(INITIAL_COLOR_ADJUSTMENTS);
                setRotation(0); setFlipHorizontal(false); setFlipVertical(false); setIsInverted(false);
                setCropSelection(null); 
                deselect();
                if (drawingCanvasRef.current) {
                    drawingCanvasRef.current.getContext('2d')?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                }
                setInternalImageUrl(resultUrl);
                const appliedState: EditorStateSnapshot = {
                    imageUrl: resultUrl, luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0,
                    grain: 0, clarity: 0, dehaze: 0, blur: 0, rotation: 0, flipHorizontal: false, flipVertical: false, isInverted: false,
                    brushHardness: 50, brushOpacity: 50,
                    colorAdjustments: INITIAL_COLOR_ADJUSTMENTS, drawingCanvasDataUrl: null,
                };
                pushHistory(appliedState);
                setAiEditPrompt('');
            };

            const newImage = new Image();
            newImage.crossOrigin = "anonymous";
            newImage.onload = () => requestAnimationFrame(resetAndApply);
            newImage.src = resultUrl;

        } catch (err) {
            alert(`Lỗi với Chỉnh sửa AI: ${err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định."}`);
        } finally {
            setIsLoading(false);
        }
    }, [aiEditPrompt, internalImageUrl, getFinalImage, isSelectionActive, selectionPath, previewCanvasRef, pushHistory, deselect]);
    
    const handleSave = useCallback(async () => {
        if (!imageToEdit) return;
        setIsProcessing(true);
        try {
            const finalUrl = await getFinalImage();
            if (finalUrl) {
                imageToEdit.onSave(finalUrl);
            }
        } catch (err) {
            console.error("Error saving image:", err);
            alert("An error occurred while saving the image.");
        } finally {
            setIsProcessing(false);
        }
    }, [getFinalImage, imageToEdit]);

    const handleRotateCanvas = useCallback(async () => {
        if (!internalImageUrl) return;
        setIsProcessing(true);
        try {
            const currentImageAsUrl = await getFinalImage();
            if (!currentImageAsUrl) throw new Error("Could not get current image data.");
    
            const img = new Image();
            img.crossOrigin = "Anonymous";
            
            const newDataUrl = await new Promise<string>((resolve, reject) => {
                img.onload = () => {
                    const rotateCanvas = document.createElement('canvas');
                    rotateCanvas.width = img.height;
                    rotateCanvas.height = img.width;
                    const rotateCtx = rotateCanvas.getContext('2d');
                    if (!rotateCtx) {
                        reject(new Error("Could not create rotate canvas context"));
                        return;
                    }
    
                    rotateCtx.translate(rotateCanvas.width / 2, rotateCanvas.height / 2);
                    rotateCtx.rotate(90 * Math.PI / 180);
                    rotateCtx.drawImage(img, -img.width / 2, -img.height / 2);
                    
                    resolve(rotateCanvas.toDataURL('image/png'));
                };
                img.onerror = reject;
                img.src = currentImageAsUrl;
            });
    
            const postRotateState: EditorStateSnapshot = {
                imageUrl: newDataUrl,
                luminance: 0, contrast: 0, temp: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0,
                grain: 0, clarity: 0, dehaze: 0, blur: 0,
                rotation: 0, 
                flipHorizontal: false, flipVertical: false, isInverted: false,
                brushHardness: brushHardness,
                brushOpacity: brushOpacity,
                colorAdjustments: INITIAL_COLOR_ADJUSTMENTS,
                drawingCanvasDataUrl: null, 
            };
            
            pushHistory(postRotateState);
            restoreState(postRotateState);
            
            if (drawingCanvasRef.current) {
                drawingCanvasRef.current.getContext('2d')?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
            }
    
        } catch (err) {
            console.error("Error during canvas rotation:", err);
            alert("An error occurred while rotating the image.");
        } finally {
            setIsProcessing(false);
        }
    }, [internalImageUrl, getFinalImage, pushHistory, restoreState, brushHardness, brushOpacity, drawingCanvasRef]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setIsSpacePanning(true);
            }
            const isUndo = (e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey;
            const isRedo = (e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && e.shiftKey;
            const isSelectAll = (e.metaKey || e.ctrlKey) && e.code === 'KeyA';
            
            if (isSelectAll) {
                e.preventDefault();
                const canvas = previewCanvasRef.current;
                if (canvas) {
                    const { width, height } = canvas;
                    const allPoints: Point[] = [
                        { x: 0, y: 0 }, { x: width, y: 0 },
                        { x: width, y: height }, { x: 0, y: height }
                    ];
                    setSelectionStrokes([{ points: allPoints, op: 'add' }]);
                    setIsSelectionInverted(false);
                }
                return;
            }
            
            if (isUndo) { e.preventDefault(); handleUndo(); return; }
            if (isRedo) { e.preventDefault(); handleRedo(); return; }
            if (e.code === 'Escape') {
                e.preventDefault();
                if (activeTool === 'crop' && cropSelection) handleCancelCrop();
                else if (activeTool === 'perspective-crop' && perspectiveCropPoints.length > 0) handleCancelPerspectiveCrop();
                else if (activeTool === 'pen' && penPathPoints.length > 0) { setPenPathPoints([]); setCurrentPenDrag(null); } 
                else if (isSelectionActive) deselect();
                return;
            }
            if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && e.code === 'KeyM') {
                e.preventDefault();
                handleToolSelect('ellipse');
                return;
            }
            const isPickerEligible = activeTool === 'brush' || activeTool === 'eraser';
            if (e.key === 'Alt' && !e.repeat && isPickerEligible) { previousToolRef.current = activeTool; setActiveTool('colorpicker'); e.preventDefault(); }
            if (activeTool === 'crop' && e.code === 'Enter' && cropSelection) { e.preventDefault(); handleApplyCrop(); return; }
            if (activeTool === 'perspective-crop' && e.code === 'Enter' && perspectiveCropPoints.length === 4) { e.preventDefault(); handleApplyPerspectiveCrop(); return; }
            
            const isPerspectiveCropShortcut = e.altKey && e.code === 'KeyC';
            if(isPerspectiveCropShortcut) {
                e.preventDefault();
                handleToolSelect('perspective-crop');
                return;
            }

            const isSimpleKey = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
            if (isSimpleKey) {
                let handled = false;
                switch(e.code) {
                    case 'KeyP': handleToolSelect('pen'); handled = true; break;
                    case 'KeyB': handleToolSelect('brush'); handled = true; break;
                    case 'KeyI': handleToolSelect('colorpicker'); handled = true; break;
                    case 'KeyL': handleToolSelect('selection'); handled = true; break;
                    case 'KeyM': handleToolSelect('marquee'); handled = true; break;
                    case 'KeyC': handleToolSelect('crop'); handled = true; break;
                    case 'KeyE': handleToolSelect('eraser'); handled = true; break;
                    case 'KeyR':
                        handleRotateCanvas();
                        handled = true;
                        break;
                    case 'BracketLeft': if (activeTool === 'brush' || activeTool === 'eraser') { setBrushSize(s => Math.max(1, s - (s > 30 ? 5 : 1))); handled = true; } break;
                    case 'BracketRight': if (activeTool === 'brush' || activeTool === 'eraser') { setBrushSize(s => Math.min(200, s + (s >= 30 ? 5 : 1))); handled = true; } break;
                }
                if (handled) e.preventDefault();
            }
            const isClear = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && (e.code === 'Delete' || e.code === 'Backspace');
            if (isClear && isSelectionActive) { e.preventDefault(); deleteImageContentInSelection(); return; }
            const isFill = (e.metaKey || e.ctrlKey) && (e.code === 'Delete' || e.code === 'Backspace');
            const isDeselect = (e.metaKey || e.ctrlKey) && e.code === 'KeyD';
            const isInverse = (e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyI';
            const isApplyToSelection = e.code === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
            if (isSelectionActive) {
                if (isFill) { e.preventDefault(); fillSelection(); }
                else if (isDeselect) { e.preventDefault(); deselect(); }
                else if (isInverse) { e.preventDefault(); invertSelection(); }
                else if (isApplyToSelection) { e.preventDefault(); handleApplyAdjustmentsToSelection(); }
            } else if (isInverse) { e.preventDefault(); invertSelection(); }
        };
        const handleKeyUp = (e: KeyboardEvent) => { 
            if (!isOpen) return;
            if (e.code === 'Space') {
                setIsSpacePanning(false);
            }
            if (e.key === 'Alt' && previousToolRef.current) { setActiveTool(previousToolRef.current); previousToolRef.current = null; } 
        };
        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
    }, [isOpen, isSelectionActive, fillSelection, deselect, invertSelection, deleteImageContentInSelection, handleToolSelect, activeTool, cropSelection, handleApplyCrop, handleCancelCrop, handleUndo, handleRedo, penPathPoints.length, perspectiveCropPoints, handleApplyPerspectiveCrop, handleCancelCrop, handleRotateCanvas, handleApplyAdjustmentsToSelection]);
    
    // --- Public API ---
    return {
        // State
        internalImageUrl, isLoading, isProcessing, setIsProcessing, openSection, activeTool, brushSize, brushColor, brushHardness, brushOpacity, cropSelection, cropAspectRatio,
        cursorPosition, isCursorOverCanvas, isDrawing, isSelectionActive, isSelectionInverted, penPathPoints, currentPenDrag, marqueeRect,
        ellipseRect, interactionState, hoveredCropHandle, historyIndex, history, isGalleryPickerOpen, isWebcamModalOpen, featherAmount,
        selectionPath, aiEditPrompt,
        perspectiveCropPoints,
        hoveredPerspectiveHandleIndex,
        handleCancelPerspectiveCrop,
        handleApplyPerspectiveCrop,
        panX, panY, scale, zoomDisplay, canvasDimensions, isSpacePanning,
        
        // Filters & Adjustments
        luminance, contrast, temp, tint, saturation, vibrance, hue, grain, clarity, dehaze, blur, rotation, flipHorizontal, flipVertical, isInverted,
        colorAdjustments, activeColorTab,
        // Refs
        previewCanvasRef, drawingCanvasRef, overlayCanvasRef, tempDrawingCanvasRef,
        currentDrawingPointsRef, lastPointRef,
        // Setters & Handlers
        setInternalImageUrl, setIsLoading, setOpenSection, setActiveTool, setBrushSize, setBrushColor, setBrushHardness, setBrushOpacity, setCropAspectRatio,
        setIsCursorOverCanvas,
        setHoveredCropHandle,
        setLuminance, setContrast, setTemp, setTint, setSaturation, setVibrance, setHue, setGrain, setClarity, setDehaze, setBlur, setRotation, setFlipHorizontal, setFlipVertical, setIsInverted,
        setColorAdjustments, setActiveColorTab,
        setIsGalleryPickerOpen, setIsWebcamModalOpen, setFeatherAmount, setAiEditPrompt,
        handleActionStart, handleCanvasMouseMove, handleActionEnd,
        handleUndo, handleRedo, commitState, resetAll, getFinalImage, handleSave,
        handleToolSelect, handleCancelCrop, handleApplyCrop, handleAiEdit,
        handleRotateCanvas,
        handleFile,
        handleFileSelected: (e: ChangeEvent<HTMLInputElement>) => handleFileUpload(e, setupNewImage),
        handleGallerySelect: (newUrl: string) => {
            setupNewImage(newUrl);
            setIsGalleryPickerOpen(false);
        },
        handleWebcamCapture: (newUrl: string) => {
            setupNewImage(newUrl);
            setIsWebcamModalOpen(false);
        },
        handleCreateBlank,
        handleClearDrawings: () => {
            const canvas = drawingCanvasRef.current; if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            commitState();
        },
        handleRemoveBackground: async () => {
            if (!internalImageUrl) return; setIsLoading(true);
            try {
                const resultUrl = await removeImageBackground(internalImageUrl);
                resetAll(true); setInternalImageUrl(resultUrl); commitState();
            } catch (err) { alert(`Error removing background: ${err instanceof Error ? err.message : "An unknown error occurred."}`); } 
            finally { setIsLoading(false); }
        },
        handleInvertColors: () => { const snapshot = captureState(); const newSnapshot = { ...snapshot, isInverted: !snapshot.isInverted }; pushHistory(newSnapshot); restoreState(newSnapshot); },
        handleApplyAllAdjustments,
        handleApplyAdjustmentsToSelection,
        invertSelection, deselect, deleteImageContentInSelection, fillSelection,
    };
};

export type ImageEditorState = ReturnType<typeof useImageEditorState>;
