import React from 'react';
import { CandleData } from '../types';

interface AIChartProps {
  candles: CandleData[];
  currentPrice: number;
  isScanning: boolean;
  scanProgress: number; // 0 to 100
  direction: 'CALL' | 'PUT' | 'WAIT' | null;
  pair?: string;
}

export const AIChart: React.FC<AIChartProps> = ({
  candles,
  currentPrice,
  isScanning,
  scanProgress,
  direction,
  pair = 'XAU/USD'
}) => {
  if (candles.length === 0) return null;

  const decimals = pair.includes('EUR') || pair.includes('GBP') ? 5 : 2;

  // Calculate scaling factors dynamically
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const maxPrice = Math.max(...highs, currentPrice) + (pair === 'BTC/USD' ? 50 : pair === 'USD/JPY' ? 0.15 : pair.includes('USD/') ? 0.001 : 0.45);
  const minPrice = Math.min(...lows, currentPrice) - (pair === 'BTC/USD' ? 50 : pair === 'USD/JPY' ? 0.15 : pair.includes('USD/') ? 0.001 : 0.45);
  const priceRange = maxPrice - minPrice || 1.0;

  // SVG grid dimensions
  const height = 180;
  const width = 450;
  const paddingX = 45;
  const paddingY = 15;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Map price to SVG Y coordinate
  const getY = (price: number) => {
    const scale = (price - minPrice) / priceRange;
    return height - paddingY - scale * chartHeight;
  };

  // Map index to SVG X coordinate
  const getX = (index: number) => {
    return paddingX + (index / (candles.length - 1)) * chartWidth;
  };

  return (
    <div className="bg-[#020603]/95 border border-[#00ff66]/20 p-4 rounded-lg relative overflow-hidden flex flex-col justify-between" id="ai_candlestick_chart">
      {/* Chart HUD header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00ff66]/30 border border-[#00ff66] flex items-center justify-center animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff66]"></div>
          </div>
          <span className="text-xs font-mono font-black text-white uppercase tracking-widest">
            AI POWERBASED CANDLESTICK CHART
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <span className="text-white/60">FEED: <span className="text-emerald-400">{pair} SPOT</span></span>
          <span className="text-white/30">|</span>
          <span className="text-white/60">TICK: <span className="text-[#00ff66]">LIVE</span></span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          
          {/* Horizontal Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const price = maxPrice - (i / 3) * priceRange;
            const y = getY(price);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#00ff66"
                  strokeOpacity="0.06"
                  strokeWidth="1"
                  strokeDasharray="2,3"
                />
                {/* Horizontal price labels on axis */}
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  fill="#00ff66"
                  fillOpacity="0.5"
                  fontSize="7"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  ${price.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {/* Render individual candlesticks */}
          {candles.map((candle, idx) => {
            const isBullish = candle.close >= candle.open;
            const candleX = getX(idx);
            
            // Scaled coordinates
            const wickY1 = getY(candle.high);
            const wickY2 = getY(candle.low);
            const bodyY1 = getY(Math.max(candle.open, candle.close));
            const bodyY2 = getY(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(1.8, Math.abs(bodyY1 - bodyY2));
            const candleWidth = Math.max(6, (chartWidth / candles.length) * 0.65);

            // Green/Red colors matching modern trading terminals
            const wickColor = isBullish ? '#00ff66' : '#ff3b30';
            const bodyColor = isBullish ? '#00ff66' : '#ff3b30';
            const fillOpacity = isBullish ? '0.15' : '0.25';

            return (
              <g key={idx} className="transition-all duration-300">
                {/* Candle Wick line */}
                <line
                  x1={candleX}
                  y1={wickY1}
                  x2={candleX}
                  y2={wickY2}
                  stroke={wickColor}
                  strokeWidth="1.2"
                  strokeOpacity="0.85"
                />
                {/* Candle Solid Body */}
                <rect
                  x={candleX - candleWidth / 2}
                  y={bodyY1}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={bodyColor}
                  fillOpacity={fillOpacity}
                  stroke={bodyColor}
                  strokeWidth="1.2"
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* Active Spot price indicator horizontal line */}
          <line
            x1={paddingX}
            y1={getY(currentPrice)}
            x2={width - paddingX}
            y2={getY(currentPrice)}
            stroke="#00ff66"
            strokeWidth="1"
            strokeDasharray="4,2"
            className="animate-pulse"
          />

          <circle
            cx={getX(candles.length - 1)}
            cy={getY(currentPrice)}
            r="3"
            fill="#00ff66"
            className="animate-ping"
          />
          <circle
            cx={getX(candles.length - 1)}
            cy={getY(currentPrice)}
            r="2"
            fill="#ffffff"
          />

          {/* Laser tag horizontal coordinate indicator */}
          <g transform={`translate(${width - paddingX + 2}, ${getY(currentPrice) - 5})`}>
            <rect
              width={decimals === 5 ? "50" : "41"}
              height="10"
              fill="#00ff66"
              rx="1.5"
            />
            <text
              x={decimals === 5 ? "25" : "20.5"}
              y="7.5"
              fill="#000000"
              fontSize="6"
              fontWeight="black"
              fontFamily="monospace"
              textAnchor="middle"
            >
              ${currentPrice.toFixed(decimals)}
            </text>
          </g>

          {/* Projected Target Forecast Candle during Signal lock */}
          {direction && !isScanning && (
            <g opacity="0.85" className="animate-pulse">
              <line
                x1={getX(candles.length - 1)}
                y1={getY(currentPrice)}
                x2={getX(candles.length - 1) + 20}
                y2={getY(currentPrice + (direction === 'CALL' ? 0.35 : -0.35))}
                stroke={direction === 'CALL' ? '#00ff66' : '#ff3b30'}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x={getX(candles.length - 1) + 24}
                y={getY(currentPrice + (direction === 'CALL' ? 0.35 : -0.35)) + 2}
                fill={direction === 'CALL' ? '#00ff66' : '#ff3b30'}
                fontSize="6.5"
                fontWeight="black"
                fontFamily="monospace"
              >
                AI TARGET➔
              </text>
            </g>
          )}

          {/* Glowing AI SCANNER SWEEP animation overlays */}
          {isScanning && (
            <g transform={`translate(${(scanProgress / 100) * chartWidth}, 0)`}>
              {/* Vertical scanning ray line */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={paddingX}
                y2={height - paddingY}
                stroke="#00ff66"
                strokeWidth="2"
                strokeOpacity="0.75"
                className="animate-pulse"
              />
              
              {/* Dynamic shader zone representing visual AI inspection block */}
              <rect
                x={paddingX - 16}
                y={paddingY}
                width="16"
                height={chartHeight}
                fill="url(#scanningGradient)"
                opacity="0.35"
              />
            </g>
          )}

          {/* Define gradient shaders */}
          <defs>
            <linearGradient id="scanningGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00ff66" stopOpacity="0" />
              <stop offset="100%" stopColor="#00ff66" stopOpacity="0.8" />
            </linearGradient>
          </defs>

        </svg>

        {/* Float indicator label for scanning stage */}
        {isScanning && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 border border-[#00ff66]/40 px-3 py-1.5 rounded font-mono text-[9px] text-[#00ff66] tracking-widest uppercase animate-pulse">
            🔍 DEEP AI CANDLE MODELING IN PROGRESS...
          </div>
        )}
      </div>

      {/* Axis/Timeline Labels footer info */}
      <div className="flex justify-between items-center mt-2 border-t border-[#00ff66]/10 pt-2 text-[8px] font-mono text-[#00ff66]/50">
        <span>UTC TIMELINE (1 TICK/SEC)</span>
        <span className="flex items-center space-x-1">
          <span className="inline-block w-1.5 h-1.5 rounded bg-[#00ff66] opacity-30"></span>
          <span>BULLISH</span>
          <span className="inline-block w-1.5 h-1.5 rounded bg-[#ff3b30] opacity-30 ml-2"></span>
          <span>BEARISH</span>
        </span>
      </div>
    </div>
  );
};
