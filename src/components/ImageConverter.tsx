import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  FileImage,
  Image,
  Sliders,
  Sparkle,
  Trash,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import { ImageFile } from '../types';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';
import {
  IMAGE_TOOL_LIMITS,
  buildConvertedFileName,
  computeOutputDimensions,
  formatFileSize,
  formatSizeDelta,
  validateImageFile
} from '../lib/imageTools';

interface ImageConverterProps {
  onBack: () => void;
  initialFile?: File;
}

export default function ImageConverter({ onBack, initialFile }: ImageConverterProps) {
  const toast = useToast();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [globalFormat, setGlobalFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const [globalQuality, setGlobalQuality] = useState<number>(85); // 0-100
  const [globalWidth, setGlobalWidth] = useState<string>(''); // keep empty for original
  const [globalHeight, setGlobalHeight] = useState<string>('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ImageFile[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

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

  // Unmount cleanup for object URLs
  useEffect(() => {
    return () => {
      imagesRef.current.forEach(img => {
        if (img.previewUrl) {
          try { URL.revokeObjectURL(img.previewUrl); } catch (e) {}
        }
        if (img.convertedUrl) {
          try { URL.revokeObjectURL(img.convertedUrl); } catch (e) {}
        }
      });
    };
  }, []);

  const handleFiles = (fileList: File[]) => {
    const MAX_SINGLE_BYTES = IMAGE_TOOL_LIMITS.maxSingleBytes;
    const MAX_TOTAL_BATCH = IMAGE_TOOL_LIMITS.maxBatchItems;

    const currentCount = imagesRef.current.length;
    if (currentCount >= MAX_TOTAL_BATCH) {
      toast.error('Batch Limit Reached', `Maximum ${MAX_TOTAL_BATCH} images can be processed at once.`);
      return;
    }

    const validImageFiles: File[] = [];

    for (const file of fileList) {
      const validation = validateImageFile(file);
      if (!validation.ok) {
        const title = validation.code === 'empty'
          ? 'Empty File Skipped'
          : validation.code === 'too-large'
            ? 'File Too Large'
            : 'Unsupported Format';
        toast.error(title, validation.message);
        continue;
      }
      validImageFiles.push(file);
    }

    if (validImageFiles.length === 0) return;

    const availableSlots = MAX_TOTAL_BATCH - currentCount;
    const filesToProcess = validImageFiles.slice(0, availableSlots);

    const newImages: ImageFile[] = filesToProcess.map(file => {
      const id = Math.random().toString(36).substring(2, 9);
      const previewUrl = URL.createObjectURL(file);
      
      const img = window.Image ? new window.Image() : null;
      let width = 0;
      let height = 0;
      if (img) {
        img.src = previewUrl;
        img.onload = () => {
          setImages(prev => prev.map(item => {
            if (item.id === id) {
              return { ...item, width: img.naturalWidth, height: img.naturalHeight };
            }
            return item;
          }));
        };
        img.onerror = () => {
          toast.error('Image Decode Error', `Failed to decode image data from "${file.name}".`);
          setImages(prev => prev.map(item => item.id === id ? { ...item, status: 'failed' } : item));
        };
      }

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'image/png',
        previewUrl,
        width,
        height,
        status: 'pending',
        progress: 0
      };
    });

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl) {
        try { URL.revokeObjectURL(target.previewUrl); } catch (e) {}
      }
      if (target?.convertedUrl) {
        try { URL.revokeObjectURL(target.convertedUrl); } catch (e) {}
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => {
      if (img.previewUrl) {
        try { URL.revokeObjectURL(img.previewUrl); } catch (e) {}
      }
      if (img.convertedUrl) {
        try { URL.revokeObjectURL(img.convertedUrl); } catch (e) {}
      }
    });
    setImages([]);
  };

  const convertSingleImage = (imgFile: ImageFile): Promise<ImageFile> => {
    return new Promise((resolve) => {
      setImages(prev => prev.map(img => 
        img.id === imgFile.id ? { ...img, status: 'processing', progress: 30 } : img
      ));

      if (imgFile.convertedUrl) {
        try { URL.revokeObjectURL(imgFile.convertedUrl); } catch (e) {}
      }

      const imgElement = new window.Image();
      imgElement.src = imgFile.previewUrl;
      
      imgElement.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get 2D context');
          }

          const naturalW = imgElement.naturalWidth || imgFile.width || 100;
          const naturalH = imgElement.naturalHeight || imgFile.height || 100;

          const { width: outWidth, height: outHeight } = computeOutputDimensions(
            naturalW,
            naturalH,
            globalWidth,
            globalHeight,
            maintainAspectRatio
          );

          canvas.width = outWidth;
          canvas.height = outHeight;
          
          // Fill background with white for JPEG format to avoid transparent pixels turning black
          if (globalFormat === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, outWidth, outHeight);
          }

          ctx.drawImage(imgElement, 0, 0, outWidth, outHeight);

          const format = globalFormat;
          const quality = globalQuality / 100;

          setImages(prev => prev.map(img => 
            img.id === imgFile.id ? { ...img, progress: 70 } : img
          ));

          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              const convertedUrl = URL.createObjectURL(blob);
              const convertedName = buildConvertedFileName(imgFile.name, format);

              const updatedImage: ImageFile = {
                ...imgFile,
                status: 'completed',
                progress: 100,
                convertedBlob: blob,
                convertedUrl,
                convertedName,
                convertedSize: blob.size
              };

              setImages(prev => prev.map(img => 
                img.id === imgFile.id ? updatedImage : img
              ));
              resolve(updatedImage);
            } else {
              throw new Error('Canvas blob output generation failed');
            }
          }, format, format === 'image/png' ? undefined : quality);

        } catch (err) {
          console.error('Image conversion error:', err);
          const failedImage: ImageFile = {
            ...imgFile,
            status: 'failed',
            progress: 0
          };
          setImages(prev => prev.map(img => 
            img.id === imgFile.id ? failedImage : img
          ));
          resolve(failedImage);
        }
      };

      imgElement.onerror = () => {
        const failedImage: ImageFile = {
          ...imgFile,
          status: 'failed',
          progress: 0
        };
        setImages(prev => prev.map(img => 
          img.id === imgFile.id ? failedImage : img
        ));
        resolve(failedImage);
      };
    });
  };

  const handleConvertAll = async () => {
    if (images.length === 0) return;
    const pendingImages = images.filter(img => img.status !== 'completed' && img.status !== 'processing');
    if (pendingImages.length === 0) return;
    setIsProcessingAll(true);

    let successCount = 0;
    let errorCount = 0;
    
    // Process sequentially or in batches
    for (const img of pendingImages) {
      const result = await convertSingleImage(img);
      if (result.status === 'completed') {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setIsProcessingAll(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (errorCount === 0) {
      toast.success(
        'Batch Conversion Complete',
        `Successfully converted ${successCount} image${successCount !== 1 ? 's' : ''} to ${getFormatLabel(globalFormat)} format.`
      );
    } else if (successCount === 0) {
      toast.error(
        'Batch Conversion Failed',
        `Failed to convert ${errorCount} image${errorCount !== 1 ? 's' : ''}. Please check your files and try again.`
      );
    } else {
      toast.toast({
        title: 'Batch Conversion Finished with Warnings',
        description: `Successfully converted ${successCount} image${successCount !== 1 ? 's' : ''}, but failed to convert ${errorCount} image${errorCount !== 1 ? 's' : ''}.`,
        type: 'warning'
      });
    }
  };

  const triggerDownload = (img: ImageFile) => {
    if (!img.convertedUrl || !img.convertedName) return;
    const a = document.createElement('a');
    a.href = img.convertedUrl;
    a.download = img.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const triggerDownloadAll = () => {
    const completed = images.filter(img => img.status === 'completed');
    completed.forEach(img => {
      triggerDownload(img);
    });
  };

  const getFormatLabel = (mime: string) => {
    if (mime === 'image/jpeg') return 'JPEG';
    if (mime === 'image/png') return 'PNG';
    if (mime === 'image/webp') return 'WebP';
    return mime.split('/')[1]?.toUpperCase() || mime;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="image-converter-tool">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button 
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <FileImage className="w-8 h-8 text-[#10b981]" />
            Image Format Converter
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Convert, resize, and compress your images locally. Zero server uploads.
          </p>
        </div>
        {images.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Options Side - Configurations */}
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Conversion Settings</h2>
          </div>

          {/* Target Format */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['image/webp', 'image/jpeg', 'image/png'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setGlobalFormat(fmt)}
                  className={`py-2 px-3 text-xs font-semibold rounded border transition-all cursor-pointer text-center ${
                    globalFormat === fmt
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                  }`}
                >
                  {getFormatLabel(fmt)}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider (only show if JPEG or WebP) */}
          {globalFormat !== 'image/png' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="image-quality" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quality</label>
                <span className="text-xs font-bold text-[#10b981]">{globalQuality}%</span>
              </div>
              <input
                id="image-quality"
                type="range"
                min="10"
                max="100"
                value={globalQuality}
                onChange={(e) => setGlobalQuality(parseInt(e.target.value))}
                className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
              />
              <span className="text-[10px] text-gray-500">Lower values reduce file size but lower quality.</span>
            </div>
          )}

          {/* Resize Configuration */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-gray-500" /> Resize Dimensions
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-400 select-none">
                <input
                  type="checkbox"
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  className="rounded text-[#10b981] focus:ring-0 accent-[#10b981] w-3.5 h-3.5 cursor-pointer"
                />
                Keep Aspect Ratio
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Width (px)</span>
                <input
                  type="number"
                  aria-label="Output width in pixels"
                  placeholder="Original"
                  value={globalWidth}
                  onChange={(e) => setGlobalWidth(e.target.value)}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Height (px)</span>
                <input
                  type="number"
                  aria-label="Output height in pixels"
                  placeholder="Original"
                  value={globalHeight}
                  onChange={(e) => setGlobalHeight(e.target.value)}
                  disabled={maintainAspectRatio && globalWidth !== ''}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] disabled:bg-[#121212] disabled:text-gray-600 disabled:border-[#1a1a1a]"
                />
              </div>
            </div>
            {maintainAspectRatio && globalWidth !== '' && (
              <span className="text-[10px] text-[#10b981] font-medium">Height will adjust automatically.</span>
            )}
          </div>

          {/* Process Button */}
          <div className="mt-4">
            <button
              onClick={handleConvertAll}
              disabled={images.length === 0 || isProcessingAll}
              className={`w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                images.length === 0 
                  ? 'bg-[#151515] text-gray-600 border border-[#2a2a2a] cursor-not-allowed shadow-none'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md'
              }`}
            >
              {isProcessingAll ? (
                <>
                  <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Converting...
                </>
              ) : (
                <>
                  <ArrowsCounterClockwise className="w-4 h-4" /> Convert All Uploaded
                </>
              )}
            </button>
            {images.filter(img => img.status === 'completed').length > 0 && (
              <button
                onClick={triggerDownloadAll}
                className="w-full mt-2 py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download All Converted
              </button>
            )}
          </div>
        </div>

        {/* Right Upload/ListBullets Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload images to convert. Drop files or press Enter to browse."
            className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] focus:outline-none focus:border-[#10b981]/70 ${
              isDragging
                ? 'border-[#10b981] bg-[#10b981]/10'
                : 'border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d]'
            }`}
          >
            <input
              id="image-converter-file-input"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*"
              aria-label="Choose image files to convert"
              className="hidden"
            />
            <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-3 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-white font-sans text-base">Drag & drop your images</h3>
            <p className="text-gray-500 text-xs mt-1 mb-3">Supports JPG, PNG, WEBP, GIF, SVG, BMP, HEIC</p>
            <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#10b981] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
              Select Files
            </span>
          </div>

          {/* ListBullets of images */}
          <div className="flex flex-col gap-3">
            {images.length > 0 && (
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                Queue ({images.length} files)
              </span>
            )}
            
            <AnimatePresence>
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm group hover:border-[#10b981]/30 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded bg-[#151515] border border-[#2a2a2a] overflow-hidden shrink-0 flex items-center justify-center relative">
                      <img
                        src={img.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {/* Image details */}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-white truncate" title={img.name}>
                        {img.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-medium">
                        <span>{formatFileSize(img.size)}</span>
                        <span className="opacity-40">&bull;</span>
                        {img.width > 0 && (
                          <span>{img.width}x{img.height} px</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Processing Status & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {img.status === 'pending' && (
                      <button
                        onClick={() => convertSingleImage(img)}
                        className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center bg-[#151515] border border-[#2a2a2a] hover:border-[#10b981]/40 rounded text-gray-400 hover:text-[#10b981] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10b981]/40"
                        title="Convert this image"
                        aria-label={`Convert ${img.name}`}
                      >
                        <ArrowsCounterClockwise className="w-4 h-4" />
                      </button>
                    )}

                    {img.status === 'processing' && (
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#10b981] h-full transition-all duration-300" 
                            style={{ width: `${img.progress}%` }}
                          />
                        </div>
                        <ArrowsCounterClockwise className="w-3.5 h-3.5 text-[#10b981] animate-spin" />
                      </div>
                    )}

                    {img.status === 'completed' && (
                      <div className="flex items-center gap-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-3 py-1.5">
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-emerald-300 flex items-center justify-end gap-1 uppercase tracking-wider">
                            <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                            {getFormatLabel(globalFormat)}
                          </div>
                          {img.convertedSize && (
                            <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              {formatFileSize(img.convertedSize)} 
                              <span className="text-emerald-400 ml-1">
                                ({formatSizeDelta(img.size, img.convertedSize)})
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => triggerDownload(img)}
                          className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 rounded text-white shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
                          title="Download converted file"
                          aria-label={`Download ${img.convertedName || img.name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {img.status === 'failed' && (
                      <div className="flex items-center gap-1 text-red-400 text-xs font-semibold" title="Conversion failed">
                        <WarningCircle className="w-4 h-4" /> Failed
                      </div>
                    )}

                    {/* Trash Button */}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center border border-transparent hover:bg-rose-950/20 text-gray-500 hover:text-rose-400 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                      title="Remove from queue"
                      aria-label={`Remove ${img.name} from queue`}
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
