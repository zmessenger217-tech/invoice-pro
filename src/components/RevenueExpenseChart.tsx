import React, { useState } from 'react';
import {
  formatCurrency,
  getMonthlyChartBaseline,
  getYearFromMonthString,
} from '../data/initialData';

interface RevenueExpenseChartProps {
  title?: string;
  activeMonth: string;
  activeMonthRevenue: number;
  activeMonthExpenses: number;
  activeMonthToBeCollected: number;
  currency?: string;
  showExpenses?: boolean;
}

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({
  title = 'Revenue vs Expenses',
  activeMonth,
  activeMonthRevenue,
  activeMonthExpenses,
  activeMonthToBeCollected,
  currency = 'Rs.',
  showExpenses = true,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeYear = getYearFromMonthString(activeMonth);
  const baseline = getMonthlyChartBaseline(activeMonth);

  const data = baseline.map((item) => {
    if (item.fullMonth === activeMonth) {
      return {
        ...item,
        revenue: Number(activeMonthRevenue) || 0,
        expenses: Number(activeMonthExpenses) || 0,
        toBeCollected: Number(activeMonthToBeCollected) || 0,
      };
    }
    // For non-active months, we might not have the real data, 
    // for now let's set toBeCollected to 0 to avoid showing expected future/past data
    return { 
        ...item, 
        revenue: Number(item.revenue) || 0, 
        expenses: Number(item.expenses) || 0, 
        toBeCollected: 0 
    };
  });

  const maxValue = Math.max(
    500000,
    ...data.map((d) =>
      Math.max(Number(d.revenue) || 0, Number(d.expenses) || 0, Number(d.toBeCollected) || 0)
    )
  );

  const yTicks = [500, 400, 300, 200, 0];

  // SVG Dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const pointsCount = data.length;
  const getX = (idx: number) => {
    if (pointsCount <= 1) return paddingLeft + chartWidth / 2;
    const x = paddingLeft + (idx / (pointsCount - 1)) * chartWidth;
    return isNaN(x) ? paddingLeft : Number(x.toFixed(2));
  };

  const getY = (val: number) => {
    const num = Number(val);
    const safeVal = isNaN(num) ? 0 : num;
    const safeMax = !maxValue || isNaN(maxValue) || maxValue <= 0 ? 1 : maxValue;
    const y = paddingTop + chartHeight - (safeVal / safeMax) * chartHeight;
    return isNaN(y) ? paddingTop + chartHeight : Number(y.toFixed(2));
  };

  const revPoints = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const expPoints = data.map((d, i) => `${getX(i)},${getY(d.expenses)}`).join(' ');
  const tbcPoints = data.map((d, i) => `${getX(i)},${getY(d.toBeCollected)}`).join(' ');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly trend across {activeYear} (in thousands {currency})
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="text-slate-700">Revenue</span>
          </div>
          {showExpenses && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-700">Expenses</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-700">To be Collected</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 overflow-visible">
          {/* Y-Axis Grid Lines & Labels */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal * 1000);
            return (
              <g key={tickVal}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {tickVal}k
                </text>
              </g>
            );
          })}

          {/* Expenses Line */}
          {showExpenses && (
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={expPoints}
            />
          )}

          {/* Revenue Line */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={revPoints}
          />

          {/* To Be Collected Line */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={tbcPoints}
          />
          
          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cyRev = getY(d.revenue);
            const cyExp = getY(d.expenses);
            const cyTbc = getY(d.toBeCollected);
            const isCurrent = d.fullMonth === activeMonth;

            return (
              <g key={`points-${d.shortMonth}`} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                <circle cx={cx} cy={cyRev} r={isCurrent ? 6 : 3} className={isCurrent ? 'fill-blue-600' : 'fill-blue-400'} />
                {showExpenses && <circle cx={cx} cy={cyExp} r={3} className="fill-red-400" />}
                <circle cx={cx} cy={cyTbc} r={3} className="fill-emerald-400" />
              </g>
            );
          })}

          {/* X-Axis Month Labels */}
          {data.map((d, i) => {
            const cx = getX(i);
            const isCurrent = d.fullMonth === activeMonth;
            return (
              <text
                key={d.shortMonth}
                x={cx}
                y={svgHeight - 8}
                textAnchor="middle"
                className={`text-[11px] font-medium cursor-pointer ${
                  isCurrent ? 'fill-blue-600 font-bold' : 'fill-slate-500'
                }`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {d.shortMonth}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredIdx !== null && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap">
            <div className="font-semibold text-slate-200 mb-0.5">
              {data[hoveredIdx].fullMonth}
            </div>
            <div className="font-mono text-blue-300">
              Revenue: {formatCurrency(data[hoveredIdx].revenue, currency)}
            </div>
            {showExpenses && (
              <div className="font-mono text-red-300">
                Expenses: {formatCurrency(data[hoveredIdx].expenses, currency)}
              </div>
            )}
            <div className="font-mono text-emerald-300">
              To be Collected: {formatCurrency(data[hoveredIdx].toBeCollected, currency)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
