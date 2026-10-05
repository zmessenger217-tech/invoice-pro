import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  History,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  AVAILABLE_MONTHS,
  CategoryTerminology,
  formatCurrency,
  getCurrentMonthLabel,
  getDueDateForMonth,
  getIssueDateForMonth,
  getOrComputeMonthlyRecord,
  getPreviousMonthName,
} from '../data/initialData';
import {
  ActiveNavTab,
  ClientEntity,
  CompanyProfile,
  PaymentTransaction,
} from '../types';
import { RevenueExpenseChart } from './RevenueExpenseChart';

interface ClientBillingViewsProps {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  company: CompanyProfile;
  term: CategoryTerminology;
  clients: ClientEntity[];
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  monthlyRevenue: number;
  monthlyExpenses: number;
  partnerPayoutsTotal: number;
  onSaveClient: (client: ClientEntity, isNew: boolean) => void;
  onDeleteClient: (clientId: string) => void;
  onRecordPaymentWithCharges: (
    clientId: string,
    month: string,
    softwareCharges: number,
    whatsappRate: number,
    whatsappMessages: number,
    chatbotCharges: number,
    amountPaidNow: number,
    method: PaymentTransaction['method'],
    note: string
  ) => void;
  onGenerateInvoiceWithCharges: (
    clientId: string,
    month: string,
    softwareCharges: number,
    whatsappRate: number,
    whatsappMessages: number,
    chatbotCharges: number
  ) => void;
  onQuickDownloadInvoice: (clientId: string, month: string) => void;
  onQuickPrintInvoice: (clientId: string, month: string) => void;
  onQuickWhatsAppInvoice: (clientId: string, month: string) => void;
}

export const ClientBillingViews: React.FC<ClientBillingViewsProps> = ({
  activeTab,
  setActiveTab,
  company,
  term,
  clients,
  selectedMonth,
  setSelectedMonth,
  monthlyRevenue,
  monthlyExpenses,
  partnerPayoutsTotal,
  onSaveClient,
  onDeleteClient,
  onRecordPaymentWithCharges,
  onGenerateInvoiceWithCharges,
  onQuickDownloadInvoice,
  onQuickPrintInvoice,
  onQuickWhatsAppInvoice,
}) => {
  const currency = company.currency || 'Rs.';
  const activeClients = clients.filter((c) => c.enabled);

  // Add / Edit Client Form State — starts clean when adding a new school
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [softwareEnabled, setSoftwareEnabled] = useState(true);
  const [softwareCharges, setSoftwareCharges] = useState<string>('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappRate, setWhatsappRate] = useState<string>('');
  const [whatsappMessages, setWhatsappMessages] = useState<string>('');
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotCharges, setChatbotCharges] = useState<string>('');
  const [clientSavedBanner, setClientSavedBanner] = useState<string | null>(
    null
  );

  // Check & Balance Filters
  const [cbSearch, setCbSearch] = useState('');
  const [cbStatusFilter, setCbStatusFilter] = useState<
    'All' | 'Paid' | 'Partially Paid' | 'Unpaid'
  >('All');
  const [cbPeriodFilter, setCbPeriodFilter] = useState<
    'This Month' | 'Previous Month' | 'Custom Month' | 'Yearly'
  >('This Month');

  // Make Payment Modal State (Screen 7) — pre-filled with the school's saved charges & WhatsApp rate/messages
  const [paymentModalClient, setPaymentModalClient] =
    useState<ClientEntity | null>(null);
  const [modalSoftwareCharges, setModalSoftwareCharges] = useState<number>(0);
  const [modalWhatsappRate, setModalWhatsappRate] = useState<number>(0);
  const [modalWhatsappMessages, setModalWhatsappMessages] = useState<number>(0);
  const [modalChatbotCharges, setModalChatbotCharges] = useState<number>(0);
  const [paymentInputAmount, setPaymentInputAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentTransaction['method']>('Bank Transfer');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // History Modal State
  const [historyModalClient, setHistoryModalClient] =
    useState<ClientEntity | null>(null);
  const [deleteModalClient, setDeleteModalClient] =
    useState<ClientEntity | null>(null);

  // Invoices Generator Selection (Screen 8) — pre-filled with the selected school's WhatsApp rate & messages
  const [invGeneratorClientId, setInvGeneratorClientId] = useState<string>(
    clients[0]?.id || ''
  );
  const [genSoftwareCharges, setGenSoftwareCharges] = useState<number>(0);
  const [genWhatsappRate, setGenWhatsappRate] = useState<number>(0);
  const [genWhatsappMessages, setGenWhatsappMessages] = useState<number>(0);
  const [genChatbotCharges, setGenChatbotCharges] = useState<number>(0);

  // Keep Invoice Generator fields synced and pre-filled with the selected school's saved amounts & WhatsApp rate/messages
  useEffect(() => {
    const targetId = invGeneratorClientId || clients[0]?.id || '';
    if (targetId && targetId !== invGeneratorClientId) {
      setInvGeneratorClientId(targetId);
    }
    const client = clients.find((c) => c.id === targetId);
    if (client) {
      const rec = getOrComputeMonthlyRecord(client, selectedMonth);
      setGenSoftwareCharges(rec.softwareCharges);
      setGenWhatsappRate(rec.whatsappRate);
      setGenWhatsappMessages(rec.whatsappMessages);
      setGenChatbotCharges(rec.chatbotCharges);
    }
  }, [invGeneratorClientId, clients, selectedMonth]);

  const loadClientIntoForm = (c: ClientEntity) => {
    setEditingClientId(c.id);
    setClientName(c.name);
    setClientAddress(c.address);
    setClientPhone(c.phone);
    setSoftwareEnabled(c.softwareEnabled);
    setSoftwareCharges(String(c.softwareCharges));
    setWhatsappEnabled(c.whatsappEnabled);
    setWhatsappRate(String(c.whatsappRate));
    setWhatsappMessages(String(c.whatsappMessages));
    setChatbotEnabled(c.chatbotEnabled);
    setChatbotCharges(String(c.chatbotCharges));
    setActiveTab('add-client');
  };

  const resetClientForm = () => {
    setEditingClientId(null);
    setClientName('');
    setClientAddress('');
    setClientPhone('');
    setSoftwareEnabled(true);
    setSoftwareCharges('');
    setWhatsappEnabled(true);
    setWhatsappRate('');
    setWhatsappMessages('');
    setChatbotEnabled(true);
    setChatbotCharges('');
  };

  const openPaymentModalForClient = (client: ClientEntity) => {
    const rec = getOrComputeMonthlyRecord(client, selectedMonth);
    setPaymentModalClient(client);
    // Pre-fill with the amounts, rate per message, and number of messages already entered when adding the school
    setModalSoftwareCharges(rec.softwareCharges);
    setModalWhatsappRate(rec.whatsappRate);
    setModalWhatsappMessages(rec.whatsappMessages);
    setModalChatbotCharges(rec.chatbotCharges);
    setPaymentInputAmount(String(rec.remainingDues || 0));
    setPaymentNote('');
  };

  const numSoftware = softwareEnabled ? Number(softwareCharges) || 0 : 0;
  const numRate = whatsappEnabled ? Number(whatsappRate) || 0 : 0;
  const numMessages = whatsappEnabled ? Number(whatsappMessages) || 0 : 0;
  const calculatedWhatsappTotal = whatsappEnabled
    ? Math.round(numRate * numMessages)
    : 0;
  const numChatbot = chatbotEnabled ? Number(chatbotCharges) || 0 : 0;
  const calculatedClientTotal =
    numSoftware + calculatedWhatsappTotal + numChatbot;

  const handleClientFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingClientId;
    const id = editingClientId || `sch-${Date.now()}`;
    const existingClient = clients.find((c) => c.id === editingClientId);

    const existingMonthRec = existingClient?.monthlyRecords[selectedMonth];
    const prevDues = existingMonthRec?.previousDues || 0;
    const paidAlready = existingMonthRec?.amountPaid || 0;
    const totalWithPrev = calculatedClientTotal + prevDues;
    const remDues = Math.max(0, totalWithPrev - paidAlready);

    const updatedRecord = {
      month: selectedMonth,
      softwareCharges: numSoftware,
      whatsappRate: numRate,
      whatsappMessages: numMessages,
      whatsappCharges: calculatedWhatsappTotal,
      chatbotCharges: numChatbot,
      previousDues: prevDues,
      previousDuesLabel:
        existingMonthRec?.previousDuesLabel || 'Previous Dues',
      currentMonthTotal: calculatedClientTotal,
      totalAmount: totalWithPrev,
      amountPaid: paidAlready,
      remainingDues: remDues,
      status:
        remDues === 0
          ? ('Paid' as const)
          : paidAlready > 0
          ? ('Partially Paid' as const)
          : ('Unpaid' as const),
      invoiceNumber:
        existingMonthRec?.invoiceNumber ||
        `INV-${String(clients.length + 1).padStart(3, '0')}`,
      invoiceDate: getIssueDateForMonth(
        selectedMonth,
        existingMonthRec?.invoiceDate
      ),
      dueDate: getDueDateForMonth(selectedMonth, existingMonthRec?.dueDate),
      payments: existingMonthRec?.payments || [],
    };

    const newClient: ClientEntity = {
      id,
      name: clientName.trim(),
      address: clientAddress.trim(),
      phone: clientPhone.trim(),
      enabled: existingClient ? existingClient.enabled : true,
      createdAt: existingClient?.createdAt || '2026-05-15',
      softwareEnabled,
      softwareCharges: numSoftware,
      whatsappEnabled,
      whatsappRate: numRate,
      whatsappMessages: numMessages,
      whatsappCharges: calculatedWhatsappTotal,
      chatbotEnabled,
      chatbotCharges: numChatbot,
      monthlyRecords: {
        ...(existingClient?.monthlyRecords || {}),
        [selectedMonth]: updatedRecord,
      },
    };

    onSaveClient(newClient, isNew);
    setClientSavedBanner(
      `${newClient.name} (${formatCurrency(
        calculatedClientTotal,
        currency
      )}/month) saved.`
    );
    if (isNew) {
      resetClientForm();
    }
    setTimeout(() => setClientSavedBanner(null), 4000);
  };

  // Ledger summary for active clients in selectedMonth
  const ledgerRows = activeClients.map((client) => ({
    client,
    record: getOrComputeMonthlyRecord(client, selectedMonth),
  }));

  const paidCount = ledgerRows.filter((r) => r.record.status === 'Paid').length;
  const unpaidCount = ledgerRows.filter(
    (r) => r.record.status === 'Unpaid'
  ).length;
  const partialCount = ledgerRows.filter(
    (r) => r.record.status === 'Partially Paid'
  ).length;
  const withDuesCount = unpaidCount + partialCount;

  const totalCollected = ledgerRows.reduce(
    (acc, r) => acc + r.record.amountPaid,
    0
  );
  const totalDues = ledgerRows.reduce(
    (acc, r) => acc + r.record.remainingDues,
    0
  );

  const periodMultiplier = cbPeriodFilter === 'Yearly' ? 12 : 1;

  const filteredLedgerRows = ledgerRows.filter(({ client, record }) => {
    const matchesSearch =
      client.name.toLowerCase().includes(cbSearch.toLowerCase()) ||
      client.phone.toLowerCase().includes(cbSearch.toLowerCase()) ||
      record.invoiceNumber.toLowerCase().includes(cbSearch.toLowerCase());
    const matchesStatus =
      cbStatusFilter === 'All' || record.status === cbStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // 4. MAIN DASHBOARD VIEW
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of {term.plural.toLowerCase()}, revenue, expenses, and dues for{' '}
              <strong>{selectedMonth}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {AVAILABLE_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                resetClientForm();
                setActiveTab('add-client');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {term.singular}</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Total {term.plural}
              </div>
              <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1.5">
                {activeClients.length}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Monthly Revenue
              </div>
              <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
                {formatCurrency(monthlyRevenue, currency)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Monthly Expenses
              </div>
              <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1.5">
                {formatCurrency(monthlyExpenses, currency)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">
                {term.plural} Paid
              </div>
              <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
                {paidCount} / {activeClients.length}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">
                {term.plural} With Dues
              </div>
              <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1.5">
                {withDuesCount} / {activeClients.length}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-600">
                Total Revenue After Partner Payments
              </div>
              <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1.5">
                {formatCurrency(monthlyRevenue - partnerPayoutsTotal, currency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                After {formatCurrency(partnerPayoutsTotal, currency)} partner payments
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Monthly Revenue vs Expenses Chart */}
        <RevenueExpenseChart
          title="Revenue vs Expenses"
          activeMonth={selectedMonth}
          activeMonthRevenue={monthlyRevenue}
          activeMonthExpenses={monthlyExpenses}
          currency={currency}
        />
      </div>
    );
  }

  // 5. ADD / EDIT CLIENT VIEW
  if (activeTab === 'add-client') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {editingClientId
                  ? `Edit ${term.singular}`
                  : `Add ${term.singular}`}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter basic details, software charges, WhatsApp rate &amp; message count, and chatbot charges
              </p>
            </div>
            {editingClientId && (
              <button
                type="button"
                onClick={resetClientForm}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                + New {term.singular}
              </button>
            )}
          </div>

          {clientSavedBanner && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center justify-between">
              <span>{clientSavedBanner}</span>
              <button
                type="button"
                onClick={() => setActiveTab('check-balance')}
                className="text-emerald-700 font-semibold underline ml-3"
              >
                View in Check &amp; Balance
              </button>
            </div>
          )}

          <form onSubmit={handleClientFormSubmit} className="space-y-5">
            {/* Basic Details */}
            <div className="space-y-3.5">
              <h2 className="text-xs font-bold text-slate-800">
                Basic Details
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {term.singular} Name
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={term.sampleName}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder={term.addressPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Description */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h2 className="text-xs font-bold text-slate-800">
                Payment Description
              </h2>

              {/* 1. Software Charges */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={softwareEnabled}
                    onChange={(e) => setSoftwareEnabled(e.target.checked)}
                    className="rounded-full text-blue-600 focus:ring-blue-500"
                  />
                  <span>Software Charges</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min={0}
                    required={softwareEnabled}
                    disabled={!softwareEnabled}
                    value={softwareCharges}
                    onChange={(e) => setSoftwareCharges(e.target.value)}
                    placeholder="15000"
                    className="w-28 px-3 py-1.5 text-xs font-mono font-semibold text-right rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* 2. WhatsApp Charges (Rate x Messages = WhatsApp Charges) */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                      className="rounded-full text-blue-600 focus:ring-blue-500"
                    />
                    <span>WhatsApp Charges</span>
                  </label>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(calculatedWhatsappTotal, currency)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {numRate} × {numMessages.toLocaleString()} ={' '}
                      {calculatedWhatsappTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                {whatsappEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Rate per message ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        required={whatsappEnabled}
                        value={whatsappRate}
                        onChange={(e) => setWhatsappRate(e.target.value)}
                        placeholder="0.50"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Number of messages
                      </label>
                      <input
                        type="number"
                        step="1"
                        min={0}
                        required={whatsappEnabled}
                        value={whatsappMessages}
                        onChange={(e) => setWhatsappMessages(e.target.value)}
                        placeholder="20000"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Chatbot Charges */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatbotEnabled}
                    onChange={(e) => setChatbotEnabled(e.target.checked)}
                    className="rounded-full text-blue-600 focus:ring-blue-500"
                  />
                  <span>Chatbot Charges</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min={0}
                    required={chatbotEnabled}
                    disabled={!chatbotEnabled}
                    value={chatbotCharges}
                    onChange={(e) => setChatbotCharges(e.target.value)}
                    placeholder="5000"
                    className="w-28 px-3 py-1.5 text-xs font-mono font-semibold text-right rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Total Amount Bar */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Total Amount
                </div>
                <div className="text-[11px] text-slate-500">
                  Software + WhatsApp + Chatbot Charges
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {formatCurrency(calculatedClientTotal, currency)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              {editingClientId && (
                <button
                  type="button"
                  onClick={() => {
                    const target = clients.find(
                      (c) => c.id === editingClientId
                    );
                    if (target) setDeleteModalClient(target);
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete {term.singular}</span>
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                Save {term.singular}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Existing Clients Quick Edit List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Saved {term.plural} ({clients.length})
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Click any {term.singular.toLowerCase()} below to edit their saved charges, WhatsApp rate, or message count.
          </p>

          {clients.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No {term.plural.toLowerCase()} added yet. Fill out the form on the left to add your first {term.singular.toLowerCase()}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {clients.map((c) => {
                const monthlyTotal =
                  (c.softwareEnabled ? c.softwareCharges : 0) +
                  (c.whatsappEnabled
                    ? Math.round(c.whatsappRate * c.whatsappMessages)
                    : 0) +
                  (c.chatbotEnabled ? c.chatbotCharges : 0);
                return (
                  <div
                    key={c.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        WhatsApp: {c.whatsappRate} ×{' '}
                        {c.whatsappMessages.toLocaleString()} ·{' '}
                        <span className="font-mono font-semibold text-slate-700">
                          {formatCurrency(monthlyTotal, currency)}/mo
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadClientIntoForm(c)}
                        className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteModalClient(c)}
                        title={`Delete ${term.singular}`}
                        className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {deleteModalClient && (
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
                    Are you sure you want to delete{' '}
                    <strong>{deleteModalClient.name}</strong>?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalClient(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingClientId === deleteModalClient.id) {
                      resetClientForm();
                    }
                    onDeleteClient(deleteModalClient.id);
                    setDeleteModalClient(null);
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

  // 6 & 7. CHECK & BALANCE + MAKE PAYMENT MODAL
  if (activeTab === 'check-balance') {
    const activeModalRecord = paymentModalClient
      ? getOrComputeMonthlyRecord(paymentModalClient, selectedMonth)
      : null;

    const modalWhatsappTotal = Math.round(
      (Number(modalWhatsappRate) || 0) * (Number(modalWhatsappMessages) || 0)
    );
    const modalCurrentMonthTotal =
      (Number(modalSoftwareCharges) || 0) +
      modalWhatsappTotal +
      (Number(modalChatbotCharges) || 0);
    const modalGrandTotal =
      modalCurrentMonthTotal + (activeModalRecord?.previousDues || 0);
    const enteredPayNum = Number(paymentInputAmount) || 0;
    const previewRemainingAfterPay = activeModalRecord
      ? Math.max(
          0,
          modalGrandTotal - (activeModalRecord.amountPaid + enteredPayNum)
        )
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Check &amp; Balance
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial tracking, payment statuses, and remaining dues for active{' '}
              {term.plural.toLowerCase()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={cbPeriodFilter}
              onChange={(e) => {
                const val = e.target.value as typeof cbPeriodFilter;
                setCbPeriodFilter(val);
                const currentMonth = getCurrentMonthLabel();
                if (val === 'This Month') {
                  setSelectedMonth(currentMonth);
                } else if (val === 'Previous Month') {
                  setSelectedMonth(getPreviousMonthName(currentMonth));
                }
              }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="This Month">This Month</option>
              <option value="Previous Month">Previous Month</option>
              <option value="Custom Month">Custom Month</option>
              <option value="Yearly">Yearly</option>
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => {
                setCbPeriodFilter('Custom Month');
                setSelectedMonth(e.target.value);
              }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {AVAILABLE_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-500">
              Paid {term.plural}
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
              {paidCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-4">
            <div className="text-xs font-medium text-slate-600">
              Unpaid {term.plural}
            </div>
            <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1">
              {unpaidCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-4">
            <div className="text-xs font-medium text-slate-600">
              Partially Paid
            </div>
            <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1">
              {partialCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-500">
              Total Collected
            </div>
            <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
              {formatCurrency(totalCollected * periodMultiplier, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-4 col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-slate-600">Total Dues</div>
            <div className="text-xl font-bold text-rose-600 font-mono tabular-nums mt-1">
              {formatCurrency(totalDues * periodMultiplier, currency)}
            </div>
          </div>
        </div>

        {/* Search & Status Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cbSearch}
                onChange={(e) => setCbSearch(e.target.value)}
                placeholder={`Search ${term.singular.toLowerCase()}...`}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['All', 'Paid', 'Partially Paid', 'Unpaid'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCbStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      cbStatusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Check & Balance Table */}
          {filteredLedgerRows.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs text-slate-500">
                No active {term.plural.toLowerCase()} found. Add a{' '}
                {term.singular.toLowerCase()} to start tracking monthly payments and dues.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetClientForm();
                  setActiveTab('add-client');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add {term.singular}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-3">{term.singular} Name</th>
                    <th className="py-3 px-3">WhatsApp (Rate × Msgs)</th>
                    <th className="py-3 px-3 text-right">Prev. Dues</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Dues</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLedgerRows.map(({ client, record }) => (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-semibold text-slate-900">
                        <div>{client.name}</div>
                        <div className="text-[11px] font-normal text-slate-400">
                          {client.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">
                        {record.whatsappRate} ×{' '}
                        {record.whatsappMessages.toLocaleString()} ={' '}
                        {formatCurrency(record.whatsappCharges, currency)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-500">
                        {record.previousDues > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {formatCurrency(record.previousDues, currency)}
                          </span>
                        ) : (
                          `${currency} 0`
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(
                          record.totalAmount * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-700 tabular-nums">
                        {formatCurrency(
                          record.amountPaid * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-rose-600 tabular-nums">
                        {formatCurrency(
                          record.remainingDues * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                            record.status === 'Paid'
                              ? 'text-emerald-700'
                              : record.status === 'Partially Paid'
                              ? 'text-amber-700'
                              : 'text-rose-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              record.status === 'Paid'
                                ? 'bg-emerald-600'
                                : record.status === 'Partially Paid'
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                            }`}
                          />
                          <span>{record.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPaymentModalForClient(client)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Make Payment
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onGenerateInvoiceWithCharges(
                                client.id,
                                selectedMonth,
                                record.softwareCharges,
                                record.whatsappRate,
                                record.whatsappMessages,
                                record.chatbotCharges
                              )
                            }
                            title="Open in Invoice Editor"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryModalClient(client)}
                            title="Payment History"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalClient(client)}
                            title={`Delete ${term.singular}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 7. MAKE PAYMENT MODAL — Pre-filled with saved WhatsApp Rate, Messages, and Charges */}
        {paymentModalClient && activeModalRecord && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Make Payment — {selectedMonth}
                  </h3>
                  <p className="text-sm font-semibold text-blue-600 mt-0.5">
                    {paymentModalClient.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalClient(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pre-filled Monthly Charges & WhatsApp Rate/Messages Verification */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="font-semibold text-slate-800">
                  Monthly Charges &amp; WhatsApp Usage (Pre-filled from{' '}
                  {term.singular})
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      WhatsApp Rate per Message
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={modalWhatsappRate}
                      onChange={(e) =>
                        setModalWhatsappRate(Number(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Number of WhatsApp Messages
                    </label>
                    <input
                      type="number"
                      step="1"
                      min={0}
                      value={modalWhatsappMessages}
                      onChange={(e) =>
                        setModalWhatsappMessages(Number(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg font-mono">
                  <span>
                    WhatsApp Charges ({modalWhatsappRate} ×{' '}
                    {modalWhatsappMessages.toLocaleString()})
                  </span>
                  <span className="font-bold">
                    {formatCurrency(modalWhatsappTotal, currency)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Software Charges ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={modalSoftwareCharges}
                      onChange={(e) =>
                        setModalSoftwareCharges(Number(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Chatbot Charges ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={modalChatbotCharges}
                      onChange={(e) =>
                        setModalChatbotCharges(Number(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-b border-slate-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Amount</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(modalGrandTotal, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Already Paid</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {formatCurrency(activeModalRecord.amountPaid, currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 flex items-center justify-between">
                  <span className="font-bold text-rose-600">
                    Remaining Dues
                  </span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatCurrency(previewRemainingAfterPay, currency)}
                  </span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onRecordPaymentWithCharges(
                    paymentModalClient.id,
                    selectedMonth,
                    modalSoftwareCharges,
                    modalWhatsappRate,
                    modalWhatsappMessages,
                    modalChatbotCharges,
                    enteredPayNum,
                    paymentMethod,
                    paymentNote
                  );
                  setPaymentModalClient(null);
                }}
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      How much did the {term.singular.toLowerCase()} pay?
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentInputAmount(
                          String(
                            Math.max(
                              0,
                              modalGrandTotal - activeModalRecord.amountPaid
                            )
                          )
                        )
                      }
                      className="text-[11px] text-blue-600 font-semibold hover:underline"
                    >
                      Pay Full Remaining
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={modalGrandTotal}
                    required
                    value={paymentInputAmount}
                    onChange={(e) => setPaymentInputAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as PaymentTransaction['method']
                        )
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Online / QR">Online / QR</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Reference Note
                    </label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Optional note"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentModalClient(null)}
                    className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {historyModalClient && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Payment History — {historyModalClient.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete chronological payment ledger across billing months
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModalClient(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {Object.values(historyModalClient.monthlyRecords).flatMap(
                  (rec) => rec.payments
                ).length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    No payments recorded yet for {historyModalClient.name}.
                  </div>
                ) : (
                  Object.values(historyModalClient.monthlyRecords)
                    .flatMap((rec) => rec.payments)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {p.month} · {p.method}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Date: {p.date} {p.note ? `· ${p.note}` : ''}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-emerald-600">
                          +{formatCurrency(p.amount, currency)}
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryModalClient(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteModalClient && (
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
                    Are you sure you want to delete{' '}
                    <strong>{deleteModalClient.name}</strong>?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalClient(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteClient(deleteModalClient.id);
                    setDeleteModalClient(null);
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

  // 8. INVOICES GENERATOR LIST VIEW (Asks for WhatsApp Rate & Messages every time, pre-filled from when school was added)
  const genWhatsappTotal = Math.round(
    (Number(genWhatsappRate) || 0) * (Number(genWhatsappMessages) || 0)
  );
  const genTotal =
    (Number(genSoftwareCharges) || 0) +
    genWhatsappTotal +
    (Number(genChatbotCharges) || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify WhatsApp rate &amp; message count (pre-filled from{' '}
          {term.singular.toLowerCase()} setup), generate invoices, download PDF with{' '}
          {term.singular.toLowerCase()} name, or share via WhatsApp
        </p>
      </div>

      {/* Top Generator Card — Asks for WhatsApp Rate & Number of Messages every time, pre-filled from School setup */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Select {term.singular}
            </label>
            <select
              value={invGeneratorClientId}
              onChange={(e) => setInvGeneratorClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            >
              {clients.length === 0 ? (
                <option value="">No {term.plural} Added Yet</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {!c.enabled ? '(Disabled)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            >
              {AVAILABLE_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!invGeneratorClientId}
            onClick={() =>
              onGenerateInvoiceWithCharges(
                invGeneratorClientId,
                selectedMonth,
                genSoftwareCharges,
                genWhatsappRate,
                genWhatsappMessages,
                genChatbotCharges
              )
            }
            className="w-full py-2.5 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Generate Invoice
          </button>
        </div>

        {/* Pre-filled Rate per message, Number of messages, and Charges bar */}
        {invGeneratorClientId && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                WhatsApp Rate / Msg
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={genWhatsappRate}
                onChange={(e) =>
                  setGenWhatsappRate(Number(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/30 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                No. of Messages
              </label>
              <input
                type="number"
                step="1"
                min={0}
                value={genWhatsappMessages}
                onChange={(e) =>
                  setGenWhatsappMessages(Number(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/30 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Software Charges
              </label>
              <input
                type="number"
                min={0}
                value={genSoftwareCharges}
                onChange={(e) =>
                  setGenSoftwareCharges(Number(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Chatbot Charges
              </label>
              <input
                type="number"
                min={0}
                value={genChatbotCharges}
                onChange={(e) =>
                  setGenChatbotCharges(Number(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
              />
            </div>

            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-right">
              <div className="text-[10px] text-slate-500">
                WhatsApp: {formatCurrency(genWhatsappTotal, currency)}
              </div>
              <div className="font-mono font-bold text-slate-900 text-xs">
                Total: {formatCurrency(genTotal, currency)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No {term.plural.toLowerCase()} added yet. Add a{' '}
            {term.singular.toLowerCase()} first to generate invoices.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3.5 px-4">Invoice No.</th>
                  <th className="py-3.5 px-4">{term.singular}</th>
                  <th className="py-3.5 px-4">Month</th>
                  <th className="py-3.5 px-4">WhatsApp (Rate × Msgs)</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {clients.map((client, idx) => {
                  const rec = getOrComputeMonthlyRecord(client, selectedMonth);
                  const invNo =
                    rec.invoiceNumber ||
                    `INV-${String(idx + 1).padStart(3, '0')}`;
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {invNo}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {client.name}
                        {!client.enabled && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">
                            (Disabled)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {selectedMonth}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {rec.whatsappRate} ×{' '}
                        {rec.whatsappMessages.toLocaleString()} ={' '}
                        {formatCurrency(rec.whatsappCharges, currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(rec.totalAmount, currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                            rec.status === 'Paid'
                              ? 'text-emerald-700'
                              : rec.status === 'Partially Paid'
                              ? 'text-amber-700'
                              : 'text-rose-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rec.status === 'Paid'
                                ? 'bg-emerald-600'
                                : rec.status === 'Partially Paid'
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                            }`}
                          />
                          <span>{rec.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onGenerateInvoiceWithCharges(
                                client.id,
                                selectedMonth,
                                rec.softwareCharges,
                                rec.whatsappRate,
                                rec.whatsappMessages,
                                rec.chatbotCharges
                              )
                            }
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Edit / Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickPrintInvoice(client.id, selectedMonth)
                            }
                            title="Print Invoice"
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                            <span>Print</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickDownloadInvoice(client.id, selectedMonth)
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickWhatsAppInvoice(client.id, selectedMonth)
                            }
                            title="Share via WhatsApp (Without Downloading)"
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
