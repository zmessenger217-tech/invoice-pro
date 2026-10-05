import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Printer,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  AVAILABLE_MONTHS,
  CategoryTerminology,
  formatCurrency,
} from '../data/initialData';
import {
  ActiveNavTab,
  CompanyProfile,
  GeneratedReceiptItem,
  InvoiceEditableDocument,
} from '../types';
import {
  downloadInvoicePdfWithClientName,
  prepareWhatsAppPdfShare,
  printInvoiceDocument,
} from '../utils/invoicePdf';

interface ReceiptLogViewProps {
  company: CompanyProfile;
  term: CategoryTerminology;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  receiptLog: GeneratedReceiptItem[];
  onDeleteReceipt: (receiptId: string) => void;
  onClearReceiptLog: (month: string) => void;
  onOpenReceiptInEditor: (doc: InvoiceEditableDocument) => void;
  setActiveTab: (tab: ActiveNavTab) => void;
}

export const ReceiptLogView: React.FC<ReceiptLogViewProps> = ({
  company,
  term,
  selectedMonth,
  setSelectedMonth,
  receiptLog,
  onDeleteReceipt,
  onClearReceiptLog,
  onOpenReceiptInEditor,
  setActiveTab,
}) => {
  const currency = company.currency || 'Rs.';
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{
    receipt: GeneratedReceiptItem;
    filename: string;
    whatsappUrl: string;
    messageText: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const monthReceipts = receiptLog.filter((r) => r.month === selectedMonth);

  const filteredReceipts = monthReceipts.filter((r) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      r.clientName.toLowerCase().includes(q) ||
      (r.clientPhone && r.clientPhone.toLowerCase().includes(q)) ||
      r.invoiceNumber.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  const totalBilled = monthReceipts.reduce((acc, r) => acc + r.totalAmount, 0);
  const totalPaid = monthReceipts.reduce((acc, r) => acc + r.amountPaid, 0);
  const totalDues = monthReceipts.reduce((acc, r) => acc + r.remainingDues, 0);

  const handleDownload = (receipt: GeneratedReceiptItem) => {
    const docToExport: InvoiceEditableDocument = {
      ...receipt.doc,
      logoDataUrl: company.logoDataUrl || receipt.doc.logoDataUrl,
      qrCodes: company.qrCodes || receipt.doc.qrCodes,
    };
    const filename = downloadInvoicePdfWithClientName(docToExport, currency);
    setToastMessage(`Downloaded receipt "${filename}" to your device.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePrint = (receipt: GeneratedReceiptItem) => {
    const docToExport: InvoiceEditableDocument = {
      ...receipt.doc,
      logoDataUrl: company.logoDataUrl || receipt.doc.logoDataUrl,
      qrCodes: company.qrCodes || receipt.doc.qrCodes,
    };
    printInvoiceDocument(docToExport, currency);
    setToastMessage(`Opening print dialog for receipt #${receipt.invoiceNumber}...`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleShare = async (receipt: GeneratedReceiptItem) => {
    const docToExport: InvoiceEditableDocument = {
      ...receipt.doc,
      logoDataUrl: company.logoDataUrl || receipt.doc.logoDataUrl,
      qrCodes: company.qrCodes || receipt.doc.qrCodes,
    };
    const res = await prepareWhatsAppPdfShare(docToExport, currency);
    setShareModalData({
      receipt,
      filename: res.filename,
      whatsappUrl: res.whatsappUrl,
      messageText: res.messageText,
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">Receipt Log</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {monthReceipts.length} {monthReceipts.length === 1 ? 'Receipt' : 'Receipts'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log of all generated invoices for <strong>{selectedMonth}</strong>. Receipts are automatically cleared at the start of a new month.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-blue-600 focus:outline-none shadow-2xs"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {monthReceipts.length > 0 && (
            <button
              type="button"
              onClick={() => onClearReceiptLog(selectedMonth)}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear {selectedMonth} Log</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
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

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">
            Total Generated Receipts
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {monthReceipts.length}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">
            Total Invoiced Amount
          </div>
          <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1">
            {formatCurrency(totalBilled, currency)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">
            Total Paid in Receipts
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {formatCurrency(totalPaid, currency)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-600">
            Remaining Dues
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1">
            {formatCurrency(totalDues, currency)}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search by ${term.singular.toLowerCase()} name or invoice #...`}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Monthly Auto-Reset Active</span>
          </div>
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              No Receipts in Log for {selectedMonth}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When you generate invoices from the <strong>Invoices</strong> tab or the <strong>Invoice Editor</strong>, they will be saved here automatically for {selectedMonth}.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Go to Invoices Generator</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50/90 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-3.5 border-r border-slate-200">Receipt #</th>
                  <th className="py-3 px-3.5 border-r border-slate-200">{term.singular}</th>
                  <th className="py-3 px-3.5 border-r border-slate-200">Charges Breakdown</th>
                  <th className="py-3 px-3.5 border-r border-slate-200 text-right">Total Amount</th>
                  <th className="py-3 px-3.5 border-r border-slate-200 text-right">Paid</th>
                  <th className="py-3 px-3.5 border-r border-slate-200 text-right">Dues</th>
                  <th className="py-3 px-3.5 border-r border-slate-200">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3.5 border-r border-slate-200 font-mono font-bold text-slate-800">
                      <div>{r.invoiceNumber}</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                        {r.generatedAt || r.invoiceDate}
                      </div>
                    </td>

                    <td className="py-3.5 px-3.5 border-r border-slate-200 font-semibold text-slate-900">
                      <div>{r.clientName}</div>
                      {r.clientPhone && (
                        <div className="text-[11px] font-mono text-slate-500 font-normal">
                          {r.clientPhone}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 border-r border-slate-200 text-slate-600 font-mono text-[11px]">
                      <div className="space-y-0.5">
                        <div>
                          Software: <strong>{formatCurrency(r.softwareCharges, currency)}</strong>
                        </div>
                        <div>
                          WhatsApp ({r.whatsappRate}×{r.whatsappMessages.toLocaleString()}):{' '}
                          <strong>{formatCurrency(r.whatsappCharges, currency)}</strong>
                        </div>
                        {r.chatbotCharges > 0 && (
                          <div>
                            Chatbot: <strong>{formatCurrency(r.chatbotCharges, currency)}</strong>
                          </div>
                        )}
                        {r.previousDues > 0 && (
                          <div className="text-rose-600">
                            Prev Dues: <strong>{formatCurrency(r.previousDues, currency)}</strong>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(r.totalAmount, currency)}
                    </td>

                    <td className="py-3.5 px-3.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(r.amountPaid, currency)}
                    </td>

                    <td className="py-3.5 px-3.5 border-r border-slate-200 text-right font-mono font-bold text-rose-600 tabular-nums">
                      {formatCurrency(r.remainingDues, currency)}
                    </td>

                    <td className="py-3.5 px-3.5 border-r border-slate-200">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2 py-0.5 rounded-full ${
                          r.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.status === 'Paid'
                              ? 'bg-emerald-600'
                              : r.status === 'Partially Paid'
                              ? 'bg-amber-500'
                              : 'bg-rose-600'
                          }`}
                        />
                        <span>{r.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownload(r)}
                          title="Download PDF to device"
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(r)}
                          title="Share via Internet & WhatsApp"
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrint(r)}
                          title="Print Receipt"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenReceiptInEditor(r.doc)}
                          title="Open in Invoice Editor"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteReceipt(r.id)}
                          title="Delete Receipt"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Share Modal */}
      {shareModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Share Receipt via Internet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send invoice receipt to {shareModalData.receipt.clientName}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>Receipt / Invoice:</span>
                <span className="font-mono font-bold text-slate-900">
                  {shareModalData.receipt.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Amount:</span>
                <span className="font-mono font-bold text-blue-600">
                  {formatCurrency(shareModalData.receipt.totalAmount, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>PDF Filename:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {shareModalData.filename}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Formatted Receipt Summary (Copy or Share)
              </label>
              <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono whitespace-pre-wrap max-h-44 overflow-y-auto">
                {shareModalData.messageText}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareModalData.messageText);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <a
                href={shareModalData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setShareModalData(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
