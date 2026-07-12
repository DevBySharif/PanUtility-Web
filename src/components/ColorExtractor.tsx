import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Clipboard,
  Copy,
  Image,
  Palette,
  Sliders,
  Sparkle,
  Trash,
  Upload
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

interface ColorExtractorProps {
  onBack: () => void;
  initialFile?: File;
}

interface Swatch {
  hex: string;
  rgb: string;
  percentage: number;
}

export default function ColorExtractor({ onBack, initialFile }: ColorExtractorProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [palette, setPalette] = useState<Swatch[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      processImage(initialFile);
    }
  }, [initialFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const processImage = (imageFile: File) => {
    if (!imageFile.type.startsWith('image/')) return;
    
    setFile(imageFile);
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    setIsExtracting(true);
    setPalette([]);

    const img = new window.Image();
    img.src = url;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Downscale image heavily for super-fast, clustered processing
        canvas.width = 40;
        canvas.height = 40;
        ctx.drawImage(img, 0, 0, 40, 40);

        const imgData = ctx.getImageData(0, 0, 40, 40).data;
        const colorBuckets: { [key: string]: number } = {};

        // Loop pixels, group colors to nearest 32-bits to perform simple, high-quality clustering/bucket grouping
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i+1];
          const b = imgData[i+2];
          const a = imgData[i+3];

          // Skip completely transparent pixels
          if (a < 128) continue;

          // Round RGB to cluster similar shades together
          const clusterFactor = 32;
          const groupedR = Math.round(r / clusterFactor) * clusterFactor;
          const groupedG = Math.round(g / clusterFactor) * clusterFactor;
          const groupedB = Math.round(b / clusterFactor) * clusterFactor;

          const key = `${groupedR},${groupedG},${groupedB}`;
          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }

        // Sort colors by frequency count
        const sortedBuckets = Object.entries(colorBuckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6); // Grab top 6 dominant colors

        const totalPixels = 40 * 40;
        const swatches: Swatch[] = sortedBuckets.map(([key, count]) => {
          const [r, g, b] = key.split(',').map(Number);
          
          // Clamp values to valid rgb range
          const clamp = (val: number) => Math.min(255, Math.max(0, val));
          const cr = clamp(r);
          const cg = clamp(g);
          const cb = clamp(b);

          const toHex = (num: number) => {
            const hex = num.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          };

          const hexStr = `#${toHex(cr)}${toHex(cg)}${toHex(cb)}`;
          
          return {
            hex: hexStr,
            rgb: `rgb(${cr}, ${cg}, ${cb})`,
            percentage: Math.round((count / totalPixels) * 100)
          };
        });

        setPalette(swatches);
        confetti({ particleCount: 30, spread: 35, origin: { y: 0.8 } });
        toast.success('Palette Extracted', `Successfully harvested ${swatches.length} dominant colors from image.`);
      } catch (err) {
        console.error('Palette extraction failed:', err);
        toast.error('Extraction Failed', 'Could not extract colors from the selected image.');
      } finally {
        setIsExtracting(false);
      }
    };
  };

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    toast.success('Color Copied', `${hex} is copied to your clipboard.`);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const clearWorkspace = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setPalette([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6" id="color-extractor-tool">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button 
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-2.5">
            <Palette className="w-8 h-8 text-[#10b981]" />
            Color Palette Extractor
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Analyze images to extract their dominant color palette swatches instantly.
          </p>
        </div>
        {file && (
          <button
            onClick={clearWorkspace}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Image
          </button>
        )}
      </div>

      {!file ? (
        /* Dropzone */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d] rounded-xl p-12 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[250px]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <div className="p-4 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-4 group-hover:scale-105 transition-transform text-[#10b981]">
            <Palette className="w-8 h-8" />
          </div>
          <h3 className="text-white font-sans text-base">Drag & drop your image</h3>
          <p className="text-gray-500 text-xs mt-1 mb-4">Upload any JPG, PNG, WEBP, or GIF image to extract its swatches</p>
          <span className="text-xs font-bold text-[#0a0a0a] bg-[#10b981] px-4 py-2 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
            Select Image
          </span>
        </div>
      ) : (
        /* Workspace Active */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Image Display */}
          <div className="md:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Source Image</span>
            <div className="w-full aspect-square bg-[#151515] rounded overflow-hidden border border-[#2a2a2a] shadow-inner flex items-center justify-center relative">
              <img
                src={previewUrl}
                alt="Source preview"
                className="w-full h-full object-cover"
              />
              {isExtracting && (
                <div className="absolute inset-0 bg-[#0a0a0a]/80 flex flex-col items-center justify-center gap-2">
                  <ArrowsCounterClockwise className="w-5 h-5 text-[#10b981] animate-spin" />
                  <span className="text-xs font-bold text-[#10b981] animate-pulse">Extracting spectrum...</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 font-medium">
              <span className="font-bold text-gray-300">Filename:</span> {file.name}
            </div>
          </div>

          {/* Extracted Swatches */}
          <div className="md:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a2a]">
              <Sparkle className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-white text-lg">Extracted Palette Swatches</h2>
            </div>

            {palette.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {palette.map((swatch, idx) => (
                  <motion.div
                    key={swatch.hex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => copyToClipboard(swatch.hex)}
                    className="border border-[#1a1a1a] hover:border-[#10b981]/40 bg-[#151515] rounded p-3.5 flex items-center justify-between gap-3 shadow-sm hover:shadow-md cursor-pointer group active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Color Block */}
                      <div 
                        className="w-12 h-12 rounded shadow-inner shrink-0 border border-black/20"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      {/* Text */}
                      <div>
                        <span className="text-sm font-bold text-gray-200 font-mono tracking-wider uppercase">{swatch.hex}</span>
                        <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{swatch.rgb}</span>
                      </div>
                    </div>

                    {/* Copy Accent Button */}
                    <div className="p-1.5 rounded bg-[#0d0d0d] group-hover:bg-[#10b981]/10 text-gray-400 group-hover:text-[#10b981] transition-colors">
                      {copiedColor === swatch.hex ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs">
                Analyzing pixels...
              </div>
            )}

            {palette.length > 0 && (
              <span className="text-[10px] text-gray-500 font-semibold text-center block mt-2 tracking-wider uppercase">
                &bull; Click any swatch card to copy its HEX code value directly &bull;
              </span>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
