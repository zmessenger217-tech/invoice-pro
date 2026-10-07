import React, { useState } from 'react';
import {
  BookmarkCheck,
  Calendar,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Palette,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  AVAILABLE_MONTHS,
  CategoryTerminology,
  formatCurrency,
  getDueDateForMonth,
  getIssueDateForMonth,
} from '../data/initialData';
import { compressImageDataUrl } from '../firebase';
import {
  ClientEntity,
  CompanyProfile,
  InvoiceEditableDocument,
  InvoiceTheme,
  PaymentQrCodeItem,
} from '../types';
import {
  downloadInvoicePdfWithClientName,
  getClientPdfFilename,
  prepareWhatsAppPdfShare,
  printInvoiceDocument,
} from '../utils/invoicePdf';
import { resolveActiveLogoUrl } from '../utils/usePWAInstall';

interface InvoicePreviewAndEditorProps {
  company: CompanyProfile;
  term: CategoryTerminology;
  clients: ClientEntity[];
  selectedClientId: string;
  selectedMonth: string;
  onSelectClientAndMonth: (clientId: string, month: string) => void;
  invoiceDoc: InvoiceEditableDocument;
  onChangeInvoiceDoc: (updated: InvoiceEditableDocument) => void;
  onSaveInvoiceChanges?: (updated: InvoiceEditableDocument) => void;
  onDeleteInvoice?: (clientId: string, month: string) => void;
  onSaveAsDefaultInvoice: (docData: InvoiceEditableDocument) => void;
  onResetFromLedger: () => void;
}

const THEME_OPTIONS: {
  id: InvoiceTheme;
  label: string;
  dotClass: string;
}[] = [
  {
    id: 'royal-blue',
    label: 'Royal Blue',
    dotClass: 'bg-blue-600',
  },
  {
    id: 'midnight-slate',
    label: 'Midnight Slate',
    dotClass: 'bg-slate-900',
  },
  {
    id: 'emerald-executive',
    label: 'Emerald Executive',
    dotClass: 'bg-emerald-700',
  },
];

export const InvoicePreviewAndEditor: React.FC<
  InvoicePreviewAndEditorProps
> = ({
  company,
  term,
  clients,
  selectedClientId,
  selectedMonth,
  onSelectClientAndMonth,
  invoiceDoc,
  onChangeInvoiceDoc,
  onSaveInvoiceChanges,
  onDeleteInvoice,
  onSaveAsDefaultInvoice,
  onResetFromLedger,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState<{
    filename: string;
    whatsappUrl: string;
    messageText: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const currency = company.currency || 'Rs.';
  const currentMonthTotal =
    (Number(invoiceDoc.softwareCharges) || 0) +
    (Number(invoiceDoc.whatsappCharges) || 0) +
    (Number(invoiceDoc.chatbotCharges) || 0);
  const previousDues = Number(invoiceDoc.previousDues) || 0;
  const totalAmount = currentMonthTotal + previousDues;
  const amountPaid = Number(invoiceDoc.amountPaid) || 0;
  const remainingDues = Math.max(0, totalAmount - amountPaid);

  const updateField = <K extends keyof InvoiceEditableDocument>(
    key: K,
    value: InvoiceEditableDocument[K]
  ) => {
    onChangeInvoiceDoc({
      ...invoiceDoc,
      [key]: value,
    });
  };

  const handleSaveInvoice = () => {
    const updatedDoc: InvoiceEditableDocument = {
      ...invoiceDoc,
      qrCodes: effectiveQrCodes,
      qrCodeDataUrl: effectiveQrCodes[0]?.dataUrl || invoiceDoc.qrCodeDataUrl,
    };
    if (onSaveInvoiceChanges) {
      onSaveInvoiceChanges(updatedDoc);
    }
    setToastMessage(
      `Invoice saved successfully! Updated ledger record & QR codes for ${invoiceDoc.clientName} (${selectedMonth}).`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleWhatsappRateOrMessagesChange = (
    nextRate: number,
    nextMessages: number
  ) => {
    const computedWhatsapp = Math.round(nextRate * nextMessages);
    onChangeInvoiceDoc({
      ...invoiceDoc,
      whatsappRate: nextRate,
      whatsappMessages: nextMessages,
      whatsappCharges: computedWhatsapp,
      whatsappLabel: `WhatsApp Charges (${nextRate} × ${nextMessages.toLocaleString()})`,
    });
  };

  const handleUploadImageField = (
    field: 'logoDataUrl' | 'qrCodeDataUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const compressed =
          (await compressImageDataUrl(
            reader.result,
            field === 'logoDataUrl' ? 180 : 240
          )) || reader.result;
        updateField(field, compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const effectiveQrCodes: PaymentQrCodeItem[] =
    invoiceDoc.qrCodes && invoiceDoc.qrCodes.length > 0
      ? invoiceDoc.qrCodes
      : company.qrCodes && company.qrCodes.length > 0
      ? company.qrCodes
      : [
          {
            id: 'qr-1',
            label: invoiceDoc.qrLabel || company.qrLabel || 'Scan to Pay',
            bankName: invoiceDoc.qrLabel || company.qrLabel || 'Scan to Pay',
            dataUrl: invoiceDoc.qrCodeDataUrl || company.qrCodeDataUrl || '',
          },
        ];

  const handleUpdateQrCodesList = (nextQrs: PaymentQrCodeItem[]) => {
    onChangeInvoiceDoc({
      ...invoiceDoc,
      qrCodes: nextQrs,
      qrCodeDataUrl: nextQrs[0]?.dataUrl || '',
      qrLabel: nextQrs[0]?.bankName || nextQrs[0]?.label || 'Scan to Pay',
      showQrCode: true,
    });
  };

  const handleAddQrCodeItem = () => {
    const nextIdx = effectiveQrCodes.length + 1;
    const nextQrs: PaymentQrCodeItem[] = [
      ...effectiveQrCodes,
      {
        id: `qr-${Date.now()}-${nextIdx}`,
        label: `Bank / QR ${nextIdx}`,
        bankName: `Bank / QR ${nextIdx}`,
        accountNumber: '',
        dataUrl: '',
      },
    ];
    handleUpdateQrCodesList(nextQrs);
  };

  const handleRemoveQrCodeItem = (idx: number) => {
    const nextQrs = effectiveQrCodes.filter((_, i) => i !== idx);
    handleUpdateQrCodesList(nextQrs);
  };

  const handleUploadQrAtIndex = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const compressed =
          (await compressImageDataUrl(reader.result, 240)) || reader.result;
        const nextQrs = effectiveQrCodes.map((item, i) =>
          i === idx ? { ...item, dataUrl: compressed } : item
        );
        handleUpdateQrCodesList(nextQrs);
      }
    };
    reader.readAsDataURL(file);
  };

  const docWithResolvedQrs: InvoiceEditableDocument = {
    ...invoiceDoc,
    qrCodes: effectiveQrCodes,
    qrCodeDataUrl: effectiveQrCodes[0]?.dataUrl || invoiceDoc.qrCodeDataUrl,
  };

  const handleSetAsDefault = () => {
    onSaveAsDefaultInvoice(docWithResolvedQrs);
    setToastMessage(
      'Saved as Default Invoice! Header, footer, dates, note, logo, and all QR codes will automatically apply to all invoices.'
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDownloadPdf = () => {
    const filename = downloadInvoicePdfWithClientName(
      docWithResolvedQrs,
      currency
    );
    setToastMessage(`Downloaded PDF as "${filename}"`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handlePrintInvoice = () => {
    printInvoiceDocument(docWithResolvedQrs, currency);
    setToastMessage('Opening print dialog for invoice...');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleShareWhatsApp = async () => {
    const res = await prepareWhatsAppPdfShare(docWithResolvedQrs, currency);
    setWhatsappModal({
      filename: res.filename,
      whatsappUrl: res.whatsappUrl,
      messageText: res.messageText,
    });
    setToastMessage('Invoice ready to share on WhatsApp (no auto-download)');
    setTimeout(() => setToastMessage(null), 4500);
  };

  const expectedPdfName = getClientPdfFilename(invoiceDoc);

  const activeTheme = invoiceDoc.theme || 'royal-blue';
  const bannerGradientClass =
    activeTheme === 'emerald-executive'
      ? 'from-emerald-950 via-emerald-900 to-teal-900 border-b-4 border-emerald-500'
      : activeTheme === 'midnight-slate'
      ? 'from-slate-950 via-slate-900 to-slate-800 border-b-4 border-slate-500'
      : 'from-slate-950 via-slate-900 to-blue-950 border-b-4 border-blue-600';

  const accentBadgeClass =
    activeTheme === 'emerald-executive'
      ? 'bg-emerald-600 text-white'
      : activeTheme === 'midnight-slate'
      ? 'bg-slate-700 text-white'
      : 'bg-blue-600 text-white';

  const accentTextClass =
    activeTheme === 'emerald-executive'
      ? 'text-emerald-700'
      : activeTheme === 'midnight-slate'
      ? 'text-slate-800'
      : 'text-blue-600';

  const tableHeaderClass =
    activeTheme === 'emerald-executive'
      ? 'bg-emerald-950 text-white'
      : 'bg-slate-900 text-white';

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Select Client / Month + Set as Default + Export & WhatsApp Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Select {term.singular}
            </label>
            <select
              value={selectedClientId}
              onChange={(e) =>
                onSelectClientAndMonth(e.target.value, selectedMonth)
              }
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-600 focus:outline-none"
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
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Billing Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) =>
                onSelectClientAndMonth(selectedClientId, e.target.value)
              }
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {AVAILABLE_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              title="Save all changes to this client's invoice and monthly ledger"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Invoice</span>
            </button>

            <button
              type="button"
              onClick={onResetFromLedger}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Sync latest values from Check & Balance"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync {term.singular} Values</span>
            </button>

            <button
              type="button"
              onClick={handleSetAsDefault}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Save current header, footer, issue/due dates, logo, QR code, and design as the Default Invoice template"
            >
              <BookmarkCheck className="w-4 h-4 text-indigo-600" />
              <span>Set as Default Invoice</span>
            </button>

            {onDeleteInvoice && selectedClientId && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                title="Delete/Reset this invoice for this month"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Invoice</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintInvoice}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print Invoice</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download ({expectedPdfName})</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Simultaneous Editor + Live Printable Executive Invoice Canvas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Simultaneous Controls Panel (4 cols on XL) */}
        <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto no-print">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Invoice Designer &amp; Editor
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Live Preview</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Theme Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-600" />
                <span>Invoice Color Theme</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateField('theme', t.id)}
                    className={`px-2.5 py-2 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                      activeTheme === t.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.dotClass}`}
                    />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Header Customization */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="font-semibold text-slate-800">
                1. Editable Invoice Header
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Header Title
                  </label>
                  <input
                    type="text"
                    value={invoiceDoc.headerTitle}
                    onChange={(e) => updateField('headerTitle', e.target.value)}
                    placeholder="INVOICE"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Invoice No.
                  </label>
                  <input
                    type="text"
                    value={invoiceDoc.invoiceNumber}
                    onChange={(e) =>
                      updateField('invoiceNumber', e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={invoiceDoc.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Header Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={invoiceDoc.companyTagline}
                  onChange={(e) =>
                    updateField('companyTagline', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Header Statement Note
                </label>
                <input
                  type="text"
                  value={invoiceDoc.headerNote}
                  onChange={(e) => updateField('headerNote', e.target.value)}
                  placeholder="Official Monthly Billing Statement"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Issue Date & Due Date */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Issue Date &amp; Due Date</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Issue Date
                  </label>
                  <input
                    type="text"
                    value={invoiceDoc.invoiceDate}
                    onChange={(e) => updateField('invoiceDate', e.target.value)}
                    placeholder="15 May 2026"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Due Date
                  </label>
                  <input
                    type="text"
                    value={invoiceDoc.dueDate}
                    onChange={(e) => updateField('dueDate', e.target.value)}
                    placeholder="25 May 2026"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/30 text-rose-800 font-medium text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-slate-800 font-semibold">
                3. {term.singular} Details (Used for PDF Filename)
              </label>
              <input
                type="text"
                value={invoiceDoc.clientName}
                onChange={(e) => updateField('clientName', e.target.value)}
                placeholder={`${term.singular} Name`}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* WhatsApp Billing Mode & Charges Box */}
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 text-xs">
                  WhatsApp Charges ({term.singular})
                </div>
                {/* Mode Selector Toggle */}
                <div className="inline-flex rounded-lg bg-blue-100/70 p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      const nextLabel = `WhatsApp Charges (${invoiceDoc.whatsappRate} × ${invoiceDoc.whatsappMessages.toLocaleString()})`;
                      const computedWhatsapp = Math.round(
                        (invoiceDoc.whatsappRate || 0) *
                          (invoiceDoc.whatsappMessages || 0)
                      );
                      onChangeInvoiceDoc({
                        ...invoiceDoc,
                        whatsappBillingType: 'per_message',
                        whatsappLabel: nextLabel,
                        whatsappCharges:
                          computedWhatsapp > 0
                            ? computedWhatsapp
                            : invoiceDoc.whatsappCharges,
                      });
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      invoiceDoc.whatsappBillingType !== 'per_month'
                        ? 'bg-white text-blue-800 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Message
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeInvoiceDoc({
                        ...invoiceDoc,
                        whatsappBillingType: 'per_month',
                        whatsappLabel: 'WhatsApp Charges',
                      });
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      invoiceDoc.whatsappBillingType === 'per_month'
                        ? 'bg-white text-blue-800 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Month (Fixed)
                  </button>
                </div>
              </div>

              {invoiceDoc.whatsappBillingType === 'per_month' ? (
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-slate-600">
                    Monthly WhatsApp Charges ({currency})
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={invoiceDoc.whatsappCharges}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        onChangeInvoiceDoc({
                          ...invoiceDoc,
                          whatsappCharges: val,
                          whatsappLabel: 'WhatsApp Charges',
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-semibold text-xs text-right focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10.5px] text-blue-700/90 italic">
                    ✓ Fixed per month — calculation is NOT shown on the invoice.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Rate per message
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={invoiceDoc.whatsappRate}
                        onChange={(e) =>
                          handleWhatsappRateOrMessagesChange(
                            Number(e.target.value) || 0,
                            invoiceDoc.whatsappMessages
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Number of messages
                      </label>
                      <input
                        type="number"
                        step="1"
                        min={0}
                        value={invoiceDoc.whatsappMessages}
                        onChange={(e) =>
                          handleWhatsappRateOrMessagesChange(
                            invoiceDoc.whatsappRate,
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-blue-700">
                    <span>
                      {invoiceDoc.whatsappRate} ×{' '}
                      {invoiceDoc.whatsappMessages.toLocaleString()}
                    </span>
                    <span className="font-bold">
                      = {formatCurrency(invoiceDoc.whatsappCharges, currency)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Line Items */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="font-semibold text-slate-800">
                4. Charges &amp; Dues
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={invoiceDoc.softwareLabel}
                  onChange={(e) => updateField('softwareLabel', e.target.value)}
                  className="col-span-7 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={invoiceDoc.softwareCharges}
                  onChange={(e) =>
                    updateField('softwareCharges', Number(e.target.value) || 0)
                  }
                  className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-right focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={invoiceDoc.chatbotLabel}
                  onChange={(e) => updateField('chatbotLabel', e.target.value)}
                  className="col-span-7 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={invoiceDoc.chatbotCharges}
                  onChange={(e) =>
                    updateField('chatbotCharges', Number(e.target.value) || 0)
                  }
                  className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-right focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Carry-forward Previous Dues */}
              <div className="grid grid-cols-12 gap-2 items-center pt-1">
                <input
                  type="text"
                  value={invoiceDoc.previousDuesLabel}
                  onChange={(e) =>
                    updateField('previousDuesLabel', e.target.value)
                  }
                  className="col-span-7 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-700 font-medium text-xs focus:border-rose-500 focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={invoiceDoc.previousDues}
                  onChange={(e) =>
                    updateField('previousDues', Number(e.target.value) || 0)
                  }
                  className="col-span-5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-700 font-mono font-semibold text-xs text-right focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Amount Paid */}
              <div className="grid grid-cols-12 gap-2 items-center pt-1">
                <span className="col-span-7 text-slate-700 font-medium">
                  Amount Paid
                </span>
                <input
                  type="number"
                  min={0}
                  value={invoiceDoc.amountPaid}
                  onChange={(e) =>
                    updateField('amountPaid', Number(e.target.value) || 0)
                  }
                  className="col-span-5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/40 text-emerald-800 font-mono font-semibold text-xs text-right focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Invoice Note / Special Instructions */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>5. Add Note in Invoice</span>
                </div>
                {invoiceDoc.invoiceNote && (
                  <button
                    type="button"
                    onClick={() => updateField('invoiceNote', '')}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Clear Note
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={invoiceDoc.invoiceNote || ''}
                onChange={(e) => updateField('invoiceNote', e.target.value)}
                placeholder="Write a note, remark, or special instruction to show on the invoice..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/30 text-xs text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* 6. Editable Footer, Logo & Multiple QR Codes */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">
                  6. Footer, Logo &amp; Multiple QR Codes
                </div>
                <button
                  type="button"
                  onClick={handleAddQrCodeItem}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add QR Code</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Footer Thank-You Heading
                </label>
                <input
                  type="text"
                  value={invoiceDoc.footerThankYou}
                  onChange={(e) =>
                    updateField('footerThankYou', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Footer Payment Terms / Bank Note
                </label>
                <textarea
                  rows={2}
                  value={invoiceDoc.footerTerms}
                  onChange={(e) => updateField('footerTerms', e.target.value)}
                  placeholder="Bank account details or payment instructions..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Quick Logo Upload */}
              <div>
                <label className="border border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-2 flex items-center justify-center gap-1.5 cursor-pointer bg-slate-50/70 text-[11px] font-medium text-slate-700">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    {invoiceDoc.logoDataUrl
                      ? 'Change Company Logo'
                      : 'Upload Company Logo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadImageField('logoDataUrl', e)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Show QR Codes Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invoiceDoc.showQrCode !== false}
                    onChange={(e) =>
                      updateField('showQrCode', e.target.checked)
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700 font-medium">
                    Show All QR Codes at Invoice Footer ({effectiveQrCodes.length})
                  </span>
                </label>
              </div>

              {/* Multiple QR Codes List in Editor */}
              {invoiceDoc.showQrCode !== false && (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {effectiveQrCodes.map((qr, idx) => (
                    <div
                      key={qr.id || idx}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          <span>QR Code #{idx + 1}</span>
                        </span>
                        {effectiveQrCodes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQrCodeItem(idx)}
                            className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-0.5 font-medium"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-8 space-y-1.5">
                          <input
                            type="text"
                            value={qr.bankName ?? qr.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextQrs = effectiveQrCodes.map((item, i) =>
                                i === idx
                                  ? { ...item, label: val, bankName: val }
                                  : item
                              );
                              handleUpdateQrCodesList(nextQrs);
                            }}
                            placeholder="Bank / Wallet Name (e.g. Meezan Bank, JazzCash)"
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-medium"
                          />
                          <input
                            type="text"
                            value={qr.accountNumber ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextQrs = effectiveQrCodes.map((item, i) =>
                                i === idx
                                  ? { ...item, accountNumber: val }
                                  : item
                              );
                              handleUpdateQrCodesList(nextQrs);
                            }}
                            placeholder="Account # / Title (Optional)"
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-mono"
                          />
                        </div>

                        <div className="col-span-4">
                          <label className="border border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-1.5 flex flex-col items-center justify-center gap-1 cursor-pointer bg-white text-center min-h-[60px]">
                            {qr.dataUrl ? (
                              <img
                                src={qr.dataUrl}
                                alt={qr.label}
                                className="w-10 h-10 object-contain"
                              />
                            ) : (
                              <QrCode className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="text-[9.5px] font-semibold text-blue-600">
                              {qr.dataUrl ? 'Change' : 'Upload QR'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadQrAtIndex(idx, e)}
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

            {/* Save Buttons */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={handleSaveInvoice}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Invoice Changes</span>
              </button>

              <button
                type="button"
                onClick={handleSetAsDefault}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Set as Default Invoice Template</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Live Interactive Executive Invoice Canvas (8 cols on XL) */}
        <div className="xl:col-span-8">
          <div
            id="printable-invoice"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative"
          >
            {/* 1. Executive Dark Header Banner */}
            <div
              className={`bg-gradient-to-r ${bannerGradientClass} px-6 sm:px-9 py-7 text-white flex flex-col sm:flex-row sm:items-start justify-between gap-6`}
            >
              {/* Brand Lockup & Editable Header Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <label
                  title="Click to change Company Logo"
                  className="cursor-pointer group relative shrink-0"
                >
                  <img
                    src={resolveActiveLogoUrl(invoiceDoc.logoDataUrl)}
                    alt={invoiceDoc.companyName || 'Company Logo'}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-contain bg-white p-1.5 shadow-md border border-white/20 group-hover:opacity-90 transition-opacity"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadImageField('logoDataUrl', e)}
                    className="hidden"
                  />
                </label>

                <div className="space-y-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={invoiceDoc.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Your Company Name"
                    className="text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/40 focus:border-white focus:outline-none w-full tracking-tight"
                  />
                  <input
                    type="text"
                    value={invoiceDoc.companyTagline}
                    onChange={(e) =>
                      updateField('companyTagline', e.target.value)
                    }
                    placeholder="Company Tagline"
                    className="text-xs sm:text-sm text-slate-300 bg-transparent border-b border-transparent hover:border-white/40 focus:border-white focus:outline-none w-full"
                  />
                  <input
                    type="text"
                    value={invoiceDoc.headerNote}
                    onChange={(e) => updateField('headerNote', e.target.value)}
                    placeholder="Header Statement Subtitle"
                    className="text-[11px] text-slate-400 bg-transparent border-b border-transparent hover:border-white/40 focus:border-white focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Right Header Meta: Editable INVOICE Title & Number */}
              <div className="sm:text-right shrink-0">
                <input
                  type="text"
                  value={invoiceDoc.headerTitle}
                  onChange={(e) => updateField('headerTitle', e.target.value)}
                  className="text-2xl sm:text-3xl font-extrabold tracking-wider text-white sm:text-right bg-transparent border-b border-transparent hover:border-white/40 focus:border-white focus:outline-none w-44 uppercase"
                />
                <div className="flex sm:justify-end items-center gap-1 mt-1">
                  <span className="text-sm font-bold text-blue-300 font-mono">
                    #
                  </span>
                  <input
                    type="text"
                    value={invoiceDoc.invoiceNumber.replace(/^#/, '')}
                    onChange={(e) =>
                      updateField('invoiceNumber', e.target.value)
                    }
                    className="text-sm font-bold text-blue-300 font-mono sm:text-right bg-transparent border-b border-transparent hover:border-blue-300 focus:border-white focus:outline-none w-28"
                  />
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-xs text-slate-200">
                  <span className="text-slate-400">Billing Period:</span>
                  <input
                    type="text"
                    value={invoiceDoc.billingMonth}
                    onChange={(e) => {
                      const nextMonth = e.target.value;
                      onChangeInvoiceDoc({
                        ...invoiceDoc,
                        billingMonth: nextMonth,
                        invoiceDate: getIssueDateForMonth(
                          nextMonth,
                          invoiceDoc.invoiceDate
                        ),
                        dueDate: getDueDateForMonth(
                          nextMonth,
                          invoiceDoc.dueDate
                        ),
                      });
                    }}
                    className="font-semibold text-white bg-transparent border-b border-transparent hover:border-white/40 focus:border-white focus:outline-none w-28 text-right"
                  />
                </div>
              </div>
            </div>

            {/* 2. Billed To & Dates / Status Strip */}
            <div className="px-6 sm:px-9 py-6 grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/60 border-b border-slate-200/80">
              {/* Left Card: Billed To */}
              <div className="md:col-span-6 bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs border-l-4 border-l-blue-600">
                <div
                  className={`text-[11px] font-bold uppercase tracking-wider ${accentTextClass} mb-1`}
                >
                  Billed To ({term.singular})
                </div>
                <input
                  type="text"
                  value={invoiceDoc.clientName}
                  onChange={(e) => updateField('clientName', e.target.value)}
                  placeholder={`${term.singular} Name`}
                  className="text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full"
                />
                <input
                  type="text"
                  value={invoiceDoc.clientAddress}
                  onChange={(e) => updateField('clientAddress', e.target.value)}
                  placeholder="Client Address"
                  className="text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full mt-0.5"
                />
                <input
                  type="text"
                  value={invoiceDoc.clientPhone}
                  onChange={(e) => updateField('clientPhone', e.target.value)}
                  placeholder="Contact Phone"
                  className="text-xs text-slate-600 font-mono bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full mt-0.5"
                />
              </div>

              {/* Right Card: Issue Date, Due Date & Payment Status */}
              <div className="md:col-span-6 bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs grid grid-cols-3 gap-3 items-center">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Issue Date
                  </div>
                  <input
                    type="text"
                    value={invoiceDoc.invoiceDate}
                    onChange={(e) => updateField('invoiceDate', e.target.value)}
                    placeholder="15 May 2026"
                    className="text-xs font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full mt-1"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                    Due Date
                  </div>
                  <input
                    type="text"
                    value={invoiceDoc.dueDate}
                    onChange={(e) => updateField('dueDate', e.target.value)}
                    placeholder="25 May 2026"
                    className="text-xs font-bold text-rose-600 bg-transparent border-b border-transparent hover:border-rose-300 focus:border-rose-600 focus:outline-none w-full mt-1"
                  />
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Status
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      remainingDues === 0
                        ? 'text-emerald-700'
                        : amountPaid > 0
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        remainingDues === 0
                          ? 'bg-emerald-600'
                          : amountPaid > 0
                          ? 'bg-amber-500'
                          : 'bg-rose-600'
                      }`}
                    />
                    <span>
                      {remainingDues === 0
                        ? 'PAID'
                        : amountPaid > 0
                        ? 'PARTIAL'
                        : 'UNPAID'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Main Billing Table & Executive Payment Summary */}
            <div className="px-6 sm:px-9 py-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Numbered Description / Amount Table (7 cols) */}
              <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div
                  className={`${tableHeaderClass} px-4 py-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">#</span>
                    <span>Service Description</span>
                  </div>
                  <span>Amount</span>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {/* 01 Software Charges */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/60">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        01
                      </span>
                      <input
                        type="text"
                        value={invoiceDoc.softwareLabel}
                        onChange={(e) =>
                          updateField('softwareLabel', e.target.value)
                        }
                        className="text-slate-800 font-medium bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none flex-1"
                      />
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(invoiceDoc.softwareCharges, currency)}
                    </span>
                  </div>

                  {/* 02 WhatsApp Charges */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/60">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        02
                      </span>
                      <input
                        type="text"
                        value={invoiceDoc.whatsappLabel}
                        onChange={(e) =>
                          updateField('whatsappLabel', e.target.value)
                        }
                        className="text-slate-800 font-medium bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none flex-1"
                      />
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(invoiceDoc.whatsappCharges, currency)}
                    </span>
                  </div>

                  {/* 03 Chatbot Charges */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/60">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        03
                      </span>
                      <input
                        type="text"
                        value={invoiceDoc.chatbotLabel}
                        onChange={(e) =>
                          updateField('chatbotLabel', e.target.value)
                        }
                        className="text-slate-800 font-medium bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none flex-1"
                      />
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(invoiceDoc.chatbotCharges, currency)}
                    </span>
                  </div>

                  {/* Current Month Subtotal */}
                  <div className="px-4 py-3 bg-slate-50 flex items-center justify-between font-bold text-slate-900">
                    <span className="pl-7">Current Month Subtotal</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(currentMonthTotal, currency)}
                    </span>
                  </div>

                  {/* Previous Dues Carry-Forward Highlighted Row */}
                  <div className="px-4 py-3 bg-rose-50/90 flex items-center justify-between font-bold text-rose-600">
                    <input
                      type="text"
                      value={invoiceDoc.previousDuesLabel}
                      onChange={(e) =>
                        updateField('previousDuesLabel', e.target.value)
                      }
                      className="pl-7 text-rose-600 font-bold bg-transparent border-b border-transparent hover:border-rose-400 focus:border-rose-600 focus:outline-none flex-1"
                    />
                    <span className="font-mono tabular-nums">
                      {formatCurrency(previousDues, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Executive Summary Totals Box (5 cols) */}
              <div className="lg:col-span-5 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 shadow-2xs text-xs">
                <div
                  className={`${tableHeaderClass} px-4 py-3 text-[11px] font-bold uppercase tracking-wider`}
                >
                  Payment Summary
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80">
                    <span className="font-semibold text-slate-700 text-sm">
                      Total Payable
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                      {formatCurrency(totalAmount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80">
                    <span className="font-medium text-slate-600">
                      Amount Paid
                    </span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(amountPaid, currency)}
                    </span>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 flex items-center justify-between">
                    <span className="font-bold text-rose-700 text-sm">
                      Balance Due
                    </span>
                    <span className="font-mono font-extrabold text-rose-600 text-base tabular-nums">
                      {formatCurrency(remainingDues, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3B. Optional Invoice Note / Special Instructions Section on Invoice */}
            <div
              className={`px-6 sm:px-9 pb-6 ${
                !invoiceDoc.invoiceNote?.trim() ? 'no-print' : ''
              }`}
            >
              <div
                className={`rounded-xl border p-3.5 transition-colors ${
                  invoiceDoc.invoiceNote?.trim()
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-slate-50/50 border-dashed border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-amber-600" />
                    <span>Note / Special Instructions</span>
                  </span>
                  {invoiceDoc.invoiceNote && (
                    <button
                      type="button"
                      onClick={() => updateField('invoiceNote', '')}
                      className="text-[10px] text-slate-400 hover:text-rose-600 no-print"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={invoiceDoc.invoiceNote?.trim() ? 2 : 1}
                  value={invoiceDoc.invoiceNote || ''}
                  onChange={(e) => updateField('invoiceNote', e.target.value)}
                  placeholder="Click to add a note or special instructions on this invoice (optional)..."
                  className="w-full text-xs text-slate-800 bg-transparent border-0 focus:outline-none resize-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 4. Editable Executive Footer with ALL QR Codes at Footer & Payment Terms */}
            <div className="bg-slate-50 px-6 sm:px-9 py-6 border-t border-slate-200 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <input
                    type="text"
                    value={invoiceDoc.footerThankYou}
                    onChange={(e) =>
                      updateField('footerThankYou', e.target.value)
                    }
                    placeholder="Thank you message"
                    className={`text-sm font-bold ${accentTextClass} bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full`}
                  />
                  <input
                    type="text"
                    value={invoiceDoc.footerTerms}
                    onChange={(e) => updateField('footerTerms', e.target.value)}
                    placeholder="Payment instructions, bank details, or terms..."
                    className="text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full"
                  />
                  <div className="text-xs text-slate-500 pt-1 flex flex-wrap items-center gap-2 font-medium">
                    <input
                      type="text"
                      value={invoiceDoc.companyWebsite}
                      onChange={(e) =>
                        updateField('companyWebsite', e.target.value)
                      }
                      placeholder="www.company.com"
                      className="bg-transparent border-b border-transparent hover:border-slate-400 focus:border-blue-600 focus:outline-none w-36"
                    />
                    <span>|</span>
                    <input
                      type="text"
                      value={invoiceDoc.companyEmail}
                      onChange={(e) =>
                        updateField('companyEmail', e.target.value)
                      }
                      placeholder="support@company.com"
                      className="bg-transparent border-b border-transparent hover:border-slate-400 focus:border-blue-600 focus:outline-none w-44"
                    />
                    <span>|</span>
                    <input
                      type="text"
                      value={invoiceDoc.companyPhone}
                      onChange={(e) =>
                        updateField('companyPhone', e.target.value)
                      }
                      placeholder="+92 300 1234567"
                      className="font-mono bg-transparent border-b border-transparent hover:border-slate-400 focus:border-blue-600 focus:outline-none w-36"
                    />
                  </div>
                </div>

                {/* All Custom Uploaded QR Codes at the Footer of the Invoice */}
                {invoiceDoc.showQrCode !== false && (
                  <div className="flex items-stretch gap-3.5 flex-wrap justify-start lg:justify-end shrink-0">
                    {effectiveQrCodes.map((qr, idx) => {
                      const titleVal = qr.bankName ?? qr.label ?? '';
                      const acctVal =
                        qr.accountNumber ?? qr.accountTitle ?? '';
                      const titleRows = Math.max(
                        1,
                        Math.ceil((titleVal.length || 1) / 20)
                      );
                      const acctRows = Math.max(
                        1,
                        Math.ceil((acctVal.length || 1) / 22)
                      );

                      return (
                        <div
                          key={qr.id || idx}
                          className="relative flex flex-col items-center bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-2xs min-w-[152px] max-w-[230px] shrink-0 group/qrcard"
                        >
                          {effectiveQrCodes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQrCodeItem(idx)}
                              title="Remove this QR Code"
                              className="no-print absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover/qrcard:opacity-100 transition-opacity shadow-xs"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <label
                            title="Click to upload custom QR code image"
                            className="cursor-pointer group"
                          >
                            {qr.dataUrl ? (
                              <img
                                src={qr.dataUrl}
                                alt={
                                  qr.bankName || qr.label || 'Payment QR Code'
                                }
                                referrerPolicy="no-referrer"
                                className="w-28 h-28 object-contain rounded group-hover:opacity-85 transition-opacity"
                              />
                            ) : (
                              <svg
                                className="w-28 h-28 text-slate-900 group-hover:text-blue-700 transition-colors"
                                viewBox="0 0 21 21"
                                fill="currentColor"
                              >
                                <path d="M0 0h7v7H0V0zm1 1v5h5V1H1zm1 1h3v3H2V2z" />
                                <path d="M14 0h7v7h-7V0zm1 1v5h5V1h-5zm1 1h3v3h-3V2z" />
                                <path d="M0 14h7v7H0v-7zm1 1v5h5v-5H1zm1 1h3v3H2v-3z" />
                                <rect x="8" y="1" width="2" height="2" />
                                <rect x="11" y="2" width="2" height="2" />
                                <rect x="8" y="5" width="3" height="2" />
                                <rect x="1" y="8" width="3" height="2" />
                                <rect x="6" y="8" width="2" height="3" />
                                <rect x="10" y="9" width="3" height="3" />
                                <rect x="15" y="8" width="2" height="2" />
                                <rect x="18" y="10" width="3" height="2" />
                                <rect x="8" y="14" width="2" height="3" />
                                <rect x="12" y="13" width="3" height="2" />
                                <rect x="16" y="14" width="2" height="3" />
                                <rect x="11" y="17" width="3" height="3" />
                                <rect x="18" y="18" width="3" height="3" />
                              </svg>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadQrAtIndex(idx, e)}
                              className="hidden"
                            />
                          </label>
                          <textarea
                            rows={titleRows}
                            value={titleVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextQrs = effectiveQrCodes.map((item, i) =>
                                i === idx
                                  ? { ...item, label: val, bankName: val }
                                  : item
                              );
                              handleUpdateQrCodesList(nextQrs);
                            }}
                            placeholder="QR Code Title / Bank Name"
                            className="text-xs font-bold text-slate-900 mt-2 text-center bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full resize-none overflow-hidden leading-snug break-words"
                          />
                          <textarea
                            rows={acctRows}
                            value={acctVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextQrs = effectiveQrCodes.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      accountNumber: val,
                                      accountTitle: val,
                                    }
                                  : item
                              );
                              handleUpdateQrCodesList(nextQrs);
                            }}
                            placeholder="Account Title / # (optional)"
                            className={`text-[10.5px] font-mono text-slate-600 mt-0.5 text-center bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none w-full resize-none overflow-hidden leading-tight break-words ${
                              !acctVal ? 'no-print' : ''
                            }`}
                          />
                        </div>
                      );
                    })}

                    {/* Quick "+ Add QR Code" button right in the invoice footer */}
                    <button
                      type="button"
                      onClick={handleAddQrCodeItem}
                      title="Add another QR code to the footer of the invoice"
                      className="no-print flex flex-col items-center justify-center gap-1.5 w-24 min-h-[150px] rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 text-slate-500 hover:text-blue-600 transition-colors shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[11px] font-semibold text-center px-2">
                        Add QR Code
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Direct PDF Share Modal */}
      {whatsappModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Share Invoice via WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send directly to WhatsApp without downloading a file
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span>Recipient ({term.singular}):</span>
                <span className="font-semibold text-slate-900">
                  {invoiceDoc.clientName} ({invoiceDoc.clientPhone})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Attached PDF File:</span>
                <span className="font-mono font-semibold text-blue-600">
                  {whatsappModal.filename}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Formatted Invoice Summary Message
              </label>
              <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {whatsappModal.messageText}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsappModal.messageText);
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
                href={whatsappModal.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open WhatsApp Chat</span>
              </a>

              <button
                type="button"
                onClick={() => setWhatsappModal(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Invoice Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Invoice #{invoiceDoc.invoiceNumber}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete the invoice for{' '}
                  <strong className="text-slate-800">{invoiceDoc.clientName}</strong> for{' '}
                  <strong>{selectedMonth}</strong>? This will reset all current month charges and remove it from the Invoice Log.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteInvoice && selectedClientId) {
                    onDeleteInvoice(selectedClientId, selectedMonth);
                    setShowDeleteModal(false);
                    setToastMessage('Invoice deleted successfully');
                    setTimeout(() => setToastMessage(null), 3500);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
