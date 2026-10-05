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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly comparison across {activeYear} (in thousands {currency})
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-blue-600" />
            <span className="text-slate-700">Revenue</span>
          </div>
          {showExpenses && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-indigo-200" />
              <span className="text-slate-700">Expenses</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-64 flex">
        {/* Y-Axis Labels */}
        <div className="w-12 flex flex-col justify-between text-[11px] font-mono text-slate-400 pb-6 pr-2 text-right select-none">
          {yTicks.map((tick) => (
            <span key={tick}>{tick}k</span>
          ))}
        </div>

        {/* Bars & Grid Lines */}
        <div className="flex-1 relative flex flex-col justify-between pb-6">
          {/* Horizontal grid lines */}
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
            {yTicks.map((tick) => (
              <div
                key={tick}
                className="w-full border-b border-slate-100"
              />
            ))}
          </div>

          {/* Columns */}
          <div className="relative z-10 flex-1 grid grid-cols-12 gap-1 sm:gap-2 items-end pt-4 px-1">
            {data.map((item, idx) => {
              const revPct = Math.min(
                100,
                Math.max(4, Math.round((item.revenue / maxValue) * 100))
              );
              const expPct = Math.min(
                100,
                Math.max(4, Math.round((item.expenses / maxValue) * 100))
              );
              const isCurrent = item.fullMonth === activeMonth;

              return (
                <div
                  key={item.shortMonth}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="h-full flex flex-col justify-end items-center group relative cursor-pointer"
                >
                  {/* Hover Tooltip */}
                  {hoveredIdx === idx && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
                      <div className="font-semibold text-slate-200 mb-0.5">
                        {item.fullMonth}
                      </div>
                      <div className="font-mono text-blue-300">
                        Rev: {formatCurrency(item.revenue, currency)}
                      </div>
                      {showExpenses && (
                        <div className="font-mono text-indigo-200">
                          Exp: {formatCurrency(item.expenses, currency)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-full h-full flex items-end justify-center gap-1 sm:gap-1.5 px-0.5">
                    <div
                      style={{ height: `${revPct}%` }}
                      className={`w-2.5 sm:w-3.5 rounded-t-sm transition-opacity ${
                        isCurrent
                          ? 'bg-blue-600'
                          : 'bg-blue-600/85 group-hover:bg-blue-600'
                      }`}
                    />
                    {showExpenses && (
                      <div
                        style={{ height: `${expPct}%` }}
                        className={`w-2.5 sm:w-3.5 rounded-t-sm transition-opacity ${
                          isCurrent
                            ? 'bg-indigo-300'
                            : 'bg-indigo-200 group-hover:bg-indigo-300'
                        }`}
                      />
                    )}
                  </div>

                  <span
                    className={`absolute -bottom-6 text-[11px] ${
                      isCurrent
                        ? 'font-bold text-blue-600'
                        : 'font-medium text-slate-500'
                    }`}
                  >
                    {item.shortMonth}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
