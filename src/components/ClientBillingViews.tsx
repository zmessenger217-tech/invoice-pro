import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  History,
  Layers,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
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
  PartnerItem,
  PaymentTransaction,
} from '../types';
import { RevenueExpenseChart } from './RevenueExpenseChart';

interface ClientBillingViewsProps {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  company: CompanyProfile;
  term: CategoryTerminology;
  clients: ClientEntity[];
  partners?: PartnerItem[];
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
    note: string,
    whatsappBillingType?: 'per_message' | 'per_month',
    whatsappCharges?: number
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
  onDeleteInvoice?: (clientId: string, month: string) => void;
  onGenerateAllMonthlyInvoices?: (
    month: string
  ) => Promise<{ count: number; totalAmount: number } | void> | void;
}

export const ClientBillingViews: React.FC<ClientBillingViewsProps> = ({
  activeTab,
  setActiveTab,
  company,
  term,
  clients,
  partners = [],
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
  onDeleteInvoice,
  onGenerateAllMonthlyInvoices,
}) => {
  const currency = company.currency || 'Rs.';
  const activeClients = clients.filter((c) => c.enabled);

  // Batch Generation State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchSuccessBanner, setBatchSuccessBanner] = useState<string | null>(
    null
  );

  // Add / Edit Client Form State — starts clean when adding a new school
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [softwareEnabled, setSoftwareEnabled] = useState(true);
  const [softwareCharges, setSoftwareCharges] = useState<string>('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappBillingType, setWhatsappBillingType] = useState<
    'per_message' | 'per_month'
  >('per_message');
  const [whatsappRate, setWhatsappRate] = useState<string>('');
  const [whatsappMessages, setWhatsappMessages] = useState<string>('');
  const [whatsappMonthlyCharges, setWhatsappMonthlyCharges] =
    useState<string>('');
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotCharges, setChatbotCharges] = useState<string>('');
  // Partner Payment State
  const [partnerPaymentEnabled, setPartnerPaymentEnabled] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');
  const [partnerSoftwareCharges, setPartnerSoftwareCharges] =
    useState<string>('');
  const [partnerWhatsappCharges, setPartnerWhatsappCharges] =
    useState<string>('');
  const [partnerChatbotCharges, setPartnerChatbotCharges] =
    useState<string>('');
  const [partnerNote, setPartnerNote] = useState<string>('');

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
  const [modalWhatsappBillingType, setModalWhatsappBillingType] = useState<
    'per_message' | 'per_month'
  >('per_message');
  const [modalWhatsappRate, setModalWhatsappRate] = useState<number>(0);
  const [modalWhatsappMessages, setModalWhatsappMessages] = useState<number>(0);
  const [modalWhatsappMonthlyCharges, setModalWhatsappMonthlyCharges] =
    useState<number>(0);
  const [modalChatbotCharges, setModalChatbotCharges] = useState<number>(0);
  const [paymentInputAmount, setPaymentInputAmount] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentTransaction['method']>('Bank Transfer');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // History Modal State
  const [historyModalClient, setHistoryModalClient] =
    useState<ClientEntity | null>(null);
  const [deleteModalClient, setDeleteModalClient] =
    useState<ClientEntity | null>(null);
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<{
    clientId: string;
    clientName: string;
    month: string;
    invoiceNumber: string;
  } | null>(null);

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
      const isPerMonth =
        rec.whatsappBillingType === 'per_month' ||
        client.whatsappBillingType === 'per_month';
      if (isPerMonth) {
        setGenWhatsappRate(
          rec.whatsappCharges !== undefined && rec.whatsappCharges > 0
            ? rec.whatsappCharges
            : client.whatsappCharges !== undefined && client.whatsappCharges > 0
            ? client.whatsappCharges
            : 0
        );
        setGenWhatsappMessages(1);
      } else {
        setGenWhatsappRate(rec.whatsappRate);
        setGenWhatsappMessages(rec.whatsappMessages);
      }
      setGenChatbotCharges(rec.chatbotCharges);
    }
  }, [invGeneratorClientId, clients, selectedMonth]);

  const loadClientIntoForm = (c: ClientEntity) => {
    const monthRec = c.monthlyRecords[selectedMonth];
    const billingType =
      monthRec?.whatsappBillingType || c.whatsappBillingType || 'per_message';
    setEditingClientId(c.id);
    setClientName(c.name);
    setClientAddress(c.address);
    setClientPhone(c.phone);
    setSoftwareEnabled(c.softwareEnabled);
    setSoftwareCharges(String(c.softwareCharges));
    setWhatsappEnabled(c.whatsappEnabled);
    setWhatsappBillingType(billingType);
    if (billingType === 'per_month') {
      setWhatsappMonthlyCharges(
        monthRec?.whatsappCharges !== undefined
          ? String(monthRec.whatsappCharges)
          : c.whatsappCharges !== undefined
          ? String(c.whatsappCharges)
          : ''
      );
      setWhatsappRate('');
      setWhatsappMessages('');
    } else {
      setWhatsappRate(
        monthRec?.whatsappRate !== undefined
          ? String(monthRec.whatsappRate)
          : String(c.whatsappRate)
      );
      setWhatsappMessages(
        monthRec?.whatsappMessages !== undefined
          ? String(monthRec.whatsappMessages)
          : String(c.whatsappMessages)
      );
      setWhatsappMonthlyCharges('');
    }
    setChatbotEnabled(c.chatbotEnabled);
    setChatbotCharges(String(c.chatbotCharges));
    // Load partner payment settings
    setPartnerPaymentEnabled(
      monthRec?.partnerPaymentEnabled ?? c.partnerPaymentEnabled ?? false
    );
    setPartnerId(monthRec?.partnerId ?? c.partnerId ?? '');
    setPartnerSoftwareCharges(
      monthRec?.partnerSoftwareCharges !== undefined
        ? String(monthRec.partnerSoftwareCharges)
        : c.partnerSoftwareCharges !== undefined
        ? String(c.partnerSoftwareCharges)
        : ''
    );
    setPartnerWhatsappCharges(
      monthRec?.partnerWhatsappCharges !== undefined
        ? String(monthRec.partnerWhatsappCharges)
        : c.partnerWhatsappCharges !== undefined
        ? String(c.partnerWhatsappCharges)
        : ''
    );
    setPartnerChatbotCharges(
      monthRec?.partnerChatbotCharges !== undefined
        ? String(monthRec.partnerChatbotCharges)
        : c.partnerChatbotCharges !== undefined
        ? String(c.partnerChatbotCharges)
        : ''
    );
    setPartnerNote(monthRec?.partnerNote ?? c.partnerNote ?? '');
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
    setWhatsappBillingType('per_message');
    setWhatsappRate('');
    setWhatsappMessages('');
    setWhatsappMonthlyCharges('');
    setChatbotEnabled(true);
    setChatbotCharges('');
    setPartnerPaymentEnabled(false);
    setPartnerId('');
    setPartnerSoftwareCharges('');
    setPartnerWhatsappCharges('');
    setPartnerChatbotCharges('');
    setPartnerNote('');
  };

  const openPaymentModalForClient = (client: ClientEntity) => {
    const rec = getOrComputeMonthlyRecord(client, selectedMonth);
    const billingType =
      rec.whatsappBillingType ||
      client.whatsappBillingType ||
      'per_message';
    setPaymentModalClient(client);
    // Pre-fill with the amounts, rate per message, and number of messages already entered when adding the school
    setModalSoftwareCharges(rec.softwareCharges);
    setModalWhatsappBillingType(billingType);
    if (billingType === 'per_month') {
      const monthlyAmount =
        rec.whatsappCharges !== undefined && rec.whatsappCharges > 0
          ? rec.whatsappCharges
          : client.whatsappCharges !== undefined && client.whatsappCharges > 0
          ? client.whatsappCharges
          : 0;
      setModalWhatsappMonthlyCharges(monthlyAmount);
      setModalWhatsappRate(monthlyAmount);
      setModalWhatsappMessages(1);
    } else {
      setModalWhatsappMonthlyCharges(rec.whatsappCharges || 0);
      setModalWhatsappRate(rec.whatsappRate);
      setModalWhatsappMessages(rec.whatsappMessages);
    }
    setModalChatbotCharges(rec.chatbotCharges);
    setPaymentInputAmount(String(rec.remainingDues || 0));
    const defaultBank =
      company.qrCodes?.[0]?.bankName ||
      company.qrCodes?.[0]?.label ||
      '';
    setSelectedBank(defaultBank);
    setPaymentMethod(defaultBank ? 'Bank Transfer' : 'Bank Transfer');
    setPaymentNote('');
  };

  const numSoftware = softwareEnabled ? Number(softwareCharges) || 0 : 0;
  const numRate = whatsappEnabled ? Number(whatsappRate) || 0 : 0;
  const numMessages = whatsappEnabled ? Number(whatsappMessages) || 0 : 0;
  const numMonthlyWhatsapp = whatsappEnabled
    ? Number(whatsappMonthlyCharges) || 0
    : 0;
  const calculatedWhatsappTotal = whatsappEnabled
    ? whatsappBillingType === 'per_month'
      ? numMonthlyWhatsapp
      : Math.round(numRate * numMessages)
    : 0;
  const numChatbot = chatbotEnabled ? Number(chatbotCharges) || 0 : 0;
  const calculatedClientTotal =
    numSoftware + calculatedWhatsappTotal + numChatbot;

  const numPartnerSoftware = partnerPaymentEnabled
    ? Number(partnerSoftwareCharges) || 0
    : 0;
  const numPartnerWhatsapp = partnerPaymentEnabled
    ? Number(partnerWhatsappCharges) || 0
    : 0;
  const numPartnerChatbot = partnerPaymentEnabled
    ? Number(partnerChatbotCharges) || 0
    : 0;
  const calculatedPartnerTotal =
    numPartnerSoftware + numPartnerWhatsapp + numPartnerChatbot;
  const selectedPartnerObj = partners.find((p) => p.id === partnerId);

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
      whatsappBillingType,
      whatsappRate: whatsappBillingType === 'per_month' ? 0 : numRate,
      whatsappMessages: whatsappBillingType === 'per_month' ? 0 : numMessages,
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
      partnerId: partnerPaymentEnabled && partnerId ? partnerId : undefined,
      partnerName:
        partnerPaymentEnabled && selectedPartnerObj
          ? selectedPartnerObj.name
          : undefined,
      partnerPaymentEnabled: partnerPaymentEnabled && Boolean(partnerId),
      partnerSoftwareCharges: numPartnerSoftware,
      partnerWhatsappCharges: numPartnerWhatsapp,
      partnerChatbotCharges: numPartnerChatbot,
      partnerTotalPayment: calculatedPartnerTotal,
      partnerNote: partnerNote.trim() || undefined,
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
      whatsappBillingType,
      whatsappRate: whatsappBillingType === 'per_month' ? 0 : numRate,
      whatsappMessages: whatsappBillingType === 'per_month' ? 0 : numMessages,
      whatsappCharges: calculatedWhatsappTotal,
      chatbotEnabled,
      chatbotCharges: numChatbot,
      partnerId: partnerPaymentEnabled && partnerId ? partnerId : undefined,
      partnerName:
        partnerPaymentEnabled && selectedPartnerObj
          ? selectedPartnerObj.name
          : undefined,
      partnerPaymentEnabled: partnerPaymentEnabled && Boolean(partnerId),
      partnerSoftwareCharges: numPartnerSoftware,
      partnerWhatsappCharges: numPartnerWhatsapp,
      partnerChatbotCharges: numPartnerChatbot,
      partnerTotalPayment: calculatedPartnerTotal,
      partnerNote: partnerNote.trim() || undefined,
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

              {/* 2. WhatsApp Charges (Selection: Per Messages vs Charges Per Month) */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                      className="rounded-full text-blue-600 focus:ring-blue-500"
                    />
                    <span>WhatsApp Charges</span>
                  </label>

                  {whatsappEnabled && (
                    <div className="inline-flex rounded-lg bg-white border border-blue-200 p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setWhatsappBillingType('per_message')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          whatsappBillingType === 'per_message'
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Per Messages
                      </button>
                      <button
                        type="button"
                        onClick={() => setWhatsappBillingType('per_month')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          whatsappBillingType === 'per_month'
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Charges Per Month
                      </button>
                    </div>
                  )}

                  <div className="text-right ml-auto">
                    <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(calculatedWhatsappTotal, currency)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {whatsappBillingType === 'per_month'
                        ? 'Flat Monthly Charge'
                        : `${numRate} × ${numMessages.toLocaleString()} = ${calculatedWhatsappTotal.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                {whatsappEnabled && (
                  <>
                    {whatsappBillingType === 'per_month' ? (
                      <div className="p-3.5 bg-white/90 rounded-lg border border-blue-200/80 space-y-1.5">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <label className="block text-xs font-semibold text-slate-800">
                              Monthly WhatsApp Charges ({currency})
                            </label>
                            <span className="text-[11px] text-blue-700 font-medium">
                              Note: Rate × message calculation will NOT appear on the invoice.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono">
                              {currency}
                            </span>
                            <input
                              type="number"
                              min={0}
                              required={whatsappEnabled && whatsappBillingType === 'per_month'}
                              value={whatsappMonthlyCharges}
                              onChange={(e) =>
                                setWhatsappMonthlyCharges(e.target.value)
                              }
                              placeholder="2500"
                              className="w-32 px-3 py-1.5 text-xs font-mono font-semibold text-right rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Rate per message ({currency})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            required={whatsappEnabled && whatsappBillingType === 'per_message'}
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
                            required={whatsappEnabled && whatsappBillingType === 'per_message'}
                            value={whatsappMessages}
                            onChange={(e) => setWhatsappMessages(e.target.value)}
                            placeholder="20000"
                            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </>
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

              {/* 4. Partner Payment & Service Commission Breakdown */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-indigo-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={partnerPaymentEnabled}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setPartnerPaymentEnabled(next);
                        if (next && !partnerId && partners.length > 0) {
                          setPartnerId(partners[0].id);
                        }
                      }}
                      className="rounded-full text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Partner Payment from this {term.singular}</span>
                    </div>
                  </label>
                  {partnerPaymentEnabled && (
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-700 font-mono tabular-nums">
                        {formatCurrency(calculatedPartnerTotal, currency)}
                      </div>
                      <div className="text-[11px] text-indigo-500">
                        Total Partner Share
                      </div>
                    </div>
                  )}
                </div>

                {partnerPaymentEnabled && (
                  <div className="space-y-3 pt-1 border-t border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Select Partner
                      </label>
                      <select
                        value={partnerId}
                        onChange={(e) => setPartnerId(e.target.value)}
                        required={partnerPaymentEnabled}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:border-indigo-600 focus:outline-none font-medium"
                      >
                        <option value="">-- Choose Partner --</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.phone})
                          </option>
                        ))}
                      </select>
                      {partners.length === 0 && (
                        <p className="text-[11px] text-amber-600 mt-1">
                          No partners created yet. You can add partners in the Partners tab anytime.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Partner Software Charges */}
                      <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Software Cut ({currency})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={partnerSoftwareCharges}
                          onChange={(e) =>
                            setPartnerSoftwareCharges(e.target.value)
                          }
                          placeholder="e.g. 5000"
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:border-indigo-600 focus:outline-none"
                        />
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          School pays: {formatCurrency(numSoftware, currency)}
                        </div>
                      </div>

                      {/* Partner WhatsApp Charges */}
                      <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          WhatsApp Cut ({currency})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={partnerWhatsappCharges}
                          onChange={(e) =>
                            setPartnerWhatsappCharges(e.target.value)
                          }
                          placeholder="e.g. 2000"
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:border-indigo-600 focus:outline-none"
                        />
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          School pays: {formatCurrency(calculatedWhatsappTotal, currency)}
                        </div>
                      </div>

                      {/* Partner Chatbot Charges */}
                      <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Chatbot Cut ({currency})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={partnerChatbotCharges}
                          onChange={(e) =>
                            setPartnerChatbotCharges(e.target.value)
                          }
                          placeholder="e.g. 1000"
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:border-indigo-600 focus:outline-none"
                        />
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          School pays: {formatCurrency(numChatbot, currency)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-100/60 text-xs">
                      <span className="text-slate-600">
                        Net Revenue Retained (After Partner):
                      </span>
                      <span className="font-mono font-bold text-indigo-900">
                        {formatCurrency(
                          Math.max(
                            0,
                            calculatedClientTotal - calculatedPartnerTotal
                          ),
                          currency
                        )}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Partner Payout Note / Detail (Optional)
                      </label>
                      <input
                        type="text"
                        value={partnerNote}
                        onChange={(e) => setPartnerNote(e.target.value)}
                        placeholder="e.g., 20% commission on software & monthly WhatsApp usage"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
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
                const partnerAssigned =
                  c.partnerPaymentEnabled && (c.partnerName || c.partnerId);
                return (
                  <div
                    key={c.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{c.name}</span>
                        {partnerAssigned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Users className="w-2.5 h-2.5" />
                            <span>
                              {c.partnerName || 'Partner'}:{' '}
                              {formatCurrency(c.partnerTotalPayment || 0, currency)}
                            </span>
                          </span>
                        )}
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

    const isModalPerMonth =
      modalWhatsappBillingType === 'per_month' ||
      activeModalRecord?.whatsappBillingType === 'per_month' ||
      paymentModalClient?.whatsappBillingType === 'per_month';

    const modalWhatsappTotal = isModalPerMonth
      ? Number(modalWhatsappMonthlyCharges) || 0
      : Math.round(
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
              <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-50/90 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-3.5 border border-slate-200">{term.singular} Name</th>
                    <th className="py-3 px-3 text-right border border-slate-200 bg-blue-50/30 text-blue-900">Software Charges</th>
                    <th className="py-3 px-3 border border-slate-200 bg-emerald-50/30 text-emerald-900">WhatsApp Charges</th>
                    <th className="py-3 px-3 text-right border border-slate-200 bg-purple-50/30 text-purple-900">Chatbot Charges</th>
                    <th className="py-3 px-3 text-right border border-slate-200">Prev. Dues</th>
                    <th className="py-3 px-3 text-right border border-slate-200">Total Amount</th>
                    <th className="py-3 px-3 text-right border border-slate-200">Paid</th>
                    <th className="py-3 px-3 text-right border border-slate-200">Dues</th>
                    <th className="py-3 px-3.5 border border-slate-200">Status</th>
                    <th className="py-3 px-3 text-right border border-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {filteredLedgerRows.map(({ client, record }) => (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-3.5 font-semibold text-slate-900 border border-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{client.name}</span>
                          {(record.partnerPaymentEnabled || client.partnerPaymentEnabled) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title={`Partner: ${record.partnerName || client.partnerName || 'Partner'}`}>
                              <Users className="w-2.5 h-2.5" />
                              <span>{record.partnerName || client.partnerName || 'Partner'}: {formatCurrency(record.partnerTotalPayment ?? client.partnerTotalPayment ?? 0, currency)}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-normal text-slate-400">
                          {client.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-800 border border-slate-200 tabular-nums">
                        {formatCurrency(
                          record.softwareCharges * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600 border border-slate-200 whitespace-nowrap">
                        {record.whatsappBillingType === 'per_month' ||
                        (record.whatsappCharges > 0 &&
                          record.whatsappRate === 0 &&
                          record.whatsappMessages === 0) ? (
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(record.whatsappCharges * periodMultiplier, currency)}
                          </span>
                        ) : (
                          <>
                            {record.whatsappRate} ×{' '}
                            {(record.whatsappMessages * periodMultiplier).toLocaleString()} ={' '}
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(record.whatsappCharges * periodMultiplier, currency)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-800 border border-slate-200 tabular-nums">
                        {formatCurrency(
                          record.chatbotCharges * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-500 border border-slate-200">
                        {record.previousDues > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {formatCurrency(record.previousDues, currency)}
                          </span>
                        ) : (
                          `${currency} 0`
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums border border-slate-200">
                        {formatCurrency(
                          record.totalAmount * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-700 tabular-nums border border-slate-200">
                        {formatCurrency(
                          record.amountPaid * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-rose-600 tabular-nums border border-slate-200">
                        {formatCurrency(
                          record.remainingDues * periodMultiplier,
                          currency
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 border border-slate-200">
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
                      <td className="py-3.5 px-3 text-right border border-slate-200">
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

                {isModalPerMonth ? (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Monthly WhatsApp Charges ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={modalWhatsappMonthlyCharges}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setModalWhatsappMonthlyCharges(val);
                        setModalWhatsappRate(val);
                        setModalWhatsappMessages(1);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-semibold"
                    />
                    <span className="text-[10.5px] text-blue-600 block mt-1">
                      Fixed per month (calculation will not show on invoice)
                    </span>
                  </div>
                ) : (
                  <>
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
                  </>
                )}

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

              {/* Partner Payout Info if enabled */}
              {(activeModalRecord.partnerPaymentEnabled ||
                paymentModalClient.partnerPaymentEnabled) && (
                <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-indigo-950">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Partner: {activeModalRecord.partnerName || paymentModalClient.partnerName || 'Assigned Partner'}</span>
                    </span>
                    <span className="font-mono text-indigo-700">
                      Payout: {formatCurrency(activeModalRecord.partnerTotalPayment ?? paymentModalClient.partnerTotalPayment ?? 0, currency)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Service Breakdown: Software ({formatCurrency(activeModalRecord.partnerSoftwareCharges ?? paymentModalClient.partnerSoftwareCharges ?? 0, currency)}) · WhatsApp ({formatCurrency(activeModalRecord.partnerWhatsappCharges ?? paymentModalClient.partnerWhatsappCharges ?? 0, currency)}) · Chatbot ({formatCurrency(activeModalRecord.partnerChatbotCharges ?? paymentModalClient.partnerChatbotCharges ?? 0, currency)})
                    </span>
                  </div>
                </div>
              )}

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
                  const noteParts: string[] = [];
                  if (selectedBank) {
                    noteParts.push(`Bank: ${selectedBank}`);
                  }
                  if (paymentNote.trim()) {
                    noteParts.push(paymentNote.trim());
                  }
                  const finalWhatsappCharges = isModalPerMonth
                    ? Number(modalWhatsappMonthlyCharges) || 0
                    : modalWhatsappTotal;
                  const finalWhatsappRate = isModalPerMonth
                    ? 0
                    : modalWhatsappRate;
                  const finalWhatsappMessages = isModalPerMonth
                    ? 0
                    : modalWhatsappMessages;
                  const finalBillingType = isModalPerMonth
                    ? 'per_month'
                    : 'per_message';

                  onRecordPaymentWithCharges(
                    paymentModalClient.id,
                    selectedMonth,
                    modalSoftwareCharges,
                    finalWhatsappRate,
                    finalWhatsappMessages,
                    modalChatbotCharges,
                    enteredPayNum,
                    paymentMethod,
                    noteParts.join(' — '),
                    finalBillingType,
                    finalWhatsappCharges
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

                {/* Bank Selection from Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Bank / Payment Destination (from Settings)
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => {
                        const b = e.target.value;
                        setSelectedBank(b);
                        if (b === 'Cash') {
                          setPaymentMethod('Cash');
                        } else if (b === 'Cheque') {
                          setPaymentMethod('Cheque');
                        } else if (
                          b.toLowerCase().includes('jazzcash') ||
                          b.toLowerCase().includes('easypaisa') ||
                          b.toLowerCase().includes('raast')
                        ) {
                          setPaymentMethod('Online / QR');
                        } else {
                          setPaymentMethod('Bank Transfer');
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                    >
                      {company.qrCodes && company.qrCodes.length > 0 ? (
                        <>
                          {company.qrCodes.map((q, idx) => (
                            <option
                              key={q.id || idx}
                              value={q.bankName || q.label}
                            >
                              {q.bankName || q.label}
                            </option>
                          ))}
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Other Bank">Other Bank</option>
                        </>
                      ) : (
                        <>
                          <option value="Primary Bank">Primary Bank Account</option>
                          <option value="Cash">Cash</option>
                          <option value="Online / QR">Online / QR</option>
                          <option value="Cheque">Cheque</option>
                        </>
                      )}
                    </select>
                  </div>

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
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Reference / Transaction Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Trx ID #98234, Deposited by Admin"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                  />
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
                    Confirm Payment
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

  const batchActiveClients = clients.filter((c) => c.enabled);
  const batchTotalAmount = batchActiveClients.reduce((sum, c) => {
    const rec = getOrComputeMonthlyRecord(c, selectedMonth);
    const sw = c.softwareEnabled
      ? Number(c.softwareCharges) || 0
      : Number(rec.softwareCharges) || 0;
    const isPerMonth =
      c.whatsappBillingType === 'per_month' ||
      rec.whatsappBillingType === 'per_month';
    const wr = c.whatsappEnabled
      ? Number(c.whatsappRate) || 0
      : Number(rec.whatsappRate) || 0;
    const wm = c.whatsappEnabled
      ? Number(c.whatsappMessages) || 0
      : Number(rec.whatsappMessages) || 0;
    const wc = c.whatsappEnabled
      ? isPerMonth
        ? Number(c.whatsappCharges) || 0
        : Math.round(wr * wm)
      : Number(rec.whatsappCharges) || 0;
    const cb = c.chatbotEnabled
      ? Number(c.chatbotCharges) || 0
      : Number(rec.chatbotCharges) || 0;
    return sum + sw + wc + cb + rec.previousDues;
  }, 0);
  const batchTotalSoftware = batchActiveClients.reduce((sum, c) => {
    return sum + (c.softwareEnabled ? Number(c.softwareCharges) || 0 : 0);
  }, 0);
  const batchTotalChatbot = batchActiveClients.reduce((sum, c) => {
    return sum + (c.chatbotEnabled ? Number(c.chatbotCharges) || 0 : 0);
  }, 0);
  const batchTotalWhatsapp = batchActiveClients.reduce((sum, c) => {
    if (!c.whatsappEnabled) return sum;
    if (c.whatsappBillingType === 'per_month') {
      return sum + (Number(c.whatsappCharges) || 0);
    }
    const wr = Number(c.whatsappRate) || 0;
    const wm = Number(c.whatsappMessages) || 0;
    return sum + Math.round(wr * wm);
  }, 0);

  const handleExecuteBatchGeneration = async () => {
    if (!onGenerateAllMonthlyInvoices) return;
    setBatchGenerating(true);
    try {
      const res = await onGenerateAllMonthlyInvoices(selectedMonth);
      setShowBatchModal(false);
      const count = res?.count ?? batchActiveClients.length;
      const total = res?.totalAmount ?? batchTotalAmount;
      setBatchSuccessBanner(
        `Successfully generated all ${count} monthly invoices for ${selectedMonth} totaling ${formatCurrency(
          total,
          currency
        )}!`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBatchGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify WhatsApp rate &amp; message count, generate individual or batch invoices for all{' '}
            {term.plural.toLowerCase()}, download PDF with {term.singular.toLowerCase()} name, or share via WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onGenerateAllMonthlyInvoices && batchActiveClients.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title={`Generate monthly invoices for all ${batchActiveClients.length} active ${term.plural.toLowerCase()} for ${selectedMonth}`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                Generate All Monthly Invoices ({batchActiveClients.length})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('invoice-log')}
            className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>View Invoice Log ({company.receiptLog?.length || 0})</span>
          </button>
        </div>
      </div>

      {batchSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{batchSuccessBanner}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('invoice-log')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
            >
              View Invoices in Log
            </button>
            <button
              type="button"
              onClick={() => setBatchSuccessBanner(null)}
              className="text-emerald-700 hover:underline px-1.5 py-1 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

          <div className="flex items-center gap-2">
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
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              Generate Invoice
            </button>

            {onGenerateAllMonthlyInvoices && batchActiveClients.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="py-2.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                title={`Generate invoices for all ${batchActiveClients.length} active ${term.plural.toLowerCase()}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>All ({batchActiveClients.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Pre-filled Rate per message, Number of messages, and Charges bar */}
        {invGeneratorClientId && (() => {
          const selectedGenClient = clients.find(
            (c) => c.id === invGeneratorClientId
          );
          const isPerMonth =
            selectedGenClient?.whatsappBillingType === 'per_month';

          return (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end text-xs">
              {isPerMonth ? (
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    WhatsApp Monthly Charges ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={genWhatsappTotal}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setGenWhatsappRate(val);
                      setGenWhatsappMessages(1);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/30 font-mono text-xs font-semibold"
                  />
                  <span className="text-[10px] text-blue-600 block mt-0.5">
                    Fixed per month (calculation will not show on invoice)
                  </span>
                </div>
              ) : (
                <>
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
                </>
              )}

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
          );
        })()}
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {clients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No {term.plural.toLowerCase()} added yet. Add a{' '}
            {term.singular.toLowerCase()} first to generate invoices.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                  <th className="py-3.5 px-4 border border-slate-200">Invoice No.</th>
                  <th className="py-3.5 px-4 border border-slate-200">{term.singular}</th>
                  <th className="py-3.5 px-4 border border-slate-200">Month</th>
                  <th className="py-3.5 px-4 text-right border border-slate-200 bg-blue-50/30 text-blue-900">Software Charges</th>
                  <th className="py-3.5 px-4 border border-slate-200">WhatsApp Charges</th>
                  <th className="py-3.5 px-4 text-right border border-slate-200 bg-purple-50/30 text-purple-900">Chatbot Charges</th>
                  <th className="py-3.5 px-4 text-right border border-slate-200 font-bold">Total Amount</th>
                  <th className="py-3.5 px-4 border border-slate-200">Status</th>
                  <th className="py-3.5 px-4 text-right border border-slate-200">Action &amp; Delete</th>
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
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 border border-slate-200">
                        {invNo}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 border border-slate-200">
                        {client.name}
                        {!client.enabled && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">
                            (Disabled)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 border border-slate-200 whitespace-nowrap">
                        {selectedMonth}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700 tabular-nums border border-slate-200 bg-blue-50/10">
                        {formatCurrency(rec.softwareCharges, currency)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 border border-slate-200 whitespace-nowrap">
                        {rec.whatsappBillingType === 'per_month' ||
                        (rec.whatsappCharges > 0 &&
                          rec.whatsappRate === 0 &&
                          rec.whatsappMessages === 0) ? (
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(rec.whatsappCharges, currency)}
                          </span>
                        ) : (
                          <>
                            {rec.whatsappRate} ×{' '}
                            {rec.whatsappMessages.toLocaleString()} ={' '}
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(rec.whatsappCharges, currency)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700 tabular-nums border border-slate-200 bg-purple-50/10">
                        {formatCurrency(rec.chatbotCharges, currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums border border-slate-200">
                        {formatCurrency(rec.totalAmount, currency)}
                      </td>
                      <td className="py-3.5 px-4 border border-slate-200">
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
                      <td className="py-3.5 px-4 text-right border border-slate-200">
                        <div className="flex items-center justify-end gap-1.5">
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
                          {onDeleteInvoice && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteInvoiceTarget({
                                  clientId: client.id,
                                  clientName: client.name,
                                  month: selectedMonth,
                                  invoiceNumber: invNo,
                                })
                              }
                              title="Delete this Invoice"
                              className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Batch Generate All Invoices Confirmation Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Generate All Monthly Invoices
                  </h3>
                  <p className="text-xs text-slate-500">
                    Batch generate invoices for all {batchActiveClients.length}{' '}
                    active {term.plural.toLowerCase()} for{' '}
                    <strong>{selectedMonth}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] text-slate-500">{term.plural}</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {batchActiveClients.length}
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <div className="text-[11px] text-blue-700">Software</div>
                <div className="text-base font-bold text-blue-800 font-mono mt-0.5">
                  {formatCurrency(batchTotalSoftware, currency)}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <div className="text-[11px] text-emerald-700">WhatsApp</div>
                <div className="text-base font-bold text-emerald-800 font-mono mt-0.5">
                  {formatCurrency(batchTotalWhatsapp, currency)}
                </div>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200">
                <div className="text-[11px] text-purple-700">Chatbot</div>
                <div className="text-base font-bold text-purple-800 font-mono mt-0.5">
                  {formatCurrency(batchTotalChatbot, currency)}
                </div>
              </div>
            </div>

            {/* Total Invoiced Bar */}
            <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-950">
                  Total Monthly Invoiced
                </div>
                <div className="text-[11px] text-indigo-700 mt-0.5">
                  Includes pre-saved recurring charges and previous dues
                </div>
              </div>
              <div className="text-xl font-bold text-indigo-900 font-mono tabular-nums">
                {formatCurrency(batchTotalAmount, currency)}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Every generated invoice will automatically be saved into the{' '}
              <strong>Invoice Log</strong>, where you can download PDFs with the {term.singular.toLowerCase()}&apos;s name, print them, share via WhatsApp, or delete them individually.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={batchGenerating}
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={batchGenerating || batchActiveClients.length === 0}
                onClick={handleExecuteBatchGeneration}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
              >
                {batchGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Invoices...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      Confirm &amp; Generate All ({batchActiveClients.length})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {deleteInvoiceTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Invoice #{deleteInvoiceTarget.invoiceNumber}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete this invoice for{' '}
                  <strong className="text-slate-800">
                    {deleteInvoiceTarget.clientName}
                  </strong>{' '}
                  for <strong>{deleteInvoiceTarget.month}</strong>? This will reset all current month charges and remove it from the Invoice Log.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteInvoiceTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteInvoice && deleteInvoiceTarget) {
                    onDeleteInvoice(
                      deleteInvoiceTarget.clientId,
                      deleteInvoiceTarget.month
                    );
                    setDeleteInvoiceTarget(null);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
