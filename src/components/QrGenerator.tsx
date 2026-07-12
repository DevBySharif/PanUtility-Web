import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Download, QrCode, Clipboard, Link, Palette, 
  Settings2, Copy, Sparkles, Sliders, RefreshCw 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

interface QrGeneratorProps {
  onBack: () => void;
}

export default function QrGenerator({ onBack }: QrGeneratorProps) {
  const toast = useToast();
  const [text, setText] = useState<string>('https://ai.studio/build');
  const [fgColor, setFgColor] = useState<string>('#0f172a'); // slate-900
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [size, setSize] = useState<number>(300);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Parse HEX to RGB without hash for api compatibility (api.qrserver expects r-g-b formatting or standard hex without hash)
  const cleanHex = (color: string) => {
    return color.replace('#', '');
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text || ' ')}&color=${cleanHex(fgColor)}&bgcolor=${cleanHex(bgColor)}&ecc=H`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('Copied to Clipboard', 'The text/URL payload was successfully copied.');
    setTimeout(() => setIsCopied(false), 1500);
  };

  const downloadQr = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr_code_${Math.random().toString(36).substring(2, 6)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      confetti({ particleCount: 50, spread: 40 });
      toast.success('QR Code Downloaded', 'Your custom QR Code has been generated and saved.');
    } catch (err) {
      console.error('QR download failed:', err);
      // fallback simple anchor
      const a = document.createElement('a');
      a.href = qrUrl;
      a.target = '_blank';
      a.download = 'qr_code.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.info('QR Code Download Started', 'Downloading via fallback channel.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6" id="qr-generator-tool">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button 
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            <QrCode className="w-8 h-8 text-[#10b981]" />
            <span>QR Code Generator</span>
            <span className="text-[9px] bg-sky-950/30 border border-sky-800/50 text-sky-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono select-none">
              Requires Network
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Instantly render high-quality custom scannable QR Codes for links, phone numbers, or text payloads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Setup Controls */}
        <div className="md:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a2a]">
            <Settings2 className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">QR Code Content & Style</h2>
          </div>

          {/* Input content */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
              <span>Text or URL Payload</span>
              <button 
                onClick={copyToClipboard}
                className="text-[10px] text-[#10b981] hover:text-[#059669] flex items-center gap-1 font-semibold transition-colors cursor-pointer capitalize"
              >
                {isCopied ? 'Copied!' : <><Copy className="w-3 h-3" /> Copy Link</>}
              </button>
            </label>
            <textarea
              rows={3}
              placeholder="Enter link, text message, phone number, or structured contact info..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-sm border border-[#2a2a2a] focus:border-[#10b981] focus:ring-0 rounded px-4 py-3 bg-[#151515] text-white focus:outline-none resize-none placeholder-gray-500"
            />
          </div>

          {/* Color Adjusters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Foreground */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-gray-500" /> Foreground Color
              </label>
              <div className="flex items-center gap-2 border border-[#2a2a2a] rounded p-2 bg-[#151515]">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer outline-none bg-transparent"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="text-xs font-mono font-bold text-gray-300 focus:outline-none bg-transparent uppercase flex-1"
                />
              </div>
            </div>

            {/* Background */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-gray-500" /> Background Color
              </label>
              <div className="flex items-center gap-2 border border-[#2a2a2a] rounded p-2 bg-[#151515]">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer outline-none bg-transparent"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="text-xs font-mono font-bold text-gray-300 focus:outline-none bg-transparent uppercase flex-1"
                />
              </div>
            </div>
          </div>

          {/* Size Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-1"><Sliders className="w-3.5 h-3.5 text-gray-500" /> QR Resolution</span>
              <span className="text-[#10b981] font-mono">{size} x {size} px</span>
            </div>
            <input
              type="range"
              min="150"
              max="500"
              step="50"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Right Side: Preview & Export */}
        <div className="md:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col items-center justify-between gap-6">
          <div className="w-full text-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-4">Output Preview</span>
            
            <div 
              className="aspect-square w-full max-w-[200px] mx-auto rounded border border-[#2a2a2a] p-3 shadow-inner flex items-center justify-center transition-all"
              style={{ backgroundColor: bgColor }}
            >
              <img
                src={qrUrl}
                alt="QR Code"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <button
            onClick={downloadQr}
            disabled={isDownloading}
            className="w-full py-3.5 px-4 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Fetching...</>
            ) : (
              <><Download className="w-4 h-4" /> Download QR Code</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
