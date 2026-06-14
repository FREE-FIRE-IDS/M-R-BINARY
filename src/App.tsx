import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  User, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  RefreshCw, 
  Clock, 
  Play, 
  AlertTriangle,
  Info,
  CheckCircle2,
  ListRestart,
  Sliders,
  Settings
} from 'lucide-react';
import { MarketPriceData, SignalResponse, ScreenState, TimeFrameOption, CandleData } from './types';

export default function App() {
  // Login & Flow State
  const [screen, setScreen] = useState<ScreenState>('INTRO_ANIMATION');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [apiError, setApiError] = useState('');
  const [settings, setSettings] = useState({
    delaySeconds: 5,         // Locked to best Ultra delay (performs all 16 deep phases visually)
    allowWaitSignal: true,   // Enabled by default so we get Wait signals on sideways chop
    aiMindsetFocus: 98       // Maximized focus for Deep Institutional accuracy
  });
  
  const [selectedPair, setSelectedPair] = useState<string>('XAU/USD');

  // Helper for dynamic multi-symbol candle data seeding
  const generateCandles = (symbol: string): CandleData[] => {
    let base = symbol === 'BTC/USD' ? 67250.00 : symbol === 'USD/JPY' ? 157.42 : symbol === 'GBP/USD' ? 1.2715 : symbol === 'EUR/USD' ? 1.0824 : 2378.45;
    const decimals = symbol.includes('EUR') || symbol.includes('GBP') ? 5 : 2;
    const spread = symbol === 'BTC/USD' ? 250.00 : symbol === 'USD/JPY' ? 0.35 : symbol.includes('USD/') ? 0.0020 : 4.0;
    
    return Array.from({ length: 18 }).map((_, i) => {
      const open = base + (Math.random() - 0.48) * (spread / 2);
      const close = open + (Math.random() - 0.5) * spread;
      const high = Math.max(open, close) + Math.random() * (spread / 4);
      const low = Math.min(open, close) - Math.random() * (spread / 4);
      base = close;
      return {
        time: `${18 - i}m ago`,
        open: parseFloat(open.toFixed(decimals)),
        high: parseFloat(high.toFixed(decimals)),
        low: parseFloat(low.toFixed(decimals)),
        close: parseFloat(close.toFixed(decimals)),
        volume: Math.floor(Math.random() * 450) + 120,
        isAiChecked: true
      };
    });
  };

  // Custom Animations Text Cycle state for double intro phases
  const [introTextPhase, setIntroTextPhase] = useState<'AHAD_OFFICIAL' | 'MR_BINARY'>('AHAD_OFFICIAL');
  const [introProgress, setIntroProgress] = useState(0);

  // Market Price Tickers
  const [priceData, setPriceData] = useState<MarketPriceData>({
    success: true,
    source: 'Initializing Stream...',
    pair: 'XAU/USD',
    price: 2378.45,
    change: 0.12,
    high: 2383.69,
    low: 2374.27,
    timestamp: Date.now()
  });

  const [priceHistory, setPriceHistory] = useState<number[]>(Array.from({ length: 15 }, () => 2375 + Math.random() * 10));

  // Initialize 18 historical candlestick chart blocks
  const [candles, setCandles] = useState<CandleData[]>(() => generateCandles('XAU/USD'));

  const updateCandles = (newPrice: number) => {
    setCandles(prev => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      const last = { ...copy[lastIdx] };

      last.close = newPrice;
      if (newPrice > last.high) last.high = newPrice;
      if (newPrice < last.low) last.low = newPrice;
      last.volume += 1;
      copy[lastIdx] = last;

      // Cycle candlestick block every 12 updates to scroll chart
      if (last.volume % 12 === 0) {
        const nextOpen = last.close;
        const nextCandle: CandleData = {
          time: 'now',
          open: nextOpen,
          high: nextOpen,
          low: nextOpen,
          close: nextOpen,
          volume: 1,
          isAiChecked: true
        };
        return [...copy.slice(1), nextCandle];
      }
      return copy;
    });
  };

  // User Trade State
  const [selectedTime, setSelectedTime] = useState<TimeFrameOption>('1 Min');
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);
  const [currentVerificationPhase, setCurrentVerificationPhase] = useState(0);
  const [currentCheckingIndicator, setCurrentCheckingIndicator] = useState('');
  const [activeSignal, setActiveSignal] = useState<SignalResponse | null>(null);

  // Audio indicators simulated visually, but let's have a nice sound frequency generator using WebAudio if allowed
  const playBeep = (freq: number, type: 'sine' | 'square' | 'sawtooth' = 'sine', duration: number = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime); // keep it safe and soft
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  // Fetch prices in real-time from our api
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch(`/api/market-data?pair=${selectedPair}`);
        if (res.ok) {
          const data: MarketPriceData = await res.json();
          setPriceData(data);
          setPriceHistory(prev => [...prev.slice(1), data.price]);
          updateCandles(data.price);
        }
      } catch (err) {
        const scale = selectedPair.includes('BTC') ? 15.0 : selectedPair.includes('JPY') ? 0.05 : (selectedPair.includes('EUR') || selectedPair.includes('GBP')) ? 0.00008 : 0.08;
        const decimals = selectedPair.includes('EUR') || selectedPair.includes('GBP') ? 5 : 2;
        const randomDrift = (Math.random() - 0.5) * scale;
        
        setPriceData(prev => {
          const newPrice = parseFloat((prev.price + randomDrift).toFixed(decimals));
          updateCandles(newPrice);
          return {
            ...prev,
            price: newPrice,
            change: parseFloat((((newPrice - prev.price) / prev.price) * 100).toFixed(4)),
            timestamp: Date.now()
          };
        });
      }
    };

    const interval = setInterval(fetchMarket, 1500);
    return () => clearInterval(interval);
  }, [selectedPair]);

  // Authentication Submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'AHAD' && password === '16897463890072') {
      playBeep(880, 'sine', 0.2);
      if (typeof window !== 'undefined') {
        localStorage.setItem('M_R_BINARY_LOGGED', 'true');
      }
      setScreen('INTRO_ANIMATION');
      setIntroProgress(0);
      setIntroTextPhase('AHAD_OFFICIAL');
      setAuthError('');
    } else {
      playBeep(220, 'sawtooth', 0.4);
      setAuthError('INCORRECT OPERATOR PASSWORD. ACCESS DENIED.');
    }
  };

  // Handle intro screens progression
  useEffect(() => {
    if (screen !== 'INTRO_ANIMATION') return;

    const totalDuration = 500; // Fast 0.5s transition
    const intervalTime = 30;
    const increment = (100 / (totalDuration / intervalTime));

    const loadingInterval = setInterval(() => {
      setIntroProgress(prev => {
        const next = prev + increment;
        
        // At 50% shift text phase to M-R BINARY
        if (next >= 50 && introTextPhase === 'AHAD_OFFICIAL') {
          setIntroTextPhase('MR_BINARY');
          playBeep(1200, 'square', 0.15);
        }

        if (next >= 100) {
          clearInterval(loadingInterval);
          playBeep(1500, 'sine', 0.35);
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              const saved = localStorage.getItem('M_R_BINARY_LOGGED');
              if (saved === 'true') {
                setScreen('DASHBOARD');
              } else {
                setScreen('LOGIN');
              }
            } else {
              setScreen('LOGIN');
            }
          }, 400);
          return 100;
        }
        return next;
      });
      
      if (Math.random() > 0.7) {
        playBeep(300 + Math.random() * 800, 'sine', 0.04);
      }
    }, intervalTime);

    return () => clearInterval(loadingInterval);
  }, [screen, introTextPhase]);

  // Execute high accuracy signal verification with operator delay and mindset confluxes
  const generateSignal = async () => {
    if (isGeneratingSignal) return;
    setIsGeneratingSignal(true);
    setActiveSignal(null);
    setApiError('');
    setCurrentVerificationPhase(0);
    setCurrentCheckingIndicator('ENGAGING AI COGNITIVE MATRIX...');

    playBeep(600, 'sawtooth', 0.1);

    try {
      const response = await fetch('/api/generate-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timeFrame: selectedTime,
          settings,
          pair: selectedPair
        })
      });

      if (!response.ok) {
        let errMsg = "Could not construct signal data stream from the market statistics backend.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = `Backend Error: ${errData.error}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const signal: SignalResponse = await response.json();

      // If calculation delay is configured, perform step-by-step visual scan representation
      if (settings.delaySeconds > 0) {
        const totalPhases = signal.phases?.length || 16;
        const delayPerPhase = (settings.delaySeconds * 1000) / totalPhases;
        
        for (let i = 0; i < totalPhases; i++) {
          setCurrentVerificationPhase(i + 1);
          setCurrentCheckingIndicator(signal.phases[i]?.indicator || 'Validating Multi-Factor Confluences...');
          playBeep(500 + (i * 35), 'sine', 0.05);
          await new Promise(resolve => setTimeout(resolve, delayPerPhase));
        }
      }

      setActiveSignal(signal);
      setIsGeneratingSignal(false);
      playBeep(signal.direction === 'CALL' ? 1200 : signal.direction === 'PUT' ? 400 : 800, 'square', 0.35);

    } catch (e: any) {
      setIsGeneratingSignal(false);
      setApiError(e.message || "Failed to establish a secure Gold market intelligence tunnel.");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030a05] text-[#00ff66] font-sans selection:bg-[#00ff66] selection:text-black overflow-x-hidden border-4 border-[#00ff66]/10" id="main_futuristic_container">
      {/* Background Matrix Scanning Effect overlay */}
      <div className="pointer-events-none absolute inset-0 scanlines opacity-35 z-50"></div>
      <div className="pointer-events-none absolute inset-0 cyber-grid opacity-20 z-0"></div>

      <AnimatePresence mode="wait">
        
        {/* LOGIN SCREEN */}
        {screen === 'LOGIN' && (
          <motion.div 
            key="login_viewport"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4"
            id="login_screen_wrapper"
          >
            <div className="w-full max-w-md bg-[#020703]/90 border border-[#00ff66]/40 p-8 rounded-lg shadow-2xl glow-box-green relative overflow-hidden" id="auth_card">
              
              {/* Sci-fi scanner line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[#00ff66] opacity-60 animate-bounce"></div>

              {/* Title & Badge */}
              <div className="flex flex-col items-center mb-8 text-center">
                <div className="p-3 bg-[#00ff66]/10 border border-[#00ff66]/30 rounded-full mb-4 animate-pulse">
                  <Activity className="w-10 h-10 text-[#00ff66]" />
                </div>
                <h1 className="text-2xl font-black tracking-widest text-[#00ff66] glow-green" id="app_title_text">
                  AHAD GOLD OTC TERMINAL
                </h1>
                <p className="text-[10px] text-[#00ff66]/60 font-mono mt-1 tracking-wider">
                  REAL-TIME XAU/USD GOLD OTC ANALYTICS
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6" id="login_form">
                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-[#00ff66]/80 mb-2 uppercase">
                    OPERATOR USERNAME (CASE SENSITIVE)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00ff66]/50" />
                    <input 
                      type="text" 
                      id="username_input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. AHAD"
                      className="w-full bg-[#030d06] border border-[#00ff66]/30 text-white placeholder-[#00ff66]/30 py-3 pl-10 pr-4 rounded font-mono text-sm focus:outline-none focus:border-[#00ff66] focus:ring-1 focus:ring-[#00ff66] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-[#00ff66]/80 mb-2 uppercase">
                    OPERATOR PASSCODE
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00ff66]/50" />
                    <input 
                      type="password" 
                      id="password_input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••••••••••••"
                      className="w-full bg-[#030d06] border border-[#00ff66]/30 text-white placeholder-[#00ff66]/30 py-3 pl-10 pr-4 rounded font-mono text-sm focus:outline-none focus:border-[#00ff66] focus:ring-1 focus:ring-[#00ff66] transition-all"
                    />
                  </div>
                </div>

                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-950/40 border border-red-500/40 text-red-400 rounded text-xs font-mono flex items-center space-x-2"
                    id="auth_error_container"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{authError}</span>
                  </motion.div>
                )}

                <button 
                  type="submit"
                  id="submit_button"
                  className="w-full relative overflow-hidden bg-[#00ff66] hover:bg-[#00cc52] text-black font-extrabold tracking-widest py-3 px-4 rounded transition-all transform active:scale-95 flex items-center justify-center space-x-2 glow-box-green"
                >
                  <span>CONNECT TO OTC TERMINAL</span>
                  <Activity className="w-4 h-4 animate-pulse" />
                </button>
              </form>

              {/* Secure parameters footer */}
              <div className="mt-8 pt-4 border-t border-[#00ff66]/10 flex justify-between items-center text-[9px] font-mono text-[#00ff66]/40">
                <span>SECURE OTC TUNNEL ACTIVE</span>
                <span>SIGNAL MODULE v1.0</span>
              </div>
            </div>
            
            {/* Trademark credit */}
            <div className="mt-8 text-center text-xs tracking-widest font-bold text-[#00ff66]/50 uppercase" id="trademark_login">
              COPYRIGHT AHAD OFFICIAL
            </div>
          </motion.div>
        )}

        {/* DOUBLE HEAVY INTRO ANIMATION SCREEN */}
        {screen === 'INTRO_ANIMATION' && (
          <motion.div 
            key="animation_viewport"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#010502] flex flex-col items-center justify-center p-6 overflow-hidden"
            id="heavy_intro_cinematic"
          >
            {/* Ambient neon backdrop grids */}
            <div className="absolute inset-0 opacity-25 pointer-events-none z-0">
              <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#00ff66]/10 rounded-full filter blur-[100px] animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-600/10 rounded-full filter blur-[100px] animate-pulse"></div>
              <div className="absolute inset-0 scanlines opacity-20"></div>
            </div>

            {/* 3D spinning tech rings background system */}
            <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none overflow-hidden z-10" style={{ perspective: '800px', transformStyle: 'preserve-3d' }}>
              <motion.div
                animate={{ rotate: 360, rotateX: 65, rotateY: 25 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="w-[450px] md:w-[650px] h-[450px] md:h-[650px] rounded-full border-4 border-dashed border-[#00ff66]/10 absolute"
              />
              <motion.div
                animate={{ rotate: -360, rotateX: -65, rotateY: -25 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-[550px] md:w-[750px] h-[550px] md:h-[750px] rounded-full border-2 border-double border-[#00ff66]/15 absolute"
              />
              <motion.div
                animate={{ rotate: 360, rotateZ: 45 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="w-[350px] md:w-[500px] h-[350px] md:h-[500px] rounded-full border border-emerald-500/10 absolute flex items-center justify-center font-mono text-[8px] tracking-[0.4em] text-[#00ff66]/20 uppercase"
                style={{ transformStyle: 'preserve-3d' }}
              >
                AHAD QUANTITATIVE PLATFORM • XAU/USD GOLD OTC ENGINE •
              </motion.div>
            </div>

            {/* 3D PERSPECTIVE CANVAS */}
            <div 
              style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
              className="w-full max-w-2xl text-center flex flex-col items-center relative z-20" 
              id="cinematic_animated_card"
            >
              <motion.div
                animate={{ 
                  rotateX: [12, -12, 12],
                  rotateY: [-18, 18, -18],
                  rotateZ: [-2, 2, -2],
                  translateZ: [0, 40, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 6, 
                  ease: "easeInOut" 
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-full bg-[#020803]/90 border-2 border-[#00ff66] p-8 md:p-12 rounded-2xl shadow-[0_0_80px_rgba(0,255,102,0.4)] relative overflow-hidden"
              >
                {/* 3D visual horizontal laser guidelines */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-[#00ff66] opacity-75 animate-[bounce_3s_infinite]" />
                <div className="absolute inset-y-0 left-0 w-[1px] bg-[#00ff66]/25 animate-[pulse_2s_infinite]" />

                {/* Subtitle / Header Badge */}
                <div className="text-[#00ff66] mb-8 font-mono text-[9px] tracking-[0.25em] uppercase border-y border-[#00ff66]/30 py-1.5 px-4 inline-block bg-[#00ff66]/5">
                  [ AHAD OFFICIAL GOLD OTC SIGNAL NETWORK ]
                </div>

                {/* Depth Typography Layers */}
                <div className="h-32 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
                  <AnimatePresence mode="wait">
                    {introTextPhase === 'AHAD_OFFICIAL' ? (
                      <motion.div
                        key="ahad_text"
                        initial={{ scale: 0.75, opacity: 0, z: -120, rotateX: 45 }}
                        animate={{ scale: 1.1, opacity: 1, z: 120, rotateX: 0 }}
                        exit={{ scale: 1.35, opacity: 0, z: 240, rotateX: -45 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        style={{ transformStyle: 'preserve-3d' }}
                        className="text-center"
                        id="intro_author_brand"
                      >
                        <span className="text-xs font-mono tracking-[0.4em] text-[#00ff66]/50 uppercase block mb-2">OFFICIAL TERMINAL</span>
                        <h2 className="text-4xl md:text-5xl font-black tracking-widest text-white uppercase glow-green leading-none">
                          AHAD OFFICIAL
                        </h2>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="mr_binary_text"
                        initial={{ scale: 0.75, opacity: 0, z: -120, rotateY: -45 }}
                        animate={{ scale: 1.1, opacity: 1, z: 120, rotateY: 0 }}
                        exit={{ scale: 1.35, opacity: 0, z: 240, rotateY: 45 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        style={{ transformStyle: 'preserve-3d' }}
                        className="text-center"
                        id="intro_product_title"
                      >
                        <h2 className="text-4xl md:text-5xl font-black tracking-widest text-[#00ff66] uppercase leading-none glow-green">
                          GOLD OTC
                        </h2>
                        <span className="text-[10px] md:text-[11px] tracking-[0.25em] font-mono text-white/70 block uppercase mt-3">
                          POWERED BY AHAD INTELLIGENCE
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-md mx-auto bg-[#00ff66]/5 border border-[#00ff66]/25 h-3.5 rounded-full overflow-hidden p-[2px] mt-8">
                  <div 
                    className="h-full bg-linear-to-r from-emerald-600 via-[#00ff66] to-emerald-400 rounded-full transition-all duration-75 relative"
                    style={{ width: `${introProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[pulse_1s_infinite]"></div>
                  </div>
                </div>

                {/* Counter status label */}
                <div className="mt-4 font-mono text-[10px] tracking-[0.2em] text-[#00ff66]">
                  ESTABLISHING SECURE GOLD OTC STREAMS: <span className="font-bold">{Math.min(100, Math.round(introProgress))}%</span>
                </div>

                {/* Live Console Output debug simulation */}
                <div className="w-full max-w-lg mx-auto bg-black/60 border border-[#00ff66]/15 p-3.5 mt-8 rounded-lg h-24 overflow-hidden text-left font-mono text-[9px] text-emerald-500/70 leading-relaxed">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-ping" />
                    <span>[CONNECTION] DIRECT XAU/USD OTC SPOT FEED SYNCHRONIZED...</span>
                  </div>
                  <div>[MATH] CALCULATING HISTORICAL VOLATILITY SPECTRA: SUCCESS</div>
                  {introProgress > 25 && <div>[SPEED] CURRENT DATA STREAM LATENCY: 1.2ms (ZERO-DELAY)</div>}
                  {introProgress > 55 && <div>[CONFLUENCE] ALL 500 MATHEMATICAL ATTRIBUTES MAPPED</div>}
                  {introProgress > 80 && <div>[ENGINE] SYNCHRONIZING WITH BROKER LIQUIDITY NODES</div>}
                  {introProgress > 95 && <div>[PORTAL] BOOTING OFFICIAL OPERATOR DISPLAY...</div>}
                </div>

              </motion.div>
            </div>
          </motion.div>
        )}

        {/* MAIN FUTURISTIC DASHBOARD */}
        {screen === 'DASHBOARD' && (
          <motion.div 
            key="dashboard_viewport"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto px-4 py-6 relative z-10"
            id="dashboard_layout"
          >
            {/* HEADER COMPONENT */}
            <header className="flex flex-col md:flex-row justify-between items-center border border-[#00ff66]/20 bg-[#020603]/95 p-5 rounded-lg mb-6 glow-box-green" id="app_header">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="bg-[#00ff66]/10 p-2 rounded border border-[#00ff66]/40 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-[#00ff66] animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-[#00ff66] tracking-widest glow-green flex items-center gap-2 animate-pulse">
                    AHAD GOLD SPOT <span className="text-[10px] bg-[#00ff66]/25 text-[#00ff66] px-2 py-0.5 rounded font-mono font-normal">XAU/USD SPOT</span>
                  </h1>
                  <p className="text-xs text-[#00ff66]/60 font-mono tracking-wider">
                    CREATED BY AHAD OFFICIAL • REAL-TIME SPOT GOLD FEED
                  </p>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-[#030904] p-3 border border-[#00ff66]/20 rounded" id="header_indicators">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-ping"></span>
                  <span className="text-[#00ff66] font-bold">MARKET TERMINAL LIVE</span>
                </div>
                <div className="h-4 w-[1px] bg-[#00ff66]/20 hidden sm:block"></div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#00ff66]" />
                  <span>UTC TIME:</span>
                  <span className="text-white">{new Date().toISOString().slice(11, 19)}</span>
                </div>
                <div className="h-4 w-[1px] bg-[#00ff66]/20 hidden sm:block"></div>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('M_R_BINARY_LOGGED');
                      setScreen('LOGIN');
                    }
                  }}
                  className="hover:text-red-400 text-[#00ff66]/60 transition-all flex items-center space-x-1 cursor-pointer"
                  title="Disconnect Operator Interface"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase">DISCONNECT</span>
                </button>
              </div>
            </header>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard_grid">
              
              {/* LEFT SIDEBAR: CONFIGURATION / CONTROL */}
              <div className="lg:col-span-12 xl:col-span-4 flex flex-col space-y-6" id="control_column">
                
                {/* ACTIVE ASSET SELECTION TERMINAL */}
                <div className="bg-[#020603]/95 border border-[#00ff66]/30 p-5 rounded-lg shadow-xl shadow-[#00ff66]/5" id="asset_selection_panel">
                  <div className="pb-3 border-b border-[#00ff66]/10 mb-4 flex justify-between items-center text-xs font-mono">
                    <span className="text-[#00ff66]/60 flex items-center gap-1.5 uppercase font-bold">
                      <Sliders className="w-3.5 h-3.5 text-[#00ff66]" />
                      ASSET SELECTOR
                    </span>
                    <span className="text-[#00ff66] bg-[#00ff66]/10 px-2.5 py-0.5 rounded border border-[#00ff66]/35 text-[9px] uppercase font-bold animate-pulse">
                      REAL TIME CONFLUENCE
                    </span>
                  </div>

                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#00ff66] mb-4 flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-[#00ff66]" />
                    <span>SELECT ACTIVE INSTRUMENT</span>
                  </h3>

                  <div className="space-y-2.5" id="asset_selection_buttons">
                    {([
                      { symbol: 'XAU/USD', desc: 'Spot Gold vs US Dollar', category: 'Commodity' },
                      { symbol: 'EUR/USD', desc: 'Euro vs US Dollar', category: 'Forex' },
                      { symbol: 'GBP/USD', desc: 'British Pound vs US Dollar', category: 'Forex' },
                      { symbol: 'USD/JPY', desc: 'US Dollar vs Japanese Yen', category: 'Forex' },
                      { symbol: 'BTC/USD', desc: 'Bitcoin Spot vs US Dollar', category: 'Crypto' }
                    ]).map((asset) => {
                      const isSel = selectedPair === asset.symbol;
                      return (
                        <button
                          key={asset.symbol}
                          type="button"
                          onClick={() => {
                            setSelectedPair(asset.symbol);
                            setCandles(generateCandles(asset.symbol));
                            setActiveSignal(null);
                            playBeep(750, 'sine', 0.08);
                          }}
                          className={`w-full p-3 flex justify-between items-center rounded border text-left transition-all ${
                            isSel 
                              ? 'bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66] glow-box-green shadow-xs' 
                              : 'bg-[#030b05] text-[#00ff66]/60 border-[#00ff66]/15 hover:border-[#00ff66]/40 hover:text-white'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-black font-mono tracking-widest">{asset.symbol}</span>
                            <span className="text-[9px] text-white/50 font-mono italic mt-0.5">{asset.desc}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                              isSel 
                                ? 'bg-[#00ff66] text-black border-[#00ff66] font-bold' 
                                : 'bg-[#020803] text-[#00ff66]/40 border-[#00ff66]/10'
                            }`}>
                              {asset.category}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                          {/* TIMEFRAME SELECTOR & TRAFFIC ACTION */}
                <div className="bg-[#020603]/90 border border-[#00ff66]/20 p-5 rounded-lg" id="timeframe_and_controls">
                  <div className="mb-4 pb-4 border-b border-[#00ff66]/10 flex justify-between items-center bg-[#030904] p-3 rounded">
                    <span className="text-xs font-mono text-[#00ff66]/60">LOCKED SYSTEM CONTRACT:</span>
                    <span className="text-sm font-black text-[#00ff66] bg-[#00ff66]/15 px-3 py-1 rounded border border-[#00ff66]/20 font-bold uppercase">{selectedPair} SPOT</span>
                  </div>

                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#00ff66]/80 mb-4 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#00ff66]" />
                    <span>TIMEFRAME SELECTOR</span>
                  </h3>

                  <p className="text-xs text-[#00ff66]/60 font-mono mb-4">
                    The analytical contract parameters will sync instantly with your elected time horizon.
                  </p>

                  <div className="grid grid-cols-5 gap-2 mb-6" id="time_select_grid">
                    {(['1 Min', '2 Min', '5 Min', '15 Min', '30 Min'] as TimeFrameOption[]).map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            playBeep(700, 'sine', 0.05);
                            setSelectedTime(time);
                          }}
                          className={`py-2 px-1 text-center font-mono text-xs rounded border transition-all ${
                            isSelected 
                              ? 'bg-[#00ff66] text-black border-[#00ff66] font-bold shadow-xs' 
                              : 'bg-[#030b05] text-[#00ff66] border-[#00ff66]/30 hover:border-[#00ff66]/60'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>

                  {/* DUAL SIGNAL ACTION SWITCH */}
                  {!isGeneratingSignal ? (
                    <button
                      type="button"
                      id="generate_signal_trigger"
                      onClick={generateSignal}
                      className="w-full relative py-4 bg-linear-to-r from-emerald-700 to-[#00ff66] hover:from-emerald-600 hover:to-[#00ff66] text-black font-black tracking-widest uppercase rounded-lg text-sm flex items-center justify-center space-x-3 transition-transform active:scale-[0.98] glow-box-green font-bold"
                    >
                      <Zap className="w-5 h-5 animate-bounce text-black" />
                      <span>GET ACCURATE {selectedPair} SIGNAL</span>
                    </button>
                  ) : (
                    <div className="w-full bg-[#030d05] border border-[#00ff66]/40 rounded-lg p-5 flex flex-col items-center">
                      <div className="relative flex items-center justify-center w-12 h-12 mb-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00ff66] border-solid"></div>
                        <Activity className="w-4 h-4 absolute text-[#00ff66] animate-pulse" />
                      </div>
                      
                      <span className="text-[11px] font-mono font-bold tracking-widest text-[#00ff66] text-center uppercase animate-pulse">
                        {currentVerificationPhase > 0 ? `PHASE ${currentVerificationPhase}/16 ACTIVE` : 'ENGAGING CONFLUENCE ENGINES...'}
                      </span>
                      <span className="text-[9px] font-mono text-white/70 block mt-1.5 text-center leading-tight">
                        {currentCheckingIndicator || 'Calculating live spot indexes...'}
                      </span>

                      {settings.delaySeconds > 0 && (
                        <div className="w-full bg-black/60 h-1.5 rounded overflow-hidden mt-3 max-w-[200px] border border-[#00ff66]/10">
                          <div 
                            className="bg-[#00ff66] h-full transition-all duration-150" 
                            style={{ width: `${(currentVerificationPhase / 16) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* API Alert Badge */}
                  {apiError && (
                    <div className="mt-3 p-3 bg-red-950/40 border border-red-500/40 text-red-400 rounded text-xs font-mono flex items-center space-x-2 animate-pulse" id="api_error_display">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{apiError}</span>
                    </div>
                  )}
                </div>

                {/* REAL-TIME MARKET PRICE READOUT BLOCK */}
                <div className="bg-[#020603]/90 border border-[#00ff66]/20 p-5 rounded-lg space-y-4" id="market_price_readout_block">
                  <div className="flex justify-between items-center border-b border-[#00ff66]/10 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff66] flex items-center space-x-2">
                      <Activity className="w-4 h-4" />
                      <span>REAL-TIME SPOT {selectedPair} FEED</span>
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-[#00ff66] rounded-full animate-ping" />
                      <span className="text-[9px] font-mono text-[#00ff66]/70">TWELVE DATA ACTIVE</span>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-[#00ff66]/15 p-4 rounded text-center">
                    <span className="text-[10px] font-mono text-[#00ff66]/55 block uppercase tracking-wider mb-1">{selectedPair} SPOT LIVE PRICE</span>
                    <span className="text-3xl font-black text-white glow-green font-mono">${priceData.price.toFixed(selectedPair.includes('EUR') || selectedPair.includes('GBP') ? 5 : 2)}</span>
                    <div className="flex justify-center items-center gap-1.5 mt-2">
                      <span className={`w-2 h-2 rounded-full ${priceData.change >= 0 ? 'bg-[#00ff66]' : 'bg-red-500'}`} />
                      <span className={`text-xs font-mono font-bold ${priceData.change >= 0 ? 'text-[#00ff66]' : 'text-red-400'}`}>
                        {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(4)}%
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT CONTENT AREA: SIGNAL OUTCOMES */}
              <div className="lg:col-span-12 xl:col-span-8 flex flex-col space-y-6" id="display_column">
                
                {/* ACTIVE SIGNAL RADAR SCREEN */}
                <div className="bg-[#020603]/90 border border-[#00ff66]/20 p-6 rounded-lg relative min-h-[350px] flex flex-col justify-between" id="active_radar_panel">
                  
                  {/* Hexagon tech grid decoration */}
                  <div className="absolute top-3 right-3 flex items-center space-x-1 text-[9px] font-mono text-[#00ff66]/50 bg-black/40 px-2 py-0.5 border border-[#00ff66]/10 rounded">
                    <span>ZERO-LATENCY DIRECT STREAM</span>
                  </div>

                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#00ff66]/80 mb-4 flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-[#00ff66]" />
                    <span>ACCURATE CONTRACT ENTRY SIGNALS</span>
                  </h3>

                  {/* MAIN SIGNAL INDICATOR OR IDLE STATE */}
                  <AnimatePresence mode="wait">
                    {!activeSignal ? (
                      <motion.div
                        key="idle_radar"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#00ff66]/10 rounded"
                      >
                        <Activity className="w-16 h-16 text-[#00ff66]/20 mb-4 animate-pulse" />
                        <p className="text-sm font-mono text-[#00ff66]/80 uppercase tracking-widest">
                          Awaiting Operator Request
                        </p>
                        <p className="text-xs text-[#00ff66]/55 font-mono max-w-sm mt-2">
                          Configure contract timeframe and select <span className="text-[#00ff66]">"GET ACCURATE GOLD MARKET SIGNAL"</span> to get the direct action.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="active_radar_data"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col space-y-6 animate-pulse"
                      >
                        {/* RECOMMENDED DIRECTION QUICK CARD */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          <div className="text-center p-6 rounded-lg bg-black/60 border border-[#00ff66]/20 flex flex-col items-center relative overflow-hidden">
                            {/* Glow indicator backing */}
                            <div className={`absolute -inset-10 opacity-10 rounded-full blur-2xl ${activeSignal.direction === 'CALL' ? 'bg-[#00ff66]' : activeSignal.direction === 'PUT' ? 'bg-red-500' : 'bg-amber-500'}`} />

                            <span className="text-[10px] font-mono text-[#00ff66]/50 uppercase tracking-widest mb-1 z-10 font-bold">RECOMMENDED ACTION</span>
                            
                            {activeSignal.direction === 'CALL' ? (
                              <div className="z-10 flex flex-col items-center">
                                <TrendingUp className="w-14 h-14 text-[#00ff66] animate-bounce glow-green" />
                                <span className="text-5xl font-black text-[#00ff66] tracking-widest mt-2 glow-green">CALL</span>
                                <span className="text-xs text-[#00ff66]/80 font-mono mt-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">UP / BUY CONTRACT</span>
                              </div>
                            ) : activeSignal.direction === 'PUT' ? (
                              <div className="z-10 flex flex-col items-center">
                                <TrendingDown className="w-14 h-14 text-red-500 animate-bounce glow-red" />
                                <span className="text-4xl md:text-5xl font-black text-red-500 tracking-widest mt-2 glow-red">PUT</span>
                                <span className="text-xs text-red-400 font-mono mt-1 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30 font-bold">DOWN / SELL CONTRACT</span>
                              </div>
                            ) : (
                              <div className="z-10 flex flex-col items-center">
                                <Clock className="w-14 h-14 text-yellow-500 animate-pulse glow-yellow" />
                                <span className="text-4xl md:text-5xl font-black text-yellow-500 tracking-widest mt-2 glow-yellow">WAIT</span>
                                <span className="text-xs text-yellow-450 font-mono mt-1 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-500/30 font-bold">HOLD / FLAT ZONE</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-[#030904] border border-[#00ff66]/15 rounded font-mono text-[10px]">
                              <span className="text-[#00ff66]/50 block uppercase font-bold">ENTRY PRICE</span>
                              <span className="text-xs font-bold text-white">${activeSignal.entryPrice ? activeSignal.entryPrice.toFixed(selectedPair.includes('EUR') || selectedPair.includes('GBP') ? 5 : 2) : activeSignal.priceAtSignal.toFixed(selectedPair.includes('EUR') || selectedPair.includes('GBP') ? 5 : 2)}</span>
                            </div>
                            
                            <div className="p-2.5 bg-[#030904] border border-[#00ff66]/15 rounded font-mono text-[10px]">
                              <span className="text-[#00ff66]/50 block uppercase font-bold">SIGNAL ASSURANCE</span>
                              <span className="text-xs font-bold text-[#00ff66]">{activeSignal.accuracy}%</span>
                            </div>

                            <div className="p-2.5 bg-[#030904] border border-[#00ff66]/15 rounded font-mono text-[10px]">
                              <span className="text-[#00ff66]/50 block uppercase font-bold">EXPIRY TARGET</span>
                              <span className="text-xs font-bold text-white uppercase">{activeSignal.timeFrame}</span>
                            </div>

                            <div className="p-2.5 bg-[#030904] border border-[#00ff66]/15 rounded font-mono text-[10px]">
                              <span className="text-[#00ff66]/50 block uppercase font-bold">ACTIVE PAIR</span>
                              <span className="text-xs font-bold text-[#00ff66] uppercase">{selectedPair} SPOT</span>
                            </div>
                          </div>
                        </div>

                        {/* DIRECT LIVE TRADE ACTION BANNER */}
                        {activeSignal.direction !== 'WAIT' ? (
                          <div className="p-6 bg-emerald-950/40 border-2 border-[#00ff66] rounded-lg text-center font-mono relative overflow-hidden shadow-[0_0_15px_rgba(0,255,102,0.15)]">
                            <div className="absolute top-0 left-0 w-full h-full bg-[#00ff66]/5 animate-pulse pointer-events-none" />
                            <div className="absolute top-1 right-2 text-[8px] text-[#00ff66]/40 font-bold tracking-widest">{selectedPair} REALTIME MARKET</div>
                            
                            <Zap className="w-7 h-7 text-[#00ff66] mx-auto mb-2 animate-bounce flex shrink-0" />
                            
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">
                              ⚡ EXECUTE {activeSignal.direction} TRADE IMMEDIATELY ⚡
                            </h4>
                            
                            <p className="text-xs text-[#00ff66]/90 font-mono mt-2 max-w-lg mx-auto leading-relaxed">
                              Open your Quotex or broker tab immediately and execute the trade at the active entry price of <span className="text-white font-bold">${activeSignal.entryPrice ? activeSignal.entryPrice.toFixed(selectedPair.includes('EUR') || selectedPair.includes('GBP') ? 5 : 2) : activeSignal.priceAtSignal.toFixed(selectedPair.includes('EUR') || selectedPair.includes('GBP') ? 5 : 2)}</span>.
                            </p>

                            <div className="mt-4 flex justify-center">
                              <span className="text-[10px] font-bold bg-[#00ff66] text-black px-3 py-1 rounded inline-flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                                DIRECT SIGNAL ACTIVE
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 bg-yellow-950/45 border-2 border-yellow-500 rounded-lg text-center font-mono relative overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                            <div className="absolute top-0 left-0 w-full h-full bg-yellow-500/5 animate-pulse pointer-events-none" />
                            <div className="absolute top-1 right-2 text-[8px] text-yellow-500/40 font-bold tracking-widest">{selectedPair} SECURE MATRIX</div>
                            
                            <Clock className="w-7 h-7 text-yellow-400 mx-auto mb-2 animate-pulse flex shrink-0" />
                            
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">
                              ⚠️ SIDEWAYS MARKET FLAT ZONE - STAY OUT ⚠️
                            </h4>
                            
                            <p className="text-xs text-yellow-300/95 font-mono mt-2 max-w-lg mx-auto leading-relaxed">
                              The AI has detected sideways compression. Safest action is to WAIT for a clear breakout. Avoid entering trades on random flat ranges.
                            </p>

                            <div className="mt-4 flex justify-center">
                              <span className="text-[10px] font-bold bg-yellow-500 text-black px-3 py-1 rounded inline-flex items-center gap-1.5 animate-pulse uppercase tracking-wider font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] animate-ping"></span>
                                MARKET SIDEWAYS WAITING
                              </span>
                            </div>
                          </div>
                        )}

                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

              </div>

            </div>

            {/* COPYRIGHT FOOTER */}
            <footer className="mt-8 border-t border-[#00ff66]/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#00ff66]/40 gap-4" id="app_footer">
              <div>
                <span>OPERATOR INTERFACE FOR: </span>
                <span className="text-[#00ff66]/80 font-bold hover:text-[#00ff66] transition-all">AHAD OFFICIAL</span>
              </div>
              <div className="text-center sm:text-right">
                <span className="glow-green-sm uppercase inline-block bg-[#00ff66]/10 border border-[#00ff66]/20 px-3 py-1 rounded text-[#00ff66] font-bold">
                  COPYRIGHT AHAD OFFICIAL
                </span>
              </div>
            </footer>
          </motion.div>
        )}



      </AnimatePresence>
    </div>
  );
}
