import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconContext,
  ArrowClockwise,
  ArrowRight,
  ArrowsCounterClockwise,
  Binary,
  BookOpen,
  Calculator,
  Calendar,
  Camera,
  Circle,
  Clock,
  Code,
  CornersIn,
  CornersOut,
  Crop,
  Database,
  DiceFive,
  DotsSixVertical,
  Download,
  Drop,
  Eye,
  File,
  FileArrowUp,
  FileCode,
  FileCsv,
  FileImage,
  FilePlus,
  FileText,
  FilmStrip,
  Gauge,
  Handshake,
  Hash,
  Heart,
  Key,
  Layout,
  Lightning,
  Link,
  ListBullets,
  MagnifyingGlass,
  Microphone,
  Moon,
  MusicNotes,
  Palette,
  Percent,
  Play,
  Pulse,
  PushPin,
  PushPinSlash,
  QrCode,
  Question,
  Radio,
  Scissors,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  SquaresFour,
  Stack,
  Star,
  Sun,
  Terminal,
  TextT,
  Timer,
  Trash,
  TrendUp,
  Trophy,
  Upload,
  Users,
  Wind,
  X
} from '@phosphor-icons/react';
import { ToolId, ToolItem } from './types';
import { ToastProvider, useToast } from './components/Toast';

// Import our modular components
import VideoSplitter from './components/VideoSplitter';
import ImageConverter from './components/ImageConverter';
import PdfCompiler from './components/PdfCompiler';
import SocialDownloader from './components/SocialDownloader';
import AudioTrimmer from './components/AudioTrimmer';
import QrGenerator from './components/QrGenerator';
import ColorExtractor from './components/ColorExtractor';
import AudioTranscriber from './components/AudioTranscriber';
import GenericUtilityWorkspace from './components/GenericUtilityWorkspace';

import { TOOLS_LIST, TOOL_SHORTCUTS } from './toolsData';
import { SeoManager } from './components/SeoManager';

function AppContent() {
  const toast = useToast();
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('panutility-theme') as 'dark' | 'light') || 'dark';
  });

  const [pinnedToolIds, setPinnedToolIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('panutility-pinned-tools');
    return saved ? JSON.parse(saved) : [];
  });
  const [isPinDraggingOver, setIsPinDraggingOver] = useState(false);
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Simple HTML5 Routing
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/tools\/([^/]+)/);
      if (match) {
        const toolId = match[1] as ToolId;
        const toolExists = TOOLS_LIST.some(t => t.id === toolId) || [
          'video-splitter', 'image-converter', 'pdf-compiler', 'social-downloader',
          'audio-trimmer', 'audio-transcriber', 'qr-generator', 'color-extractor'
        ].includes(toolId);
        
        if (toolExists) {
          setActiveTool(toolId);
        } else {
          window.history.replaceState(null, '', '/');
          setActiveTool(null);
        }
      } else {
        setActiveTool(null);
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  const navigateToTool = (toolId: ToolId | null) => {
    if (toolId) {
      window.history.pushState(null, '', `/tools/${toolId}`);
      setActiveTool(toolId);
    } else {
      window.history.pushState(null, '', '/');
      setActiveTool(null);
    }
  };

  const savePinnedTools = (newIds: string[]) => {
    setPinnedToolIds(newIds);
    localStorage.setItem('panutility-pinned-tools', JSON.stringify(newIds));
  };

  const handlePinTool = (toolId: string) => {
    if (!pinnedToolIds.includes(toolId)) {
      const updated = [...pinnedToolIds, toolId];
      savePinnedTools(updated);
      const toolItem = TOOLS_LIST.find(t => t.id === toolId);
      toast.success('Tool Pinned', `"${toolItem?.title}" pinned for rapid access.`);
    }
  };

  const handleUnpinTool = (toolId: string) => {
    const updated = pinnedToolIds.filter(id => id !== toolId);
    savePinnedTools(updated);
    const toolItem = TOOLS_LIST.find(t => t.id === toolId);
    toast.success('Tool Unpinned', `"${toolItem?.title}" removed from favorites.`);
  };

  const togglePinTool = (toolId: string) => {
    if (pinnedToolIds.includes(toolId)) {
      handleUnpinTool(toolId);
    } else {
      handlePinTool(toolId);
    }
  };

  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [dashboardPendingFile, setDashboardPendingFile] = useState<File | null>(null);
  const [dashboardPreviewUrl, setDashboardPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboardPendingFile) {
      setDashboardPreviewUrl(null);
      return;
    }

    if (
      dashboardPendingFile.type.startsWith('image/') || 
      dashboardPendingFile.type.startsWith('video/') || 
      dashboardPendingFile.type.startsWith('audio/')
    ) {
      const url = URL.createObjectURL(dashboardPendingFile);
      setDashboardPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [dashboardPendingFile]);

  const getRoutingOptions = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) {
      return [
        {
          toolId: 'image-converter' as ToolId,
          title: 'Image Converter',
          description: 'Convert formats, resize, compress',
          icon: 'FileImage'
        },
        {
          toolId: 'pdf-compiler' as ToolId,
          title: 'PDF Compiler',
          description: 'Compile multiple images into a PDF volume',
          icon: 'FileText'
        },
        {
          toolId: 'color-extractor' as ToolId,
          title: 'Color Extractor',
          description: 'Harvest dominant HEX color clusters',
          icon: 'Palette'
        }
      ];
    } else if (type.startsWith('audio/')) {
      return [
        {
          toolId: 'audio-trimmer' as ToolId,
          title: 'Audio Trimmer',
          description: 'Slice & clip visual audio waveforms',
          icon: 'MusicNotes'
        },
        {
          toolId: 'audio-transcriber' as ToolId,
          title: 'AI Audio Transcriber',
          description: 'Convert spoken speech to text',
          icon: 'Sparkle'
        }
      ];
    } else if (type.startsWith('video/')) {
      return [
        {
          toolId: 'video-splitter' as ToolId,
          title: 'Video Splitter',
          description: 'Segment and slice video tracks offline',
          icon: 'Scissors'
        }
      ];
    } else {
      return [
        {
          toolId: 'pdf-compiler' as ToolId,
          title: 'PDF Compiler',
          description: 'Combine files into a PDF document',
          icon: 'FileText'
        }
      ];
    }
  };

  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [draggedFileType, setDraggedFileType] = useState<'image' | 'audio' | 'video' | 'other' | null>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTool !== null) return; // ignore if inside a workspace
    
    // Check if dragging files. If it's a tool card drag, do not trigger global file overlay!
    const isFileDrag = Array.from(e.dataTransfer.types).includes('Files');
    if (!isFileDrag) {
      return;
    }
    
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsGlobalDragging(true);
      // Detect type
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file') {
        const type = item.type;
        if (type.startsWith('image/')) {
          setDraggedFileType('image');
        } else if (type.startsWith('audio/')) {
          setDraggedFileType('audio');
        } else if (type.startsWith('video/')) {
          setDraggedFileType('video');
        } else {
          setDraggedFileType('other');
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTool !== null) return;
    
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsGlobalDragging(false);
    }
  };

  const handleRoute = (file: File, toolId: ToolId) => {
    setDroppedFile(file);
    navigateToTool(toolId);
    setDashboardPendingFile(null);
    toast.success('File Loaded', `Routing "${file.name}" into workspace.`);
  };

  const handleBack = () => {
    navigateToTool(null);
    setDroppedFile(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently editing or typing in a form input/textarea/editable field
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        // If focusing search and pressing Escape, blur search
        if (e.key === 'Escape' && activeEl === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        return;
      }

      // Escape key handles:
      // - Going back to home if activeTool is active
      // - Clearing search query if activeTool is null and query is active
      if (e.key === 'Escape') {
        if (activeTool) {
          handleBack();
        } else if (searchQuery) {
          setSearchQuery('');
        }
        return;
      }

      // If activeTool is set, don't execute dashboard tool launching hotkeys
      if (activeTool !== null) {
        return;
      }

      // Focus search input on "/" key
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Map keys to tools
      const key = e.key.toLowerCase();
      
      // We accept both digits '1'-'8' or specific alpha keys
      let targetToolId: ToolId | null = null;
      if (key === '1' || key === 'v') {
        targetToolId = 'video-splitter';
      } else if (key === '2' || key === 'i') {
        targetToolId = 'image-converter';
      } else if (key === '3' || key === 'p') {
        targetToolId = 'pdf-compiler';
      } else if (key === '4' || key === 's') {
        targetToolId = 'social-downloader';
      } else if (key === '5' || key === 't') {
        targetToolId = 'audio-trimmer';
      } else if (key === '6' || key === 'a') {
        targetToolId = 'audio-transcriber';
      } else if (key === '7' || key === 'q') {
        targetToolId = 'qr-generator';
      } else if (key === '8' || key === 'c') {
        targetToolId = 'color-extractor';
      }

      if (targetToolId) {
        e.preventDefault();
        navigateToTool(targetToolId);
        const toolItem = TOOLS_LIST.find(t => t.id === targetToolId);
        toast.success('Workspace Activated', `Launching "${toolItem?.title}" via hotkey.`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTool, searchQuery, toast]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('omnitool-theme', nextTheme);
  };

  const getIcon = (name: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      Scissors: <Scissors className="w-5 h-5" />,
      FileImage: <FileImage className="w-5 h-5" />,
      FileText: <FileText className="w-5 h-5" />,
      Download: <Download className="w-5 h-5" />,
      MusicNotes: <MusicNotes className="w-5 h-5" />,
      QrCode: <QrCode className="w-5 h-5" />,
      Palette: <Palette className="w-5 h-5" />,
      Sparkle: <Sparkle className="w-5 h-5" />,
      FilmStrip: <FilmStrip className="w-5 h-5" />,
      Radio: <Radio className="w-5 h-5" />,
      Camera: <Camera className="w-5 h-5" />,
      Gauge: <Gauge className="w-5 h-5" />,
      SpeakerSlash: <SpeakerSlash className="w-5 h-5" />,
      CornersIn: <CornersIn className="w-5 h-5" />,
      ArrowsCounterClockwise: <ArrowsCounterClockwise className="w-5 h-5" />,
      ArrowClockwise: <ArrowClockwise className="w-5 h-5" />,
      Crop: <Crop className="w-5 h-5" />,
      Stack: <Stack className="w-5 h-5" />,
      CornersOut: <CornersOut className="w-5 h-5" />,
      Terminal: <Terminal className="w-5 h-5" />,
      File: <File className="w-5 h-5" />,
      FileArrowUp: <FileArrowUp className="w-5 h-5" />,
      BookOpen: <BookOpen className="w-5 h-5" />,
      Binary: <Binary className="w-5 h-5" />,
      FileCsv: <FileCsv className="w-5 h-5" />,
      FilePlus: <FilePlus className="w-5 h-5" />,
      ListBullets: <ListBullets className="w-5 h-5" />,
      Code: <Code className="w-5 h-5" />,
      Microphone: <Microphone className="w-5 h-5" />,
      Pulse: <Pulse className="w-5 h-5" />,
      Timer: <Timer className="w-5 h-5" />,
      Shuffle: <Shuffle className="w-5 h-5" />,
      TextT: <TextT className="w-5 h-5" />,
      Link: <Link className="w-5 h-5" />,
      Link2: <Link className="w-5 h-5" />,
      Trash: <Trash className="w-5 h-5" />,
      FileCode: <FileCode className="w-5 h-5" />,
      Hash: <Hash className="w-5 h-5" />,
      Layout: <Layout className="w-5 h-5" />,
      Database: <Database className="w-5 h-5" />,
      Clock: <Clock className="w-5 h-5" />,
      Calculator: <Calculator className="w-5 h-5" />,
      Percent: <Percent className="w-5 h-5" />,
      Users: <Users className="w-5 h-5" />,
      Trophy: <Trophy className="w-5 h-5" />,
      Calendar: <Calendar className="w-5 h-5" />,
      TrendUp: <TrendUp className="w-5 h-5" />,
      Heart: <Heart className="w-5 h-5" />,
      Wind: <Wind className="w-5 h-5" />,
      Drop: <Drop className="w-5 h-5" />,
      Key: <Key className="w-5 h-5" />,
      DiceFive: <DiceFive className="w-5 h-5" />,
      Circle: <Circle className="w-5 h-5" />,
      Shield: <Shield className="w-5 h-5" />,
      Question: <Question className="w-5 h-5" />,
    };
    return iconMap[name] || <SquaresFour className="w-5 h-5" />;
  };

  const getPremiumIcon = (name: string, category: string) => {
    const icon = getIcon(name);
    
    let glow = "rgba(16,185,129,0.25)";
    let from = "from-emerald-500/10";
    let to = "to-teal-500/2";
    let border = "border-emerald-500/15 group-hover:border-emerald-500/40";
    let text = "text-emerald-400";
    
    if (category === 'Video') {
      glow = "rgba(244,63,94,0.25)";
      from = "from-rose-500/10";
      to = "to-orange-500/2";
      border = "border-rose-500/15 group-hover:border-rose-500/40";
      text = "text-rose-400";
    } else if (category === 'Image') {
      glow = "rgba(6,182,212,0.25)";
      from = "from-cyan-500/10";
      to = "to-blue-500/2";
      border = "border-cyan-500/15 group-hover:border-cyan-500/40";
      text = "text-cyan-400";
    } else if (category === 'Audio') {
      glow = "rgba(16,185,129,0.25)";
      from = "from-emerald-500/10";
      to = "to-teal-500/2";
      border = "border-emerald-500/15 group-hover:border-emerald-500/40";
      text = "text-emerald-400";
    } else if (category === 'Document') {
      glow = "rgba(59,130,246,0.25)";
      from = "from-blue-500/10";
      to = "to-indigo-500/2";
      border = "border-blue-500/15 group-hover:border-blue-500/40";
      text = "text-blue-400";
    } else {
      glow = "rgba(245,158,11,0.25)";
      from = "from-amber-500/10";
      to = "to-yellow-500/2";
      border = "border-amber-500/15 group-hover:border-amber-500/40";
      text = "text-amber-400";
    }
    
    return (
      <div 
        className={`relative p-3 rounded-xl bg-gradient-to-br ${from} ${to} border ${border} ${text} transition-all duration-300 group-hover:scale-105 shadow-inner flex items-center justify-center`}
        style={{ boxShadow: `0 0 20px -5px ${glow}` }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-[2px] group-hover:opacity-60 transition-opacity">
          {icon}
        </div>
        <div className="relative z-10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    );
  };

  const categories = [
    'All', 'Video', 'Image', 'Document', 'Audio', 'Text & Writing', 
    'Developer Tools', 'Math & Finance', 'Health & Lifestyle', 'Fun & Games'
  ];

  const filteredTools = TOOLS_LIST.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeToolObj = activeTool ? (TOOLS_LIST.find(t => t.id === activeTool) || {
    id: activeTool,
    title: activeTool.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: `Perform client-side ${activeTool.split('-').join(' ')} operations safely in your browser.`,
    category: 'Media Tools'
  }) : undefined;

  return (
    <div 
      className={`min-h-screen bg-[#07080a] text-[#f4f4f5] flex flex-col font-sans transition-all duration-300 ${theme === 'light' ? 'theme-light' : ''}`} 
      id="all-in-one-app"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      <SeoManager 
        toolId={activeTool} 
        toolTitle={activeToolObj?.title} 
        toolDescription={activeToolObj?.description} 
        category={activeToolObj?.category} 
      />
      
      {/* Universal Top Nav */}
      <header className="sticky top-0 bg-[#07080a]/90 backdrop-blur-md border-b border-zinc-800/60 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => navigateToTool(null)}>
            <div className="bg-emerald-600/10 border border-emerald-500/30 p-2 rounded-lg text-emerald-400 shadow-sm hover:bg-emerald-600 hover:text-white transition-all duration-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="opacity-60" />
                <path d="M12 2v20M2 12h20" className="opacity-40" />
                <path d="M12 9l3 3-3 3-3-3 3-3z" fill="currentColor" fillOpacity="0.3" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight block font-sans font-sans">
                PanUtility <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider ml-0.5 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">Core</span>
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block leading-none uppercase tracking-widest mt-1">Universal Utility Suite</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span className="hidden md:flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Sandbox Secure</span>
            <span className="hidden md:inline opacity-30">&bull;</span>
            <span className="hidden lg:flex items-center gap-1.5"><Handshake className="w-4 h-4 text-emerald-400" /> Zero HardDrive Siphoning</span>
            
            {/* Elegant Theme Selector */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 bg-[#0f1115] hover:bg-zinc-800/50 border border-zinc-800 text-zinc-300 py-1.5 px-3 rounded-lg transition-all cursor-pointer font-bold select-none text-[9px] uppercase tracking-widest"
              title={theme === 'dark' ? 'Switch to Minimalist Light Theme' : 'Switch to Modern Dark Theme'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span>Minimalist Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400/10" />
                  <span>Modern Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8 relative">
        <AnimatePresence mode="wait">
          {!activeTool ? (
            /* Dashboard View */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-8"
            >
              {/* Promo Banner / Hero greeting */}
              <div className="text-center max-w-2xl mx-auto py-6 flex flex-col gap-4">
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded w-fit mx-auto uppercase tracking-wider font-mono select-none">
                  Universal Sandbox Tools
                </span>
                <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl leading-tight font-sans">
                  Universal Offline <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 font-extrabold uppercase tracking-tight">Utility Suite</span>
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Fast, client-side, zero-telemetry utilities. Slice videos, compile PDF volumes, convert image formats, generate secure QR codes, and format data safely with zero server uploads.
                </p>
              </div>

              {/* MagnifyingGlass & Filters block */}
              <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
                {/* MagnifyingGlass input field */}
                <div className="relative group/search">
                  <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/search:text-emerald-400 transition-colors" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="MagnifyingGlass tools by name, description, category... (Press / to focus)"
                    className="w-full bg-[#111114] border border-zinc-800/80 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filters category bar */}
                <div className="flex items-center justify-center gap-2 flex-wrap pb-2 border-b border-zinc-800/60 w-full">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 bg-transparent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dashboard Drag & Drop Station */}
              <div className="max-w-xl mx-auto w-full" id="dashboard-drop-zone-container">
                {!dashboardPendingFile ? (
                  /* Idle Drop Zone State */
                  <div
                    id="dashboard-drop-zone-idle"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const file = e.dataTransfer.files[0];
                        setDashboardPendingFile(file);
                        toast.success("File Received", `"${file.name}" ready to analyze.`);
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,audio/*,video/*';
                      input.onchange = (e: any) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setDashboardPendingFile(file);
                          toast.success("File Selected", `"${file.name}" ready to analyze.`);
                        }
                      };
                      input.click();
                    }}
                    className="border border-dashed border-zinc-800 hover:border-emerald-500/50 bg-[#0f1115] hover:bg-zinc-800/20 rounded-xl p-6 transition-all duration-300 cursor-pointer text-center group relative overflow-hidden shadow-md"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-white font-sans group-hover:text-emerald-400 transition-colors">
                          Drag & drop or click to upload file for instant routing
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                          Supported formats: Images (PNG, JPG, WebP), Audio (MP3, WAV), Video (MP4, WebM)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Pending File Active State with Thumbnail/Preview and Route Controls */
                  <div 
                    id="dashboard-drop-zone-active"
                    className="border border-emerald-500/30 bg-[#0f1115] rounded-xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4 animate-in fade-in duration-300"
                  >
                    {/* Absolute Glow Background Accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Header with filename and clear button */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c] relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-emerald-950/40 text-emerald-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          File Staged
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {(dashboardPendingFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        onClick={() => setDashboardPendingFile(null)}
                        className="text-gray-500 hover:text-white hover:bg-[#1a1a1a] p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Clear staged file"
                        id="clear-staged-file-btn"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Main Preview Container */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#070707] border border-[#1a1a1a] p-3 rounded-lg relative z-10">
                      
                      {/* Thumbnail Preview Area */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#121212] border border-[#222] rounded-md overflow-hidden flex items-center justify-center shrink-0 relative group/thumb shadow-inner">
                        
                        {dashboardPendingFile.type.startsWith('image/') && dashboardPreviewUrl && (
                          <img
                            src={dashboardPreviewUrl}
                            alt="File Thumbnail Preview"
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform animate-in fade-in duration-200"
                            referrerPolicy="no-referrer"
                          />
                        )}

                        {dashboardPendingFile.type.startsWith('video/') && dashboardPreviewUrl && (
                          <div className="w-full h-full relative">
                            <video
                              src={dashboardPreviewUrl}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              disablePictureInPicture
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Scissors className="w-5 h-5 text-emerald-400" />
                            </div>
                          </div>
                        )}

                        {dashboardPendingFile.type.startsWith('audio/') && (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-b from-[#111] to-[#1a1a1a]">
                            <MusicNotes className="w-6 h-6 text-emerald-400 animate-pulse" />
                            {dashboardPreviewUrl && (
                              <audio src={dashboardPreviewUrl} controls className="hidden" />
                            )}
                          </div>
                        )}

                        {!dashboardPendingFile.type.startsWith('image/') && !dashboardPendingFile.type.startsWith('video/') && !dashboardPendingFile.type.startsWith('audio/') && (
                          <FileText className="w-8 h-8 text-zinc-500" />
                        )}
                      </div>

                      {/* File Info metadata & details */}
                      <div className="flex-grow text-center sm:text-left min-w-0">
                        <h4 className="font-sans font-semibold text-sm text-white truncate pr-2" title={dashboardPendingFile.name}>
                          {dashboardPendingFile.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1 truncate">
                          Type: {dashboardPendingFile.type || 'Unknown Format'}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                          <span className="text-[8px] bg-zinc-800 border border-zinc-700/50 text-zinc-300 px-2 py-0.5 rounded font-mono uppercase">
                            {dashboardPendingFile.name.split('.').pop() || 'file'}
                          </span>
                          <span className="text-[8px] bg-zinc-800 border border-zinc-700/50 text-zinc-300 px-2 py-0.5 rounded font-mono uppercase">
                            Ready to process
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Suggested Workspaces / Destination Routing ListBullets */}
                    <div className="flex flex-col gap-2 relative z-10">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                        Select workspace destination:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {getRoutingOptions(dashboardPendingFile).map((option) => (
                          <button
                            key={option.toolId}
                            id={`route-to-${option.toolId}`}
                            onClick={() => handleRoute(dashboardPendingFile, option.toolId)}
                            className="flex items-center justify-between p-3 rounded-lg bg-[#111114] border border-zinc-800/80 hover:border-emerald-500/40 hover:bg-zinc-800/20 transition-all text-left cursor-pointer group active:scale-98"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded bg-zinc-900 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                {getIcon(option.icon)}
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                  {option.title}
                                </h5>
                                <p className="text-[9px] text-zinc-500 mt-0.5">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Tools Area */}
              <div className="max-w-xl md:max-w-none mx-auto w-full mb-2 bg-[#0a0a0b]" id="pinned-tools-shelf">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                    <h2 className="font-sans font-bold text-xs uppercase tracking-wider text-zinc-200">Favorite Workspaces</h2>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
                    {pinnedToolIds.length} tool{pinnedToolIds.length !== 1 ? 's' : ''} pinned
                  </span>
                </div>

                {pinnedToolIds.length === 0 ? (
                  <div 
                    id="pinned-shelf-empty"
                    className={`border border-dashed rounded-xl p-5 text-center transition-all duration-300 ${
                      isPinDraggingOver 
                        ? 'border-emerald-500 bg-emerald-500/5 scale-[1.01]' 
                        : 'border-zinc-800 bg-[#0f1115]/40 hover:border-zinc-700'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPinDraggingOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPinDraggingOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPinDraggingOver(false);
                      const toolId = e.dataTransfer.getData('text/plain');
                      const source = e.dataTransfer.getData('source');
                      if (source === 'grid-tool' && toolId) {
                        handlePinTool(toolId);
                      }
                    }}
                  >
                    <PushPin className={`w-5 h-5 mx-auto mb-2 transition-colors ${isPinDraggingOver ? 'text-emerald-400 animate-bounce' : 'text-zinc-500'}`} />
                    <p className="text-xs text-zinc-300 font-sans font-semibold">Your pinned workspaces shelf is empty</p>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Drag & drop any tool card from the grid below to pin it here for instant access.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" id="pinned-shelf-grid">
                    {pinnedToolIds.map((toolId, index) => {
                      const tool = TOOLS_LIST.find(t => t.id === toolId);
                      if (!tool) return null;
                      return (
                        <motion.div
                          key={`pinned-${tool.id}`}
                          id={`pinned-tool-${tool.id}`}
                          layoutId={`pinned-layout-${tool.id}`}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', tool.id);
                            e.dataTransfer.setData('source', 'pinned-tool');
                            e.dataTransfer.setData('index', index.toString());
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const source = e.dataTransfer.getData('source');
                            if (source === 'pinned-tool') {
                              const dragIndex = parseInt(e.dataTransfer.getData('index'));
                              const hoverIndex = index;
                              if (dragIndex !== hoverIndex) {
                                const updated = [...pinnedToolIds];
                                const [removed] = updated.splice(dragIndex, 1);
                                updated.splice(hoverIndex, 0, removed);
                                savePinnedTools(updated);
                              }
                            } else if (source === 'grid-tool') {
                              const draggedId = e.dataTransfer.getData('text/plain');
                              if (draggedId && !pinnedToolIds.includes(draggedId)) {
                                const updated = [...pinnedToolIds];
                                updated.splice(index, 0, draggedId);
                                savePinnedTools(updated);
                                const toolItem = TOOLS_LIST.find(t => t.id === draggedId);
                                toast.success('Tool Pinned', `Pinned "${toolItem?.title}" at this position.`);
                              }
                            }
                          }}
                          onClick={() => navigateToTool(tool.id as ToolId)}
                          onMouseEnter={() => setHoveredToolId(`pinned-${tool.id}`)}
                          onMouseLeave={() => setHoveredToolId(null)}
                          className="border border-zinc-800 bg-[#111114] rounded-lg p-3 hover:border-emerald-500/30 cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between gap-3 relative group active:scale-98 shadow-sm animate-in fade-in zoom-in duration-250"
                        >
                          {/* Interactive Subtle Tooltip system for Pinned Workspace */}
                          <AnimatePresence>
                            {hoveredToolId === `pinned-${tool.id}` && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 w-72 bg-[#0e0e11] border border-zinc-700/50 rounded-xl p-3 shadow-2xl pointer-events-none text-left"
                              >
                                <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5 mb-2">
                                  <span className="text-[9px] bg-emerald-950/40 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Pro-Tip & Shortcut
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                                    <kbd className="px-1.5 py-0.5 bg-[#161619] border border-zinc-800 rounded text-emerald-400 font-bold">
                                      {TOOL_SHORTCUTS[tool.id]?.key}
                                    </kbd>
                                    <span className="text-zinc-650">or</span>
                                    <kbd className="px-1.5 py-0.5 bg-[#161619] border border-zinc-800 rounded text-emerald-400 font-bold">
                                      {TOOL_SHORTCUTS[tool.id]?.label}
                                    </kbd>
                                  </div>
                                </div>
                                <p className="text-[11px] text-zinc-300 leading-relaxed font-sans mb-1.5">
                                  "{TOOL_SHORTCUTS[tool.id]?.tip}"
                                </p>
                                <div className="text-[8px] text-zinc-500 font-mono flex items-center justify-between">
                                  <span>Hover card &bull; Press key to launch</span>
                                  <span className="text-emerald-400">&bull; Favorite</span>
                                </div>
                                {/* Mini triangle arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-zinc-800 w-0 h-0" />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Unpin Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnpinTool(tool.id);
                            }}
                            className="absolute top-2.5 right-2.5 z-10 p-1 rounded hover:text-red-400 hover:bg-[#151515] text-gray-500 transition-colors cursor-pointer"
                            title="Unpin tool"
                          >
                            <PushPinSlash className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-3">
                            <div className="shrink-0 scale-90">
                              {getPremiumIcon(tool.icon, tool.category)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-sans text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition-colors leading-tight">
                                {tool.title}
                              </h3>
                              <span className="text-[8px] bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono inline-block mt-1">
                                {tool.category}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Compact append-drop-zone block */}
                    <div
                      className={`border border-dashed rounded-lg p-3.5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[58px] ${
                        isPinDraggingOver 
                          ? 'border-emerald-500 bg-emerald-500/5 scale-[1.01]' 
                          : 'border-zinc-800 bg-[#111114]/10 hover:border-zinc-700'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPinDraggingOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPinDraggingOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPinDraggingOver(false);
                        const toolId = e.dataTransfer.getData('text/plain');
                        const source = e.dataTransfer.getData('source');
                        if (source === 'grid-tool' && toolId) {
                          handlePinTool(toolId);
                        }
                      }}
                    >
                      <PushPin className={`w-3.5 h-3.5 mb-1 ${isPinDraggingOver ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
                      <span className="text-[9px] text-zinc-550">Drop here to PushPin</span>
                    </div>
                  </div>
                )}
              </div>

              {/* SquaresFour Layout or Empty State */}
              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                  {filteredTools.map((tool, index) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => navigateToTool(tool.id as ToolId)}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', tool.id);
                        e.dataTransfer.setData('source', 'grid-tool');
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      onMouseEnter={() => setHoveredToolId(tool.id)}
                      onMouseLeave={() => setHoveredToolId(null)}
                      className="border border-zinc-800 bg-[#111114] rounded-xl p-5 shadow-xl hover:border-emerald-500/30 cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between gap-6 relative group active:scale-98"
                      style={{ contentVisibility: 'auto' }}
                    >
                      {/* Interactive Subtle Tooltip system */}
                      <AnimatePresence>
                        {hoveredToolId === tool.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 w-72 bg-[#0e0e11] border border-zinc-700/50 rounded-xl p-3 shadow-2xl pointer-events-none text-left"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5 mb-2">
                              <span className="text-[9px] bg-emerald-950/40 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Pro-Tip & Shortcut
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                                <kbd className="px-1.5 py-0.5 bg-[#161619] border border-zinc-800 rounded text-emerald-400 font-bold">
                                  {TOOL_SHORTCUTS[tool.id]?.key}
                                </kbd>
                                <span className="text-zinc-650">or</span>
                                <kbd className="px-1.5 py-0.5 bg-[#161619] border border-zinc-800 rounded text-emerald-400 font-bold">
                                  {TOOL_SHORTCUTS[tool.id]?.label}
                                </kbd>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-350 leading-relaxed font-sans mb-1.5">
                              "{TOOL_SHORTCUTS[tool.id]?.tip}"
                            </p>
                            <div className="text-[8px] text-zinc-500 font-mono flex items-center justify-between">
                              <span>Hover card &bull; Press key to launch</span>
                              <span className="text-emerald-400">&bull; Sandbox Ready</span>
                            </div>
                            {/* Mini triangle arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-zinc-800 w-0 h-0" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Favorite/PushPin Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinTool(tool.id);
                        }}
                        className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                        title={pinnedToolIds.includes(tool.id) ? "Remove from favorite tools" : "Add to favorite tools"}
                      >
                        <Star className={`w-4 h-4 ${pinnedToolIds.includes(tool.id) ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                      </button>

                      {tool.badge && (
                        <span className="absolute top-4 right-12 bg-emerald-600 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase tracking-widest select-none">
                          {tool.badge}
                        </span>
                      )}

                      <div className="flex flex-col gap-4">
                        {/* Premium Glowing Glassmorphic Icon Container */}
                        <div className="w-fit">
                          {getPremiumIcon(tool.icon, tool.category)}
                        </div>

                        {/* Text details */}
                        <div>
                          <h3 className="font-sans font-semibold text-base text-white leading-tight group-hover:text-emerald-400 transition-colors">
                            {tool.title}
                          </h3>
                          <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80 text-[9px] font-bold uppercase tracking-widest text-emerald-400 group-hover:translate-x-1 transition-transform w-fit">
                        Launch Workspace &rarr;
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-[#111114]/10 max-w-md mx-auto w-full gap-4 mt-4">
                  <div className="p-3 rounded-full bg-zinc-900 border border-zinc-850 text-zinc-500">
                    <MagnifyingGlass className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-base text-white">No tools found</h3>
                    <p className="text-zinc-450 text-xs mt-1">We couldn't find any tools matching "{searchQuery}".</p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="py-2 px-4 bg-emerald-600 text-white font-bold text-xs rounded uppercase tracking-wider hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            /* Active Workspace Router */
            <motion.div
              key="workspace"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {activeTool === 'video-splitter' && (
                <VideoSplitter onBack={handleBack} initialFile={droppedFile || undefined} />
              )}
              {activeTool === 'image-converter' && (
                <ImageConverter onBack={handleBack} initialFile={droppedFile || undefined} />
              )}
              {activeTool === 'pdf-compiler' && (
                <PdfCompiler onBack={handleBack} initialFile={droppedFile || undefined} />
              )}
              {activeTool === 'social-downloader' && (
                <SocialDownloader onBack={handleBack} />
              )}
              {activeTool === 'audio-trimmer' && (
                <AudioTrimmer onBack={handleBack} initialFile={droppedFile || undefined} />
              )}
              {activeTool === 'audio-transcriber' && (
                <AudioTranscriber onBack={handleBack} initialFile={droppedFile || undefined} />
              )}
              {activeTool === 'qr-generator' && (
                <QrGenerator onBack={handleBack} />
              )}
              {activeTool === 'color-extractor' && (
                <ColorExtractor onBack={handleBack} initialFile={droppedFile || undefined} />
              )}
              {activeTool && ![
                'video-splitter', 'image-converter', 'pdf-compiler', 'social-downloader',
                'audio-trimmer', 'audio-transcriber', 'qr-generator', 'color-extractor'
              ].includes(activeTool) && (
                <GenericUtilityWorkspace 
                  tool={TOOLS_LIST.find(t => t.id === activeTool)!} 
                  onBack={handleBack} 
                  initialFile={droppedFile || undefined} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Aesthetic Footer */}
      <footer className="bg-[#0c0c0e] border-t border-zinc-800/80 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-widest text-gray-500 select-none font-medium">
          <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" /> PanUtility Workstation Framework &bull; Release 2026</span>
          <div className="flex gap-4">
            <span className="hover:text-white transition-colors">Offline Sandbox</span>
            <span>&bull;</span>
            <span className="hover:text-white transition-colors">Client GPU Rendered</span>
            <span>&bull;</span>
            <span className="hover:text-white transition-colors">W3C Compliance</span>
          </div>
        </div>
      </footer>

      {/* Global Drag-and-Drop Glassmorphic Overlay */}
      {isGlobalDragging && activeTool === null && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center select-none"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsGlobalDragging(false);
            dragCounter.current = 0;
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const file = e.dataTransfer.files[0];
              // Smart default routing on general drop
              if (file.type.startsWith('image/')) {
                handleRoute(file, 'image-converter');
              } else if (file.type.startsWith('audio/')) {
                handleRoute(file, 'audio-trimmer');
              } else if (file.type.startsWith('video/')) {
                handleRoute(file, 'video-splitter');
              } else {
                toast.error('Unsupported File Type', 'No suitable tools found for this file.');
              }
            }
          }}
        >
          {/* Floating icon */}
          <div className="p-5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 animate-bounce mb-4 pointer-events-none">
            <Upload className="w-10 h-10" />
          </div>
          
          <div className="pointer-events-none max-w-xl">
            <h2 className="font-sans font-bold text-3xl text-white">
              {draggedFileType === 'image' && "Image File Detected!"}
              {draggedFileType === 'audio' && "Audio File Detected!"}
              {draggedFileType === 'video' && "Video File Detected!"}
              {draggedFileType === 'other' && "File Detected!"}
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              {draggedFileType === 'image' && "Drop onto a specialized workspace below to open and process it, or drop anywhere to launch Image Converter."}
              {draggedFileType === 'audio' && "Drop onto a workspace below to open, or drop anywhere to launch Audio Trimmer."}
              {draggedFileType === 'video' && "Drop anywhere to open and segment your video clip in Video Splitting."}
              {draggedFileType === 'other' && "This format is not natively supported by our tools."}
            </p>
          </div>

          {/* Drag Targets */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 max-w-4xl w-full pointer-events-auto">
            {draggedFileType === 'image' && (
              <>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsGlobalDragging(false);
                    dragCounter.current = 0;
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleRoute(e.dataTransfer.files[0], 'image-converter');
                    }
                  }}
                  className="flex-1 min-w-[240px] max-w-[300px] bg-[#0f1115] border-2 border-dashed border-zinc-800 hover:border-emerald-500 hover:bg-[#111114] p-6 rounded-xl transition-all flex flex-col items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <FileImage className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-sans font-semibold text-base text-white group-hover:text-emerald-400 transition-colors">Image Converter</h3>
                      <p className="text-gray-500 text-xs mt-1">Convert formats, compress, and resize</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-2 border border-emerald-500/20 px-2.5 py-1 rounded bg-emerald-950/20">
                    Drop here to Convert
                  </div>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsGlobalDragging(false);
                    dragCounter.current = 0;
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleRoute(e.dataTransfer.files[0], 'pdf-compiler');
                    }
                  }}
                  className="flex-1 min-w-[240px] max-w-[300px] bg-[#0f1115] border-2 border-dashed border-zinc-800 hover:border-emerald-500 hover:bg-[#111114] p-6 rounded-xl transition-all flex flex-col items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-sans font-semibold text-base text-white group-hover:text-emerald-400 transition-colors">PDF Compiler</h3>
                      <p className="text-gray-500 text-xs mt-1">Compile screenshots/images to PDF</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-2 border border-emerald-500/20 px-2.5 py-1 rounded bg-emerald-950/20">
                    Drop here to Compile PDF
                  </div>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsGlobalDragging(false);
                    dragCounter.current = 0;
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleRoute(e.dataTransfer.files[0], 'color-extractor');
                    }
                  }}
                  className="flex-1 min-w-[240px] max-w-[300px] bg-[#0f1115] border-2 border-dashed border-zinc-800 hover:border-emerald-500 hover:bg-[#111114] p-6 rounded-xl transition-all flex flex-col items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Palette className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-sans font-semibold text-base text-white group-hover:text-emerald-400 transition-colors">Color Extractor</h3>
                      <p className="text-gray-500 text-xs mt-1">Extract dominant HEX color palettes</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-2 border border-emerald-500/20 px-2.5 py-1 rounded bg-emerald-950/20">
                    Drop here to Extract Colors
                  </div>
                </div>
              </>
            )}

            {draggedFileType === 'audio' && (
              <>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsGlobalDragging(false);
                    dragCounter.current = 0;
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleRoute(e.dataTransfer.files[0], 'audio-trimmer');
                    }
                  }}
                  className="flex-1 min-w-[240px] max-w-[320px] bg-[#0f1115] border-2 border-dashed border-zinc-800 hover:border-emerald-500 hover:bg-[#111114] p-6 rounded-xl transition-all flex flex-col items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <MusicNotes className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-sans font-semibold text-base text-white group-hover:text-emerald-400 transition-colors">Audio Waveform Trimmer</h3>
                      <p className="text-gray-500 text-xs mt-1">Visualize waveforms, trim and clip</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-2 border border-emerald-500/20 px-2.5 py-1 rounded bg-emerald-950/20">
                    Drop here to Trim Audio
                  </div>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsGlobalDragging(false);
                    dragCounter.current = 0;
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleRoute(e.dataTransfer.files[0], 'audio-transcriber');
                    }
                  }}
                  className="flex-1 min-w-[240px] max-w-[320px] bg-[#0f1115] border-2 border-dashed border-zinc-800 hover:border-emerald-500 hover:bg-[#111114] p-6 rounded-xl transition-all flex flex-col items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Sparkle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-sans font-semibold text-base text-white group-hover:text-emerald-400 transition-colors">AI Audio Transcriber</h3>
                      <p className="text-gray-500 text-xs mt-1">Transcribe speech & timestamps with AI</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-2 border border-emerald-500/20 px-2.5 py-1 rounded bg-emerald-950/20">
                    Drop here to Transcribe
                  </div>
                </div>
              </>
            )}

            {draggedFileType === 'video' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsGlobalDragging(false);
                  dragCounter.current = 0;
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleRoute(e.dataTransfer.files[0], 'video-splitter');
                  }
                }}
                className="min-w-[280px] max-w-[360px] bg-[#0f1115] border-2 border-dashed border-zinc-800 hover:border-emerald-500 hover:bg-[#111114] p-6 rounded-xl transition-all flex flex-col items-center justify-between gap-4 cursor-pointer group mx-auto"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Scissors className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-sans font-semibold text-base text-white group-hover:text-emerald-400 transition-colors">Video Splitting & Cutting</h3>
                    <p className="text-gray-500 text-xs mt-1">Trim, segment and cut video tracks</p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-2 border border-emerald-500/20 px-2.5 py-1 rounded bg-emerald-950/20">
                  Drop here to Trim Video
                </div>
              </div>
            )}

            {draggedFileType === 'other' && (
              <div className="min-w-[280px] max-w-[360px] bg-[#0f1115]/50 border-2 border-dashed border-red-950 p-6 rounded-xl flex flex-col items-center gap-4 mx-auto">
                <div className="p-3 rounded-lg bg-[#111114] border border-red-900/30 text-red-400">
                  <X className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-base text-white">Unsupported Format</h3>
                  <p className="text-gray-500 text-xs mt-1">Please drop an image, audio, or video file.</p>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-8 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
            Drop anywhere outside a target to launch default workspace &bull; Drag away to cancel
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <IconContext.Provider value={{ weight: "duotone" }}>
        <AppContent />
      </IconContext.Provider>
    </ToastProvider>
  );
}
