import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileText, ArrowUp, ArrowDown, Trash2, 
  Settings2, FileCode, CheckCircle2, RefreshCw, 
  Sparkles, Download, LayoutTemplate, HelpCircle 
} from 'lucide-react';
import { PDFImageItem } from '../types';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

interface PdfCompilerProps {
  onBack: () => void;
  initialFile?: File;
}

export default function PdfCompiler({ onBack, initialFile }: PdfCompilerProps) {
  const toast = useToast();
  const [items, setItems] = useState<PDFImageItem[]>([]);
  const [pdfTitle, setPdfTitle] = useState<string>('compiled_document');
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'original'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [margin, setMargin] = useState<'none' | 'small' | 'medium'>('none');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compiledUrl, setCompiledUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      handleFiles([initialFile]);
    }
  }, [initialFile]);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => file.type.startsWith('image/'));
    
    const newItems: PDFImageItem[] = validFiles.map(file => {
      const id = Math.random().toString(36).substring(2, 9);
      const previewUrl = URL.createObjectURL(file);
      return {
        id,
        file,
        name: file.name,
        previewUrl,
        size: file.size
      };
    });

    setItems(prev => [...prev, ...newItems]);
    setCompiledUrl(null); // clear old build
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== id);
    });
    setCompiledUrl(null);
  };

  const clearAll = () => {
    items.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    if (compiledUrl) URL.revokeObjectURL(compiledUrl);
    setCompiledUrl(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
    setCompiledUrl(null);
  };

  const getPageDimensions = (itemWidth: number, itemHeight: number) => {
    let w = itemWidth;
    let h = itemHeight;

    if (pageSize === 'a4') {
      // Standard A4 dimensions in pixels/points (roughly 595.27 x 841.89)
      w = 595;
      h = 842;
    } else if (pageSize === 'letter') {
      // Letter dimensions (roughly 612 x 792)
      w = 612;
      h = 792;
    }

    // Handle orientation adjustments
    if (pageSize !== 'original') {
      const isItemLandscape = itemWidth > itemHeight;
      const forceLandscape = orientation === 'landscape' || (orientation === 'auto' && isItemLandscape);
      const forcePortrait = orientation === 'portrait' || (orientation === 'auto' && !isItemLandscape);

      if (forceLandscape && w < h) {
        // Swap width and height to make landscape
        const temp = w;
        w = h;
        h = temp;
      } else if (forcePortrait && w > h) {
        const temp = w;
        w = h;
        h = temp;
      }
    }

    return { pageW: w, pageH: h };
  };

  const compilePdf = async () => {
    if (items.length === 0) return;
    setIsCompiling(true);

    try {
      // Helper to load image as HTMLImageElement
      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
        });
      };

      // Create initial PDF
      // jsPDF accepts coordinates in points/pixels ('pt' or 'px')
      // Let's load the first image to determine sizing
      const firstImg = await loadImage(items[0].previewUrl);
      const firstW = firstImg.naturalWidth;
      const firstH = firstImg.naturalHeight;

      const { pageW: initW, pageH: initH } = getPageDimensions(firstW, firstH);
      const isFirstLandscape = initW > initH;

      const doc = new jsPDF({
        orientation: isFirstLandscape ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [initW, initH],
        compress: true
      });

      // Map margins
      let marginVal = 0;
      if (margin === 'small') marginVal = 15;
      else if (margin === 'medium') marginVal = 30;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const img = await loadImage(item.previewUrl);
        const origW = img.naturalWidth;
        const origH = img.naturalHeight;

        const { pageW, pageH } = getPageDimensions(origW, origH);
        const isLandscape = pageW > pageH;

        if (i > 0) {
          doc.addPage([pageW, pageH], isLandscape ? 'landscape' : 'portrait');
        }

        // Calculate size to draw image in page with margin
        const maxDrawW = pageW - marginVal * 2;
        const maxDrawH = pageH - marginVal * 2;

        const imgRatio = origW / origH;
        const drawRatio = maxDrawW / maxDrawH;

        let drawW = maxDrawW;
        let drawH = maxDrawH;

        if (imgRatio > drawRatio) {
          // Fit to width
          drawH = maxDrawW / imgRatio;
        } else {
          // Fit to height
          drawW = maxDrawH * imgRatio;
        }

        // Center the image in the drawing region
        const drawX = marginVal + (maxDrawW - drawW) / 2;
        const drawY = marginVal + (maxDrawH - drawH) / 2;

        // Draw onto canvas to compress and generate JPEG
        const canvas = document.createElement('canvas');
        canvas.width = origW;
        canvas.height = origH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill canvas with solid white background to avoid transparent sections of PNG turning black in JPEG output
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, origW, origH);
          ctx.drawImage(img, 0, 0);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          doc.addImage(compressedDataUrl, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
        } else {
          doc.addImage(img, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
        }
      }

      // Output as blob
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setCompiledUrl(url);
      
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });

      toast.success(
        'PDF Compiled Successfully',
        `Sorted and compiled ${items.length} image${items.length !== 1 ? 's' : ''} into a single document.`
      );
    } catch (err: any) {
      console.error('PDF creation error:', err);
      toast.error(
        'PDF Compilation Failed',
        `Error: ${err.message || 'An unknown error occurred.'}`
      );
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = () => {
    if (!compiledUrl) return;
    const a = document.createElement('a');
    a.href = compiledUrl;
    a.download = `${pdfTitle.trim() || 'compiled_document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="pdf-compiler-tool">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button 
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#c5a368] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-serif italic text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#c5a368]" />
            PDF Compiler (Images to PDF)
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Reorder and compile JPG, PNG, WEBP, or GIF images into a single legal PDF.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side Options */}
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Settings2 className="w-5 h-5 text-[#c5a368]" />
            <h2 className="font-serif italic text-lg text-white">PDF Configuration</h2>
          </div>

          {/* PDF File Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">File Name</label>
            <div className="flex rounded border border-[#2a2a2a] bg-[#151515] text-white focus-within:border-[#c5a368] overflow-hidden text-sm">
              <input
                type="text"
                placeholder="compiled_document"
                value={pdfTitle}
                onChange={(e) => {
                  setPdfTitle(e.target.value);
                  setCompiledUrl(null);
                }}
                className="w-full px-3 py-2 bg-transparent focus:outline-none"
              />
              <span className="bg-[#111] text-gray-500 px-3 py-2 border-l border-[#2a2a2a] font-medium shrink-0 flex items-center select-none text-xs">
                .pdf
              </span>
            </div>
          </div>

          {/* Page Format */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Size</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['a4', 'letter', 'original'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCompiledUrl(null);
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    pageSize === size
                      ? 'border-[#c5a368] bg-[#c5a368]/10 text-[#c5a368]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {size === 'a4' ? 'A4' : size === 'letter' ? 'Letter' : 'Original'}
                </button>
              ))}
            </div>
          </div>

          {/* Page Orientation */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orientation</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['auto', 'portrait', 'landscape'] as const).map((orient) => (
                <button
                  key={orient}
                  disabled={pageSize === 'original'}
                  onClick={() => {
                    setOrientation(orient);
                    setCompiledUrl(null);
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded border transition-all cursor-pointer text-center disabled:opacity-30 disabled:cursor-not-allowed ${
                    orientation === orient && pageSize !== 'original'
                      ? 'border-[#c5a368] bg-[#c5a368]/10 text-[#c5a368]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {orient === 'auto' ? 'Auto-Fit' : orient === 'portrait' ? 'Portrait' : 'Landscape'}
                </button>
              ))}
            </div>
            {pageSize === 'original' && (
              <span className="text-[10px] text-gray-500">Locked to original image dimensions.</span>
            )}
          </div>

          {/* Margin Sizing */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Margins</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['none', 'small', 'medium'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMargin(m);
                    setCompiledUrl(null);
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    margin === m
                      ? 'border-[#c5a368] bg-[#c5a368]/10 text-[#c5a368]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {m === 'none' ? 'None' : m === 'small' ? 'Small' : 'Medium'}
                </button>
              ))}
            </div>
          </div>

          {/* Build Controls */}
          <div className="mt-4 flex flex-col gap-2">
            {!compiledUrl ? (
              <button
                onClick={compilePdf}
                disabled={items.length === 0 || isCompiling}
                className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  items.length === 0
                    ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed'
                    : 'bg-[#c5a368] hover:bg-[#8a6d3b] text-[#0a0a0a] hover:shadow-md'
                }`}
              >
                {isCompiling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Compiling...
                  </>
                ) : (
                  <>
                    <LayoutTemplate className="w-4 h-4" /> Compile into PDF
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownload}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download PDF Now
                </button>
                <button
                  onClick={() => setCompiledUrl(null)}
                  className="w-full py-2 px-4 border border-rose-900/40 hover:bg-rose-950/20 text-rose-400 rounded font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-compile / Make Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sort/Upload Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[180px] ${
              isDragging
                ? 'border-[#c5a368] bg-[#c5a368]/10'
                : 'border-[#2a2a2a] hover:border-[#c5a368]/40 bg-[#0d0d0d]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*"
              className="hidden"
            />
            <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#c5a368]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-white font-serif italic text-base">Drag & drop images to convert to PDF</h3>
            <p className="text-gray-500 text-xs mt-1 mb-3">Upload pages in the order you'd like, or sort them below</p>
            <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#c5a368] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#8a6d3b] transition-all">
              Choose Images
            </span>
          </div>

          {/* List of images */}
          <div className="flex flex-col gap-3">
            {items.length > 0 && (
              <div className="flex justify-between items-center mb-1 select-none">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Pages Layout ({items.length} pages)
                </span>
                <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-600" /> Use arrows to order pages
                </span>
              </div>
            )}

            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm group hover:border-[#c5a368]/30 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Page counter & Thumbnail */}
                    <div className="text-xs font-bold text-gray-400 bg-[#151515] w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-[#2a2a2a]">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 rounded bg-[#151515] border border-[#2a2a2a] overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={item.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {/* Filename details */}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-white truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <span className="text-xs text-gray-400 font-semibold">{formatSize(item.size)}</span>
                    </div>
                  </div>

                  {/* Actions & Ordering Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Arrow Up */}
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] rounded text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Move Page Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    {/* Arrow Down */}
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] rounded text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Move Page Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {/* Trash Button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 border border-transparent hover:bg-rose-950/20 text-gray-500 hover:text-rose-400 rounded transition-colors cursor-pointer ml-1"
                      title="Delete Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm select-none font-medium">
                No images added. Add some pages to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
