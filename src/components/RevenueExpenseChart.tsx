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
  currency?: string;
  showExpenses?: boolean;
}

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({
  title = 'Revenue vs Expenses',
  activeMonth,
  activeMonthRevenue,
  activeMonthExpenses,
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
        revenue: activeMonthRevenue,
        expenses: activeMonthExpenses,
      };
    }
    return item;
  });

  const maxValue = Math.max(
    500000,
    ...data.map((d) =>
      showExpenses ? Math.max(d.revenue, d.expenses) : d.revenue
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
  const getX = (idx: number) => paddingLeft + (idx / (pointsCount - 1)) * chartWidth;
  const getY = (val: number) => paddingTop + chartHeight - (val / maxValue) * chartHeight;

  const revPoints = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const expPoints = data.map((d, i) => `${getX(i)},${getY(d.expenses)}`).join(' ');

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
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-slate-700">Expenses</span>
            </div>
          )}
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

          {/* Expenses Line & Area */}
          {showExpenses && (
            <>
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={expPoints}
              />
              {data.map((d, i) => {
                const cx = getX(i);
                const cy = getY(d.expenses);
                return (
                  <circle
                    key={`exp-${d.shortMonth}`}
                    cx={cx}
                    cy={cy}
                    r={hoveredIdx === i ? 5 : 3.5}
                    className="fill-white stroke-indigo-500 stroke-2 transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </>
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
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.revenue);
            const isCurrent = d.fullMonth === activeMonth;
            return (
              <g key={`rev-${d.shortMonth}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={hoveredIdx === i || isCurrent ? 6 : 4}
                  className={`transition-all cursor-pointer ${
                    isCurrent ? 'fill-blue-600 stroke-white stroke-2' : 'fill-white stroke-blue-600 stroke-2'
                  }`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
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
              <div className="font-mono text-indigo-300">
                Expenses: {formatCurrency(data[hoveredIdx].expenses, currency)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
