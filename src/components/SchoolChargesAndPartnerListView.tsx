import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  MessageSquare,
  Plus,
  Printer,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  AVAILABLE_MONTHS,
  CategoryTerminology,
  formatCurrency,
  getOrComputeMonthlyRecord,
} from '../data/initialData';
import {
  ActiveNavTab,
  ClientEntity,
  CompanyProfile,
  PartnerItem,
} from '../types';
import {
  downloadAllPartnersReportPdf,
  downloadPartnerReportPdf,
} from '../utils/partnerReportPdf';

interface SchoolChargesAndPartnerListViewProps {
  company: CompanyProfile;
  term: CategoryTerminology;
  clients: ClientEntity[];
  partners: PartnerItem[];
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  setActiveTab: (tab: ActiveNavTab) => void;
  onOpenInvoiceEditor: (clientId: string, month: string) => void;
  onRecordPayment?: (client: ClientEntity) => void;
}

export const SchoolChargesAndPartnerListView: React.FC<
  SchoolChargesAndPartnerListViewProps
> = ({
  company,
  term,
  clients,
  partners,
  selectedMonth,
  setSelectedMonth,
  setActiveTab,
  onOpenInvoiceEditor,
  onRecordPayment,
}) => {
  const currency = company.currency || 'Rs.';
  const [searchQuery, setSearchQuery] = useState('');
  const [partnerFilter, setPartnerFilter] = useState<string>('all'); // 'all', 'partner-only', 'no-partner', or partnerId

  // Build rows data for all active schools/clients in the selected month
  const allRows = clients
    .filter((c) => c.enabled)
    .map((c) => {
      const rec = getOrComputeMonthlyRecord(c, selectedMonth);

      // School Charges
      const softwareCharges = Number(rec.softwareCharges || 0);
      const whatsappCharges = Number(rec.whatsappCharges || 0);
      const chatbotCharges = Number(rec.chatbotCharges || 0);
      const totalSchoolCharges = softwareCharges + whatsappCharges + chatbotCharges;

      // Partner Breakdown
      const hasPartner = Boolean(
        (rec.partnerId && rec.partnerPaymentEnabled) ||
        (c.partnerId && c.partnerPaymentEnabled)
      );
      const resolvedPartnerId = rec.partnerId || c.partnerId || '';
      const partnerObj = partners.find((p) => p.id === resolvedPartnerId);
      const resolvedPartnerName =
        rec.partnerName || c.partnerName || partnerObj?.name || 'Assigned Partner';

      const partnerSoftware = hasPartner
        ? Number(rec.partnerSoftwareCharges ?? c.partnerSoftwareCharges ?? 0)
        : 0;
      const partnerWhatsapp = hasPartner
        ? Number(rec.partnerWhatsappCharges ?? c.partnerWhatsappCharges ?? 0)
        : 0;
      const partnerChatbot = hasPartner
        ? Number(rec.partnerChatbotCharges ?? c.partnerChatbotCharges ?? 0)
        : 0;
      const partnerTotal = hasPartner
        ? Number(rec.partnerTotalPayment ?? c.partnerTotalPayment ?? 0)
        : 0;

      // Company Net Profit from this school
      const companyNet = Math.max(0, totalSchoolCharges - partnerTotal);

      return {
        client: c,
        record: rec,
        softwareCharges,
        whatsappCharges,
        whatsappRate: rec.whatsappRate,
        whatsappMessages: rec.whatsappMessages,
        whatsappBillingType: rec.whatsappBillingType,
        chatbotCharges,
        totalSchoolCharges,
        hasPartner,
        partnerId: resolvedPartnerId,
        partnerName: resolvedPartnerName,
        partnerSoftware,
        partnerWhatsapp,
        partnerChatbot,
        partnerTotal,
        companyNet,
        status: rec.status,
        amountPaid: rec.amountPaid,
        remainingDues: rec.remainingDues,
      };
    });

  // Filter rows by search and partner dropdown
  const filteredRows = allRows.filter((row) => {
    const matchesSearch =
      row.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.client.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.partnerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (partnerFilter === 'all') return true;
    if (partnerFilter === 'partner-only') return row.hasPartner;
    if (partnerFilter === 'no-partner') return !row.hasPartner;
    return row.partnerId === partnerFilter;
  });

  // Aggregate Totals across all active rows
  const totals = filteredRows.reduce(
    (acc, row) => {
      acc.schoolSoftware += row.softwareCharges;
      acc.schoolWhatsapp += row.whatsappCharges;
      acc.schoolChatbot += row.chatbotCharges;
      acc.schoolTotal += row.totalSchoolCharges;

      acc.partnerSoftware += row.partnerSoftware;
      acc.partnerWhatsapp += row.partnerWhatsapp;
      acc.partnerChatbot += row.partnerChatbot;
      acc.partnerTotal += row.partnerTotal;

      acc.companyNet += row.companyNet;
      acc.amountPaid += row.amountPaid;
      acc.remainingDues += row.remainingDues;
      return acc;
    },
    {
      schoolSoftware: 0,
      schoolWhatsapp: 0,
      schoolChatbot: 0,
      schoolTotal: 0,
      partnerSoftware: 0,
      partnerWhatsapp: 0,
      partnerChatbot: 0,
      partnerTotal: 0,
      companyNet: 0,
      amountPaid: 0,
      remainingDues: 0,
    }
  );

  const handleExportCSV = () => {
    const headers = [
      '#',
      `${term.singular} Name`,
      'Phone',
      'Software Charges',
      'WhatsApp Charges',
      'Chatbot Charges',
      'Total School Bill',
      'Partner Name',
      'Software to Partner',
      'WhatsApp to Partner',
      'Chatbot to Partner',
      'Total to Partner',
      'Company Net',
      'Status',
    ];

    const rowsData = filteredRows.map((r, i) => [
      i + 1,
      `"${r.client.name.replace(/"/g, '""')}"`,
      `"${r.client.phone}"`,
      r.softwareCharges,
      r.whatsappCharges,
      r.chatbotCharges,
      r.totalSchoolCharges,
      r.hasPartner ? `"${r.partnerName.replace(/"/g, '""')}"` : 'None',
      r.partnerSoftware,
      r.partnerWhatsapp,
      r.partnerChatbot,
      r.partnerTotal,
      r.companyNet,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rowsData.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `School_Charges_Partner_Cuts_${selectedMonth.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadPartnerReport = (targetPartnerId?: string) => {
    const selectedPid =
      targetPartnerId ||
      (partnerFilter !== 'all' &&
      partnerFilter !== 'partner-only' &&
      partnerFilter !== 'no-partner'
        ? partnerFilter
        : undefined);

    if (selectedPid) {
      const partner = partners.find((p) => p.id === selectedPid);
      if (partner) {
        const partnerSchools = clients
          .filter((c) => c.enabled)
          .map((c) => {
            const rec = getOrComputeMonthlyRecord(c, selectedMonth);
            const isLinked =
              (rec.partnerId === partner.id && rec.partnerPaymentEnabled) ||
              (c.partnerId === partner.id && c.partnerPaymentEnabled);
            if (!isLinked) return null;
            return {
              client: c,
              softwarePay: Number(
                rec.partnerSoftwareCharges ?? c.partnerSoftwareCharges ?? 0
              ),
              whatsappPay: Number(
                rec.partnerWhatsappCharges ?? c.partnerWhatsappCharges ?? 0
              ),
              chatbotPay: Number(
                rec.partnerChatbotCharges ?? c.partnerChatbotCharges ?? 0
              ),
              totalPay: Number(
                rec.partnerTotalPayment ?? c.partnerTotalPayment ?? 0
              ),
              partnerNote: rec.partnerNote || c.partnerNote,
              schoolStatus: rec.status,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        downloadPartnerReportPdf({
          partner,
          partnerSchools,
          company,
          selectedMonth,
          currency,
        });
        return;
      }
    }

    // Otherwise download all partners summary report
    const allPartnerData = partners.map((p) => {
      const schools = clients
        .filter((c) => c.enabled)
        .map((c) => {
          const rec = getOrComputeMonthlyRecord(c, selectedMonth);
          const isLinked =
            (rec.partnerId === p.id && rec.partnerPaymentEnabled) ||
            (c.partnerId === p.id && c.partnerPaymentEnabled);
          if (!isLinked) return null;
          return {
            client: c,
            softwarePay: Number(
              rec.partnerSoftwareCharges ?? c.partnerSoftwareCharges ?? 0
            ),
            whatsappPay: Number(
              rec.partnerWhatsappCharges ?? c.partnerWhatsappCharges ?? 0
            ),
            chatbotPay: Number(
              rec.partnerChatbotCharges ?? c.partnerChatbotCharges ?? 0
            ),
            totalPay: Number(
              rec.partnerTotalPayment ?? c.partnerTotalPayment ?? 0
            ),
            partnerNote: rec.partnerNote || c.partnerNote,
            schoolStatus: rec.status,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const totalSoftware = schools.reduce((sum, s) => sum + s.softwarePay, 0);
      const totalWhatsapp = schools.reduce((sum, s) => sum + s.whatsappPay, 0);
      const totalChatbot = schools.reduce((sum, s) => sum + s.chatbotPay, 0);
      const totalPayCalc = schools.reduce((sum, s) => sum + s.totalPay, 0);
      const totalPayout = totalPayCalc > 0 ? totalPayCalc : p.monthlyPayment;
      const isPaid = Boolean(p.paidMonths[selectedMonth]?.paid);

      return {
        partner: p,
        schools,
        totalSoftware,
        totalWhatsapp,
        totalChatbot,
        totalPayout,
        isPaid,
      };
    });

    downloadAllPartnersReportPdf({
      partners,
      allPartnerData,
      company,
      selectedMonth,
      currency,
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {term.plural} Service Charges &amp; Partner Cuts
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {filteredRows.length} {filteredRows.length === 1 ? term.singular : term.plural}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of software charges, WhatsApp charges, chatbot charges, total bill, and exact partner payouts from each {term.singular.toLowerCase()} for{' '}
            <strong>{selectedMonth}</strong>.
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
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

          <button
            type="button"
            onClick={() => handleDownloadPartnerReport()}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Download PDF report showing software, WhatsApp, and chatbot cuts to partner only"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Partner PDF Report</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Top 6 Summary Metric Cards (Separately showing School Charges vs Partner Payouts by Service) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. School Software Charges */}
        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/20 p-3.5">
          <div className="text-[11px] font-medium text-slate-500">
            {term.plural} Software Total
          </div>
          <div className="text-base font-bold text-blue-900 font-mono tabular-nums mt-1">
            {formatCurrency(totals.schoolSoftware, currency)}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">
            Base software billing
          </div>
        </div>

        {/* 2. School WhatsApp Charges */}
        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-3.5">
          <div className="text-[11px] font-medium text-slate-500">
            {term.plural} WhatsApp Total
          </div>
          <div className="text-base font-bold text-emerald-900 font-mono tabular-nums mt-1">
            {formatCurrency(totals.schoolWhatsapp, currency)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            Messaging &amp; SMS charges
          </div>
        </div>

        {/* 3. School Chatbot Charges */}
        <div className="bg-white rounded-xl border border-purple-200 bg-purple-50/20 p-3.5">
          <div className="text-[11px] font-medium text-slate-500">
            {term.plural} Chatbot Total
          </div>
          <div className="text-base font-bold text-purple-900 font-mono tabular-nums mt-1">
            {formatCurrency(totals.schoolChatbot, currency)}
          </div>
          <div className="text-[10px] text-purple-600 mt-0.5">
            AI Assistant add-on
          </div>
        </div>

        {/* 4. Total Software Paid to Partners */}
        <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5">
          <div className="text-[11px] font-medium text-indigo-950">
            Software Paid to Partner
          </div>
          <div className="text-base font-bold text-indigo-700 font-mono tabular-nums mt-1">
            {formatCurrency(totals.partnerSoftware, currency)}
          </div>
          <div className="text-[10px] text-indigo-500 mt-0.5">
            Partner software share
          </div>
        </div>

        {/* 5. Total WhatsApp Paid to Partners */}
        <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5">
          <div className="text-[11px] font-medium text-indigo-950">
            WhatsApp Paid to Partner
          </div>
          <div className="text-base font-bold text-indigo-700 font-mono tabular-nums mt-1">
            {formatCurrency(totals.partnerWhatsapp, currency)}
          </div>
          <div className="text-[10px] text-indigo-500 mt-0.5">
            Partner WhatsApp share
          </div>
        </div>

        {/* 6. Total Chatbot Paid to Partners */}
        <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5">
          <div className="text-[11px] font-medium text-indigo-950">
            Chatbot Paid to Partner
          </div>
          <div className="text-base font-bold text-indigo-700 font-mono tabular-nums mt-1">
            {formatCurrency(totals.partnerChatbot, currency)}
          </div>
          <div className="text-[10px] text-indigo-500 mt-0.5">
            Partner Chatbot share
          </div>
        </div>
      </div>

      {/* Main Totals Highlight Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Total {term.plural} Charges Billed ({selectedMonth})
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatCurrency(totals.schoolTotal, currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Total Amount Paid to Partners ({selectedMonth})
            </div>
            <div className="text-xl font-bold font-mono text-indigo-300">
              {formatCurrency(totals.partnerTotal, currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Net Company Retained Profit
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatCurrency(totals.companyNet, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${term.plural.toLowerCase()} by name, phone, or partner...`}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Partner Filter:</span>
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All {term.plural}</option>
            <option value="partner-only">Partner-Linked {term.plural} Only</option>
            <option value="no-partner">No Partner (Direct Only)</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                Partner: {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comprehensive Charges & Partner Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                <th className="py-3 px-3 text-center border border-slate-200 w-10">#</th>
                <th className="py-3 px-3.5 border border-slate-200 min-w-[160px]">
                  {term.singular} Name
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-blue-50/40 text-blue-950 min-w-[110px]">
                  Software Charges
                </th>
                <th className="py-3 px-3 border border-slate-200 bg-emerald-50/40 text-emerald-950 min-w-[140px]">
                  WhatsApp Charges
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-purple-50/40 text-purple-950 min-w-[100px]">
                  Chatbot Charges
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-slate-100/70 font-bold text-slate-900 min-w-[110px]">
                  Total {term.singular} Bill
                </th>
                <th className="py-3 px-3.5 border border-slate-200 bg-indigo-50/40 text-indigo-950 min-w-[130px]">
                  Partner Name
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-indigo-50/40 text-indigo-900 min-w-[105px]">
                  Software to Partner
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-indigo-50/40 text-indigo-900 min-w-[105px]">
                  WhatsApp to Partner
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-indigo-50/40 text-indigo-900 min-w-[105px]">
                  Chatbot to Partner
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-indigo-100/60 font-bold text-indigo-950 min-w-[115px]">
                  Total to Partner
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 bg-emerald-50/60 font-bold text-emerald-950 min-w-[110px]">
                  Company Retained
                </th>
                <th className="py-3 px-3 text-center border border-slate-200 min-w-[90px]">
                  Status
                </th>
                <th className="py-3 px-3 text-right border border-slate-200 min-w-[80px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    No records found for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.client.id}
                    className="hover:bg-slate-50/90 transition-colors"
                  >
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400 border border-slate-200">
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {/* School Name */}
                    <td className="py-3 px-3.5 font-semibold text-slate-900 border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{row.client.name}</span>
                      </div>
                      <div className="text-[11px] font-normal text-slate-400">
                        {row.client.phone}
                      </div>
                    </td>

                    {/* Software Charges (School) */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 border border-slate-200 tabular-nums bg-blue-50/10">
                      {formatCurrency(row.softwareCharges, currency)}
                    </td>

                    {/* WhatsApp Charges (School) */}
                    <td className="py-3 px-3 font-mono text-slate-700 border border-slate-200 whitespace-nowrap bg-emerald-50/10">
                      {row.whatsappBillingType === 'per_month' ||
                      (row.whatsappCharges > 0 &&
                        row.whatsappRate === 0 &&
                        row.whatsappMessages === 0) ? (
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(row.whatsappCharges, currency)}
                        </span>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-900">
                            {formatCurrency(row.whatsappCharges, currency)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {row.whatsappRate} × {row.whatsappMessages.toLocaleString()} msgs
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Chatbot Charges (School) */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 border border-slate-200 tabular-nums bg-purple-50/10">
                      {formatCurrency(row.chatbotCharges, currency)}
                    </td>

                    {/* Total School Bill */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 border border-slate-200 tabular-nums bg-slate-50/60">
                      {formatCurrency(row.totalSchoolCharges, currency)}
                    </td>

                    {/* Partner Name */}
                    <td className="py-3 px-3.5 border border-slate-200 bg-indigo-50/10">
                      {row.hasPartner ? (
                        <div className="flex items-center gap-1.5 text-indigo-900 font-medium">
                          <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">{row.partnerName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None (Direct)</span>
                      )}
                    </td>

                    {/* Software Cut to Partner */}
                    <td className="py-3 px-3 text-right font-mono text-indigo-700 border border-slate-200 tabular-nums bg-indigo-50/10">
                      {row.hasPartner
                        ? formatCurrency(row.partnerSoftware, currency)
                        : `${currency} 0`}
                    </td>

                    {/* WhatsApp Cut to Partner */}
                    <td className="py-3 px-3 text-right font-mono text-indigo-700 border border-slate-200 tabular-nums bg-indigo-50/10">
                      {row.hasPartner
                        ? formatCurrency(row.partnerWhatsapp, currency)
                        : `${currency} 0`}
                    </td>

                    {/* Chatbot Cut to Partner */}
                    <td className="py-3 px-3 text-right font-mono text-indigo-700 border border-slate-200 tabular-nums bg-indigo-50/10">
                      {row.hasPartner
                        ? formatCurrency(row.partnerChatbot, currency)
                        : `${currency} 0`}
                    </td>

                    {/* Total Paid to Partner from this School */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-indigo-800 border border-slate-200 tabular-nums bg-indigo-100/40">
                      {row.hasPartner
                        ? formatCurrency(row.partnerTotal, currency)
                        : `${currency} 0`}
                    </td>

                    {/* Company Retained Net Profit */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 border border-slate-200 tabular-nums bg-emerald-50/40">
                      {formatCurrency(row.companyNet, currency)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center border border-slate-200">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.status === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-3 text-right border border-slate-200">
                      <div className="flex items-center justify-end gap-1">
                        {row.hasPartner && row.partnerId && (
                          <button
                            type="button"
                            onClick={() => handleDownloadPartnerReport(row.partnerId)}
                            title={`Download Partner PDF Report for ${row.partnerName}`}
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceEditor(row.client.id, selectedMonth)}
                          title="Open in Invoice Editor"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {onRecordPayment && (
                          <button
                            type="button"
                            onClick={() => onRecordPayment(row.client)}
                            title="Make Payment"
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Grand Totals Footer Row */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-xs">
                  <td colSpan={2} className="py-3.5 px-3.5 text-slate-900 border border-slate-200 uppercase tracking-wide">
                    Grand Totals ({filteredRows.length} {filteredRows.length === 1 ? term.singular : term.plural})
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-blue-950 border border-slate-200 tabular-nums">
                    {formatCurrency(totals.schoolSoftware, currency)}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-emerald-950 border border-slate-200 tabular-nums">
                    {formatCurrency(totals.schoolWhatsapp, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-purple-950 border border-slate-200 tabular-nums">
                    {formatCurrency(totals.schoolChatbot, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-900 border border-slate-200 tabular-nums text-sm">
                    {formatCurrency(totals.schoolTotal, currency)}
                  </td>
                  <td className="py-3.5 px-3.5 border border-slate-200 text-slate-500 font-normal italic">
                    All Partners
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-indigo-700 border border-slate-200 tabular-nums">
                    {formatCurrency(totals.partnerSoftware, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-indigo-700 border border-slate-200 tabular-nums">
                    {formatCurrency(totals.partnerWhatsapp, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-indigo-700 border border-slate-200 tabular-nums">
                    {formatCurrency(totals.partnerChatbot, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-indigo-900 border border-slate-200 tabular-nums text-sm">
                    {formatCurrency(totals.partnerTotal, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-700 border border-slate-200 tabular-nums text-sm">
                    {formatCurrency(totals.companyNet, currency)}
                  </td>
                  <td colSpan={2} className="border border-slate-200"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
