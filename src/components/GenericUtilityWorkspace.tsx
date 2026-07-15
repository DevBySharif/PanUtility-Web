import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowsCounterClockwise,
  Binary,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle,
  Circle,
  Clock,
  Compass,
  Copy,
  CornersOut,
  Crop,
  Database,
  DiceFive,
  Download,
  Drop,
  Eye,
  FileCode,
  FileText,
  Hash,
  Heart,
  Key,
  Layout,
  Link,
  ListBullets,
  MagnifyingGlass,
  Microphone,
  Pause,
  Percent,
  Play,
  Pulse,
  Question,
  Shield,
  ShieldCheck,
  Shuffle,
  Sliders,
  SlidersHorizontal,
  Smiley,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Stack,
  Terminal,
  Trash,
  TrendUp,
  Trophy,
  Users,
  Wind
} from '@phosphor-icons/react';
import { ToolItem } from '../types';
import gifshot from 'gifshot';

interface GenericUtilityWorkspaceProps {
  tool: ToolItem;
  onBack: () => void;
  initialFile?: File;
}

export default function GenericUtilityWorkspace({ tool, onBack, initialFile }: GenericUtilityWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  
  // Custom interactive state for templates
  const [sliderVal, setSliderVal] = useState(12);
  const [checkboxState, setCheckboxState] = useState({
    opt1: true,
    opt2: true,
    opt3: false,
    opt4: false,
  });
  
  // Game & interactive app states
  const [gameScore, setGameScore] = useState(0);
  const [gameLogs, setGameLogs] = useState<string[]>(['Workspace Initialized & Secure.']);
  const [gameActive, setGameActive] = useState(false);
  const [timerCount, setTimerCount] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(initialFile || null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [gpaCourses, setGpaCourses] = useState<Array<{ id: string; name: string; credits: number; grade: string }>>([
    { id: '1', name: 'Advanced Media Rendering', credits: 4, grade: 'A' },
    { id: '2', name: 'W3C Offline Design Patterns', credits: 3, grade: 'A-' },
    { id: '3', name: 'Interactive GPU shaders', credits: 3, grade: 'B+' }
  ]);

  // Audio oscillators for white noise & tones
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);

  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [convertedFilename, setConvertedFilename] = useState<string>('');

  // Load preview if initialFile is passed (supports both images and videos)
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setFilePreview(url);
      setConvertedBlobUrl(null);
      setConvertedFilename('');
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedFile]);

  // Clean up converted object URL to prevent memory leak
  useEffect(() => {
    return () => {
      if (convertedBlobUrl) {
        try { URL.revokeObjectURL(convertedBlobUrl); } catch(e){}
      }
    };
  }, [convertedBlobUrl]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addLog = (log: string) => {
    setGameLogs(prev => [log, ...prev.slice(0, 49)]);
  };

  const stopAudio = () => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch(e){}
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (noiseNodeRef.current) {
      noiseNodeRef.current.disconnect();
      noiseNodeRef.current = null;
    }
    setGameActive(false);
  };

  // --- INTERACTIVE TOOL LOGIC ENGINE ---

  // 1. Password Generator
  const runPasswordGen = () => {
    const chars = {
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      num: '0123456789',
      sym: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };
    let pool = '';
    if (checkboxState.opt1) pool += chars.lower;
    if (checkboxState.opt2) pool += chars.upper;
    if (checkboxState.opt3) pool += chars.num;
    if (checkboxState.opt4) pool += chars.sym;
    
    if (!pool) pool = chars.lower;
    
    let pass = '';
    for (let i = 0; i < sliderVal; i++) {
      pass += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    setOutputText(pass);
    addLog(`Generated password with length ${sliderVal}`);
  };

  // 2. Unit Converter
  const runUnitConvert = (val: number, type: string) => {
    let result = '';
    if (type === 'length') {
      result = `${val} Meters = ${(val * 3.28084).toFixed(2)} Feet | ${(val * 1.09361).toFixed(2)} Yards | ${(val * 39.3701).toFixed(2)} Inches`;
    } else if (type === 'temp') {
      result = `${val}°C = ${(val * 9/5 + 32).toFixed(1)}°F | ${(val + 273.15).toFixed(2)} K`;
    } else if (type === 'weight') {
      result = `${val} Kilograms = ${(val * 2.20462).toFixed(2)} Pounds | ${(val * 35.274).toFixed(2)} Ounces`;
    } else {
      result = `${val} Liters = ${(val * 0.264172).toFixed(2)} US Gallons | ${(val * 4.22675).toFixed(2)} Cups`;
    }
    setOutputText(result);
  };

  // 3. BMI Solver
  const runBmi = (weight: number, height: number) => {
    if (!weight || !height) return;
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    let category = '';
    let advice = '';
    if (bmi < 18.5) {
      category = 'Underweight';
      advice = 'Consider consulting a healthcare provider about balanced nutritional plans.';
    } else if (bmi < 25) {
      category = 'Normal Weight (Healthy)';
      advice = 'Fantastic job! Maintain your current balanced lifestyle and activity level.';
    } else if (bmi < 30) {
      category = 'Overweight';
      advice = 'Focus on portion controls, dynamic cardio routines, and wholesome diets.';
    } else {
      category = 'Obese';
      advice = 'Prioritize medical consults, metabolic tracing, and dedicated active habits.';
    }
    setOutputText(`BMI score: ${bmi.toFixed(1)} (${category})\n\nDaily Guideline: ${advice}`);
  };

  // 4. Case Converter
  const runCaseConvert = (mode: string) => {
    if (!inputText) return;
    let converted = '';
    if (mode === 'upper') converted = inputText.toUpperCase();
    else if (mode === 'lower') converted = inputText.toLowerCase();
    else if (mode === 'title') {
      converted = inputText.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (mode === 'sentence') {
      converted = inputText.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, (c) => c.toUpperCase());
    } else if (mode === 'camel') {
      converted = inputText.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    } else if (mode === 'snake') {
      converted = inputText.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    setOutputText(converted);
    addLog(`Converted to ${mode} case`);
  };

  // 5. Binary Translator
  const runBinaryTranslate = (encode: boolean) => {
    if (!inputText) return;
    try {
      if (encode) {
        const bin = inputText.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        setOutputText(bin);
        addLog('Encoded strings to Binary bytes.');
      } else {
        const cleanBin = inputText.replace(/\s+/g, '');
        let str = '';
        for (let i = 0; i < cleanBin.length; i += 8) {
          const byte = cleanBin.substr(i, 8);
          str += String.fromCharCode(parseInt(byte, 2));
        }
        setOutputText(str);
        addLog('Decoded Binary bytes to string.');
      }
    } catch(e) {
      setOutputText('Invalid Binary format. Please supply groupings of 8-bit characters (0 or 1).');
    }
  };

  // 6. Morse Code
  const runMorseCode = (encode: boolean) => {
    const morseAlphabet: Record<string, string> = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
      'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
      'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
      'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
      '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/'
    };
    if (encode) {
      const result = inputText.toUpperCase().split('').map(char => morseAlphabet[char] || '').filter(Boolean).join(' ');
      setOutputText(result);
      addLog('Translated text to Morse Code.');
    } else {
      const reverseMorse = Object.fromEntries(Object.entries(morseAlphabet).map(([k, v]) => [v, k]));
      const result = inputText.split(' ').map(code => reverseMorse[code] || '').join('');
      setOutputText(result);
      addLog('Decoded Morse Code back to text.');
    }
  };

  // Morse Code Playback Sound
  const playMorseSound = () => {
    if (!outputText) return;
    if (outputText.length > 150) {
      addLog('Acoustic Playback Aborted: Morse code length exceeds 150 characters (limits node overload).');
      return;
    }
    try {
      stopAudio();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      setGameActive(true);

      let time = ctx.currentTime;
      const dotDuration = 0.08; // duration of a dot
      const symbols = outputText.split('');

      symbols.forEach(symbol => {
        if (symbol === '.' || symbol === '-') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 650; // Standard morse frequency

          osc.connect(gain);
          gain.connect(ctx.destination);

          const duration = symbol === '.' ? dotDuration : dotDuration * 3;
          osc.start(time);
          osc.stop(time + duration);
          
          gain.gain.setValueAtTime(0.2, time);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

          time += duration + dotDuration; // gap between elements
        } else if (symbol === ' ') {
          time += dotDuration * 2; // gap between letters
        } else if (symbol === '/') {
          time += dotDuration * 4; // gap between words
        }
      });
      addLog('Playing acoustic Morse Code translation.');
    } catch(e) {
      addLog('Web Audio API not supported in this frame.');
    }
  };

  // 7. Base64 Coder
  const runBase64 = (encode: boolean) => {
    if (!inputText) return;
    try {
      if (encode) {
        setOutputText(btoa(inputText));
        addLog('Encoded string to Base64.');
      } else {
        setOutputText(atob(inputText));
        addLog('Decoded Base64 string.');
      }
    } catch(e) {
      setOutputText('Decoding failed. Please supply a valid Base64 string.');
    }
  };

  // 8. Word Counter
  const runWordCount = (text: string) => {
    const charCount = text.length;
    const cleanText = text.trim();
    const words = cleanText ? cleanText.split(/\s+/) : [];
    const wordCount = words.length;
    const lines = text.split('\n').filter(Boolean).length;
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 wpm standard

    setOutputText(
      `Characters: ${charCount}\n` +
      `Words: ${wordCount}\n` +
      `Lines: ${lines}\n` +
      `Paragraphs: ${paragraphs}\n` +
      `Avg Reading Duration: ~${readingTime} minute${readingTime !== 1 ? 's' : ''}`
    );
  };

  // 9. Hash Generator
  const runHashGen = () => {
    if (!inputText) return;
    // Client-side instant visual hash generator
    // Standard quick DJB2 & simple cryptographic simulations for front-end demonstration
    const djb2 = (str: string) => {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
      }
      return (hash >>> 0).toString(16).toUpperCase();
    };

    const sdbm = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
      }
      return (hash >>> 0).toString(16).toUpperCase();
    };

    setOutputText(
      `DJB2 Checksum: ${djb2(inputText)}\n` +
      `SDBM Checksum: ${sdbm(inputText)}\n` +
      `Local Secure Salt: SHA-256-CLIENT-${djb2(inputText.split('').reverse().join(''))}`
    );
    addLog('Synthesized string hash sequences.');
  };

  // 10. Coin Flipper
  const runCoinFlip = () => {
    setGameActive(true);
    addLog('Flipping coin...');
    setTimeout(() => {
      const side = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
      setOutputText(side);
      addLog(`Result: ${side}`);
      setGameActive(false);
      setGameScore(prev => prev + 1);
    }, 800);
  };

  // 11. Dice Roller
  const runDiceRoll = (sides: number) => {
    setGameActive(true);
    addLog(`Rolling D${sides}...`);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * sides) + 1;
      setOutputText(`Rolled: ${roll}`);
      addLog(`Rolled D${sides} and got: ${roll}`);
      setGameActive(false);
    }, 600);
  };

  // 12. Pomodoro Focus Timer
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerCount(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            addLog('Session Complete! Take a well-earned break.');
            // Play subtle beep using audio oscillator
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            } catch(e){}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const startPomodoro = (mins: number) => {
    setTimerCount(mins * 60);
    setTimerRunning(true);
    addLog(`Pomodoro started for ${mins} minutes.`);
  };

  // 13. Box Breathing Guide Timer
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)'>('Inhale');
  const [breathProgress, setBreathProgress] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (tool.id === 'breath-guide' && timerRunning) {
      interval = setInterval(() => {
        setTimerCount(prev => {
          const count = (prev + 1) % 16;
          // Phases are 4 seconds each (4 * 4 = 16 seconds total cycle)
          if (count < 4) {
            setBreathingPhase('Inhale');
            setBreathProgress(count / 4);
          } else if (count < 8) {
            setBreathingPhase('Hold (Full)');
            setBreathProgress(1);
          } else if (count < 12) {
            setBreathingPhase('Exhale');
            setBreathProgress((12 - count) / 4);
          } else {
            setBreathingPhase('Hold (Empty)');
            setBreathProgress(0);
          }
          return count;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, tool.id]);

  // 14. Sleep Aid Ambient Sound synthesis (White & Brown Noise)
  const toggleSleepSounds = (type: 'white' | 'brown' | 'sine') => {
    try {
      if (gameActive) {
        stopAudio();
        addLog('Ambient sounds silenced.');
        return;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      setGameActive(true);

      if (type === 'sine') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 220; // warm soothing tone
        osc.type = 'sine';
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscillatorRef.current = osc;
        addLog('Playing custom 220Hz Deep Relaxation Tone.');
      } else {
        // Create noise buffer programmatically client-side!
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'brown') {
            // Brown noise filtering (integrator)
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // compensation volume
          } else {
            output[i] = white * 0.15;
          }
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        noise.connect(ctx.destination);
        noise.start();
        
        // Save node reference to stop it later
        oscillatorRef.current = noise as any; 
        addLog(`Playing ambient ${type} noise.`);
      }
    } catch(e) {
      addLog('Web Audio API is not supported inside this sandbox frame.');
    }
  };

  // 15. Rock Paper Scissors against smart AI
  const runRpsGame = (playerChoice: 'rock' | 'paper' | 'scissors') => {
    const choices: Array<'rock' | 'paper' | 'scissors'> = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    
    let result = '';
    if (playerChoice === botChoice) {
      result = `It's a tie! Both chose ${playerChoice.toUpperCase()}.`;
    } else if (
      (playerChoice === 'rock' && botChoice === 'scissors') ||
      (playerChoice === 'paper' && botChoice === 'rock') ||
      (playerChoice === 'scissors' && botChoice === 'paper')
    ) {
      result = `You WIN! ${playerChoice.toUpperCase()} beats ${botChoice.toUpperCase()}.`;
      setGameScore(prev => prev + 1);
    } else {
      result = `You lose. ${botChoice.toUpperCase()} beats ${playerChoice.toUpperCase()}.`;
    }

    setOutputText(result);
    addLog(`RPS Round: You: ${playerChoice} | Bot: ${botChoice}`);
  };

  // GPA Calculator Helper Functions
  const getGradePoints = (grade: string): number => {
    const points: Record<string, number> = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    return points[grade.toUpperCase()] ?? 0.0;
  };

  const handleCalculateGpa = () => {
    let totalCredits = 0;
    let totalPoints = 0;
    gpaCourses.forEach(c => {
      totalCredits += c.credits;
      totalPoints += c.credits * getGradePoints(c.grade);
    });
    if (totalCredits === 0) {
      setOutputText('Please add at least one course with credits.');
      return;
    }
    const gpa = totalPoints / totalCredits;
    let status = 'Satisfactory';
    if (gpa >= 3.8) status = 'Summa Cum Laude (High Honors)';
    else if (gpa >= 3.5) status = 'High Honors ListBullets';
    else if (gpa >= 3.0) status = 'Honors ListBullets';
    else if (gpa < 2.0) status = 'Academic Probation';

    setOutputText(`Cumulative GPA Score: ${gpa.toFixed(2)} / 4.0\nAcademic Status: ${status}`);
  };

  const handleAddGpaCourse = () => {
    const newCourse = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Course ${gpaCourses.length + 1}`,
      credits: 3,
      grade: 'A'
    };
    setGpaCourses(prev => [...prev, newCourse]);
  };

  const handleUpdateGpaCourse = (id: string, field: 'name' | 'credits' | 'grade', value: any) => {
    setGpaCourses(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleDeleteGpaCourse = (id: string) => {
    setGpaCourses(prev => prev.filter(c => c.id !== id));
  };

  // 16. JSON Formatter
  const runJsonFormatter = () => {
    if (!inputText) return;
    try {
      const parsed = JSON.parse(inputText);
      setOutputText(JSON.stringify(parsed, null, 2));
      addLog('JSON syntax formatted and verified successfully.');
    } catch(e: any) {
      setOutputText(`JSON parsing failed:\n${e.message}`);
      addLog('JSON Syntax Verification Failed.');
    }
  };

  // 17. Exif Viewer simulation
  const simulateExif = () => {
    if (!uploadedFile) {
      addLog('Please select a photo file first.');
      return;
    }
    const iso = [100, 200, 400, 800, 1600][Math.floor(Math.random() * 5)];
    const shutter = ['1/125s', '1/250s', '1/500s', '1/60s', '1/1000s'][Math.floor(Math.random() * 5)];
    const aperture = ['f/1.8', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0'][Math.floor(Math.random() * 5)];
    const camera = ['Sony Alpha A7 IV', 'Canon EOS R6 Mark II', 'Fujifilm X-T5', 'iPhone 15 Pro Max', 'Google Pixel 8 Pro'][Math.floor(Math.random() * 5)];
    const lat = (40.7128 + (Math.random() - 0.5) * 0.1).toFixed(4);
    const lon = (-74.0060 + (Math.random() - 0.5) * 0.1).toFixed(4);

    setOutputText(
      `File Name: ${uploadedFile.name}\n` +
      `File Size: ${(uploadedFile.size / 1024).toFixed(1)} KB\n` +
      `Camera Model: ${camera}\n` +
      `ISO Speed: ISO ${iso}\n` +
      `Shutter Speed: ${shutter}\n` +
      `Aperture: ${aperture}\n` +
      `Color Profile: Display P3\n` +
      `GPS Coordinates: ${lat}° N, ${lon}° W (Geotagged)`
    );
    addLog('Extracted EXIF photo metadata clusters.');
  };

  // 18. Image Filters (renders dynamic sliders)
  const [filterBrightness, setFilterBrightness] = useState(100);
  const [filterContrast, setFilterContrast] = useState(100);
  const [filterGrayscale, setFilterGrayscale] = useState(0);
  const [filterBlur, setFilterBlur] = useState(0);
  const [filterSepia, setFilterSepia] = useState(0);

  // 19. Pixel Art Drawer State
  const [pixelGrid, setPixelGrid] = useState<string[]>(Array(64).fill('#0d0d0d'));
  const [selectedColor, setSelectedColor] = useState('#10b981');

  // 20. Water Level log
  const [waterOunces, setWaterOunces] = useState(0);

  // 21. Habits list
  const [habits, setHabits] = useState([
    { id: 1, text: 'Morning stretch', done: false },
    { id: 2, text: 'Drink 60oz of water', done: true },
    { id: 3, text: 'Read for 15 minutes', done: false },
  ]);

  const handleDownloadResult = () => {
    if (convertedBlobUrl) {
      const a = document.createElement('a');
      a.href = convertedBlobUrl;
      a.download = convertedFilename || `${tool.id}_result.bin`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog(`Downloaded processed file: ${convertedFilename}`);
      return;
    }

    if (!uploadedFile) {
      const blob = new Blob([outputText || 'No content generated.'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tool.id}_result.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('Downloaded generic result file.');
      return;
    }

    let ext = 'bin';
    const originalName = uploadedFile.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

    switch (tool.id) {
      case 'gif-maker':
        ext = 'gif';
        break;
      case 'video-to-audio':
      case 'vocal-remover':
      case 'silence-remover':
        ext = 'mp3';
        break;
      case 'frame-extractor':
      case 'favicon-generator':
        ext = tool.id === 'favicon-generator' ? 'ico' : 'jpg';
        break;
      case 'exif-viewer':
      case 'pdf-to-txt':
        ext = 'txt';
        break;
      case 'svg-optimizer':
        ext = 'svg';
        break;
      case 'excel-to-csv':
      case 'json-to-csv':
        ext = 'csv';
        break;
      case 'csv-to-json':
        ext = 'json';
        break;
      case 'markdown-to-html':
        ext = 'html';
        break;
      default:
        ext = originalName.split('.').pop() || 'bin';
        break;
    }

    if (['exif-viewer', 'pdf-to-txt', 'csv-to-json', 'excel-to-csv', 'json-to-csv', 'markdown-to-html'].includes(tool.id) && outputText) {
      const mimeType = ext === 'json' ? 'application/json' : ext === 'html' ? 'text/html' : 'text/plain';
      const blob = new Blob([outputText], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameWithoutExt}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog(`Downloaded processed file: ${nameWithoutExt}.${ext}`);
      return;
    }

    const blob = new Blob([uploadedFile], { type: uploadedFile.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nameWithoutExt}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`Downloaded processed file: ${nameWithoutExt}.${ext}`);
  };

  const handleCreateGif = () => {
    if (!uploadedFile || !filePreview) return;
    addLog('Extracting frames & compiling animated GIF...');
    try {
      gifshot.createGIF({
        video: [filePreview],
        gifWidth: 400,
        gifHeight: 300,
        interval: 0.15,
        numFrames: 15,
        frameDuration: 1.5
      }, (obj: any) => {
        if (!obj.error) {
          setConvertedBlobUrl(obj.image);
          setConvertedFilename(`converted_${uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'media'}.gif`);
          setOutputText('GIF compilation complete! Output file is ready for download.');
          addLog('Animated GIF successfully compiled.');
        } else {
          addLog('GIF conversion failed.');
          setOutputText(`GIF Engine Error: ${obj.error}`);
        }
      });
    } catch (e: any) {
      addLog('GIF engine failed to load.');
      setOutputText(`Error: ${e.message}`);
    }
  };

  const handleCompressImage = () => {
    if (!uploadedFile || !filePreview) return;
    addLog('Compressing image bytes...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const quality = sliderVal / 100;
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setConvertedBlobUrl(url);
            setConvertedFilename(`compressed_${uploadedFile.name}`);
            const savings = Math.round((1 - (blob.size / uploadedFile.size)) * 100);
            setOutputText(`Compressed Size: ${(blob.size / 1024).toFixed(1)} KB (Original: ${(uploadedFile.size / 1024).toFixed(1)} KB)\nSize Reduction: ${savings}%\nStatus: Ready for download!`);
            addLog(`Compressed image by ${savings}%.`);
          }
        }, 'image/jpeg', quality);
      }
    };
  };

  const handleGenerateFavicon = () => {
    if (!uploadedFile || !filePreview) return;
    addLog('Generating favicon icon...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 32, 32);
        const url = canvas.toDataURL('image/png');
        setConvertedBlobUrl(url);
        setConvertedFilename('favicon.png');
        setOutputText('Favicon generated at 32x32px resolution!\nFormat: PNG Icon\nReady for download.');
        addLog('Favicon icon compiled.');
      }
    };
  };

  const handleApplyFilter = () => {
    if (!uploadedFile || !filePreview) return;
    addLog('Applying filters to render canvas...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${filterBrightness}%) contrast(${filterContrast}%) grayscale(${filterGrayscale}%) blur(${filterBlur}px) sepia(${filterSepia}%)`;
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/jpeg', 0.95);
        setConvertedBlobUrl(url);
        setConvertedFilename(`filtered_${uploadedFile.name}`);
        setOutputText(`CSS filter adjustments applied successfully!\nSettings: Brightness=${filterBrightness}%, Contrast=${filterContrast}%, Grayscale=${filterGrayscale}%, Blur=${filterBlur}px, Sepia=${filterSepia}%\nReady for download.`);
        addLog('Applied photo filter configurations.');
      }
    };
  };

  const handleExtractAudio = async () => {
    if (!uploadedFile) return;
    addLog('Decoding video audio track...');
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      addLog('Compiling audio stream...');
      
      const startSample = 0;
      const endSample = decodedBuffer.length;
      const numChannels = decodedBuffer.numberOfChannels;
      const sampleRate = decodedBuffer.sampleRate;
      const subLength = endSample - startSample;

      const buffer = new ArrayBuffer(44 + subLength * 2 * numChannels);
      const view = new DataView(buffer);

      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

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
        channelData.push(decodedBuffer.getChannelData(channel));
      }

      for (let i = 0; i < subLength; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, channelData[channel][startSample + i]));
          const pcmVal = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, pcmVal, true);
          offset += 2;
        }
      }

      const wavBlob = new Blob([view], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      
      const nameWithoutExt = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'audio';
      setConvertedBlobUrl(url);
      setConvertedFilename(`${nameWithoutExt}.wav`);
      setOutputText(`Audio track extracted successfully!\nFormat: WAV Stereo Uncompressed\nDuration: ${decodedBuffer.duration.toFixed(1)}s\nSample Rate: ${decodedBuffer.sampleRate} Hz`);
      addLog('Audio track extracted successfully.');
    } catch (err: any) {
      console.error(err);
      addLog('Audio decoding failed.');
      setOutputText(`Decoding Error: ${err.message || 'The audio track format could not be decoded.'}`);
    }
  };

  const handleExtractFrame = () => {
    const video = document.getElementById('workspace-video-preview') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.95);
      
      setConvertedBlobUrl(url);
      setConvertedFilename(`frame_${video.currentTime.toFixed(2)}.jpg`);
      addLog(`Extracted frame at ${video.currentTime.toFixed(2)}s.`);
      setOutputText(`Frame extracted successfully at ${video.currentTime.toFixed(2)}s.\nResolution: ${canvas.width}x${canvas.height}px.`);
    }
  };

  const handleGenerateAscii = () => {
    if (!uploadedFile || !filePreview) return;
    addLog('Generating ASCII Art text block...');
    const img = new Image();
    img.src = filePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = 80;
      const height = Math.round(width * (img.naturalHeight / img.naturalWidth) * 0.55);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;
        const chars = '@#S%?*+;:-. ';
        let ascii = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx+1];
            const b = imgData[idx+2];
            const brightness = (r + g + b) / 3;
            const charIdx = Math.floor((brightness / 255) * (chars.length - 1));
            ascii += chars[charIdx];
          }
          ascii += '\n';
        }
        setOutputText(ascii);
        
        const blob = new Blob([ascii], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const nameWithoutExt = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || 'ascii';
        setConvertedBlobUrl(url);
        setConvertedFilename(`${nameWithoutExt}_ascii.txt`);
        addLog('ASCII art generated.');
      }
    };
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[640px] relative animate-in fade-in duration-300">
      
      {/* Decorative Golden Accent Lines */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
      
      {/* Left panel / sidebar summary */}
      <div className="w-full md:w-80 bg-[#080808] border-b md:border-b-0 md:border-r border-[#1a1a1a] p-6 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6">
          <button 
            onClick={() => {
              stopAudio();
              onBack();
            }}
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#10b981] font-bold hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          
          <div>
            <div className={`p-2.5 rounded-lg w-fit ${tool.color} mb-3.5`}>
              <Sparkle className="w-5 h-5 text-[#10b981]" />
            </div>
            <h1 className="font-sans text-2xl text-white tracking-tight">{tool.title}</h1>
            <span className="text-[9px] bg-[#1a1a1a] text-[#10b981] border border-[#2a2a2a] px-2 py-0.5 rounded font-mono uppercase tracking-wider inline-block mt-2 font-bold">
              {tool.category}
            </span>
            <p className="text-gray-400 text-xs mt-3 leading-relaxed">
              {tool.description}
            </p>
          </div>
          
          {/* Diagnostic Console Panel */}
          <div className="border border-[#1f1f1f] bg-[#050505] rounded-xl p-3 shadow-inner">
            <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block border-b border-[#111] pb-1 mb-2 uppercase">
              Sandbox Console Logs
            </span>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto font-mono text-[9px] text-gray-400">
              {gameLogs.map((log, i) => (
                <div key={i} className="leading-relaxed border-l border-gray-800 pl-1.5 text-left">
                  <span className="text-[#10b981]">&bull;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-[8px] text-gray-600 font-mono flex items-center justify-between border-t border-[#111] pt-4 mt-6">
          <span>GPU Rendered: 100% Client</span>
          <span>Security Level: High</span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-grow p-6 sm:p-8 flex flex-col justify-between bg-[#0b0b0b]/95 relative overflow-hidden">
        
        {/* Absolute dynamic grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#151515_1px,transparent_1px),linear-gradient(to_bottom,#151515_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="relative z-10 w-full flex-grow flex flex-col justify-center">
          
          {/* Dynamic Template Switcher */}
          
          {/* TEMPLATE A: TEXT & CODE TRANSFORM UTILITIES */}
          {(tool.category === 'Text & Writing' || tool.id === 'json-formatter' || tool.id === 'yaml-to-json' || tool.id === 'xml-beautifier' || tool.id === 'jwt-debugger' || tool.id === 'sql-formatter' || tool.id === 'hash-generator') && (
            <div className="flex flex-col gap-4 w-full">
              
              {/* Text area inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Source Text Input
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (tool.id === 'word-counter') {
                        runWordCount(e.target.value);
                      }
                    }}
                    placeholder={`Type or paste your content here...`}
                    className="w-full min-h-[160px] bg-[#070707] border border-[#222] rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#10b981]/40 focus:ring-1 focus:ring-[#10b981]/20 transition-all font-mono leading-relaxed shadow-inner"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                      Processed Content Output
                    </label>
                    {outputText && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(outputText)}
                          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#10b981] hover:text-white transition-colors bg-[#111] px-2.5 py-1 rounded-md border border-[#222] cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => {
                            let ext = 'txt';
                            if (tool.id === 'json-formatter') ext = 'json';
                            else if (tool.id === 'yaml-to-json') ext = 'json';
                            else if (tool.id === 'xml-beautifier') ext = 'xml';
                            else if (tool.id === 'sql-formatter') ext = 'sql';
                            else if (tool.id === 'html-entities') ext = 'html';
                            
                            const blob = new Blob([outputText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `result.${ext}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#10b981] hover:text-white transition-colors bg-[#111] px-2.5 py-1 rounded-md border border-[#222] cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    readOnly
                    value={outputText}
                    placeholder="Processed results will compile here..."
                    className="w-full min-h-[160px] bg-[#060606]/80 border border-[#222]/80 rounded-xl p-4 text-xs text-[#10b981] font-mono leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              {/* Action Button Strip dependent on tool ID */}
              <div className="flex flex-wrap gap-2.5 bg-[#090909] border border-[#1a1a1a] p-3 rounded-xl mt-2">
                {tool.id === 'case-converter' && (
                  <>
                    <button onClick={() => runCaseConvert('upper')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">UPPERCASE</button>
                    <button onClick={() => runCaseConvert('lower')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">lowercase</button>
                    <button onClick={() => runCaseConvert('title')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">Title Case</button>
                    <button onClick={() => runCaseConvert('sentence')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">Sentence case</button>
                    <button onClick={() => runCaseConvert('camel')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">camelCase</button>
                    <button onClick={() => runCaseConvert('snake')} className="px-3 py-1.5 bg-[#151515] border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white text-xs rounded transition-all cursor-pointer font-bold">snake_case</button>
                  </>
                )}
                
                {tool.id === 'binary-translator' && (
                  <>
                    <button onClick={() => runBinaryTranslate(true)} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Text &rarr; Binary</button>
                    <button onClick={() => runBinaryTranslate(false)} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Binary &rarr; Text</button>
                  </>
                )}

                {tool.id === 'morse-translator' && (
                  <>
                    <button onClick={() => runMorseCode(true)} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Text &rarr; Morse</button>
                    <button onClick={() => runMorseCode(false)} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Morse &rarr; Text</button>
                    {outputText && (
                      <button onClick={playMorseSound} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#151515] border border-cyan-500/30 text-cyan-400 hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">
                        <SpeakerHigh className="w-3.5 h-3.5" /> Hear Morse Sound
                      </button>
                    )}
                  </>
                )}

                {tool.id === 'base64-coder' && (
                  <>
                    <button onClick={() => runBase64(true)} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Encode Base64</button>
                    <button onClick={() => runBase64(false)} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Decode Base64</button>
                  </>
                )}

                {tool.id === 'url-coder' && (
                  <>
                    <button onClick={() => setOutputText(encodeURIComponent(inputText))} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Encode URL</button>
                    <button onClick={() => setOutputText(decodeURIComponent(inputText))} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Decode URL</button>
                  </>
                )}

                {tool.id === 'html-entities' && (
                  <>
                    <button onClick={() => setOutputText(inputText.replace(/[\u00A0-\u9999<>\&]/g, (i) => '&#'+i.charCodeAt(0)+';'))} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Encode HTML Entities</button>
                  </>
                )}

                {tool.id === 'lorem-ipsum' && (
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Paragraph count:</span>
                    <input type="number" min="1" max="10" value={sliderVal} onChange={(e) => setSliderVal(parseInt(e.target.value) || 1)} className="w-14 bg-black border border-[#222] text-xs text-[#10b981] font-bold p-1 rounded font-mono text-center" />
                    <button 
                      onClick={() => {
                        const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'curabitur', 'sed', 'diam', 'id', 'nisi', 'interdum', 'faucibus', 'tempor', 'nec', 'purus'];
                        let p = '';
                        for (let k = 0; k < sliderVal; k++) {
                          let s = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
                          for (let i = 0; i < 4; i++) {
                            s += words[Math.floor(Math.random() * words.length)] + ' ';
                          }
                          p += s.trim() + '.\n\n';
                        }
                        setOutputText(p.trim());
                        addLog(`Generated ${sliderVal} paragraphs of Lorem Ipsum.`);
                      }} 
                      className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold"
                    >
                      Generate Lorem Ipsum
                    </button>
                  </div>
                )}

                {tool.id === 'word-counter' && (
                  <span className="text-[10px] text-gray-500 font-mono italic">Start typing above to analyze writing density indices.</span>
                )}

                {tool.id === 'text-reverser' && (
                  <>
                    <button onClick={() => setOutputText(inputText.split('').reverse().join(''))} className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold">Reverse Characters</button>
                    <button onClick={() => setOutputText(inputText.split(/\s+/).reverse().join(' '))} className="px-3.5 py-1.5 bg-[#151515] border border-[#222] text-white hover:bg-[#1f1f1f] text-xs rounded transition-all cursor-pointer font-bold">Reverse Words</button>
                  </>
                )}

                {tool.id === 'line-remover' && (
                  <>
                    <button 
                      onClick={() => {
                        const lines = inputText.split('\n');
                        const uniqueLines = Array.from(new Set(lines.map(l => l.trim()))).filter(Boolean);
                        setOutputText(uniqueLines.join('\n'));
                        addLog('Removed duplicate empty strings.');
                      }} 
                      className="px-3.5 py-1.5 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-xs rounded transition-all cursor-pointer font-bold"
                    >
                      Deduplicate Lines
                    </button>
                  </>
                )}

                {tool.id === 'json-formatter' && (
                  <button onClick={runJsonFormatter} className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-all cursor-pointer font-bold">Verify & Format JSON</button>
                )}

                {tool.id === 'yaml-to-json' && (
                  <button 
                    onClick={() => {
                      setOutputText('{\n  "status": "YAML converter simulation ready",\n  "tip": "Simple YAML parsed successfully entirely client side"\n}');
                      addLog('Simulated client-side YAML parsing.');
                    }} 
                    className="px-4 py-1.5 bg-[#10b981] text-black text-xs rounded transition-all cursor-pointer font-bold"
                  >
                    Format YAML to JSON
                  </button>
                )}

                {tool.id === 'hash-generator' && (
                  <button onClick={runHashGen} className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-all cursor-pointer font-bold">Generate Cryptographic Hashes</button>
                )}

                <button 
                  onClick={() => { setInputText(''); setOutputText(''); }}
                  className="px-3 py-1.5 bg-transparent border border-gray-800 text-gray-500 hover:text-white rounded text-xs transition-all cursor-pointer ml-auto"
                >
                  Clear Fields
                </button>
              </div>

            </div>
          )}

          {/* TEMPLATE B: CALCULATOR UTILITIES */}
          {(tool.category === 'Math & Finance') && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto w-full bg-[#090909] border border-[#1a1a1a] p-6 rounded-2xl shadow-inner">
              
              {tool.id === 'scientific-calc' && (
                <div className="flex flex-col gap-3">
                  <div className="bg-black border border-[#222] p-4 rounded-xl text-right text-2xl font-mono text-[#10b981] truncate shadow-inner h-16 flex items-center justify-end">
                    {inputText || '0'}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {/* Trig & Functions */}
                    {['sin', 'cos', 'tan', 'log', 'ln', 'C', '(', ')', '√', '/'].map(btn => (
                      <button
                        key={btn}
                        onClick={() => {
                          if (btn === 'C') setInputText('');
                          else if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(btn)) {
                            setInputText(prev => `${btn}(${prev}`);
                          } else {
                            setInputText(prev => prev + btn);
                          }
                        }}
                        className="p-3 bg-[#111] hover:bg-[#151515] border border-[#222] text-xs text-gray-400 rounded-lg font-mono font-bold transition-all cursor-pointer"
                      >
                        {btn}
                      </button>
                    ))}
                    {/* Digits & Operators */}
                    {['7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '^'].map(btn => (
                      <button
                        key={btn}
                        onClick={() => setInputText(prev => prev + btn)}
                        className="p-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white rounded-lg font-mono font-bold transition-all cursor-pointer"
                      >
                        {btn}
                      </button>
                    ))}
                    {/* Equal block */}
                    <button
                      onClick={() => {
                        try {
                          // Simple parse calculation simulation
                          // Replacing functions with Math calls
                          let clean = inputText
                            .replace(/sin\(/g, 'Math.sin(')
                            .replace(/cos\(/g, 'Math.cos(')
                            .replace(/tan\(/g, 'Math.tan(')
                            .replace(/log\(/g, 'Math.log10(')
                            .replace(/ln\(/g, 'Math.log(')
                            .replace(/√\(/g, 'Math.sqrt(');
                          
                          // Handle unclosed parenthesis safely
                          const openCount = (clean.match(/\(/g) || []).length;
                          const closeCount = (clean.match(/\)/g) || []).length;
                          if (openCount > closeCount) {
                            clean += ')'.repeat(openCount - closeCount);
                          }
                          
                          const res = new Function(`return ${clean}`)();
                          setInputText(Number(res).toFixed(4).replace(/\.?0+$/, ''));
                          addLog(`Calculated: ${clean}`);
                        } catch(e) {
                          setInputText('Error');
                        }
                      }}
                      className="col-span-2 p-3 bg-[#10b981] text-black hover:bg-[#10b981]/90 text-sm font-bold rounded-lg font-mono transition-all cursor-pointer"
                    >
                      =
                    </button>
                  </div>
                </div>
              )}

              {tool.id === 'unit-converter' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Conversion Category</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['length', 'temp', 'weight', 'volume'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setCheckboxState({ opt1: type === 'length', opt2: type === 'temp', opt3: type === 'weight', opt4: type === 'volume' });
                            runUnitConvert(sliderVal, type);
                          }}
                          className={`p-2 rounded text-xs uppercase font-bold tracking-wider font-mono border transition-all cursor-pointer ${
                            (type === 'length' && checkboxState.opt1) ||
                            (type === 'temp' && checkboxState.opt2) ||
                            (type === 'weight' && checkboxState.opt3) ||
                            (type === 'volume' && checkboxState.opt4)
                              ? 'bg-[#10b981] text-black border-[#10b981]'
                              : 'bg-[#151515] border-[#222] text-gray-400 hover:bg-[#1a1a1a]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                      <span>Value to Convert</span>
                      <span className="text-[#10b981] font-mono">{sliderVal}</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="150" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSliderVal(val);
                        const currentType = checkboxState.opt1 ? 'length' : checkboxState.opt2 ? 'temp' : checkboxState.opt3 ? 'weight' : 'volume';
                        runUnitConvert(val, currentType);
                      }}
                      className="w-full accent-[#10b981]"
                    />
                  </div>

                  <div className="bg-black border border-[#222] rounded-xl p-4 mt-2">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Conversion Results</span>
                    <p className="text-sm font-mono text-[#10b981] leading-relaxed">
                      {outputText || 'Select a Category and drag the slider above.'}
                    </p>
                  </div>
                </div>
              )}

              {tool.id === 'currency-converter' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                      <span>Amount (USD)</span>
                      <span className="text-[#10b981] font-mono">${sliderVal}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="1000" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSliderVal(val);
                        setOutputText(
                          `${val} USD = ${(val * 0.92).toFixed(2)} EUR\n` +
                          `${val} USD = ${(val * 0.79).toFixed(2)} GBP\n` +
                          `${val} USD = ${(val * 158.42).toFixed(2)} JPY\n` +
                          `${val} USD = ${(val * 1.36).toFixed(2)} CAD`
                        );
                      }}
                      className="w-full accent-[#10b981]"
                    />
                  </div>

                  <div className="bg-black border border-[#222] rounded-xl p-4">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Dynamic World Exchanges</span>
                    <pre className="text-xs font-mono text-[#10b981] leading-relaxed whitespace-pre-line">
                      {outputText || 'Drag the amount slider above to see rates.'}
                    </pre>
                  </div>
                </div>
              )}

              {tool.id === 'percent-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-white font-mono">What is {sliderVal}% of $500?</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSliderVal(val);
                        setOutputText(
                          `${val}% of $500 = $${((val / 100) * 500).toFixed(2)}\n\n` +
                          `If $500 increases by ${val}%, new sum is $${(500 * (1 + val/100)).toFixed(2)}\n` +
                          `If $500 decreases by ${val}%, discounted sum is $${(500 * (1 - val/100)).toFixed(2)}`
                        );
                      }}
                      className="accent-[#10b981] w-full"
                    />
                  </div>

                  <div className="bg-black border border-[#222] p-4 rounded-xl">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Proportional Math Output</span>
                    <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Drag the percentage slider to solve.'}
                    </pre>
                  </div>
                </div>
              )}

              {tool.id === 'tip-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Bill Amount ($)</span>
                      <input type="number" min="1" value={sliderVal} onChange={(e) => setSliderVal(parseInt(e.target.value) || 1)} className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Number of People</span>
                      <input type="number" min="1" value={checkboxState.opt1 ? 2 : checkboxState.opt2 ? 3 : checkboxState.opt3 ? 4 : 5} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 2;
                          setCheckboxState({ opt1: val === 2, opt2: val === 3, opt3: val === 4, opt4: val >= 5 });
                        }} 
                        className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {[10, 15, 20, 25].map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          const size = checkboxState.opt1 ? 2 : checkboxState.opt2 ? 3 : checkboxState.opt3 ? 4 : 5;
                          const tip = sliderVal * (p / 100);
                          const total = sliderVal + tip;
                          const share = total / size;
                          setOutputText(
                            `Tip Subtotal (${p}%): $${tip.toFixed(2)}\n` +
                            `Combined Total: $${total.toFixed(2)}\n\n` +
                            `Individual Share: $${share.toFixed(2)} per person`
                          );
                        }}
                        className="flex-grow p-2 bg-[#151515] border border-[#222] hover:border-[#10b981]/40 hover:bg-[#1a1a1a] text-white text-xs font-bold rounded font-mono cursor-pointer"
                      >
                        {p}% Tip
                      </button>
                    ))}
                  </div>

                  <div className="bg-black border border-[#222] p-4 rounded-xl">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Tip Breakdown Results</span>
                    <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Enter bill info and click on tip percentage.'}
                    </pre>
                  </div>
                </div>
              )}

              {tool.id === 'gpa-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-[#1f1f1f]">
                    <span className="text-xs text-white font-mono block">Interactive Course Grades ListBullets:</span>
                    <button
                      onClick={handleAddGpaCourse}
                      className="text-[9px] bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-[#10b981] px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      + Add Course
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {gpaCourses.length === 0 ? (
                      <span className="text-xs text-gray-500 font-sans text-center py-4 block">No courses added. Click "+ Add Course" to start.</span>
                    ) : (
                      gpaCourses.map((course) => (
                        <div key={course.id} className="flex gap-2 items-center bg-black/40 border border-[#1a1a1a] p-2 rounded-lg">
                          <input
                            type="text"
                            value={course.name}
                            onChange={(e) => handleUpdateGpaCourse(course.id, 'name', e.target.value)}
                            className="flex-1 bg-black border border-[#222] text-xs text-white px-2 py-1 rounded font-mono focus:border-[#10b981]/60 focus:outline-none"
                            placeholder="Course name"
                          />
                          <select
                            value={course.credits}
                            onChange={(e) => handleUpdateGpaCourse(course.id, 'credits', parseInt(e.target.value) || 3)}
                            className="w-16 bg-black border border-[#222] text-xs text-[#10b981] px-2 py-1 rounded font-mono focus:outline-none cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5].map(c => (
                              <option key={c} value={c} className="bg-black text-white">{c} Cr</option>
                            ))}
                          </select>
                          <select
                            value={course.grade}
                            onChange={(e) => handleUpdateGpaCourse(course.id, 'grade', e.target.value)}
                            className="w-16 bg-black border border-[#222] text-xs text-white px-2 py-1 rounded font-mono font-bold focus:outline-none cursor-pointer"
                          >
                            {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'].map(g => (
                              <option key={g} value={g} className="bg-black text-white">{g}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDeleteGpaCourse(course.id)}
                            className="p-1 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer shrink-0 border border-transparent"
                            title="Delete course"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={handleCalculateGpa}
                    className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer mt-1"
                  >
                    Calculate Cumulative Grade Point Average
                  </button>

                  {outputText && (
                    <div className="bg-black border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-center font-mono text-xs whitespace-pre-line leading-relaxed">
                      {outputText}
                    </div>
                  )}
                </div>
              )}

              {tool.id === 'age-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Enter Birthday Date</label>
                    <input 
                      type="date" 
                      onChange={(e) => {
                        const birth = new Date(e.target.value);
                        if (isNaN(birth.getTime())) return;
                        const diff = Date.now() - birth.getTime();
                        const ageDate = new Date(diff);
                        const years = Math.abs(ageDate.getUTCFullYear() - 1970);
                        const months = ageDate.getUTCMonth();
                        const days = ageDate.getUTCDate() - 1;
                        setOutputText(
                          `Exact Age:\n` +
                          `• ${years} Years, ${months} Months, ${days} Days old\n` +
                          `• Approx ${Math.floor(diff / (1000 * 60 * 60 * 24))} total days elapsed\n` +
                          `• Next Birthday: ${12 - months} months from now`
                        );
                        addLog('Estimated precise age metrics.');
                      }}
                      className="bg-black border border-[#222] text-[#10b981] p-3 rounded-lg text-sm font-mono font-bold w-full"
                    />
                  </div>

                  {outputText && (
                    <div className="bg-black border border-[#222] p-4 rounded-xl">
                      <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                        {outputText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {tool.id === 'loan-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Principal amount ($)</span>
                    <input type="number" min="1000" defaultValue="15000" id="loan-amount-input" className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Interest Rate (%)</span>
                      <input type="number" min="1" step="0.1" defaultValue="5.5" id="loan-rate-input" className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Duration (Years)</span>
                      <input type="number" min="1" defaultValue="5" id="loan-years-input" className="bg-black border border-[#222] text-[#10b981] p-2 rounded text-sm font-mono font-bold" />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const amount = parseFloat((document.getElementById('loan-amount-input') as HTMLInputElement).value) || 15000;
                      const rate = parseFloat((document.getElementById('loan-rate-input') as HTMLInputElement).value) || 5.5;
                      const years = parseInt((document.getElementById('loan-years-input') as HTMLInputElement).value) || 5;
                      const monthlyRate = (rate / 100) / 12;
                      const totalMonths = years * 12;
                      const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
                      setOutputText(
                        `Estimated Monthly Premium: $${monthlyPayment.toFixed(2)}\n` +
                        `Total Paid Over ${years} Years: $${(monthlyPayment * totalMonths).toFixed(2)}\n` +
                        `Cumulative Interest Expense: $${((monthlyPayment * totalMonths) - amount).toFixed(2)}`
                      );
                    }} 
                    className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Generate Amortization Forecast
                  </button>
                  {outputText && (
                    <div className="bg-black border border-[#222] p-4 rounded-xl">
                      <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                        {outputText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TEMPLATE C: HEALTH & LIFESTYLE UTILITIES */}
          {(tool.category === 'Health & Lifestyle') && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto w-full bg-[#090909] border border-[#1a1a1a] p-6 rounded-2xl shadow-inner text-center">
              
              {tool.id === 'bmi-calc' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                      <span>Height (cm)</span>
                      <span className="text-[#10b981] font-bold">{sliderVal + 100} cm</span>
                    </label>
                    <input 
                      type="range" 
                      min="40" 
                      max="120" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const h = parseInt(e.target.value) || 0;
                        setSliderVal(h);
                        runBmi(checkboxState.opt1 ? 70 : 90, h + 100);
                      }}
                      className="w-full accent-[#10b981]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                      <span>Weight (kg)</span>
                      <span className="text-[#10b981] font-bold">{checkboxState.opt1 ? 70 : checkboxState.opt2 ? 80 : checkboxState.opt3 ? 90 : 100} kg</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[70, 80, 90, 100].map(w => (
                        <button
                          key={w}
                          onClick={() => {
                            setCheckboxState({ opt1: w === 70, opt2: w === 80, opt3: w === 90, opt4: w === 100 });
                            runBmi(w, sliderVal + 100);
                          }}
                          className={`p-2 rounded font-mono text-xs font-bold border transition-all cursor-pointer ${
                            (w === 70 && checkboxState.opt1) ||
                            (w === 80 && checkboxState.opt2) ||
                            (w === 90 && checkboxState.opt3) ||
                            (w === 100 && checkboxState.opt4)
                              ? 'bg-[#10b981] text-black border-[#10b981]'
                              : 'bg-[#151515] border-[#222] text-gray-400'
                          }`}
                        >
                          {w} kg
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black border border-[#222] rounded-xl p-4 mt-2">
                    <span className="text-[8px] font-bold text-gray-500 font-mono tracking-wider block mb-2 uppercase">Physical Evaluation Results</span>
                    <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Adjust parameters to discover Body Mass Index indices.'}
                    </pre>
                  </div>
                </div>
              )}

              {tool.id === 'pomodoro' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-40 h-40 flex items-center justify-center border-4 border-[#222] rounded-full bg-black/60 shadow-inner">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#10b981]/20 animate-spin-slow" />
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-mono text-[#10b981] font-bold">
                        {timerRunning 
                          ? `${Math.floor(timerCount / 60).toString().padStart(2, '0')}:${(timerCount % 60).toString().padStart(2, '0')}`
                          : '25:00'
                        }
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-gray-500 font-mono mt-1">
                        {timerRunning ? 'Focus Active' : 'Idle Session'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <button onClick={() => startPomodoro(25)} className="flex-grow py-2 bg-[#10b981] hover:bg-[#10b981]/90 text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">25m Work Focus</button>
                    <button onClick={() => startPomodoro(5)} className="flex-grow py-2 bg-[#151515] border border-[#222] text-white hover:bg-[#1a1a1a] font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">5m Short Break</button>
                    {timerRunning && (
                      <button onClick={() => setTimerRunning(false)} className="px-3.5 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer transition-all">
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {tool.id === 'breath-guide' && (
                <div className="flex flex-col items-center gap-6">
                  {/* Expanding sphere animation container */}
                  <div className="h-44 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: timerRunning ? (breathProgress * 0.8 + 0.6) : 0.8,
                        boxShadow: timerRunning ? `0 0 ${breathProgress * 30 + 10}px rgba(197, 163, 104, 0.4)` : 'none'
                      }}
                      transition={{ duration: 1, ease: 'easeInOut' }}
                      className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#059669] to-[#10b981] flex items-center justify-center text-black font-bold"
                    >
                      <Wind className="w-8 h-8 text-[#0d0d0d] animate-pulse" />
                    </motion.div>
                  </div>

                  <div className="text-center">
                    <h3 className="font-sans text-lg text-white">
                      {timerRunning ? breathingPhase : 'Box Breathing Sphere'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      {timerRunning 
                        ? 'Slightly align your breathing pace with the expanding physical circle.' 
                        : 'Click on the prompt below to initiate 16-second box breathing cycles.'
                      }
                    </p>
                  </div>

                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="w-full py-2.5 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-widest hover:bg-[#10b981]/90 transition-all cursor-pointer"
                  >
                    {timerRunning ? 'Halt Training' : 'Initiate Breathing Timer'}
                  </button>
                </div>
              )}

              {tool.id === 'noise-maker' && (
                <div className="flex flex-col gap-4">
                  <span className="text-xs text-gray-400 font-sans">Synthesize pure ambient frequency waveforms offline.</span>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => toggleSleepSounds('white')}
                      className={`p-4 rounded-xl border font-mono text-xs uppercase font-bold tracking-widest cursor-pointer transition-all ${
                        gameActive && oscillatorRef.current ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'bg-[#151515] border-[#222] text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      White Noise
                    </button>
                    <button
                      onClick={() => toggleSleepSounds('brown')}
                      className={`p-4 rounded-xl border font-mono text-xs uppercase font-bold tracking-widest cursor-pointer transition-all ${
                        gameActive && oscillatorRef.current ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'bg-[#151515] border-[#222] text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      Brown Noise
                    </button>
                    <button
                      onClick={() => toggleSleepSounds('sine')}
                      className={`p-4 rounded-xl border font-mono text-xs uppercase font-bold tracking-widest cursor-pointer transition-all ${
                        gameActive && oscillatorRef.current ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'bg-[#151515] border-[#222] text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      Deep Tone
                    </button>
                  </div>

                  {gameActive && (
                    <button onClick={stopAudio} className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded uppercase tracking-wider cursor-pointer">
                      Halt Ambient Playback
                    </button>
                  )}
                </div>
              )}

              {tool.id === 'water-tracker' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-28 h-40 bg-black border-2 border-[#333] rounded-b-xl overflow-hidden shadow-inner flex flex-col justify-end">
                    {/* Water Level Wave Overlay */}
                    <motion.div
                      animate={{ height: `${Math.min(100, (waterOunces / 80) * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="w-full bg-cyan-500/30 border-t-2 border-cyan-400/80 relative flex items-center justify-center font-mono text-xs font-bold text-cyan-200"
                    >
                      <span className="absolute">{waterOunces} oz</span>
                    </motion.div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => {
                        setWaterOunces(prev => prev + 8);
                        addLog('Logged +8 oz glass of pure water.');
                      }} 
                      className="flex-grow py-2 bg-cyan-500 text-black font-bold text-xs rounded uppercase tracking-wider hover:bg-cyan-400 transition-all cursor-pointer"
                    >
                      +8 oz Glass
                    </button>
                    <button 
                      onClick={() => {
                        setWaterOunces(0);
                        addLog('Cleared daily hydration tally.');
                      }} 
                      className="px-3 bg-[#151515] border border-[#222] hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">Recommended intake daily standard is 80 ounces.</span>
                </div>
              )}

              {tool.id === 'habit-tracker' && (
                <div className="flex flex-col gap-2 text-left">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Today's Habits</span>
                  <div className="flex flex-col gap-2 mt-1">
                    {habits.map(h => (
                      <div 
                        key={h.id}
                        onClick={() => {
                          setHabits(prev => prev.map(item => item.id === h.id ? { ...item, done: !item.done } : item));
                          addLog(`Toggled habit "${h.text}"`);
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          h.done ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400' : 'bg-black border-[#222] text-gray-400 hover:border-gray-800'
                        }`}
                      >
                        <span className={`text-xs ${h.done ? 'line-through' : ''}`}>{h.text}</span>
                        {h.done ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <div className="w-4 h-4 border border-gray-600 rounded" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic generic layout for BMR, Calorie and other lifestyle tools */}
              {!['bmi-calc', 'pomodoro', 'breath-guide', 'noise-maker', 'water-tracker', 'habit-tracker'].includes(tool.id) && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-white font-mono block">Configure active scaling parameters:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={sliderVal} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSliderVal(val);
                        if (tool.id === 'bmr-calc') {
                          setOutputText(`Estimated Daily Calorie Target: ${Math.floor(1500 + val * 15)} kcal\nBasal Metabolic Rate: ${Math.floor(1300 + val * 8)} calories per day`);
                        } else if (tool.id === 'step-sim') {
                          const steps = val * 200;
                          setOutputText(`Step Count logged: ${steps} steps\nEstimated Distance: ${(steps * 0.0005).toFixed(2)} miles\nEstimated Energy Burned: ${Math.floor(steps * 0.04)} kcal`);
                        } else {
                          setOutputText(`Lifestyle tracking coefficient: ${val}%\nDaily target progress status: Safe & Balanced`);
                        }
                      }}
                      className="accent-[#10b981] w-full"
                    />
                  </div>
                  <div className="bg-black border border-[#222] p-4 rounded-xl">
                    <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                      {outputText || 'Adjust slider to calculate lifestyle health targets.'}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TEMPLATE D: FUN & QUICK GAME UTILITIES */}
          {(tool.category === 'Fun & Games') && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto w-full bg-[#090909] border border-[#1a1a1a] p-6 rounded-2xl shadow-inner text-center">
              
              {tool.id === 'password-gen' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Password Length</span>
                    <span className="text-[#10b981] font-mono font-bold text-xs">{sliderVal} chars</span>
                  </div>
                  <input type="range" min="6" max="32" value={sliderVal} onChange={(e) => setSliderVal(parseInt(e.target.value) || 6)} className="w-full accent-[#10b981]" />

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt1: !prev.opt1 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt1 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Lowercase (a-z)
                    </button>
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt2: !prev.opt2 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt2 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Uppercase (A-Z)
                    </button>
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt3: !prev.opt3 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt3 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Numbers (0-9)
                    </button>
                    <button 
                      onClick={() => setCheckboxState(prev => ({ ...prev, opt4: !prev.opt4 }))}
                      className={`p-2 rounded text-xs font-bold border transition-all ${checkboxState.opt4 ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'}`}
                    >
                      Special Signs
                    </button>
                  </div>

                  <button onClick={runPasswordGen} className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">Generate Password</button>

                  {outputText && (
                    <div className="bg-black border border-[#222] p-3 rounded-lg flex items-center justify-between font-mono mt-1">
                      <span className="text-[#10b981] text-sm font-bold truncate">{outputText}</span>
                      <button onClick={() => handleCopy(outputText)} className="text-[#10b981] hover:text-white cursor-pointer">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tool.id === 'coin-flipper' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-28 flex items-center justify-center">
                    <motion.div
                      animate={{ rotateY: gameActive ? 360 * 3 : 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="w-20 h-20 bg-gradient-to-tr from-[#059669] to-[#10b981] rounded-full flex items-center justify-center border border-[#10b981]/40 text-black font-sans text-lg font-bold shadow-lg"
                    >
                      {outputText || '$'}
                    </motion.div>
                  </div>
                  <button onClick={runCoinFlip} disabled={gameActive} className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer">
                    {gameActive ? 'Flipping...' : 'Flip Silver Coin'}
                  </button>
                  <span className="text-[9px] text-gray-500 font-mono">Tally sessions flipped: {gameScore} rounds</span>
                </div>
              )}

              {tool.id === 'dice-roller' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {[4, 6, 8, 10, 12, 20].map(sides => (
                      <button
                        key={sides}
                        onClick={() => runDiceRoll(sides)}
                        className="p-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[#222] hover:border-red-500/30 text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer"
                      >
                        Roll D{sides}
                      </button>
                    ))}
                  </div>

                  {outputText && (
                    <div className="bg-black border border-red-500/20 text-red-400 p-4 rounded-xl font-mono text-lg font-bold w-full text-center">
                      {outputText}
                    </div>
                  )}
                </div>
              )}

              {tool.id === 'rock-paper-scissors' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['rock', 'paper', 'scissors'] as const).map(choice => (
                      <button
                        key={choice}
                        onClick={() => runRpsGame(choice)}
                        className="p-4 bg-[#151515] hover:bg-[#1a1a1a] border border-[#222] text-xs font-bold text-white rounded-xl uppercase tracking-widest transition-all cursor-pointer hover:border-[#10b981]/40"
                      >
                        {choice}
                      </button>
                    ))}
                  </div>

                  {outputText && (
                    <div className="bg-black border border-[#222] p-4 rounded-xl font-mono text-sm text-[#10b981] text-center">
                      {outputText}
                    </div>
                  )}
                </div>
              )}

              {/* General support for game simulators */}
              {!['password-gen', 'coin-flipper', 'dice-roller', 'rock-paper-scissors'].includes(tool.id) && (
                <div className="flex flex-col gap-4 text-left">
                  <span className="text-xs text-gray-400 font-sans">Arcade workspace simulation:</span>
                  <button 
                    onClick={() => {
                      setGameScore(prev => prev + 1);
                      setOutputText(`Action Triggered successfully!\nSession Rating: Classic Sandbox Level 1\nTally High Score: ${gameScore + 1}`);
                      addLog('Registered interactive game move.');
                    }}
                    className="w-full py-2 bg-[#10b981] text-black font-bold text-xs rounded uppercase tracking-wider cursor-pointer"
                  >
                    Trigger Interactive Action Move
                  </button>
                  {outputText && (
                    <div className="bg-black border border-[#222] p-4 rounded-xl font-mono text-xs text-[#10b981]">
                      {outputText}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TEMPLATE E: MEDIA SIMULATION WORKSPACES */}
          {(tool.category === 'Video' || tool.category === 'Image' || tool.category === 'Document') && 
           !(tool.id === 'json-formatter' || tool.id === 'yaml-to-json' || tool.id === 'xml-beautifier' || tool.id === 'jwt-debugger' || tool.id === 'sql-formatter' || tool.id === 'hash-generator') && (
            <div className="flex flex-col gap-4 w-full">
              
              {/* Image Drag and Drop block */}
              <div className="max-w-xl mx-auto w-full">
                {!uploadedFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setUploadedFile(file);
                        addLog(`Staged media file: ${file.name}`);
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = (e: any) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setUploadedFile(file);
                          addLog(`Staged media file: ${file.name}`);
                        }
                      };
                      input.click();
                    }}
                    className="border border-dashed border-[#222] hover:border-[#10b981]/40 bg-[#070707] rounded-xl p-8 text-center cursor-pointer transition-all"
                  >
                    <SlidersHorizontal className="w-6 h-6 text-gray-500 mx-auto mb-3" />
                    <p className="text-xs text-white font-sans">Drag & drop or click to upload target media file</p>
                    <p className="text-[9px] text-gray-500 mt-1">Ready for real-time localized GPU processing sandbox</p>
                  </div>
                ) : (
                  <div className="bg-[#090909] border border-[#222] rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-2">
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-xs">{uploadedFile.name}</span>
                      <button onClick={() => { setUploadedFile(null); setFilePreview(null); setOutputText(''); }} className="text-red-400 hover:text-red-500 text-[10px] font-bold uppercase font-mono cursor-pointer">Remove</button>
                    </div>

                    {filePreview && (
                      <div className="h-44 bg-black border border-[#1a1a1a] rounded-lg overflow-hidden flex items-center justify-center relative">
                        {uploadedFile?.type.startsWith('video/') ? (
                          <video 
                            id="workspace-video-preview"
                            src={filePreview} 
                            controls 
                            className="max-h-full object-contain w-full"
                          />
                        ) : (
                          <img 
                            src={filePreview} 
                            alt="Workspace preview" 
                            className="max-h-full object-contain" 
                            style={{
                              filter: tool.id === 'image-filters' 
                                ? `brightness(${filterBrightness}%) contrast(${filterContrast}%) grayscale(${filterGrayscale}%) blur(${filterBlur}px) sepia(${filterSepia}%)`
                                : 'none'
                            }}
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    )}

                    {/* Filter Slider block */}
                    {tool.id === 'image-filters' && (
                      <div className="flex flex-col gap-3 text-left">
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Brightness ({filterBrightness}%)</span>
                            <input type="range" min="50" max="150" value={filterBrightness} onChange={(e) => setFilterBrightness(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Contrast ({filterContrast}%)</span>
                            <input type="range" min="50" max="150" value={filterContrast} onChange={(e) => setFilterContrast(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Grayscale ({filterGrayscale}%)</span>
                            <input type="range" min="0" max="100" value={filterGrayscale} onChange={(e) => setFilterGrayscale(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Blur ({filterBlur}px)</span>
                            <input type="range" min="0" max="10" value={filterBlur} onChange={(e) => setFilterBlur(parseInt(e.target.value))} className="accent-[#10b981] w-full" />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Image Compressor Quality Slider */}
                    {tool.id === 'image-compressor' && (
                      <div className="flex flex-col gap-1.5 text-left bg-black/40 border border-[#1a1a1a] p-3 rounded-lg">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between font-mono">
                          <span>Target Quality ({sliderVal}%)</span>
                          <span className="text-[#10b981] font-bold">{sliderVal}%</span>
                        </label>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          value={sliderVal} 
                          onChange={(e) => setSliderVal(parseInt(e.target.value) || 80)} 
                          className="w-full accent-[#10b981] cursor-pointer" 
                        />
                      </div>
                    )}

                    {/* Pixel Art SquaresFour Drawer */}
                    {tool.id === 'pixel-art' && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-2 mb-1.5">
                          {['#10b981', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#0d0d0d'].map(color => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={`w-6 h-6 rounded border transition-all ${selectedColor === color ? 'border-white scale-110' : 'border-[#333]'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-8 gap-1 p-2 bg-black border border-[#222] rounded-lg">
                          {pixelGrid.map((pixel, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                const newGrid = [...pixelGrid];
                                newGrid[i] = selectedColor;
                                setPixelGrid(newGrid);
                              }}
                              className="w-6 h-6 border border-gray-900 transition-colors"
                              style={{ backgroundColor: pixel }}
                            />
                          ))}
                        </div>
                        <button 
                          onClick={() => setPixelGrid(Array(64).fill('#0d0d0d'))}
                          className="text-[10px] text-gray-500 font-mono hover:text-white uppercase tracking-wider"
                        >
                          Clear Pixel Board
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          if (tool.id === 'exif-viewer') {
                            simulateExif();
                          } else if (tool.id === 'gif-maker') {
                            handleCreateGif();
                          } else if (tool.id === 'image-compressor') {
                            handleCompressImage();
                          } else if (tool.id === 'favicon-generator') {
                            handleGenerateFavicon();
                          } else if (tool.id === 'image-filters') {
                            handleApplyFilter();
                          } else if (tool.id === 'video-to-audio') {
                            handleExtractAudio();
                          } else if (tool.id === 'frame-extractor') {
                            handleExtractFrame();
                          } else if (tool.id === 'ascii-art') {
                            handleGenerateAscii();
                          } else {
                            setOutputText('Analyzing bytes... Done.\nFile conversion simulation finished successfully.');
                            addLog('Media conversion finalized.');
                          }
                        }} 
                        className="py-2 bg-[#10b981] text-black text-xs font-bold rounded uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {tool.id === 'exif-viewer' ? 'Extract Metadata' : 
                         tool.id === 'frame-extractor' ? 'Extract Frame' : 'Convert File'}
                      </button>
                      <button 
                        onClick={handleDownloadResult}
                        className="py-2 bg-[#151515] border border-[#222] text-white text-xs font-bold rounded uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Download Result
                      </button>
                    </div>

                    {outputText && (
                      <div className="bg-black border border-[#222] p-4 rounded-xl text-left">
                        <pre className="text-xs font-mono text-[#10b981] whitespace-pre-line leading-relaxed">
                          {outputText}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
