import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Clock,
  Download,
  MusicNotes,
  Pause,
  Play,
  Plus,
  Scissors,
  Sliders,
  Sparkle,
  SpeakerHigh,
  Trash,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

interface AudioTrimmerProps {
  onBack: () => void;
  initialFile?: File;
}

interface AudioSegment {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  trimmedUrl: string | null;
}

export default function AudioTrimmer({ onBack, initialFile }: AudioTrimmerProps) {
  const toast = useToast();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  
  // Single export states
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0.8);

  // Multi-segment split states
  const [splitMode, setSplitMode] = useState<'trim' | 'batch'>('trim');
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio playback playback nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const currentOffsetRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      loadAudio(initialFile);
    }
  }, [initialFile]);

  // Initialize Web Audio API context
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await loadAudio(e.target.files[0]);
    }
  };

  const loadAudio = async (file: File) => {
    if (!file.type.startsWith('audio/')) return;
    
    stopPlayback();
    setAudioFile(file);
    setAudioBuffer(null);
    setIsDecoding(true);
    setTrimmedUrl(null);
    setExportStatus('idle');
    setExportProgress(0);
    setSegments([]);

    try {
      const audioCtx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer);
      setDuration(decodedBuffer.duration);
      setStartTime(0);
      setEndTime(decodedBuffer.duration);
      currentOffsetRef.current = 0;
      setCurrentTime(0);
      
      setTimeout(() => drawWaveform(decodedBuffer), 50);

    } catch (err) {
      console.error('Audio decoding error:', err);
    } finally {
      setIsDecoding(false);
    }
  };

  // Waveform renderer onto Canvas
  const drawWaveform = (buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const rawData = buffer.getChannelData(0); 
    const step = Math.ceil(rawData.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#070707';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#10b981'; 

    ctx.beginPath();
    ctx.moveTo(0, amp);

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx >= rawData.length) break;
        const dat = rawData[idx];
        if (dat < min) min = dat;
        if (dat > max) max = dat;
      }

      ctx.lineTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }

    ctx.lineTo(width, amp);
    ctx.stroke();
  };

  const startPlayback = () => {
    const audioCtx = getAudioContext();
    if (!audioBuffer) return;

    sourceNodeRef.current = audioCtx.createBufferSource();
    sourceNodeRef.current.buffer = audioBuffer;

    gainNodeRef.current = audioCtx.createGain();
    gainNodeRef.current.gain.value = volume;

    sourceNodeRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(audioCtx.destination);

    const playOffset = currentOffsetRef.current >= endTime || currentOffsetRef.current < startTime
      ? startTime
      : currentOffsetRef.current;

    sourceNodeRef.current.start(0, playOffset);
    playStartTimeRef.current = audioCtx.currentTime - playOffset;
    currentOffsetRef.current = playOffset;
    setIsPlaying(true);

    timerRef.current = setInterval(() => {
      const elapsed = audioCtx.currentTime - playStartTimeRef.current;
      setCurrentTime(elapsed);
      currentOffsetRef.current = elapsed;

      if (elapsed >= endTime && splitMode === 'trim') {
        stopPlayback();
      }
    }, 60);
  };

  const stopPlayback = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
    } catch (e) {
      // Ignored
    }
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = val;
    }
  };

  const handleStartChange = (val: number) => {
    const newStart = Math.min(val, endTime - 0.1);
    setStartTime(newStart);
    currentOffsetRef.current = newStart;
    setCurrentTime(newStart);
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  };

  const handleEndChange = (val: number) => {
    const newEnd = Math.max(val, startTime + 0.1);
    setEndTime(newEnd);
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  };

  // Add current segment to queue
  const addSegment = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const name = `Segment ${segments.length + 1} (${formatTime(startTime)} - ${formatTime(endTime)})`;
    const newSeg: AudioSegment = {
      id,
      name,
      startTime,
      endTime,
      status: 'idle',
      progress: 0,
      trimmedUrl: null
    };
    setSegments(prev => [...prev, newSeg]);
  };

  const removeSegment = (id: string) => {
    setSegments(prev => {
      const target = prev.find(seg => seg.id === id);
      if (target?.trimmedUrl) URL.revokeObjectURL(target.trimmedUrl);
      return prev.filter(seg => seg.id !== id);
    });
  };

  const clearSegments = () => {
    segments.forEach(seg => {
      if (seg.trimmedUrl) URL.revokeObjectURL(seg.trimmedUrl);
    });
    setSegments([]);
  };

  // Standard WAV builder
  const compileWavBlob = (sTime: number, eTime: number): Blob | null => {
    if (!audioBuffer) return null;
    
    const startSample = Math.floor(sTime * audioBuffer.sampleRate);
    const endSample = Math.floor(eTime * audioBuffer.sampleRate);
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const subLength = endSample - startSample;

    const buffer = new ArrayBuffer(44 + subLength * 2 * numChannels);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + subLength * 2 * numChannels, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2 * numChannels, true);
    view.setUint16(32, 2 * numChannels, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, subLength * 2 * numChannels, true);

    let offset = 44;
    const channelData: Float32Array[] = [];
    for (let channel = 0; channel < numChannels; channel++) {
      channelData.push(audioBuffer.getChannelData(channel));
    }

    for (let i = 0; i < subLength; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][startSample + i]));
        const pcmVal = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, pcmVal, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  // Export single clip
  const exportWavFile = () => {
    if (!audioBuffer) return;
    setExportStatus('processing');
    setExportProgress(10);

    setTimeout(() => {
      try {
        const wavBlob = compileWavBlob(startTime, endTime);
        if (wavBlob) {
          const url = URL.createObjectURL(wavBlob);
          setTrimmedUrl(url);
          setExportProgress(100);
          setExportStatus('completed');
          confetti({ particleCount: 80, spread: 65 });
        } else {
          throw new Error('Wav compilation returned null');
        }
      } catch (err) {
        console.error('Wav trim failed:', err);
        setExportStatus('failed');
      }
    }, 400);
  };

  // Batch process multi-segments
  const handleBatchSplit = async () => {
    if (segments.length === 0) return;
    setIsBatchProcessing(true);

    let successCount = 0;
    let errorCount = 0;

    const pendingSegments = segments.filter(seg => seg.status !== 'completed');

    for (const seg of pendingSegments) {
      setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, status: 'processing', progress: 20 } : s));
      
      const status = await new Promise<'completed' | 'failed'>((resolve) => {
        setTimeout(() => {
          setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, progress: 60 } : s));
        }, 150);

        setTimeout(() => {
          const wavBlob = compileWavBlob(seg.startTime, seg.endTime);
          const url = wavBlob ? URL.createObjectURL(wavBlob) : null;

          setSegments(prev => prev.map(s => s.id === seg.id ? { 
            ...s, 
            status: wavBlob ? 'completed' : 'failed', 
            progress: 100, 
            trimmedUrl: url 
          } : s));
          resolve(wavBlob ? 'completed' : 'failed');
        }, 300);
      });

      if (status === 'completed') {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setIsBatchProcessing(false);
    confetti({ particleCount: 100, spread: 80 });

    if (errorCount === 0) {
      toast.success(
        'Batch Audio Splitting Complete',
        `Successfully sliced and encoded ${successCount} audio clip${successCount !== 1 ? 's' : ''}.`
      );
    } else if (successCount === 0) {
      toast.error(
        'Batch Audio Splitting Failed',
        `Failed to slice ${errorCount} audio segment${errorCount !== 1 ? 's' : ''}.`
      );
    } else {
      toast.toast({
        title: 'Batch Audio Splitting Finished',
        description: `Successfully sliced ${successCount} segment${successCount !== 1 ? 's' : ''}, but failed for ${errorCount} segment${errorCount !== 1 ? 's' : ''}.`,
        type: 'warning'
      });
    }
  };

  const triggerDownloadSeg = (seg: AudioSegment) => {
    if (!seg.trimmedUrl) return;
    const a = document.createElement('a');
    a.href = seg.trimmedUrl;
    a.download = `cut_${seg.startTime.toFixed(1)}_${seg.endTime.toFixed(1)}_${audioFile?.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const triggerDownloadAllSegs = () => {
    segments.forEach(seg => {
      if (seg.trimmedUrl) {
        triggerDownloadSeg(seg);
      }
    });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const removeAudio = () => {
    stopPlayback();
    clearSegments();
    setAudioFile(null);
    setAudioBuffer(null);
    setTrimmedUrl(null);
    setExportStatus('idle');
    setExportProgress(0);
    setCurrentTime(0);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="audio-trimmer-tool">
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
            <MusicNotes className="w-8 h-8 text-[#10b981]" />
            Audio Cutter & Trimmer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Analyze, split, and trim audio files with custom multi-segment batch splitting encoders.
          </p>
        </div>
        {audioFile && (
          <button
            onClick={removeAudio}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Audio
          </button>
        )}
      </div>

      {!audioFile ? (
        /* Audio Upload Zone */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/40 bg-[#0d0d0d] rounded-xl p-12 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[250px]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="audio/*"
            className="hidden"
          />
          <div className="p-4 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-4 group-hover:scale-105 transition-transform text-[#10b981]">
            <MusicNotes className="w-8 h-8" />
          </div>
          <h3 className="text-white font-sans text-base">Drag & drop your audio track</h3>
          <p className="text-gray-500 text-xs mt-1 mb-4">Supports MP3, WAV, M4A, OGG, AAC up to 50MB</p>
          <span className="text-xs font-bold text-[#0a0a0a] bg-[#10b981] px-4 py-2 rounded uppercase tracking-wider hover:bg-[#059669] transition-all">
            Select Audio File
          </span>
        </div>
      ) : (
        /* Active Trimming Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Waveform Visualization (Left 2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Waveform Canvas Card */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>Visual Waveform Spectrum</span>
                {isDecoding && <span className="text-[#10b981] animate-pulse">Decoding Audio Frame...</span>}
              </div>

              {/* Canvas Container */}
              <div className="relative border border-[#1a1a1a] rounded overflow-hidden bg-[#070707] min-h-[140px] flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width="650"
                  height="140"
                  className="w-full h-[140px]"
                />
                
                {/* Timeline overlay indicators */}
                <div 
                  className="absolute top-0 bottom-0 bg-[#10b981]/10 pointer-events-none"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`
                  }}
                />

                {/* Vertical position playhead marker */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-[#10b981] shadow-md pointer-events-none z-10"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
              </div>

              {/* Timings indicators text */}
              <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
                <span className="text-[#10b981] flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Start: {formatTime(startTime)}</span>
                <span className="text-gray-500">Position: {formatTime(currentTime)}</span>
                <span className="text-rose-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> End: {formatTime(endTime)}</span>
              </div>

              {/* Slider Input Handles */}
              <div className="relative pt-2 pb-1">
                <div className="h-2 bg-[#1a1a1a] rounded-full w-full relative">
                  <div 
                    className="absolute h-full bg-[#10b981] rounded-full"
                    style={{
                      left: `${(startTime / duration) * 100}%`,
                      width: `${((endTime - startTime) / duration) * 100}%`
                    }}
                  />
                </div>
                <div className="relative -mt-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.01"
                    value={startTime}
                    onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                    className="absolute w-full accent-[#10b981] h-1.5 opacity-0 cursor-pointer pointer-events-auto"
                    style={{ zIndex: 3 }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.01"
                    value={endTime}
                    onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                    className="absolute w-full accent-[#10b981] h-1.5 opacity-0 cursor-pointer pointer-events-auto"
                    style={{ zIndex: 3 }}
                  />
                </div>
              </div>

              {/* Mode selector tab bar */}
              <div className="flex border border-[#1a1a1a] bg-[#070707] p-1 rounded-lg max-w-sm w-full mx-auto mt-2">
                <button
                  onClick={() => setSplitMode('trim')}
                  className={`flex-1 py-1.5 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    splitMode === 'trim'
                      ? 'bg-[#10b981] text-[#0a0a0a]'
                      : 'text-gray-400 hover:text-white bg-transparent'
                  }`}
                >
                  Single Trim Mode
                </button>
                <button
                  onClick={() => setSplitMode('batch')}
                  className={`flex-1 py-1.5 rounded font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    splitMode === 'batch'
                      ? 'bg-[#10b981] text-[#0a0a0a]'
                      : 'text-gray-400 hover:text-white bg-transparent'
                  }`}
                >
                  Multi-Split Batch Mode
                </button>
              </div>

              {/* Controls bar */}
              <div className="flex items-center justify-between border-t border-[#2a2a2a] pt-3 mt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayPause}
                    disabled={!audioBuffer}
                    className="p-2.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-semibold text-gray-400 font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {splitMode === 'batch' && (
                  <button
                    onClick={addSegment}
                    className="px-3.5 py-1.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Segment
                  </button>
                )}

                {/* Volume slider */}
                <div className="flex items-center gap-2">
                  <SpeakerHigh className="w-4 h-4 text-gray-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 accent-[#10b981] h-1 bg-[#1a1a1a] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audio Cutter controls card (Right Col) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {splitMode === 'trim' ? (
              /* Single Trim Sidebar panel */
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
                  <Sliders className="w-5 h-5 text-[#10b981]" />
                  <h2 className="font-sans text-white text-lg">Audio Export</h2>
                </div>

                {/* Format details */}
                <div className="bg-[#151515] border border-[#2a2a2a] rounded p-3 text-xs flex flex-col gap-1.5 text-gray-400 font-medium font-mono">
                  <div><span className="font-bold text-gray-300">Track:</span> {audioFile.name}</div>
                  <div><span className="font-bold text-gray-300">Channels:</span> {audioBuffer?.numberOfChannels || 'N/A'}</div>
                  <div><span className="font-bold text-gray-300">Sample Rate:</span> {audioBuffer?.sampleRate || 'N/A'} Hz</div>
                  <div className="border-t border-[#2a2a2a] my-1 pt-1">
                    <span className="font-bold text-[#10b981]">Cut Duration:</span> {formatTime(endTime - startTime)}
                  </div>
                </div>

                {/* Export Button */}
                {exportStatus !== 'processing' ? (
                  <button
                    onClick={exportWavFile}
                    disabled={!audioBuffer}
                    className="w-full py-3 px-4 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Scissors className="w-4 h-4" /> Trim & Compile WAV
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#10b981]">
                      <span>Encoding PCM data...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#10b981] h-full transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Download link */}
                {trimmedUrl && exportStatus === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 mt-2 pt-2 border-t border-[#2a2a2a]"
                  >
                    <div className="bg-emerald-950/20 text-emerald-300 rounded p-3 text-xs flex items-center gap-2 border border-emerald-900/40">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold">Track Cut Completed successfully!</span>
                    </div>
                    <a
                      href={trimmedUrl}
                      download={`cut_${audioFile.name}`}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download WAV Clip
                    </a>
                  </motion.div>
                )}
              </div>
            ) : (
              /* Multi-Split Batch Mode Panel */
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#10b981]" />
                    <h2 className="font-sans text-lg text-white font-bold">Multi-Split Queue</h2>
                  </div>
                  {segments.length > 0 && (
                    <button
                      onClick={clearSegments}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>

                {segments.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 border border-[#1a1a1a] border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
                    <Scissors className="w-8 h-8 text-gray-600" />
                    <span className="text-xs font-medium">No segments defined yet</span>
                    <span className="text-[10px] text-gray-600 px-4">Adjust the range slider on the left and click <strong>+ Add Segment</strong> to build your split cue.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
                    {segments.map((seg, idx) => (
                      <div 
                        key={seg.id}
                        className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white truncate max-w-[130px]">{seg.name}</span>
                          <div className="flex items-center gap-1.5">
                            {seg.status === 'idle' && (
                              <button
                                onClick={() => removeSegment(seg.id)}
                                className="text-gray-500 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {seg.status === 'completed' && (
                              <button
                                onClick={() => triggerDownloadSeg(seg)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                title="Download segment"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {seg.status === 'processing' && (
                          <div className="flex flex-col gap-1">
                            <div className="w-full bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
                              <div className="bg-[#10b981] h-full" style={{ width: `${seg.progress}%` }} />
                            </div>
                            <span className="text-[8px] font-mono font-bold text-[#10b981] uppercase tracking-wider">Encoding PCM...</span>
                          </div>
                        )}

                        {seg.status === 'completed' && (
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Ready for download
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Batch Actions */}
                {segments.length > 0 && (
                  <div className="pt-2 border-t border-[#2a2a2a] flex flex-col gap-2">
                    <button
                      onClick={handleBatchSplit}
                      disabled={isBatchProcessing}
                      className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] disabled:bg-[#1a1a1a] disabled:text-gray-600 rounded font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isBatchProcessing ? (
                        <>
                          <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> Compiling...
                        </>
                      ) : (
                        <>
                          <Scissors className="w-4 h-4" /> Batch Process ({segments.length}) Splits
                        </>
                      )}
                    </button>
                    {segments.some(seg => seg.status === 'completed') && (
                      <button
                        onClick={triggerDownloadAllSegs}
                        className="w-full py-2 bg-[#111111] hover:bg-[#181818] text-white border border-[#2a2a2a] rounded font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" /> Download All Clips
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
