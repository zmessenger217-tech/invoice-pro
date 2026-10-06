import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AVAILABLE_MONTHS,
  CATEGORY_MAP,
  CategoryTerminology,
  formatCurrency,
  getIssueDateForMonth,
  getOrComputeMonthlyRecord,
} from '../data/initialData';
import {
  ActiveNavTab,
  ClientEntity,
  CompanyProfile,
  ExpenseCategory,
  ExpenseItem,
  InvoiceTheme,
  PartnerItem,
  PaymentQrCodeItem,
  SoftwareCategory,
} from '../types';
import { resolveActiveLogoUrl } from '../utils/usePWAInstall';
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
  const [detailPartnerModal, setDetailPartnerModal] = useState<PartnerItem | null>(null);

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
  const [compQrCodes, setCompQrCodes] = useState<PaymentQrCodeItem[]>(() => {
    if (company.qrCodes && company.qrCodes.length > 0) {
      return company.qrCodes;
    }
    if (company.qrCodeDataUrl) {
      return [
        {
          id: 'qr-1',
          label: company.qrLabel || 'Primary Bank / Account',
          bankName: company.qrLabel || 'Primary Bank',
          dataUrl: company.qrCodeDataUrl,
        },
      ];
    }
    return [];
  });
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

    // Helper to get linked schools for a specific partner in the selected month
    const getPartnerSchoolsData = (partnerId: string) => {
      return clients
        .filter((c) => c.enabled)
        .map((c) => {
          const rec = getOrComputeMonthlyRecord(c, selectedMonth);
          const isLinked =
            (rec.partnerId === partnerId && rec.partnerPaymentEnabled) ||
            (c.partnerId === partnerId && c.partnerPaymentEnabled);
          return {
            client: c,
            record: rec,
            isLinked,
            softwarePay: Number(rec.partnerSoftwareCharges ?? c.partnerSoftwareCharges ?? 0),
            whatsappPay: Number(rec.partnerWhatsappCharges ?? c.partnerWhatsappCharges ?? 0),
            chatbotPay: Number(rec.partnerChatbotCharges ?? c.partnerChatbotCharges ?? 0),
            totalPay: Number(rec.partnerTotalPayment ?? c.partnerTotalPayment ?? 0),
            schoolTotal: rec.currentMonthTotal,
            schoolPaid: rec.amountPaid,
            schoolRemaining: rec.remainingDues,
            schoolStatus: rec.status,
            partnerNote: rec.partnerNote || c.partnerNote,
          };
        })
        .filter((item) => item.isLinked);
    };

    const modalPartnerSchools = detailPartnerModal
      ? getPartnerSchoolsData(detailPartnerModal.id)
      : [];
    const modalTotalPayout = detailPartnerModal
      ? modalPartnerSchools.reduce((sum, s) => sum + s.totalPay, 0) ||
        detailPartnerModal.monthlyPayment
      : 0;
    const modalTotalSchoolRevenue = detailPartnerModal
      ? modalPartnerSchools.reduce((sum, s) => sum + s.schoolTotal, 0)
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Partners</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage partners, school service commissions, and monthly payouts for{' '}
              <strong>{selectedMonth}</strong>.
            </p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white shadow-xs focus:border-blue-600 focus:outline-none"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Partner Revenue Summary Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium text-slate-500">
              Total {term.plural} Revenue ({selectedMonth})
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5">
              {formatCurrency(monthlyRevenue, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/20 p-5">
            <div className="text-xs font-medium text-indigo-900">
              Partner Payments ({selectedMonth})
            </div>
            <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(partnerPayoutsTotal, currency)}
            </div>
            <div className="text-[11px] text-indigo-500 mt-1">
              Total payouts across all partner-linked {term.plural.toLowerCase()}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-5">
            <div className="text-xs font-medium text-slate-600">
              Total Revenue After Partner Payments
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(remainingAfterPartners, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Net profit retained by company after partner payouts
            </div>
          </div>
        </div>

        {/* Add Partner Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add Partner</span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Add partners to link with {term.plural.toLowerCase()} and automatically compute per-service commission payouts.
          </p>
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
              setPartnerMonthlyPayment('');
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
                placeholder="e.g., Ali Raza"
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
                Default / Flat Monthly Payment ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={partnerMonthlyPayment}
                onChange={(e) => setPartnerMonthlyPayment(e.target.value)}
                placeholder="Optional or 0"
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

        {/* Partners List & School Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Partners List ({selectedMonth})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shows all partners, their linked {term.plural.toLowerCase()} with exact payment cuts, and service details.
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
              {partners.length} {partners.length === 1 ? 'Partner' : 'Partners'} Total
            </span>
          </div>

          {partners.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No partners added yet. Use the form above to register your first partner.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {partners.map((p) => {
                const partnerSchools = getPartnerSchoolsData(p.id);
                const schoolPayoutsSum = partnerSchools.reduce(
                  (sum, s) => sum + s.totalPay,
                  0
                );
                const finalPayout =
                  schoolPayoutsSum > 0 ? schoolPayoutsSum : p.monthlyPayment;
                const isPaid = Boolean(p.paidMonths[selectedMonth]?.paid);

                return (
                  <div
                    key={p.id}
                    className="py-4 space-y-3 hover:bg-slate-50/50 p-3 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                  >
                    {/* Partner Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>{p.name}</span>
                            <span className="text-xs font-mono font-normal text-slate-500">
                              ({p.phone})
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Linked to{' '}
                            <strong>
                              {partnerSchools.length}{' '}
                              {partnerSchools.length === 1
                                ? term.singular
                                : term.plural}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Right Action & Payout Block */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">
                            Monthly Payout ({selectedMonth})
                          </div>
                          <div className="text-base font-bold text-indigo-600 font-mono tabular-nums">
                            {formatCurrency(finalPayout, currency)}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 rounded-full ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaid ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                          />
                          <span>{isPaid ? 'Paid' : 'Pending'}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setDetailPartnerModal(p)}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          title="See detailed breakdown of service charges paid to this partner"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>See Details</span>
                        </button>

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
                    </div>

                    {/* Assigned Schools by School Name + How Much Paid from Each School */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span>
                          {term.plural} assigned to {p.name} &amp; Payout from each {term.singular.toLowerCase()}:
                        </span>
                        {partnerSchools.length > 0 && (
                          <span className="font-mono text-indigo-600 font-semibold lowercase">
                            {formatCurrency(schoolPayoutsSum, currency)} total from {partnerSchools.length} {partnerSchools.length === 1 ? term.singular.toLowerCase() : term.plural.toLowerCase()}
                          </span>
                        )}
                      </div>

                      {partnerSchools.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-1">
                          No {term.plural.toLowerCase()} linked yet. In the &quot;Add {term.singular}&quot; or &quot;Edit {term.singular}&quot; view, check &quot;Partner Payment&quot; and choose {p.name} to assign {term.plural.toLowerCase()}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {partnerSchools.map((item) => (
                            <div
                              key={item.client.id}
                              className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                  <span>🏫 {item.client.name}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>
                                    Payout from this {term.singular.toLowerCase()}:{' '}
                                    <strong className="text-indigo-600 font-mono">
                                      {formatCurrency(item.totalPay, currency)}
                                    </strong>
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                      item.schoolStatus === 'Paid'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {term.singular}: {item.schoolStatus}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  Software: {formatCurrency(item.softwarePay, currency)} · WhatsApp: {formatCurrency(item.whatsappPay, currency)} · Chatbot: {formatCurrency(item.chatbotPay, currency)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setDetailPartnerModal(p)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors shrink-0 flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Detail</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
              <span className="font-mono font-bold text-indigo-600">
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

        {/* Detailed Partner & School Service Commission Modal ("See Details") */}
        {detailPartnerModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Partner Payout Details — {detailPartnerModal.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Phone: {detailPartnerModal.phone} · Billing Month:{' '}
                        <strong>{selectedMonth}</strong>
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPartnerModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Top Summary Metrics for this Partner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
                  <div className="text-slate-600 font-medium">
                    Total Partner Payout
                  </div>
                  <div className="text-xl font-bold text-indigo-700 font-mono tabular-nums mt-1">
                    {formatCurrency(modalTotalPayout, currency)}
                  </div>
                  <div className="text-[10px] text-indigo-500 mt-0.5">
                    For {selectedMonth}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="text-slate-600 font-medium">
                    Linked {term.plural}
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {modalPartnerSchools.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Assigned institutions
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="text-emerald-800 font-medium">
                    School Revenue Generated
                  </div>
                  <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                    {formatCurrency(modalTotalSchoolRevenue, currency)}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">
                    Net retained: {formatCurrency(Math.max(0, modalTotalSchoolRevenue - modalTotalPayout), currency)}
                  </div>
                </div>
              </div>

              {/* Service Charges Breakdown by School */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Itemized Service Charges Breakdown by {term.singular}
                </h4>

                {modalPartnerSchools.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    No individual {term.plural.toLowerCase()} linked to this partner yet. This partner currently receives a fixed monthly payment of {formatCurrency(detailPartnerModal.monthlyPayment, currency)}.
                  </div>
                ) : (
                  modalPartnerSchools.map((item) => (
                    <div
                      key={item.client.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
                    >
                      {/* School Header */}
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>🏫 {item.client.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.schoolStatus === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {term.singular} Status: {item.schoolStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.client.address || 'No address'} · Contact:{' '}
                            {item.client.phone}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] text-slate-500">
                            Partner Payment from this {term.singular.toLowerCase()}
                          </div>
                          <div className="text-sm font-bold text-indigo-600 font-mono">
                            {formatCurrency(item.totalPay, currency)}
                          </div>
                        </div>
                      </div>

                      {/* Service Breakdown Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/50">
                              <th className="py-2.5 px-4">Service</th>
                              <th className="py-2.5 px-4 text-right">
                                {term.singular} Charged
                              </th>
                              <th className="py-2.5 px-4 text-right text-indigo-700">
                                Paid to Partner
                              </th>
                              <th className="py-2.5 px-4 text-right text-emerald-700">
                                Company Retained
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="py-2.5 px-4 font-medium text-slate-800">
                                Software Management
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                                {formatCurrency(item.record.softwareCharges, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold text-indigo-600">
                                {formatCurrency(item.softwarePay, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                                {formatCurrency(
                                  Math.max(
                                    0,
                                    item.record.softwareCharges - item.softwarePay
                                  ),
                                  currency
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-medium text-slate-800">
                                <div>WhatsApp Communication</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {item.record.whatsappRate} × {item.record.whatsappMessages.toLocaleString()} msgs
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                                {formatCurrency(item.record.whatsappCharges, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold text-indigo-600">
                                {formatCurrency(item.whatsappPay, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                                {formatCurrency(
                                  Math.max(
                                    0,
                                    item.record.whatsappCharges - item.whatsappPay
                                  ),
                                  currency
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-medium text-slate-800">
                                AI Chatbot
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                                {formatCurrency(item.record.chatbotCharges, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold text-indigo-600">
                                {formatCurrency(item.chatbotPay, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                                {formatCurrency(
                                  Math.max(
                                    0,
                                    item.record.chatbotCharges - item.chatbotPay
                                  ),
                                  currency
                                )}
                              </td>
                            </tr>
                            <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                              <td className="py-2.5 px-4 text-slate-900">
                                Total from {item.client.name}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                                {formatCurrency(item.schoolTotal, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-indigo-700 text-sm">
                                {formatCurrency(item.totalPay, currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-emerald-700 text-sm">
                                {formatCurrency(
                                  Math.max(0, item.schoolTotal - item.totalPay),
                                  currency
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {item.partnerNote && (
                        <div className="px-4 py-2 bg-indigo-50/50 border-t border-indigo-100 text-[11px] text-indigo-900">
                          <strong>Note:</strong> {item.partnerNote}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Payout Statement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailPartnerModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 11. MONTHLY & YEARLY FINANCE REPORT (Matches Screen 11)
  if (activeTab === 'finance-report') {
    const scale = reportScope === 'Year' ? 12 : 1;
    const scaledRevenue = monthlyRevenue * scale;
    const scaledPartners = partnerPayoutsTotal * scale;
    const scaledCollected = totalCollected * scale;
    const scaledDues = totalOutstandingDues * scale;
    const scaledNetBalance = scaledRevenue - scaledPartners;

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

        {/* Summary Cards in Grid */}
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
              Partner Payments
            </div>
            <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledPartners, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-5">
            <div className="text-xs font-medium text-slate-600">
              Total Revenue After Partner Payments
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
              {formatCurrency(scaledNetBalance, currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Total revenue after giving partner payments
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
          title="Monthly Revenue Overview"
          activeMonth={selectedMonth}
          activeMonthRevenue={monthlyRevenue}
          activeMonthExpenses={monthlyExpenses}
          currency={currency}
          showExpenses={false}
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
          Change company logo, add payment QR code, configure default Issue Date &amp; Due Date, and customize Default Invoice Header &amp; Footer
        </p>
      </div>

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
            qrCodeDataUrl: compQrCodes[0]?.dataUrl || compQrCode,
            qrCodes: compQrCodes,
            showQrCode: compShowQr,
            qrLabel: compQrCodes[0]?.bankName || compQrCodes[0]?.label || compQrLabel.trim() || 'Scan to Pay',
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

        {/* Card 2: Change Company Logo & Add Bank Payment QR Codes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Company Logo &amp; Bank Payment QR Codes
              </h2>
              <p className="text-[11px] text-slate-500">
                Add one or more bank accounts with QR codes (Meezan Bank, HBL, JazzCash, EasyPaisa, Raast, etc.)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newId = `qr-${Date.now()}`;
                setCompQrCodes((prev) => [
                  ...prev,
                  {
                    id: newId,
                    label: `Bank Account ${prev.length + 1}`,
                    bankName: `Bank ${prev.length + 1}`,
                    dataUrl: '',
                  },
                ]);
                setCompShowQr(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bank QR Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Company Logo Upload (4 cols) */}
            <div className="md:col-span-4 space-y-2">
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
                    Remove
                  </button>
                )}
              </div>
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/60 min-h-[140px] text-center">
                <img
                  src={resolveActiveLogoUrl(compLogo)}
                  alt="Company Logo"
                  referrerPolicy="no-referrer"
                  className="h-14 w-auto object-contain rounded bg-white p-1 border border-slate-200 shadow-xs"
                />
                <span className="text-[11px] font-medium text-slate-700">
                  Click to replace logo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Multiple Bank Accounts & QR Codes List (8 cols) */}
            <div className="md:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Configured Bank Accounts &amp; QR Codes ({compQrCodes.length})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={compShowQr}
                    onChange={(e) => setCompShowQr(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span className="font-medium text-slate-700">
                    Show QR Codes on Invoice
                  </span>
                </label>
              </div>

              {compQrCodes.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    No bank QR codes added yet. Click &quot;Add Bank QR Code&quot; to add your first payment bank (e.g. Meezan Bank, HBL, JazzCash).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCompQrCodes([
                        {
                          id: `qr-${Date.now()}`,
                          label: 'Meezan Bank',
                          bankName: 'Meezan Bank',
                          dataUrl: '',
                        },
                      ]);
                      setCompShowQr(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Meezan Bank QR</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {compQrCodes.map((qrItem, idx) => (
                    <div
                      key={qrItem.id || `qr-${idx}`}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-800">
                            {qrItem.bankName || qrItem.label || `Bank ${idx + 1}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCompQrCodes((prev) =>
                              prev.filter((_, i) => i !== idx)
                            );
                          }}
                          className="text-rose-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-7 space-y-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Bank / Wallet Name
                            </label>
                            <input
                              type="text"
                              value={qrItem.bankName ?? qrItem.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompQrCodes((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          bankName: val,
                                          label: val,
                                        }
                                      : item
                                  )
                                );
                              }}
                              placeholder="e.g. Meezan Bank, HBL, JazzCash, EasyPaisa, Raast"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Account Title / Number (Optional)
                            </label>
                            <input
                              type="text"
                              value={qrItem.accountNumber ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompQrCodes((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          accountNumber: val,
                                        }
                                      : item
                                  )
                                );
                              }}
                              placeholder="e.g. 0101-0104567890 / Title: Enterprise Ltd"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                            />
                          </div>
                        </div>

                        {/* QR Image preview & upload */}
                        <div className="sm:col-span-5">
                          <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white min-h-[90px] text-center">
                            {qrItem.dataUrl ? (
                              <img
                                src={qrItem.dataUrl}
                                alt={qrItem.bankName || 'QR Code'}
                                className="h-12 w-12 object-contain rounded border border-slate-200 bg-white p-0.5"
                              />
                            ) : (
                              <UploadCloud className="w-5 h-5 text-blue-600" />
                            )}
                            <span className="text-[10px] font-medium text-slate-700">
                              {qrItem.dataUrl ? 'Change QR Image' : 'Upload QR Image'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    const resultData = reader.result;
                                    setCompQrCodes((prev) =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? { ...item, dataUrl: resultData }
                                          : item
                                      )
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
