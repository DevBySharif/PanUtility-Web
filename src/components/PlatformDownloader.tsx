import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  Link,
  WarningCircle,
  Play,
  Image as ImageIcon,
} from '@phosphor-icons/react';

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'facebook';

interface PlatformConfig {
  name: string;
  placeholder: string;
  color: string;
  bgColor: string;
  borderColor: string;
  validate: (url: string) => string | null;
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  youtube: {
    name: 'YouTube',
    placeholder: 'https://youtube.com/watch?v=... or youtu.be/...',
    color: '#FF0000',
    bgColor: 'bg-red-950/20',
    borderColor: 'border-red-800/40',
    validate: (url) => {
      try {
        const u = new URL(url);
        const h = u.hostname.replace('www.', '');
        if (h !== 'youtube.com' && h !== 'youtu.be' && h !== 'm.youtube.com' && h !== 'music.youtube.com') return 'Please enter a valid YouTube URL.';
      } catch { return 'Invalid URL format.'; }
      return null;
    },
  },
  instagram: {
    name: 'Instagram',
    placeholder: 'https://instagram.com/reel/... or /p/...',
    color: '#E4405F',
    bgColor: 'bg-pink-950/20',
    borderColor: 'border-pink-800/40',
    validate: (url) => {
      try {
        const u = new URL(url);
        const h = u.hostname.replace('www.', '');
        if (h !== 'instagram.com') return 'Please enter a valid Instagram URL.';
        if (!/^\/(p|reel|reels|tv|stories)\//.test(u.pathname)) return 'Please enter an Instagram post, reel, or story URL.';
      } catch { return 'Invalid URL format.'; }
      return null;
    },
  },
  tiktok: {
    name: 'TikTok',
    placeholder: 'https://tiktok.com/@user/video/...',
    color: '#00F2EA',
    bgColor: 'bg-cyan-950/20',
    borderColor: 'border-cyan-800/40',
    validate: (url) => {
      try {
        const u = new URL(url);
        const h = u.hostname.replace('www.', '');
        if (h !== 'tiktok.com' && h !== 'vm.tiktok.com' && h !== 'vt.tiktok.com') return 'Please enter a valid TikTok URL.';
      } catch { return 'Invalid URL format.'; }
      return null;
    },
  },
  facebook: {
    name: 'Facebook',
    placeholder: 'https://facebook.com/watch?v=... or /reel/...',
    color: '#1877F2',
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-800/40',
    validate: (url) => {
      try {
        const u = new URL(url);
        const h = u.hostname.replace('www.', '').replace('web.', '').replace('m.', '');
        if (h !== 'facebook.com' && h !== 'fb.watch') return 'Please enter a valid Facebook URL.';
      } catch { return 'Invalid URL format.'; }
      return null;
    },
  },
};

type DownloadStatus = 'idle' | 'resolving' | 'ready' | 'error';

interface ResolvedItem {
  type: string;
  url: string;
  thumb?: string;
}

interface PlatformDownloaderProps {
  platform: Platform;
  icon: React.ReactNode;
  description: string;
}

export default function PlatformDownloader({ platform, icon, description }: PlatformDownloaderProps) {
  const config = PLATFORM_CONFIGS[platform];
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [error, setError] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [resolvedFilename, setResolvedFilename] = useState('');
  const [pickerItems, setPickerItems] = useState<ResolvedItem[]>([]);
  const [pickerAudio, setPickerAudio] = useState('');
  const [pickerAudioFilename, setPickerAudioFilename] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const reset = useCallback(() => {
    setUrl('');
    setStatus('idle');
    setError('');
    setResolvedUrl('');
    setResolvedFilename('');
    setPickerItems([]);
    setPickerAudio('');
    setPickerAudioFilename('');
    setIsDownloading(false);
  }, []);

  const handleResolve = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    const validationError = config.validate(trimmed);
    if (validationError) {
      setError(validationError);
      setStatus('error');
      return;
    }

    setStatus('resolving');
    setError('');

    try {
      const response = await fetch(`/api/download/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `Server error (${response.status})`);
      }

      if (data.status === 'tunnel' || data.status === 'redirect') {
        setResolvedUrl(data.url);
        setResolvedFilename(data.filename || 'download');
        setStatus('ready');
      } else if (data.status === 'picker') {
        setPickerItems(data.items || []);
        setPickerAudio(data.audioUrl || '');
        setPickerAudioFilename(data.audioFilename || '');
        setStatus('ready');
      } else {
        throw new Error('Unexpected response from provider.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resolve URL.';
      setError(message);
      setStatus('error');
    }
  }, [url, platform, config]);

  const handleDownload = useCallback((downloadUrl: string, filename: string) => {
    setIsDownloading(true);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setIsDownloading(false), 2000);
  }, []);

  const handleDownloadDirect = useCallback(() => {
    if (resolvedUrl) handleDownload(resolvedUrl, resolvedFilename);
  }, [resolvedUrl, resolvedFilename, handleDownload]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/40">
        <div>
          <button onClick={reset} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            {icon} {config.name} Downloader
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{description}</p>
          <p className="mt-2 text-xs text-amber-300">Submitted URLs are sent to Omnitily&apos;s server, which contacts the Cobalt download provider. Only public content is supported.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-[#0d0d0f] border border-zinc-800/80 rounded-xl p-6 md:p-8 shadow-xl flex flex-col gap-4 max-w-3xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row rounded-lg overflow-hidden border border-zinc-700 focus-within:border-emerald-500 transition-all bg-zinc-900/50 p-1 gap-0">
            <div className="flex-1 flex items-center px-3.5">
              <Link className="w-4 h-4 text-zinc-500 shrink-0 mr-2" />
              <input
                type="url"
                placeholder={config.placeholder}
                value={url}
                onChange={(e) => { setUrl(e.target.value); if (status === 'error') setStatus('idle'); }}
                onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                disabled={status === 'resolving' || isDownloading}
                className="w-full py-3.5 text-sm focus:outline-none bg-transparent text-white placeholder-zinc-500"
              />
            </div>
            <button
              onClick={handleResolve}
              disabled={!url.trim() || status === 'resolving' || isDownloading}
              className="py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shrink-0 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-md sm:rounded-none sm:rounded-r-md m-0.5 sm:m-0"
            >
              {status === 'resolving'
                ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Resolving…</>
                : <>Resolve →</>
              }
            </button>
          </div>

          <AnimatePresence>
            {status === 'resolving' && (
              <motion.div key="resolving" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/40 rounded-lg p-3 text-left">
                <ArrowsCounterClockwise className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                <span className="text-[11px] text-emerald-400 font-mono">Resolving {config.name} stream…</span>
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-red-950/20 border border-red-900/40 rounded-lg p-4 flex flex-col gap-2 text-left">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest">
                  <WarningCircle className="w-4 h-4" /> Could Not Resolve
                </div>
                <p className="text-[11px] text-red-300/80 leading-relaxed">{error}</p>
                <button onClick={reset} className="mt-1 self-start text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-700 rounded px-3 py-1.5 cursor-pointer transition-colors">
                  Try Another Link
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {status === 'ready' && !isDownloading && (
            <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="border border-zinc-800/80 bg-[#0d0d0f] rounded-xl overflow-hidden shadow-2xl max-w-3xl mx-auto w-full">

              {pickerItems.length > 0 ? (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">
                      {config.name} · {pickerItems.length} items found
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pickerItems.map((item, i) => (
                      <button key={i} onClick={() => handleDownload(item.url, `${platform}-download-${i + 1}`)}
                        className="group bg-zinc-900/50 border border-zinc-800/80 hover:border-emerald-500/50 rounded-lg p-3 flex flex-col gap-2 transition-all cursor-pointer">
                        {item.thumb
                          ? <img src={item.thumb} alt="" className="w-full aspect-video object-cover rounded" referrerPolicy="no-referrer" />
                          : <div className="w-full aspect-video bg-zinc-800 rounded flex items-center justify-center">
                              {item.type === 'video' ? <Play className="w-6 h-6 text-zinc-600" /> : <ImageIcon className="w-6 h-6 text-zinc-600" />}
                            </div>
                        }
                        <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-emerald-400 transition-colors capitalize">{item.type}</span>
                      </button>
                    ))}
                  </div>
                  {pickerAudio && (
                    <button onClick={() => handleDownload(pickerAudio, pickerAudioFilename || `${platform}-audio.mp3`)}
                      className="mt-3 w-full py-2.5 bg-zinc-900/50 border border-zinc-800/80 hover:border-emerald-500/50 rounded-lg text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer flex items-center justify-center gap-2">
                      <Download className="w-3.5 h-3.5" /> Download Audio
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-5 flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">
                      {config.name} · Stream Resolved
                    </span>
                    <p className="text-xs text-zinc-400 mt-2 font-mono break-all">{resolvedFilename}</p>
                  </div>
                  <button onClick={handleDownloadDirect}
                    className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shrink-0">
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              )}

              <div className="px-5 pb-4 flex justify-between items-center">
                <button onClick={reset} className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white cursor-pointer transition-colors">
                  ← Download Another
                </button>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-medium">Ready</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-[#0d0d0f] border border-zinc-800/80 rounded-xl p-5 max-w-3xl mx-auto w-full">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Supported {config.name} URLs</h3>
          <ul className="text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
            <li>• Standard videos: youtube.com/watch?v=..., youtu.be/...</li>
            {platform === 'youtube' && <li>• Shorts: youtube.com/shorts/...</li>}
            {platform === 'instagram' && <>
              <li>• Posts: instagram.com/p/...</li>
              <li>• Reels: instagram.com/reel/...</li>
              <li>• Stories: instagram.com/stories/...</li>
            </>}
            {platform === 'tiktok' && <li>• Short links: vm.tiktok.com/..., vt.tiktok.com/...</li>}
            {platform === 'facebook' && <>
              <li>• Watch: facebook.com/watch?v=...</li>
              <li>• Reels: facebook.com/reel/...</li>
            </>}
            <li>• Only publicly accessible content is supported</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
