import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Image, RefreshCw, Download, Trash2, CheckCircle2, 
  AlertCircle, Settings2, Sliders, FileImage, Sparkles 
} from 'lucide-react';
import { ImageFile } from '../types';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

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
    const validImageFiles = fileList.filter(file => file.type.startsWith('image/'));
    
    const newImages: ImageFile[] = validImageFiles.map(file => {
      const id = Math.random().toString(36).substring(2, 9);
      const previewUrl = URL.createObjectURL(file);
      
      // Load dimensions
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
      }

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
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
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => {
      URL.revokeObjectURL(img.previewUrl);
      if (img.convertedUrl) URL.revokeObjectURL(img.convertedUrl);
    });
    setImages([]);
  };

  const convertSingleImage = (imgFile: ImageFile): Promise<ImageFile> => {
    return new Promise((resolve) => {
      // Mark as processing
      setImages(prev => prev.map(img => 
        img.id === imgFile.id ? { ...img, status: 'processing', progress: 30 } : img
      ));

      const imgElement = new window.Image();
      imgElement.src = imgFile.previewUrl;
      
      imgElement.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get 2D context');
          }

          // Calculate output dimensions
          let outWidth = imgFile.width || imgElement.naturalWidth;
          let outHeight = imgFile.height || imgElement.naturalHeight;

          const userW = parseInt(globalWidth);
          const userH = parseInt(globalHeight);

          if (userW && userH) {
            outWidth = userW;
            outHeight = userH;
          } else if (userW && maintainAspectRatio) {
            const aspect = imgElement.naturalHeight / imgElement.naturalWidth;
            outWidth = userW;
            outHeight = Math.round(userW * aspect);
          } else if (userH && maintainAspectRatio) {
            const aspect = imgElement.naturalWidth / imgElement.naturalHeight;
            outHeight = userH;
            outWidth = Math.round(userH * aspect);
          } else {
            if (userW) outWidth = userW;
            if (userH) outHeight = userH;
          }

          canvas.width = outWidth;
          canvas.height = outHeight;
          
          // Draw image
          ctx.drawImage(imgElement, 0, 0, outWidth, outHeight);

          // Convert to blob
          const format = globalFormat;
          const quality = globalQuality / 100;

          // Set progress
          setImages(prev => prev.map(img => 
            img.id === imgFile.id ? { ...img, progress: 70 } : img
          ));

          canvas.toBlob((blob) => {
            if (blob) {
              const convertedUrl = URL.createObjectURL(blob);
              const extension = format.split('/')[1];
              
              // Remove original extension and append new one
              const baseName = imgFile.name.substring(0, imgFile.name.lastIndexOf('.')) || imgFile.name;
              const convertedName = `${baseName}_converted.${extension}`;

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
              throw new Error('Blob generation failed');
            }
          }, format, format === 'image/png' ? undefined : quality);

        } catch (err) {
          console.error(err);
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
    setIsProcessingAll(true);

    const pendingImages = images.filter(img => img.status !== 'completed');
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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
            className="text-sm font-medium text-gray-400 hover:text-[#c5a368] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-serif italic text-white tracking-tight flex items-center gap-3">
            <FileImage className="w-8 h-8 text-[#c5a368]" />
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
            <Settings2 className="w-5 h-5 text-[#c5a368]" />
            <h2 className="font-serif italic text-lg text-white">Conversion Settings</h2>
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
                      ? 'border-[#c5a368] bg-[#c5a368]/10 text-[#c5a368]'
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
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quality</label>
                <span className="text-xs font-bold text-[#c5a368]">{globalQuality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={globalQuality}
                onChange={(e) => setGlobalQuality(parseInt(e.target.value))}
                className="w-full accent-[#c5a368] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
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
                  className="rounded text-[#c5a368] focus:ring-0 accent-[#c5a368] w-3.5 h-3.5 cursor-pointer"
                />
                Keep Aspect Ratio
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Width (px)</span>
                <input
                  type="number"
                  placeholder="Original"
                  value={globalWidth}
                  onChange={(e) => setGlobalWidth(e.target.value)}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#c5a368]"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Height (px)</span>
                <input
                  type="number"
                  placeholder="Original"
                  value={globalHeight}
                  onChange={(e) => setGlobalHeight(e.target.value)}
                  disabled={maintainAspectRatio && globalWidth !== ''}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#c5a368] disabled:bg-[#121212] disabled:text-gray-600 disabled:border-[#1a1a1a]"
                />
              </div>
            </div>
            {maintainAspectRatio && globalWidth !== '' && (
              <span className="text-[10px] text-[#c5a368] font-medium">Height will adjust automatically.</span>
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
                  : 'bg-[#c5a368] hover:bg-[#8a6d3b] text-[#0a0a0a] hover:shadow-md'
              }`}
            >
              {isProcessingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Converting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Convert All Uploaded
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

        {/* Right Upload/List Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[220px] ${
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
            <h3 className="text-white font-serif italic text-base">Drag & drop your images</h3>
            <p className="text-gray-500 text-xs mt-1 mb-3">Supports JPG, PNG, WEBP, GIF, SVG, BMP, HEIC</p>
            <span className="text-[11px] font-bold text-[#0a0a0a] bg-[#c5a368] px-3 py-1.5 rounded uppercase tracking-wider hover:bg-[#8a6d3b] transition-all">
              Select Files
            </span>
          </div>

          {/* List of images */}
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
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm group hover:border-[#c5a368]/30 transition-colors"
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
                        <span>{formatSize(img.size)}</span>
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
                        className="p-1.5 bg-[#151515] border border-[#2a2a2a] hover:border-[#c5a368]/40 rounded text-gray-400 hover:text-[#c5a368] transition-colors cursor-pointer"
                        title="Convert this image"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}

                    {img.status === 'processing' && (
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#c5a368] h-full transition-all duration-300" 
                            style={{ width: `${img.progress}%` }}
                          />
                        </div>
                        <RefreshCw className="w-3.5 h-3.5 text-[#c5a368] animate-spin" />
                      </div>
                    )}

                    {img.status === 'completed' && (
                      <div className="flex items-center gap-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-3 py-1.5">
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-emerald-300 flex items-center justify-end gap-1 uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            {getFormatLabel(globalFormat)}
                          </div>
                          {img.convertedSize && (
                            <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              {formatSize(img.convertedSize)} 
                              <span className="text-emerald-400 ml-1">
                                ({Math.round(((img.convertedSize - img.size) / img.size) * 100)}%)
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => triggerDownload(img)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white shadow-sm transition-colors cursor-pointer"
                          title="Download converted file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {img.status === 'failed' && (
                      <div className="flex items-center gap-1 text-red-400 text-xs font-semibold" title="Conversion failed">
                        <AlertCircle className="w-4 h-4" /> Failed
                      </div>
                    )}

                    {/* Trash Button */}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-1.5 border border-transparent hover:bg-rose-950/20 text-gray-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
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
