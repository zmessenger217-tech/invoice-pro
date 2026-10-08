import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Laptop,
  MessageCircle,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  AVAILABLE_MONTHS,
  CategoryTerminology,
  formatCurrency,
  getCurrentMonthLabel,
} from '../data/initialData';
import {
  ClientEntity,
  CompanyProfile,
  GeneratedReceiptItem,
  InvoiceEditableDocument,
} from '../types';
import {
  downloadInvoicePdfWithClientName,
  prepareWhatsAppPdfShare,
  printInvoiceDocument,
} from '../utils/invoicePdf';
import { resolveActiveLogoUrl } from '../utils/usePWAInstall';

interface InvoiceLogViewProps {
  company: CompanyProfile;
  term: CategoryTerminology;
  clients: ClientEntity[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onDeleteInvoiceFromLog: (
    logId: string,
    resetClientMonthLedger?: boolean,
    clientId?: string,
    month?: string
  ) => void;
  onClearInvoiceLog: (month?: string) => void;
  onOpenInEditor: (
    clientId: string,
    month: string,
    doc?: InvoiceEditableDocument
  ) => void;
  onQuickDownloadInvoice: (clientId: string, month: string) => void;
  onQuickPrintInvoice: (clientId: string, month: string) => void;
  onQuickWhatsAppInvoice: (clientId: string, month: string) => void;
}

export const InvoiceLogView: React.FC<InvoiceLogViewProps> = ({
  company,
  term,
  clients,
  selectedMonth,
  setSelectedMonth,
  onDeleteInvoiceFromLog,
  onClearInvoiceLog,
  onOpenInEditor,
  onQuickDownloadInvoice,
  onQuickPrintInvoice,
  onQuickWhatsAppInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'Paid' | 'Partially Paid' | 'Unpaid'
  >('all');
  const [deleteModalItem, setDeleteModalItem] =
    useState<GeneratedReceiptItem | null>(null);
  const [resetLedgerOnDelete, setResetLedgerOnDelete] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const rawLogs: GeneratedReceiptItem[] = company.receiptLog || [];
  const currency = company.currency || 'Rs.';
  const currentMonth = getCurrentMonthLabel();

  // In month dropdown in receipt log: ONLY show all previous months on which we generated invoices, and the current month
  const availableLoggedMonths = useMemo(() => {
    const setOfMonths = new Set<string>();

    // Include current month
    setOfMonths.add(currentMonth);

    // Include all months from generated receipts/invoices log
    (company.receiptLog || []).forEach((item) => {
      if (item.month) setOfMonths.add(item.month);
    });

    // Sort matching AVAILABLE_MONTHS chronological sequence (most recent first)
    return Array.from(setOfMonths).sort((a, b) => {
      const idxA = AVAILABLE_MONTHS.indexOf(a);
      const idxB = AVAILABLE_MONTHS.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxB - idxA;
      return b.localeCompare(a);
    });
  }, [company.receiptLog, currentMonth]);

  const filteredLogs = rawLogs.filter((item) => {
    if (monthFilter !== 'all' && item.month !== monthFilter) {
      return false;
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (item.clientName || '').toLowerCase().includes(q) ||
      (item.invoiceNumber || '').toLowerCase().includes(q) ||
      (item.month || '').toLowerCase().includes(q) ||
      (item.clientPhone || '').toLowerCase().includes(q)
    );
  });

  // Calculate totals for currently filtered logs
  const totalInvoices = filteredLogs.length;
  const totalSoftwareCharges = filteredLogs.reduce(
    (sum, item) => sum + (Number(item.softwareCharges) || 0),
    0
  );
  const totalChatbotCharges = filteredLogs.reduce(
    (sum, item) => sum + (Number(item.chatbotCharges) || 0),
    0
  );
  const totalWhatsappCharges = filteredLogs.reduce(
    (sum, item) => sum + (Number(item.whatsappCharges) || 0),
    0
  );
  const totalInvoicedAmount = filteredLogs.reduce(
    (sum, item) => sum + (Number(item.totalAmount) || 0),
    0
  );
  const totalPaidAmount = filteredLogs.reduce(
    (sum, item) => sum + (Number(item.amountPaid) || 0),
    0
  );

  const getEnrichedDoc = (item: GeneratedReceiptItem) => ({
    ...item.doc,
    companyName: item.doc?.companyName || company.name || 'Your Company Name',
    companyTagline: item.doc?.companyTagline || company.tagline,
    companyPhone: item.doc?.companyPhone || company.phone,
    companyEmail: item.doc?.companyEmail || company.email,
    companyWebsite: item.doc?.companyWebsite || company.website,
    logoDataUrl: resolveActiveLogoUrl(
      item.doc?.logoDataUrl || company.logoDataUrl
    ),
    qrCodes:
      item.doc?.qrCodes && item.doc.qrCodes.length > 0
        ? item.doc.qrCodes
        : company.qrCodes,
    qrCodeDataUrl: item.doc?.qrCodeDataUrl || company.qrCodeDataUrl,
    showQrCode: item.doc?.showQrCode ?? company.showQrCode !== false,
    invoiceNote:
      item.invoiceNote ??
      item.doc?.invoiceNote ??
      company.defaultInvoiceNote ??
      '',
  });

  const handleDownload = (item: GeneratedReceiptItem) => {
    try {
      downloadInvoicePdfWithClientName(getEnrichedDoc(item), currency);
      setToastMessage(`Downloaded invoice for ${item.clientName}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      onQuickDownloadInvoice(item.clientId, item.month);
    }
  };

  const handlePrint = (item: GeneratedReceiptItem) => {
    try {
      printInvoiceDocument(getEnrichedDoc(item), currency);
      setToastMessage(`Opening print preview for ${item.clientName}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      onQuickPrintInvoice(item.clientId, item.month);
    }
  };

  const handleWhatsApp = async (item: GeneratedReceiptItem) => {
    try {
      await prepareWhatsAppPdfShare(getEnrichedDoc(item), currency);
      setToastMessage(`Prepared WhatsApp share for ${item.clientName}`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      onQuickWhatsAppInvoice(item.clientId, item.month);
    }
  };

  const confirmDelete = () => {
    if (!deleteModalItem) return;
    onDeleteInvoiceFromLog(
      deleteModalItem.id,
      resetLedgerOnDelete,
      deleteModalItem.clientId,
      deleteModalItem.month
    );
    setToastMessage(
      `Deleted invoice #${deleteModalItem.invoiceNumber} from Invoice Log${
        resetLedgerOnDelete ? ' and reset client ledger' : ''
      }`
    );
    setDeleteModalItem(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Invoice Log</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            All generated invoices are saved here. View Software &amp; Chatbot charges, download or print receipts, share via WhatsApp, or delete invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {rawLogs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500">
            Total Invoices
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {totalInvoices}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {monthFilter === 'all' ? 'Across all months' : monthFilter}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/20 p-4">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-blue-600" />
            <span>Software Charges</span>
          </div>
          <div className="text-xl font-bold text-blue-700 font-mono tabular-nums mt-1">
            {formatCurrency(totalSoftwareCharges, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Included in invoices
          </div>
        </div>

        <div className="bg-white rounded-xl border border-purple-200 bg-purple-50/20 p-4">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>Chatbot Charges</span>
          </div>
          <div className="text-xl font-bold text-purple-700 font-mono tabular-nums mt-1">
            {formatCurrency(totalChatbotCharges, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            AI Assistant services
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp Charges</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {formatCurrency(totalWhatsappCharges, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Messaging billing
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-slate-500">
            Total Invoiced
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatCurrency(totalInvoicedAmount, currency)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            Paid: {formatCurrency(totalPaidAmount, currency)}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search by ${term.singular.toLowerCase()} name, invoice #...`}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-500">Month:</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="all">
                All Generated Months ({rawLogs.length} invoices)
              </option>
              {availableLoggedMonths.map((m) => {
                const countForMonth = rawLogs.filter(
                  (r) => r.month === m
                ).length;
                return (
                  <option key={m} value={m}>
                    {m}
                    {m === currentMonth ? ' • Current Month' : ''} (
                    {countForMonth} invoices)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-500">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'all' | 'Paid' | 'Partially Paid' | 'Unpaid'
                )
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                No invoices found in log
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {rawLogs.length === 0
                  ? `Invoices generated in the Invoices tab or Invoice Editor will automatically be saved and tracked in this log.`
                  : `No invoices matched your current search or month filter.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-3.5 border border-slate-200">
                    Invoice No. &amp; Date
                  </th>
                  <th className="py-3 px-3.5 border border-slate-200">
                    {term.singular}
                  </th>
                  <th className="py-3 px-3 border border-slate-200">Month</th>
                  <th className="py-3 px-3 text-right border border-slate-200 bg-blue-50/40 text-blue-900">
                    Software Charges
                  </th>
                  <th className="py-3 px-3 border border-slate-200">
                    WhatsApp Charges
                  </th>
                  <th className="py-3 px-3 text-right border border-slate-200 bg-purple-50/40 text-purple-900">
                    Chatbot Charges
                  </th>
                  <th className="py-3 px-3 text-right border border-slate-200">
                    Prev. Dues
                  </th>
                  <th className="py-3 px-3 text-right border border-slate-200 font-bold">
                    Total Amount
                  </th>
                  <th className="py-3 px-3 text-right border border-slate-200">
                    Paid / Due
                  </th>
                  <th className="py-3 px-3.5 border border-slate-200">Status</th>
                  <th className="py-3 px-3 text-right border border-slate-200">
                    Actions &amp; Delete
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredLogs.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Invoice No. & Generated Date */}
                      <td className="py-3.5 px-3.5 border border-slate-200">
                        <div className="font-mono font-bold text-slate-900">
                          {item.invoiceNumber || 'INV-001'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.generatedAt || item.invoiceDate}
                        </div>
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-3.5 border border-slate-200 font-semibold text-slate-900">
                        <div>{item.clientName}</div>
                        {item.clientPhone && (
                          <div className="text-[11px] font-normal text-slate-400">
                            {item.clientPhone}
                          </div>
                        )}
                      </td>

                      {/* Month */}
                      <td className="py-3.5 px-3 border border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                        {item.month}
                      </td>

                      {/* Software Charges */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-blue-700 tabular-nums border border-slate-200 bg-blue-50/20">
                        {formatCurrency(item.softwareCharges, currency)}
                      </td>

                      {/* WhatsApp Charges */}
                      <td className="py-3.5 px-3 font-mono text-slate-600 border border-slate-200 whitespace-nowrap">
                        {item.whatsappBillingType === 'per_month' ||
                        (item.whatsappCharges > 0 &&
                          item.whatsappRate === 0 &&
                          item.whatsappMessages === 0) ? (
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(item.whatsappCharges, currency)}
                          </span>
                        ) : (
                          <>
                            {item.whatsappRate} ×{' '}
                            {item.whatsappMessages.toLocaleString()} ={' '}
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(item.whatsappCharges, currency)}
                            </span>
                          </>
                        )}
                      </td>

                      {/* Chatbot Charges */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-purple-700 tabular-nums border border-slate-200 bg-purple-50/20">
                        {formatCurrency(item.chatbotCharges, currency)}
                      </td>

                      {/* Prev Dues */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-500 border border-slate-200">
                        {item.previousDues > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {formatCurrency(item.previousDues, currency)}
                          </span>
                        ) : (
                          `${currency} 0`
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums border border-slate-200">
                        {formatCurrency(item.totalAmount, currency)}
                      </td>

                      {/* Paid / Due */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums border border-slate-200">
                        <div className="text-emerald-700 font-semibold">
                          +{formatCurrency(item.amountPaid, currency)}
                        </div>
                        {item.remainingDues > 0 && (
                          <div className="text-rose-600 text-[11px]">
                            Due: {formatCurrency(item.remainingDues, currency)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 border border-slate-200">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                            item.status === 'Paid'
                              ? 'text-emerald-700'
                              : item.status === 'Partially Paid'
                              ? 'text-amber-700'
                              : 'text-rose-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'Paid'
                                ? 'bg-emerald-600'
                                : item.status === 'Partially Paid'
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                            }`}
                          />
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Actions & Delete */}
                      <td className="py-3.5 px-3 text-right border border-slate-200">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenInEditor(item.clientId, item.month, item.doc)
                            }
                            title="Open in Invoice Editor"
                            className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrint(item)}
                            title="Print Invoice"
                            className="p-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(item)}
                            title="Download PDF"
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleWhatsApp(item)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Invoice Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalItem(item)}
                            title="Delete this Invoice"
                            className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Delete Invoice Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Invoice #{deleteModalItem.invoiceNumber}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete the invoice for{' '}
                  <strong className="text-slate-800">
                    {deleteModalItem.clientName}
                  </strong>{' '}
                  for <strong>{deleteModalItem.month}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={resetLedgerOnDelete}
                  onChange={(e) => setResetLedgerOnDelete(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 mt-0.5"
                />
                <span>
                  Also reset this {term.singular.toLowerCase()}&apos;s billing record for{' '}
                  <strong>{deleteModalItem.month}</strong> in Check &amp; Balance
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Log Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Clear Invoice Log?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose whether you want to clear invoices for{' '}
                  <strong>{selectedMonth}</strong> only, or clear all saved generated invoices completely.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClearInvoiceLog(selectedMonth);
                  setShowClearModal(false);
                  setToastMessage(`Cleared invoice logs for ${selectedMonth}`);
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-left flex items-center justify-between"
              >
                <span>Clear {selectedMonth} Only</span>
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onClearInvoiceLog();
                  setShowClearModal(false);
                  setToastMessage('Cleared all generated invoice logs');
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors text-left flex items-center justify-between"
              >
                <span>Clear All Months Completely</span>
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 text-center mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
