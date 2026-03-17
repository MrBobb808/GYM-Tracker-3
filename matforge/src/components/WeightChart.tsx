import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  ReferenceLine,
  Dot
} from 'recharts';
import { format } from 'date-fns';
import { DailyStats } from '../types';
import { Activity, TrendingDown } from 'lucide-react';

interface WeightChartProps {
  data: DailyStats[];
}

export function WeightChart({ data }: WeightChartProps) {
  const [showBMI, setShowBMI] = useState(false);
  const [showTrend, setShowTrend] = useState(true);
  const [showRollingAvg, setShowRollingAvg] = useState(true);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter and sort data by datetime
    const sortedData = [...data]
      .filter(d => d.bodyWeight !== null && d.timestamp)
      .map(d => {
        // Explicitly parse timestamp to Unix time (number)
        const datetime = new Date(d.timestamp).getTime();
        return {
          ...d,
          datetime,
          // Missing values as null, not zero
          bodyFat: (d.bodyFat !== undefined && d.bodyFat !== null) ? d.bodyFat : null,
          water: (d.water !== undefined && d.water !== null) ? d.water : null,
          muscles: (d.muscles !== undefined && d.muscles !== null) ? d.muscles : null,
          bone: (d.bone !== undefined && d.bone !== null) ? d.bone : null,
          bmi: (d.bmi !== undefined && d.bmi !== null) ? d.bmi : null,
        };
      })
      .filter(d => !isNaN(d.datetime))
      .sort((a, b) => a.datetime - b.datetime);

    if (sortedData.length === 0) return [];

    // Calculate Linear Regression
    const n = sortedData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    sortedData.forEach(d => {
      sumX += d.datetime;
      sumY += d.bodyWeight!;
      sumXY += d.datetime * d.bodyWeight!;
      sumX2 += d.datetime * d.datetime;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // Calculate 7-day rolling average
    return sortedData.map((d, i) => {
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const window = sortedData.filter(
        point => point.datetime <= d.datetime && point.datetime > d.datetime - sevenDaysInMs
      );
      const rollingAvg = window.reduce((acc, curr) => acc + curr.bodyWeight!, 0) / window.length;

      return {
        ...d,
        trend: m * d.datetime + b,
        rollingAvg: window.length > 0 ? rollingAvg : null,
      };
    });
  }, [data]);

  const latestEntry = chartData[chartData.length - 1];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
            {format(new Date(label), 'MMM d, yyyy h:mm a')}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-8">
              <span className="text-zinc-400">Weight</span>
              <span className="text-white font-bold">{data.bodyWeight} lb</span>
            </div>
            {data.bmi && (
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">BMI</span>
                <span className="text-blue-400 font-bold">{data.bmi}</span>
              </div>
            )}
            {data.bodyFat && (
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">Body Fat</span>
                <span className="text-orange-400 font-bold">{data.bodyFat}%</span>
              </div>
            )}
            {data.water && (
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">Water</span>
                <span className="text-cyan-400 font-bold">{data.water}%</span>
              </div>
            )}
            {data.muscles && (
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">Muscle</span>
                <span className="text-emerald-400 font-bold">{data.muscles}%</span>
              </div>
            )}
            {data.bone && (
              <div className="flex justify-between gap-8">
                <span className="text-zinc-400">Bone</span>
                <span className="text-zinc-400 font-bold">{data.bone}%</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) return null;

  const minWeight = Math.min(...chartData.map(d => d.bodyWeight!));
  const maxWeight = Math.max(...chartData.map(d => d.bodyWeight!));
  const padding = (maxWeight - minWeight) * 0.5 || 5;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="text-emerald-400" size={20} />
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Weight Progress</h3>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
          <button 
            onClick={() => setShowBMI(!showBMI)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${showBMI ? 'bg-blue-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            BMI
          </button>
          <button 
            onClick={() => setShowTrend(!showTrend)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${showTrend ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Trend
          </button>
          <button 
            onClick={() => setShowRollingAvg(!showRollingAvg)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${showRollingAvg ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            7D Avg
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="datetime" 
              type="number"
              scale="time"
              domain={['auto', 'auto']}
              tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM d')}
              stroke="#52525b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left"
              domain={[minWeight - padding, maxWeight + padding]}
              stroke="#52525b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}lb`}
            />
            {showBMI && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']}
                stroke="#60a5fa"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Trend Line */}
            {showTrend && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="trend"
                stroke="#10b981"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                name="Trend"
              />
            )}

            {/* Rolling Average */}
            {showRollingAvg && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rollingAvg"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                name="7D Rolling Avg"
              />
            )}

            {/* Weight Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="bodyWeight"
              stroke="#ffffff"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isLatest = payload.id === latestEntry.id;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isLatest ? 6 : 4} 
                    fill={isLatest ? "#10b981" : "#ffffff"} 
                    stroke={isLatest ? "rgba(16, 185, 129, 0.4)" : "none"}
                    strokeWidth={isLatest ? 8 : 0}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
              name="Weight"
            />

            {/* BMI Line */}
            {showBMI && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bmi"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
                name="BMI"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-[2px] bg-white"></div>
          <span>Weight</span>
        </div>
        {showRollingAvg && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-orange-500"></div>
            <span>7D Average</span>
          </div>
        )}
        {showTrend && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-emerald-500 border-t border-dashed"></div>
            <span>Trend</span>
          </div>
        )}
        {showBMI && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-blue-500"></div>
            <span>BMI</span>
          </div>
        )}
      </div>
    </div>
  );
}
