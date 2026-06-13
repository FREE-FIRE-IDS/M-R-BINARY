export interface MarketPriceData {
  success: boolean;
  source: string;
  pair: string;
  price: number;
  change: number;
  high: number;
  low: number;
  timestamp: number;
}

export interface PhaseCheck {
  phase: number;
  indicator: string;
  accuracy: number;
  status: string;
  passed: boolean;
}

export interface SignalResponse {
  success: boolean;
  pair: string;
  direction: 'CALL' | 'PUT';
  timeFrame: string;
  priceAtSignal: number;
  accuracy: number;
  executeTime?: string;
  aiReasoning?: string;
  phases: PhaseCheck[];
  timestamp: number;
  
  // 500-Factor institutional report attributes
  signalDecision: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  confidence: number;
  scantimeframe: string;
  entryPrice: number;
  stopLossPrice: number;
  tp1Price: number;
  tp2Price: number;
  tp3Price: number;
  rrRatio: string;
  top5Drivers: string[];
  riskWarning: string;
  invalidation: string;
}

export type ScreenState = 'LOGIN' | 'INTRO_ANIMATION' | 'DASHBOARD';
export type TimeFrameOption = '1 Min' | '2 Min' | '5 Min' | '15 Min' | '30 Min';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isAiChecked?: boolean;
}
