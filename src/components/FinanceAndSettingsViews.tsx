import React, { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UserCheck,
} from 'lucide-react';
import {
  AVAILABLE_MONTHS,
  CATEGORY_MAP,
  CategoryTerminology,
  formatCurrency,
  getIssueDateForMonth,
} from '../data/initialData';
import {
  ActiveNavTab,
  ClientEntity,
  CompanyProfile,
  ExpenseCategory,
  ExpenseItem,
  InvoiceTheme,
  PartnerItem,
  SoftwareCategory,
} from '../types';
import { DEFAULT_BRAND_LOGO_PATH } from '../utils/usePWAInstall';
import { PWAInstallButton } from './PWAInstallModal';
import { RevenueExpenseChart } from './RevenueExpenseChart';

interface FinanceAndSettingsViewsProps {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  company: CompanyProfile;
  term: CategoryTerminology;
  clients: ClientEntity[];
  expenses: ExpenseItem[];
  partners: PartnerItem[];
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  monthlyRevenue: number;
  monthlyExpenses: number;
  totalCollected: number;
  totalOutstandingDues: number;
  onAddExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onAddPartner: (partner: PartnerItem) => void;
  onTogglePartnerPaid: (partnerId: string, month: string) => void;
  onDeletePartner: (partnerId: string) => void;
  onToggleClientEnabled: (clientId: string) => void;
  onDeleteClient: (clientId: string) => void;
  onUpdateCompany: (updated: CompanyProfile) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Office Expenses',
  'Salaries',
  'Marketing',
  'Internet',
  'Partner Payout',
  'Other Expenses',
];

const SOFTWARE_CATEGORIES: SoftwareCategory[] = [
  'School Management',
  'Store Management',
  'Hospital Management',
  'Restaurant Management',
  'Other',
];

export const FinanceAndSettingsViews: React.FC<
  FinanceAndSettingsViewsProps
> = ({
  activeTab,
  setActiveTab,
  company,
  term,
  clients,
  expenses,
  partners,
  selectedMonth,
  setSelectedMonth,
  monthlyRevenue,
  monthlyExpenses,
  totalCollected,
  totalOutstandingDues,
  onAddExpense,
  onDeleteExpense,
  onAddPartner,
  onTogglePartnerPaid,
  onDeletePartner,
  onToggleClientEnabled,
  onDeleteClient,
  onUpdateCompany,
}) => {
  const currency = company.currency || 'Rs.';

  // 9. Expense Form State — starts clean
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] =
    useState<ExpenseCategory>('Office Expenses');
  const [expPartnerId, setExpPartnerId] = useState<string>('');
  const [expDate, setExpDate] = useState(() =>
    getIssueDateForMonth(selectedMonth)
  );

  useEffect(() => {
    setExpDate((prev) => getIssueDateForMonth(selectedMonth, prev));
  }, [selectedMonth]);

  // 10. Partner Form State — starts clean
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerMonthlyPayment, setPartnerMonthlyPayment] = useState('');

  // 11. Finance Report Filter State
  const [reportScope, setReportScope] = useState<
    'Current Month' | 'Specific Month' | 'Year' | 'Custom Date Range'
  >('Current Month');
  const [customStartDate, setCustomStartDate] = useState('2026-05-01');
  const [customEndDate, setCustomEndDate] = useState('2026-05-31');

  // 12. Enable / Disable Search State
  const [enableSearch, setEnableSearch] = useState('');
  const [clientToDelete, setClientToDelete] = useState<ClientEntity | null>(
    null
  );

  // Settings State
  const [compName, setCompName] = useState(company.name);
  const [compTagline, setCompTagline] = useState(company.tagline);
  const [compPhone, setCompPhone] = useState(company.phone);
  const [compEmail, setCompEmail] = useState(company.email);
  const [compWebsite, setCompWebsite] = useState(company.website);
  const [compCategory, setCompCategory] = useState<SoftwareCategory>(
    company.category
  );
  const [compCustomSingular, setCompCustomSingular] = useState(
    company.customSingular || 'Client'
  );
  const [compLogo, setCompLogo] = useState<string | undefined>(
    company.logoDataUrl
  );
  const [compQrCode, setCompQrCode] = useState<string | undefined>(
    company.qrCodeDataUrl
  );
  const [compShowQr, setCompShowQr] = useState<boolean>(
    company.showQrCode !== false
  );
  const [compQrLabel, setCompQrLabel] = useState<string>(
    company.qrLabel || 'Scan to Pay'
  );
  const [compDefaultIssueDate, setCompDefaultIssueDate] = useState<string>(
    company.defaultIssueDate || ''
  );
  const [compDefaultDueDate, setCompDefaultDueDate] = useState<string>(
    company.defaultDueDate || ''
  );
  const [compHeaderTitle, setCompHeaderTitle] = useState<string>(
    company.invoiceHeaderTitle || 'INVOICE'
  );
  const [compHeaderNote, setCompHeaderNote] = useState<string>(
    company.invoiceHeaderNote ||
      'Official Monthly Software & Communication Billing Statement'
  );
  const [compFooterThankYou, setCompFooterThankYou] = useState<string>(
    company.invoiceFooterThankYou || 'Thank you for your business & trust!'
  );
  const [compFooterTerms, setCompFooterTerms] = useState<string>(
    company.invoiceFooterTerms ||
      'Please remit payment by the due date via Bank Transfer or scan the QR code to pay online.'
  );
  const [compInvoiceTheme, setCompInvoiceTheme] = useState<InvoiceTheme>(
    company.invoiceTheme || 'royal-blue'
  );
  const [settingsSaved, setSettingsSaved] = useState(false);

  const monthExpensesList = expenses.filter((e) => e.month === selectedMonth);
  const partnerPayoutsTotal = partners.reduce((sum, p) => {
    const isPaid = p.paidMonths[selectedMonth]?.paid;
    return sum + (isPaid ? p.monthlyPayment : 0);
  }, 0);

  // 9. EXPENSES VIEW (Matches Screen 9)
  if (activeTab === 'expenses') {
    const netBalance = monthlyRevenue - monthlyExpenses;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track salaries, office expenses, marketing, internet, and partner payouts for{' '}
              <strong>{selectedMonth}</strong>
            </p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Add Expense Form */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Add Expense</span>
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const linkedPartner = partners.find(
                  (p) => p.id === expPartnerId
                );
                const newExp: ExpenseItem = {
                  id: `exp-${Date.now()}`,
                  description: expDesc.trim() || 'Office Expense',
                  amount: Math.max(0, Number(expAmount) || 0),
                  category: expCategory,
                  date: expDate.trim() || '15-05-2026',
                  month: selectedMonth,
                  partnerId: linkedPartner?.id,
                  partnerName: linkedPartner?.name,
                };
                onAddExpense(newExp);
                setExpDesc('');
                setExpAmount('');
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g., Office Rent"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="20000"
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) =>
                      setExpCategory(e.target.value as ExpenseCategory)
                    }
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Partner (Optional)
                </label>
                <select
                  value={expPartnerId}
                  onChange={(e) => setExpPartnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="">Select Partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.monthlyPayment, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  placeholder="15-05-2026"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                Add Expense
              </button>
            </form>
          </div>

          {/* Right: Recent Expenses Table + Bottom Formula Bar */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Recent Expenses ({selectedMonth})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {monthExpensesList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-400"
                        >
                          No expenses logged for {selectedMonth}.
                        </td>
                      </tr>
                    ) : (
                      monthExpensesList.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-3 font-semibold text-slate-900">
                            {exp.description}
                            {exp.partnerName && (
                              <span className="ml-1.5 text-[11px] font-normal text-blue-600">
                                ({exp.partnerName})
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(exp.amount, currency)}
                          </td>
                          <td className="py-3.5 px-3 text-slate-600">
                            {exp.category}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-500">
                            {exp.date}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onDeleteExpense(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                              title="Remove Expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Formula Summary Bar (Monthly Revenue - Expenses = Net Balance) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Monthly Revenue</div>
                <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {formatCurrency(monthlyRevenue, currency)}
                </div>
              </div>
              <div className="text-lg font-bold text-slate-300">−</div>
              <div>
                <div className="text-xs text-slate-500">Expenses</div>
                <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {formatCurrency(monthlyExpenses, currency)}
                </div>
              </div>
              <div className="text-lg font-bold text-slate-300">=</div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <div className="text-xs font-medium text-emerald-700">
                  Net Balance
                </div>
                <div className="text-lg font-bold text-emerald-600 font-mono tabular-nums">
                  {formatCurrency(netBalance, currency)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 10. PARTNERS VIEW (Matches Screen 10)
  if (activeTab === 'partners') {
    const remainingAfterPartners = monthlyRevenue - partnerPayoutsTotal;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Partners</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage partners and monthly payouts. Marking a partner as paid automatically logs an expense.
            </p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Add Partner Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Add Partner</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const newPartner: PartnerItem = {
                id: `part-${Date.now()}`,
                name: partnerName.trim() || 'Ali Raza',
                phone: partnerPhone.trim() || '+92 300 9876543',
                monthlyPayment: Math.max(0, Number(partnerMonthlyPayment) || 0),
                paidMonths: {
                  [selectedMonth]: { paid: false },
                },
              };
              onAddPartner(newPartner);
              setPartnerName('');
              setPartnerPhone('');
              setPartnerMonthlyPayment('10000');
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-xs"
          >
            <div>
              <label className="block font-medium text-slate-600 mb-1.5">
                Partner Name
              </label>
              <input
                type="text"
                required
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Ali Raza"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={partnerPhone}
                onChange={(e) => setPartnerPhone(e.target.value)}
                placeholder="+92 300 9876543"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1.5">
                Monthly Payment ({currency})
              </label>
              <input
                type="number"
                min={0}
                required
                value={partnerMonthlyPayment}
                onChange={(e) => setPartnerMonthlyPayment(e.target.value)}
                placeholder="10000"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Add Partner
            </button>
          </form>
        </div>

        {/* Partners List Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Partners List ({selectedMonth})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3 text-right">Monthly Payment</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {partners.map((p) => {
                  const isPaid = Boolean(p.paidMonths[selectedMonth]?.paid);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-3 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">
                        {p.phone}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(p.monthlyPayment, currency)}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                            isPaid ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaid ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                          />
                          <span>{isPaid ? 'Paid' : 'Pending'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onTogglePartnerPaid(p.id, selectedMonth)
                            }
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                              isPaid
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>
                              {isPaid ? 'Mark Pending' : 'Mark as Paid'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePartner(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete Partner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Partner Revenue Deduction Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-500">Monthly Revenue: </span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(monthlyRevenue, currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">
                Partner Payments (Paid in {selectedMonth}):{' '}
              </span>
              <span className="font-mono font-bold text-blue-600">
                {formatCurrency(partnerPayoutsTotal, currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Remaining Revenue: </span>
              <span className="font-mono font-bold text-emerald-600">
                {formatCurrency(remainingAfterPartners, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 11. MONTHLY & YEARLY FINANCE REPORT (Matches Screen 11)
  if (activeTab === 'finance-report') {
    const scale = reportScope === 'Year' ? 12 : 1;
    const scaledRevenue = monthlyRevenue * scale;
    const scaledExpenses = monthlyExpenses * scale;
    const scaledPartners = partnerPayoutsTotal * scale;
    const scaledCollected = totalCollected * scale;
    const scaledDues = totalOutstandingDues * scale;
    const scaledNetBalance = scaledRevenue - scaledExpenses;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Finance Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive monthly &amp; yearly financial breakdown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={reportScope}
              onChange={(e) =>
                setReportScope(e.target.value as typeof reportScope)
              }
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800"
            >
              <option value="Current Month">This Month</option>
              <option value="Specific Month">Specific Month</option>
              <option value="Year">Full Year (2026)</option>
              <option value="Custom Date Range">Custom Date Range</option>
            </select>

            {reportScope === 'Specific Month' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800"
              >
                {AVAILABLE_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            {reportScope === 'Custom Date Range' && (
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* 6 Summary Cards in 3x2 Grid (Matches Screen 11) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium text-slate-500">
              Total Revenue
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledRevenue, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium text-slate-500">
              Total Expenses
            </div>
            <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledExpenses, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium text-slate-500">
              Partner Payments
            </div>
            <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledPartners, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium text-slate-500">
              Amount Collected
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledCollected, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-5">
            <div className="text-xs font-medium text-slate-600">
              Outstanding Dues
            </div>
            <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledDues, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-5">
            <div className="text-xs font-medium text-slate-600">
              Net Balance
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledNetBalance, currency)}
            </div>
          </div>
        </div>

        {/* Monthly Overview Chart */}
        <RevenueExpenseChart
          title="Monthly Overview"
          activeMonth={selectedMonth}
          activeMonthRevenue={monthlyRevenue}
          activeMonthExpenses={monthlyExpenses}
          currency={currency}
        />
      </div>
    );
  }

  // 12. ENABLE / DISABLE CLIENT VIEW (Matches Screen 12)
  if (activeTab === 'enable-disable') {
    const filteredClients = clients.filter((c) =>
      c.name.toLowerCase().includes(enableSearch.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{term.plural}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable or disable {term.plural.toLowerCase()}. Disabled {term.plural.toLowerCase()} are paused from active monthly billing while retaining full historical records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('add-client')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add {term.singular}</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={enableSearch}
              onChange={(e) => setEnableSearch(e.target.value)}
              placeholder={`Search ${term.singular.toLowerCase()}...`}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">{term.singular} Name</th>
                  <th className="py-3 px-4">Address &amp; Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {client.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {client.address} ·{' '}
                      <span className="font-mono">{client.phone}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                          client.enabled ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            client.enabled ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        <span>{client.enabled ? 'Enabled' : 'Disabled'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={client.enabled}
                          onClick={() => onToggleClientEnabled(client.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            client.enabled ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              client.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientToDelete(client)}
                          title={`Delete ${term.singular}`}
                          className="px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {clientToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Delete {term.singular}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to permanently delete{' '}
                    <strong>{clientToDelete.name}</strong>?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setClientToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteClient(clientToDelete.id);
                    setClientToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Delete {term.singular}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SETTINGS VIEW (Company Profile, Logo, QR Code, Issue/Due Dates, Header/Footer & Terminology)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQrCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompQrCode(reader.result);
        setCompShowQr(true);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Company &amp; Invoice Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Change company logo, add payment QR code, configure default Issue Date &amp; Due Date, customize Default Invoice Header &amp; Footer, or install the WebApp on Windows &amp; Android
        </p>
      </div>

      <PWAInstallButton
        company={company}
        onUpdateCompany={onUpdateCompany}
        variant="settings"
      />

      {settingsSaved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>
            Settings saved! Logo, QR code, Issue/Due dates, and Default Invoice Header/Footer updated.
          </span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onUpdateCompany({
            ...company,
            name: compName.trim() || 'Your Company Name',
            tagline: compTagline.trim() || CATEGORY_MAP[compCategory].tagline,
            phone: compPhone.trim(),
            email: compEmail.trim(),
            website: compWebsite.trim(),
            category: compCategory,
            customSingular:
              compCategory === 'Other' ? compCustomSingular : undefined,
            customPlural:
              compCategory === 'Other' ? `${compCustomSingular}s` : undefined,
            logoDataUrl: compLogo,
            qrCodeDataUrl: compQrCode,
            showQrCode: compShowQr,
            qrLabel: compQrLabel.trim() || 'Scan to Pay',
            defaultIssueDate: compDefaultIssueDate.trim(),
            defaultDueDate: compDefaultDueDate.trim(),
            invoiceHeaderTitle: compHeaderTitle.trim() || 'INVOICE',
            invoiceHeaderNote: compHeaderNote.trim(),
            invoiceFooterThankYou:
              compFooterThankYou.trim() ||
              'Thank you for your business & trust!',
            invoiceFooterTerms: compFooterTerms.trim(),
            invoiceTheme: compInvoiceTheme,
          });
          setSettingsSaved(true);
          setTimeout(() => setSettingsSaved(false), 4000);
        }}
        className="space-y-6 text-xs"
      >
        {/* Card 1: Company Profile & Software Category */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            1. Company Details &amp; Software Category
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Software Category (Dynamic Terminology)
              </label>
              <select
                value={compCategory}
                onChange={(e) => {
                  const cat = e.target.value as SoftwareCategory;
                  setCompCategory(cat);
                  setCompTagline(CATEGORY_MAP[cat].tagline);
                }}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white"
              >
                {SOFTWARE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {compCategory === 'Other' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Custom Entity Name (Singular)
              </label>
              <input
                type="text"
                value={compCustomSingular}
                onChange={(e) => setCompCustomSingular(e.target.value)}
                placeholder="e.g., Clinic, Gym, Branch"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                value={compPhone}
                onChange={(e) => setCompPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Support Email
              </label>
              <input
                type="email"
                value={compEmail}
                onChange={(e) => setCompEmail(e.target.value)}
                placeholder="support@company.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Website
              </label>
              <input
                type="text"
                value={compWebsite}
                onChange={(e) => setCompWebsite(e.target.value)}
                placeholder="www.company.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Change Company Logo & Add QR Code */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            2. Company Logo &amp; Payment QR Code
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Logo Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">
                  Company Logo
                </label>
                {compLogo && (
                  <button
                    type="button"
                    onClick={() => setCompLogo(undefined)}
                    className="text-rose-600 hover:underline text-[11px]"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-slate-50/60 min-h-[120px]">
                <img
                  src={compLogo || DEFAULT_BRAND_LOGO_PATH}
                  alt="Company Logo"
                  referrerPolicy="no-referrer"
                  className="h-14 w-auto object-contain rounded bg-white p-1 border border-slate-200"
                />
                <span className="text-xs font-medium text-slate-700 text-center">
                  Click to change company &amp; app logo (PNG, JPG)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Payment QR Code Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">
                  Payment QR Code (Displayed on Invoice)
                </label>
                {compQrCode && (
                  <button
                    type="button"
                    onClick={() => setCompQrCode(undefined)}
                    className="text-rose-600 hover:underline text-[11px]"
                  >
                    Remove Custom QR
                  </button>
                )}
              </div>
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-slate-50/60 min-h-[120px]">
                {compQrCode ? (
                  <img
                    src={compQrCode}
                    alt="Payment QR Code"
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 object-contain rounded border border-slate-200 bg-white p-1"
                  />
                ) : (
                  <UploadCloud className="w-6 h-6 text-emerald-600" />
                )}
                <span className="text-xs font-medium text-slate-700 text-center">
                  {compQrCode
                    ? 'Click to replace QR Code image'
                    : 'Click to upload QR Code (Bank / JazzCash / EasyPaisa / Raast)'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrCodeChange}
                  className="hidden"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-center">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compShowQr}
                    onChange={(e) => setCompShowQr(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span className="font-medium text-slate-700">
                    Show QR Code on Invoice
                  </span>
                </label>

                <input
                  type="text"
                  value={compQrLabel}
                  onChange={(e) => setCompQrLabel(e.target.value)}
                  placeholder="QR Label (e.g., Scan to Pay)"
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Issue Date, Due Date & Default Invoice Header / Footer */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            3. Default Issue Date, Due Date &amp; Invoice Header / Footer
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Default Issue Date (Optional)
              </label>
              <input
                type="text"
                value={compDefaultIssueDate}
                onChange={(e) => setCompDefaultIssueDate(e.target.value)}
                placeholder="e.g., 15 May 2026 (auto if blank)"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Default Due Date (Optional)
              </label>
              <input
                type="text"
                value={compDefaultDueDate}
                onChange={(e) => setCompDefaultDueDate(e.target.value)}
                placeholder="e.g., 25 May 2026 (auto if blank)"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Default Invoice Theme
              </label>
              <select
                value={compInvoiceTheme}
                onChange={(e) =>
                  setCompInvoiceTheme(e.target.value as InvoiceTheme)
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white"
              >
                <option value="royal-blue">Royal Blue Executive</option>
                <option value="midnight-slate">Midnight Slate</option>
                <option value="emerald-executive">Emerald Executive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Invoice Header Title
              </label>
              <input
                type="text"
                value={compHeaderTitle}
                onChange={(e) => setCompHeaderTitle(e.target.value)}
                placeholder="INVOICE"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Invoice Header Tagline
              </label>
              <input
                type="text"
                value={compTagline}
                onChange={(e) => setCompTagline(e.target.value)}
                placeholder="Smart Solutions for Better Education"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1.5">
              Invoice Header Subtitle / Statement Note
            </label>
            <input
              type="text"
              value={compHeaderNote}
              onChange={(e) => setCompHeaderNote(e.target.value)}
              placeholder="Official Monthly Software & Communication Billing Statement"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Invoice Footer Thank-You Heading
              </label>
              <input
                type="text"
                value={compFooterThankYou}
                onChange={(e) => setCompFooterThankYou(e.target.value)}
                placeholder="Thank you for your business & trust!"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Invoice Footer Payment Terms / Bank Details
              </label>
              <input
                type="text"
                value={compFooterTerms}
                onChange={(e) => setCompFooterTerms(e.target.value)}
                placeholder="Please remit payment by the due date via Bank Transfer..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Save All Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
