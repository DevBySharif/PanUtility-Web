import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Download,
  Globe,
  Link,
  Shield,
  Terminal,
  Video,
  WarningCircle,
  ArrowSquareOut,
  MusicNote,
  Play,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';

interface SocialDownloaderProps {
  onBack: () => void;
}

interface VideoMeta {
  title: string;
  thumbnail: string;
  duration?: string;
  platform: string;
  ytId?: string;
  isDirectMp4: boolean;
}

type Status = 'idle' | 'parsing' | 'ready' | 'error';

const SERVICES = [
  {
    id: 'cobalt',
    name: 'Cobalt',
    desc: 'Open-source, no ads',
    color: '#6366f1',
    getUrl: (u: string) => `https://cobalt.tools/?u=${encodeURIComponent(u)}`,
  },
  {
    id: 'savefrom',
    name: 'SaveFrom.net',
    desc: 'Supports most platforms',
    color: '#10b981',
    getUrl: (u: string) => `https://en1.savefrom.net/19wr/#url=${encodeURIComponent(u)}`,
  },
  {
    id: 'y2mate',
    name: 'Y2Mate',
    desc: 'YouTube & Facebook',
    color: '#f59e0b',
    getUrl: (u: string) => `https://www.y2mate.com/youtube/${u.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ''}`,
  },
  {
    id: 'yt1s',
    name: 'YT1s',
    desc: 'Fast HD downloads',
    color: '#ec4899',
    getUrl: (u: string) => `https://yt1s.com/en/youtube-to-mp4?q=${encodeURIComponent(u)}`,
  },
];

export default function SocialDownloader({ onBack }: SocialDownloaderProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [parsingStep, setParsingStep] = useState('');
  const [meta, setMeta] = useState<VideoMeta | null>(null);

  const detectPlatform = (u: string): string => {
    const l = u.toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'YouTube';
    if (l.includes('tiktok.com')) return 'TikTok';
    if (l.includes('instagram.com')) return 'Instagram';
    if (l.includes('facebook.com') || l.includes('fb.watch')) return 'Facebook';
    if (l.includes('twitter.com') || l.includes('x.com')) return 'Twitter / X';
    if (l.match(/\.(mp4|webm|mov|mkv|avi)(\?|$)/i)) return 'Direct Video';
    return 'Web Video';
  };

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus('parsing');
    setMeta(null);

    const platform = detectPlatform(trimmed);

    // Direct .mp4 link — no metadata needed, offer instant download
    if (trimmed.match(/\.(mp4|webm|mov|mkv)(\?|$)/i)) {
      setMeta({ title: trimmed.split('/').pop()?.split('?')[0] || 'video', thumbnail: '', platform: 'Direct Video', isDirectMp4: true });
      setStatus('ready');
      return;
    }

    // YouTube — fetch metadata via oEmbed (works from browser, no API key needed)
    const ytId = trimmed.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (ytId) {
      setParsingStep('Fetching video details via YouTube API...');
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
        if (r.ok) {
          const d = await r.json();
          setMeta({
            title: d.title,
            thumbnail: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
            platform: 'YouTube',
            ytId,
            isDirectMp4: false,
          });
          setStatus('ready');
          return;
        }
      } catch {/* fallthrough */}
    }

    // Other platforms — try OG metadata via our backend (best-effort)
    setParsingStep('Fetching page metadata...');
    try {
      const r = await fetch('/api/resolve-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (r.ok) {
        const d = await r.json();
        setMeta({
          title: d.title || `${platform} Video`,
          thumbnail: d.thumbnail || '',
          duration: d.duration,
          platform,
          isDirectMp4: false,
        });
        setStatus('ready');
        return;
      }
    } catch {/* fallthrough */}

    // Fallback — still show the card so user can choose a service
    setMeta({ title: `${platform} Video`, thumbnail: '', platform, isDirectMp4: false });
    setStatus('ready');
  };

  const handleDirectDownload = () => {
    const a = document.createElement('a');
    a.href = url.trim();
    a.download = meta?.title || 'video';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    confetti({ particleCount: 100, spread: 80 });
  };

  const openService = (svc: typeof SERVICES[0]) => {
    window.open(svc.getUrl(url.trim()), '_blank', 'noopener');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6" id="social-downloader-tool">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-2.5">
            <Download className="w-8 h-8 text-[#10b981]" />
            Social Media Downloader
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Download videos from YouTube, TikTok, Instagram, Twitter &amp; more.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">

        {/* URL Input Card */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 md:p-8 shadow-xl flex flex-col gap-4 text-center max-w-3xl mx-auto w-full">
          <div className="flex flex-col items-center gap-1.5 mb-2">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2 justify-center">
              <Globe className="w-6 h-6 text-[#10b981]" /> Online Video Downloader
            </h2>
            <p className="text-gray-400 text-xs md:text-sm">
              Paste any video link — YouTube, TikTok, Instagram, Twitter/X, Facebook, or a direct .mp4 URL.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-0 rounded-lg overflow-hidden border border-[#2a2a2a] focus-within:border-[#10b981] transition-all bg-[#151515] p-1 shadow-inner">
            <div className="relative flex-1 flex items-center px-3.5">
              <Link className="w-4 h-4 text-gray-500 shrink-0 mr-2" />
              <input
                type="url"
                id="video-url-input"
                placeholder="https://youtube.com/watch?v=... or any video URL"
                value={url}
                onChange={e => { setUrl(e.target.value); setStatus('idle'); setMeta(null); }}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
                disabled={status === 'parsing'}
                className="w-full py-3.5 text-sm focus:outline-none bg-transparent text-white placeholder-gray-500"
              />
            </div>
            <button
              id="fetch-video-btn"
              onClick={handleFetch}
              disabled={!url.trim() || status === 'parsing'}
              className="py-3 px-8 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shrink-0 disabled:bg-[#1c1c1c] disabled:text-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-md sm:rounded-none sm:rounded-r-md m-0.5 sm:m-0"
            >
              {status === 'parsing'
                ? <><ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Fetching...</>
                : <>Download →</>
              }
            </button>
          </div>

          {/* Loading step */}
          <AnimatePresence>
            {status === 'parsing' && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-left bg-[#070707] border border-[#1a1a1a] rounded-lg p-3"
              >
                <ArrowsCounterClockwise className="w-4 h-4 text-[#10b981] animate-spin shrink-0" />
                <span className="text-[11px] text-[#10b981] font-mono">{parsingStep}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Result Card */}
        <AnimatePresence>
          {status === 'ready' && meta && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto w-full"
            >
              {/* Video info strip */}
              <div className="border border-[#2a2a2a] bg-[#0d0d0d] rounded-xl overflow-hidden shadow-2xl">
                <div className="flex flex-col md:flex-row gap-0">
                  {/* Thumbnail */}
                  {meta.thumbnail ? (
                    <div className="w-full md:w-60 aspect-video bg-[#0a0a0a] shrink-0 relative overflow-hidden">
                      <img
                        src={meta.thumbnail}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        referrerPolicy="no-referrer"
                      />
                      {meta.ytId && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                            <Play className="w-5 h-5 text-white ml-1" weight="fill" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full md:w-60 aspect-video bg-[#0a0a0a] flex items-center justify-center shrink-0">
                      <Video className="w-10 h-10 text-gray-700" />
                    </div>
                  )}

                  {/* Meta + direct download (for .mp4 links) */}
                  <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-950/40 text-[#10b981] px-2 py-0.5 rounded border border-[#10b981]/25">
                        {meta.platform}
                      </span>
                      <h3 className="text-sm md:text-base font-bold text-white mt-2 leading-snug line-clamp-2">
                        {meta.title}
                      </h3>
                      {meta.duration && meta.duration !== '00:00' && (
                        <p className="text-[11px] text-gray-500 mt-1 font-mono">{meta.duration}</p>
                      )}
                    </div>

                    {meta.isDirectMp4 ? (
                      <button
                        onClick={handleDirectDownload}
                        className="self-start flex items-center gap-2 py-2.5 px-5 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Download File
                      </button>
                    ) : (
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Choose a download service below. Each opens in a new tab with your link pre-filled.
                      </p>
                    )}
                  </div>
                </div>

                {/* Download Services Grid — shown for non-direct links */}
                {!meta.isDirectMp4 && (
                  <div className="border-t border-[#1a1a1a] p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                      Choose Download Service
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {SERVICES.map(svc => (
                        <button
                          key={svc.id}
                          onClick={() => openService(svc)}
                          className="group flex flex-col items-start gap-1 p-3 bg-[#111] hover:bg-[#181818] border border-[#222] hover:border-[#333] rounded-xl transition-all cursor-pointer text-left"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-white group-hover:text-[#10b981] transition-colors">
                              {svc.name}
                            </span>
                            <ArrowSquareOut className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#10b981] transition-colors" />
                          </div>
                          <span className="text-[10px] text-gray-500">{svc.desc}</span>
                          <div className="mt-1 h-0.5 w-8 rounded-full" style={{ backgroundColor: svc.color }} />
                        </button>
                      ))}
                    </div>

                    {/* Also offer direct MP3 via audio services */}
                    {meta.ytId && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={`https://cobalt.tools/?u=https://youtu.be/${meta.ytId}&vCodec=none`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-[#10b981] border border-[#222] hover:border-[#10b981]/30 rounded-lg px-3 py-2 transition-all"
                        >
                          <MusicNote className="w-3.5 h-3.5" /> Download Audio (MP3)
                        </a>
                        <a
                          href={`https://www.y2mate.com/youtube-mp3/${meta.ytId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-[#10b981] border border-[#222] hover:border-[#10b981]/30 rounded-lg px-3 py-2 transition-all"
                        >
                          <MusicNote className="w-3.5 h-3.5" /> MP3 via Y2Mate
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reset */}
              <button
                onClick={() => { setUrl(''); setStatus('idle'); setMeta(null); }}
                className="mt-4 text-[11px] text-gray-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowsCounterClockwise className="w-3.5 h-3.5" /> Try another link
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 max-w-4xl mx-auto w-full">
          <div className="md:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a2a]">
              <Terminal className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-white text-sm font-semibold">Direct Stream Sniffer Guide</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-400 font-medium">
              For private or restricted content, you can sniff the raw stream directly from your browser:
            </p>
            <ol className="text-[11px] text-gray-300 flex flex-col gap-2 list-decimal pl-4 font-medium leading-relaxed">
              <li>Open the platform (e.g. TikTok) and press <kbd className="bg-[#151515] border border-[#2a2a2a] px-1 rounded text-[10px] text-gray-400">F12</kbd> → Network tab.</li>
              <li>Filter by <strong>Media</strong> or search for <code>.mp4</code>.</li>
              <li>Play the video, copy the request URL, paste it here — it downloads instantly.</li>
            </ol>
          </div>

          <div className="md:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 shadow-sm flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a2a]">
              <Shield className="w-5 h-5 text-[#10b981]" />
              <h2 className="font-sans text-white text-sm font-semibold">100% Secure</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-400 font-medium">
              Your URL is never stored. Download services open directly in your browser — no tracking, no credentials shared.
            </p>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="text-[10px] font-bold text-[#10b981]">Privacy-first design</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
