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
  showNetAfterExpenses?: boolean;
  monthlyBreakdown?: Array<{
    month: string;
    toBeCollected: number;
    collected: number;
    expenses: number;
    netBalance?: number;
  }>;
}

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({
  title = 'Revenue vs Expenses & Profit',
  activeMonth,
  activeMonthRevenue,
  activeMonthExpenses,
  activeMonthToBeCollected,
  currency = 'Rs.',
  showExpenses = true,
  showNetAfterExpenses = true,
  monthlyBreakdown,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeYear = getYearFromMonthString(activeMonth);
  const baseline = getMonthlyChartBaseline(activeMonth);

  const data = baseline.map((item) => {
    const row = monthlyBreakdown?.find((r) => r.month === item.fullMonth);
    if (row) {
      const rev = Number(row.collected) || 0;
      const exp = Number(row.expenses) || 0;
      const tbc = Number(row.toBeCollected) || 0;
      const net = rev - exp;
      return {
        ...item,
        revenue: rev,
        expenses: exp,
        toBeCollected: tbc,
        netAfterExpenses: net,
      };
    }

    if (item.fullMonth === activeMonth) {
      const rev = Number(activeMonthRevenue) || 0;
      const exp = Number(activeMonthExpenses) || 0;
      const tbc = Number(activeMonthToBeCollected) || 0;
      const net = rev - exp;
      return {
        ...item,
        revenue: rev,
        expenses: exp,
        toBeCollected: tbc,
        netAfterExpenses: net,
      };
    }

    // For other months, keep 0 to avoid showing fictitious expected data
    return {
      ...item,
      revenue: 0,
      expenses: 0,
      toBeCollected: 0,
      netAfterExpenses: 0,
    };
  });

  const maxValue = Math.max(
    100000,
    ...data.map((d) =>
      Math.max(
        Number(d.revenue) || 0,
        Number(d.expenses) || 0,
        Number(d.toBeCollected) || 0,
        Math.max(0, Number(d.netAfterExpenses) || 0)
      )
    )
  );

  const step = Math.ceil(maxValue / 5 / 10000) * 10000 || 50000;
  const safeMax = Math.max(maxValue, step * 5);
  const yTicks = [step * 5, step * 4, step * 3, step * 2, step * 1, 0];

  // SVG Dimensions
  const svgWidth = 620;
  const svgHeight = 220;
  const paddingLeft = 55;
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
    const y = paddingTop + chartHeight - (safeVal / safeMax) * chartHeight;
    return isNaN(y) ? paddingTop + chartHeight : Number(y.toFixed(2));
  };

  const revPoints = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const expPoints = data.map((d, i) => `${getX(i)},${getY(d.expenses)}`).join(' ');
  const tbcPoints = data.map((d, i) => `${getX(i)},${getY(d.toBeCollected)}`).join(' ');
  const netPoints = data
    .map((d, i) => `${getX(i)},${getY(Math.max(0, d.netAfterExpenses))}`)
    .join(' ');

  const activeNetAfterExpenses = activeMonthRevenue - activeMonthExpenses;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Chart Top Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Trend across {activeYear} (in {currency}) — includes real collected revenue, expenses, and amount after all expenses
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="text-slate-700">Revenue</span>
          </div>
          {showExpenses && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-700">Expenses</span>
            </div>
          )}
          {showNetAfterExpenses && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-violet-600" />
              <span className="text-violet-950 font-bold">After Deducting Expenses</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600">To be Collected</span>
          </div>
        </div>
      </div>

      {/* Real-time Month Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Collected Revenue ({activeMonth})</div>
            <div className="text-lg font-bold text-blue-600 font-mono mt-0.5">
              {formatCurrency(activeMonthRevenue, currency)}
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold">Inflow</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Total Expenses ({activeMonth})</div>
            <div className="text-lg font-bold text-rose-600 font-mono mt-0.5">
              {formatCurrency(activeMonthExpenses, currency)}
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-semibold">Outflow</span>
        </div>

        <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-violet-800">
              Amount After Deducting All Expenses
            </div>
            <div className="text-lg font-extrabold text-violet-700 font-mono mt-0.5">
              {formatCurrency(activeNetAfterExpenses, currency)}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
            activeNetAfterExpenses >= 0
              ? 'bg-violet-200 text-violet-800'
              : 'bg-rose-200 text-rose-800'
          }`}>
            {activeNetAfterExpenses >= 0 ? 'Net Profit' : 'Deficit'}
          </span>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 overflow-visible">
          {/* Y-Axis Grid Lines & Labels */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
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
                  {tickVal >= 1000 ? `${Math.round(tickVal / 1000)}k` : tickVal}
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

          {/* To Be Collected Line (Dashed) */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={tbcPoints}
          />

          {/* Amount After Deducting All Expenses (Net Profit Line) */}
          {showNetAfterExpenses && (
            <polyline
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={netPoints}
            />
          )}

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cyRev = getY(d.revenue);
            const cyExp = getY(d.expenses);
            const cyTbc = getY(d.toBeCollected);
            const cyNet = getY(Math.max(0, d.netAfterExpenses));
            const isCurrent = d.fullMonth === activeMonth;

            return (
              <g
                key={`points-${d.shortMonth}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Revenue circle */}
                <circle
                  cx={cx}
                  cy={cyRev}
                  r={isCurrent ? 5.5 : 3}
                  className={isCurrent ? 'fill-blue-600' : 'fill-blue-400'}
                />
                {/* Expenses circle */}
                {showExpenses && (
                  <circle
                    cx={cx}
                    cy={cyExp}
                    r={isCurrent ? 5 : 3}
                    className="fill-red-400"
                  />
                )}
                {/* To be collected circle */}
                <circle cx={cx} cy={cyTbc} r={3} className="fill-emerald-400" />
                {/* Net after expenses circle */}
                {showNetAfterExpenses && (
                  <circle
                    cx={cx}
                    cy={cyNet}
                    r={isCurrent ? 6 : 3.5}
                    className="fill-violet-600 stroke-white stroke-2"
                  />
                )}
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
                className={`text-[11px] font-medium cursor-pointer transition-colors ${
                  isCurrent ? 'fill-violet-700 font-bold' : 'fill-slate-500 hover:fill-slate-900'
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
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md text-white text-[11px] rounded-xl px-4 py-3 shadow-2xl pointer-events-none whitespace-nowrap border border-slate-700 space-y-1">
            <div className="font-bold text-slate-100 flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
              <span>{data[hoveredIdx].fullMonth}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  data[hoveredIdx].netAfterExpenses >= 0
                    ? 'bg-violet-900/80 text-violet-300'
                    : 'bg-rose-900/80 text-rose-300'
                }`}
              >
                {data[hoveredIdx].netAfterExpenses >= 0 ? 'Net Profit' : 'Deficit'}
              </span>
            </div>
            <div className="font-mono text-blue-300">
              Revenue: {formatCurrency(data[hoveredIdx].revenue, currency)}
            </div>
            {showExpenses && (
              <div className="font-mono text-rose-300">
                Expenses: {formatCurrency(data[hoveredIdx].expenses, currency)}
              </div>
            )}
            <div className="font-mono text-violet-300 font-bold text-xs pt-1 border-t border-slate-800">
              After Deducting Expenses: {formatCurrency(data[hoveredIdx].netAfterExpenses, currency)}
            </div>
            <div className="font-mono text-emerald-300 text-[10px]">
              To be Collected: {formatCurrency(data[hoveredIdx].toBeCollected, currency)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
