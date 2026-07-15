import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Clock,
  Copy,
  Download,
  FileText,
  Headphones,
  Microphone,
  MicrophoneSlash,
  MusicNotes,
  Pause,
  Play,
  Sparkle,
  Trash,
  Upload,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

interface AudioTranscriberProps {
  onBack: () => void;
  initialFile?: File;
}

interface TranscriptLine {
  timeStr: string; // "MM:SS"
  seconds: number;
  text: string;
}

export default function AudioTranscriber({ onBack, initialFile }: AudioTranscriberProps) {
  const { success: showSuccessToast, error: showWarningToast } = useToast();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  
  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Transcription states
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [transcriptionResult, setTranscriptionResult] = useState<string>('');
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [transcribeError, setTranscribeError] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      loadAudio(initialFile);
    }
  }, [initialFile]);

  // Sync timeline
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioSrc]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadAudio(e.target.files[0]);
    }
  };

  const loadAudio = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setTranscribeError('Selected file is not an audio file.');
      return;
    }
    setTranscribeError('');
    setAudioFile(file);
    const src = URL.createObjectURL(file);
    setAudioSrc(src);
    setTranscriptionResult('');
    setTranscriptLines([]);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Live microphone recording
  const startRecording = async () => {
    try {
      setTranscribeError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const file = new File([audioBlob], `recording_${new Date().toISOString().slice(0,10)}.mp3`, { type: 'audio/mp3' });
        loadAudio(file);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setTranscribeError('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true));
    }
  };

  const scrubTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Call backend transcription API
  const handleTranscribe = async () => {
    if (!audioFile) return;
    
    setIsTranscribing(true);
    setTranscribeError('');
    setTranscriptionResult('');
    setTranscriptLines([]);

    try {
      setProgressStep('Extracting audio buffer...');
      const base64Audio = await fileToBase64(audioFile);
      
      setProgressStep('Uploading payload to Gemini HardDrive...');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: audioFile.type || 'audio/mp3',
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'HardDrive transcription failed');
      }

      setProgressStep('Gemini model generating high-fidelity transcript...');
      const data = await response.json();
      
      const text = data.transcription;
      setTranscriptionResult(text);
      parseTranscript(text);
      
      confetti({ particleCount: 100, spread: 80 });
    } catch (err: any) {
      console.error(err);
      setTranscribeError(err.message || 'An error occurred during transcription. Please try again.');
    } finally {
      setIsTranscribing(false);
      setProgressStep('');
    }
  };

  // Parse lines with timestamps like [MM:SS] or [HH:MM:SS]
  const parseTranscript = (rawText: string) => {
    const lines = rawText.split('\n');
    const parsed: TranscriptLine[] = [];

    // Match patterns like [01:23] or [00:12:34] or [0:45] or 01:23 or (01:23)
    const timestampRegex = /(?:\[|\()?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\]|\))?/;

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      const match = cleanLine.match(timestampRegex);
      if (match) {
        const hrs = match[1] ? parseInt(match[1]) : 0;
        const mins = parseInt(match[2]);
        const secs = parseInt(match[3]);
        const totalSeconds = hrs * 3600 + mins * 60 + secs;
        const timeStr = `${hrs > 0 ? hrs.toString().padStart(2, '0') + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        // Remove the matched timestamp part from the text line
        const text = cleanLine.replace(match[0], '').replace(/^\s*[-:–—]\s*/, '').trim();

        parsed.push({
          timeStr,
          seconds: totalSeconds,
          text
        });
      } else {
        // Line with no timestamp - pair with last timestamp or 0
        const prevSeconds = parsed.length > 0 ? parsed[parsed.length - 1].seconds : 0;
        const prevTimeStr = parsed.length > 0 ? parsed[parsed.length - 1].timeStr : '00:00';
        parsed.push({
          timeStr: prevTimeStr,
          seconds: prevSeconds,
          text: cleanLine
        });
      }
    });

    setTranscriptLines(parsed);
  };

  const copyToClipboard = () => {
    if (!transcriptionResult) return;
    navigator.clipboard.writeText(transcriptionResult);
    showSuccessToast('Transcript copied to clipboard!', 'The transcription content has been copied successfully.');
  };

  const downloadAsText = () => {
    if (!transcriptionResult) return;
    const blob = new Blob([transcriptionResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.split('.')[0] || 'transcript'}_timestamped.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsSRT = () => {
    if (transcriptLines.length === 0) return;
    
    let srtText = '';
    transcriptLines.forEach((line, index) => {
      const startSec = line.seconds;
      const endSec = index < transcriptLines.length - 1 ? transcriptLines[index + 1].seconds : startSec + 4;
      
      const formatSRTTime = (totalSec: number) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = Math.floor(totalSec % 60);
        const ms = Math.floor((totalSec % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
      };

      srtText += `${index + 1}\n`;
      srtText += `${formatSRTTime(startSec)} --> ${formatSRTTime(endSec)}\n`;
      srtText += `${line.text}\n\n`;
    });

    const blob = new Blob([srtText], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.split('.')[0] || 'transcript'}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const clearAudio = () => {
    if (audioSrc) URL.revokeObjectURL(audioSrc);
    setAudioFile(null);
    setAudioSrc('');
    setTranscriptionResult('');
    setTranscriptLines([]);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="audio-transcriber-tool">
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
            <Sparkle className="w-8 h-8 text-[#10b981]" />
            AI Audio Transcriber
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Transcribe your audio tracks or live recordings with automatic timestamps using Gemini 2.5 Flash.
          </p>
        </div>
        {audioFile && (
          <button
            onClick={clearAudio}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-3 py-1.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
          >
            Clear Audio
          </button>
        )}
      </div>

      {transcribeError && (
        <div className="mb-6 p-4 rounded-xl border border-rose-900/50 bg-rose-950/10 text-rose-300 text-xs flex items-start gap-2">
          <WarningCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block uppercase tracking-wider mb-1 text-[10px]">Transcription Error</span>
            {transcribeError}
          </div>
        </div>
      )}

      {!audioFile ? (
        /* Selection View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* File Upload card */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2a2a2a] hover:border-[#10b981]/50 bg-[#0d0d0d] rounded-xl p-10 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none group min-h-[300px]"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="audio/*"
              className="hidden"
            />
            <div className="p-4 bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-sm mb-4 group-hover:scale-105 transition-transform text-[#10b981]">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-white font-sans text-lg">Upload an audio file</h3>
            <p className="text-gray-500 text-xs mt-1 mb-4">Supports MP3, WAV, AAC, M4A, FLAC, WEBM</p>
            <span className="text-xs font-bold text-[#0a0a0a] bg-[#10b981] px-4 py-2 rounded uppercase tracking-wider hover:bg-[#059669] transition-colors">
              Select Audio File
            </span>
          </div>

          {/* Live Microphone Recorder Card */}
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className={`p-4 rounded-xl shadow-sm mb-4 transition-all ${isRecording ? 'bg-red-950/30 border border-red-900 text-red-500 animate-pulse' : 'bg-[#151515] border border-[#2a2a2a] text-[#10b981]'}`}>
              {isRecording ? <Microphone className="w-8 h-8 text-red-500" /> : <Microphone className="w-8 h-8" />}
            </div>
            <h3 className="text-white font-sans text-lg">{isRecording ? 'Recording Audio' : 'Record voice note'}</h3>
            <p className="text-gray-500 text-xs mt-1 mb-4">
              {isRecording ? `Recording time: ${formatTime(recordingSeconds)}` : 'Record live voice note using your browser microphone'}
            </p>
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="text-xs font-bold text-white bg-red-600 px-4 py-2 rounded uppercase tracking-wider hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <MicrophoneSlash className="w-3.5 h-3.5" /> Stop & Load Recording
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="text-xs font-bold text-[#0a0a0a] bg-[#10b981] px-4 py-2 rounded uppercase tracking-wider hover:bg-[#059669] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Microphone className="w-3.5 h-3.5" /> Start Live Record
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Transcription Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Audio controls & trigger */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-lg text-[#10b981]">
                  <Headphones className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-semibold text-white truncate" title={audioFile.name}>
                    {audioFile.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                    Type: {audioFile.type || 'audio/mp3'} &bull; {Math.round(audioFile.size / 1024 / 1024 * 100) / 100} MB
                  </p>
                </div>
              </div>

              {/* Native audio player */}
              <audio ref={audioRef} src={audioSrc} className="hidden" />

              {/* Custom play slider timeline */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 font-bold">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => scrubTo(parseFloat(e.target.value))}
                  className="w-full accent-[#10b981] h-1.5 bg-[#1a1a1a] rounded cursor-pointer"
                />
              </div>

              {/* Player control buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-[#10b981]/95 hover:bg-[#10b981] text-[#0a0a0a] rounded-full shadow transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current text-[#0a0a0a]" /> : <Play className="w-5 h-5 fill-current text-[#0a0a0a]" />}
                </button>
              </div>

              {/* AI action trigger */}
              <div className="border-t border-[#1a1a1a] pt-4 mt-2">
                {!isTranscribing ? (
                  <button
                    onClick={handleTranscribe}
                    className="w-full py-3.5 px-4 bg-gradient-to-tr from-[#059669] to-[#10b981] hover:shadow-lg text-[#0a0a0a] rounded font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkle className="w-4 h-4 fill-current text-[#0a0a0a]" /> Transcribe with AI
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#10b981]">
                      <span className="flex items-center gap-1.5"><ArrowsCounterClockwise className="w-3.5 h-3.5 animate-spin" /> {progressStep}</span>
                    </div>
                    <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#10b981] h-full w-2/3 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Helper card */}
            <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 text-xs text-gray-400 font-medium leading-relaxed">
              <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest block mb-2 font-mono">Interactive Navigation</span>
              Once compiled, the transcription is sliced into clickable line timestamps. You can click on any timestamp (e.g. <span className="text-[#10b981] font-mono">[00:15]</span>) to jump the audio player instantly to that moment.
            </div>
          </div>

          {/* Right Transcription output terminal */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4 min-h-[350px]">
              <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#10b981]" />
                  <h2 className="font-sans text-white text-base">Transcription Output</h2>
                </div>
                {transcriptionResult && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 bg-[#151515] border border-[#2a2a2a] hover:border-gray-700 text-gray-400 hover:text-white rounded text-xs transition-colors cursor-pointer"
                      title="Copy raw text"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={downloadAsText}
                      className="p-1.5 bg-[#151515] border border-[#2a2a2a] hover:border-gray-700 text-gray-400 hover:text-white rounded text-xs transition-colors cursor-pointer"
                      title="Download as TXT"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={downloadAsSRT}
                      className="px-2.5 py-1.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      title="Export Subtitles"
                    >
                      SRT Subtitles
                    </button>
                  </div>
                )}
              </div>

              {/* Result Area */}
              <div className="flex-1 overflow-y-auto max-h-[380px] pr-1">
                {isTranscribing ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
                    <ArrowsCounterClockwise className="w-8 h-8 text-[#10b981] animate-spin" />
                    <p className="text-xs text-gray-400 font-mono">Gemini AI is parsing speech data... Please wait.</p>
                  </div>
                ) : transcriptLines.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {transcriptLines.map((line, idx) => (
                      <div 
                        key={idx}
                        className={`flex gap-3 items-start p-2 rounded-lg transition-colors cursor-pointer ${
                          currentTime >= line.seconds && (idx === transcriptLines.length - 1 || currentTime < transcriptLines[idx+1].seconds)
                            ? 'bg-[#10b981]/10 border-l-2 border-[#10b981]'
                            : 'hover:bg-[#151515] border-l-2 border-transparent'
                        }`}
                        onClick={() => scrubTo(line.seconds)}
                      >
                        <span className="font-mono text-[11px] font-bold text-[#10b981] bg-[#1a1a1a] px-2 py-0.5 rounded shrink-0 select-none">
                          {line.timeStr}
                        </span>
                        <p className="text-xs text-gray-300 font-medium leading-relaxed mt-0.5">{line.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16 text-gray-500">
                    <FileText className="w-10 h-10 stroke-1" />
                    <p className="text-xs max-w-sm">No transcription generated yet. Click the <strong>Transcribe with AI</strong> button to begin extraction.</p>
                  </div>
                )}
              </div>

              {/* Status footer */}
              {transcriptLines.length > 0 && (
                <div className="border-t border-[#1a1a1a] pt-3 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Compiled successfully
                  </span>
                  <span>{transcriptLines.length} Segments</span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
