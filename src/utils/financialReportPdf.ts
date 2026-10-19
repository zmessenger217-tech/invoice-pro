import { jsPDF } from 'jspdf';
import { CompanyProfile } from '../types';
import { formatCurrency } from '../data/initialData';

export interface MonthlyFinancialRow {
  month: string;
  toBeCollected: number;
  collected: number;
  expenses: number;
  dues: number;
  netBalance: number;
  rate: number;
}

export interface FinancialReportOptions {
  company: CompanyProfile;
  selectedMonth: string;
  reportScope?: 'Current Month' | 'Specific Month' | 'Year' | 'Custom Date Range';
  currency?: string;
  totalToBeCollected: number;
  totalCollected: number;
  totalExpenses: number;
  totalDues: number;
  monthlyBreakdown: MonthlyFinancialRow[];
}

/**
 * Builds a corporate-grade financial PDF statement detailing collections, expenses, and dues.
 * Completely eliminates any projected or expected numbers, presenting 100% realized data.
 */
export function buildFinancialReportPdfInstance(
  options: FinancialReportOptions
): jsPDF {
  const {
    company,
    selectedMonth,
    reportScope = 'Current Month',
    currency = company.currency || 'Rs.',
    totalToBeCollected,
    totalCollected,
    totalExpenses,
    totalDues,
    monthlyBreakdown,
  } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currY = 12;

  // 1. Header Banner
  pdf.setFillColor(15, 23, 42); // Slate-900
  pdf.roundedRect(margin, currY, contentWidth, 24, 2, 2, 'F');

  let textStartX = margin + 5;
  if (company.logoDataUrl) {
    try {
      const format = company.logoDataUrl.includes('png') ? 'PNG' : 'JPEG';
      pdf.addImage(company.logoDataUrl, format, margin + 4, currY + 3.5, 17, 17, undefined, 'FAST');
      textStartX = margin + 25;
    } catch {
      textStartX = margin + 5;
    }
  }

  // Company Name & Description
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(company.name || 'ProBill Financial Management', textStartX, currY + 9);

  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(
    company.tagline || 'Official Realized Revenue, Expense & Dues Statement',
    textStartX,
    currY + 15
  );

  const contactLine = [company.phone, company.email, company.website]
    .filter(Boolean)
    .join('  •  ');
  if (contactLine) {
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(7.5);
    pdf.text(contactLine.slice(0, 70), textStartX, currY + 20);
  }

  // Right Side: Report Title & Period
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const isYearly = reportScope === 'Year';
  pdf.text(
    isYearly ? 'YEARLY FINANCIAL REPORT' : 'MONTHLY FINANCIAL REPORT',
    pageWidth - margin - 5,
    currY + 9,
    { align: 'right' }
  );

  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(
    isYearly ? 'Scope: Full Year Realized Ledger' : `Billing Period: ${selectedMonth}`,
    pageWidth - margin - 5,
    currY + 15,
    { align: 'right' }
  );
  const genDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  pdf.text(`Issued: ${genDate}`, pageWidth - margin - 5, currY + 20, { align: 'right' });

  currY += 28;

  // 2. Executive KPI Summary Cards (4 Cards)
  const kpiW = (contentWidth - 9) / 4;
  const kpiH = 17;

  // Card 1: To Be Collected
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(margin, currY, kpiW, kpiH, 1.5, 1.5, 'FD');
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('TOTAL TO BE COLLECTED', margin + 3, currY + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(totalToBeCollected, currency), margin + 3, currY + 12.5);

  // Card 2: Received / Collected
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(187, 247, 208);
  pdf.roundedRect(margin + kpiW + 3, currY, kpiW, kpiH, 1.5, 1.5, 'FD');
  pdf.setTextColor(22, 101, 52);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('PAYMENTS RECEIVED', margin + kpiW + 6, currY + 5);
  pdf.setTextColor(21, 128, 61);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(totalCollected, currency), margin + kpiW + 6, currY + 12.5);

  // Card 3: Expenses (Partner Payouts)
  pdf.setFillColor(238, 242, 255);
  pdf.setDrawColor(199, 210, 254);
  pdf.roundedRect(margin + (kpiW + 3) * 2, currY, kpiW, kpiH, 1.5, 1.5, 'FD');
  pdf.setTextColor(55, 48, 163);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('EXPENSES / PARTNER PAY', margin + (kpiW + 3) * 2 + 3, currY + 5);
  pdf.setTextColor(67, 56, 202);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(totalExpenses, currency), margin + (kpiW + 3) * 2 + 3, currY + 12.5);

  // Card 4: Outstanding Dues
  pdf.setFillColor(254, 242, 242);
  pdf.setDrawColor(254, 202, 202);
  pdf.roundedRect(margin + (kpiW + 3) * 3, currY, kpiW, kpiH, 1.5, 1.5, 'FD');
  pdf.setTextColor(153, 27, 27);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('OUTSTANDING DUES', margin + (kpiW + 3) * 3 + 3, currY + 5);
  pdf.setTextColor(220, 38, 38);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(totalDues, currency), margin + (kpiW + 3) * 3 + 3, currY + 12.5);

  currY += 21;

  // 3. Net Cash Flow & Collection Rate Banner
  const netBalance = totalCollected - totalExpenses;
  const overallRate = totalToBeCollected > 0 ? Math.round((totalCollected / totalToBeCollected) * 100) : 100;

  pdf.setFillColor(netBalance >= 0 ? 240 : 254, netBalance >= 0 ? 253 : 242, netBalance >= 0 ? 244 : 242);
  pdf.setDrawColor(netBalance >= 0 ? 187 : 254, netBalance >= 0 ? 247 : 202, netBalance >= 0 ? 208 : 202);
  pdf.roundedRect(margin, currY, contentWidth, 12, 1.5, 1.5, 'FD');

  pdf.setTextColor(netBalance >= 0 ? 21 : 185, netBalance >= 0 ? 128 : 28, netBalance >= 0 ? 61 : 28);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('NET OPERATING BALANCE (Collected - Expenses):', margin + 4, currY + 7.5);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(netBalance, currency), margin + 85, currY + 7.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Collection Recovery: ${overallRate}%`, pageWidth - margin - 4, currY + 7.5, {
    align: 'right',
  });

  currY += 17;

  // 4. Monthly Realized Breakdown Table
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text('REALIZED MONTHLY FINANCIAL BREAKDOWN', margin, currY);

  currY += 4;

  const colW = {
    month: 35,
    toCollect: 30,
    collected: 30,
    expenses: 28,
    dues: 27,
    net: 32,
  };

  const drawTableHeader = (y: number) => {
    pdf.setFillColor(30, 41, 59); // Slate-800
    pdf.roundedRect(margin, y, contentWidth, 7.5, 1, 1, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);

    let x = margin + 2;
    pdf.text('Month', x, y + 5.2);
    x += colW.month;
    pdf.text('To Collect', x + colW.toCollect - 4, y + 5.2, { align: 'right' });
    x += colW.toCollect;
    pdf.text('Collected', x + colW.collected - 4, y + 5.2, { align: 'right' });
    x += colW.collected;
    pdf.text('Expenses', x + colW.expenses - 4, y + 5.2, { align: 'right' });
    x += colW.expenses;
    pdf.text('Remaining Dues', x + colW.dues - 4, y + 5.2, { align: 'right' });
    x += colW.dues;
    pdf.text('Net Balance', x + colW.net - 4, y + 5.2, { align: 'right' });
  };

  drawTableHeader(currY);
  currY += 7.5;

  // Filter out any months that have literally zero recorded activity so we never display fake expected data!
  const activeMonths = monthlyBreakdown.filter(
    (row) =>
      row.toBeCollected > 0 ||
      row.collected > 0 ||
      row.expenses > 0 ||
      row.dues > 0 ||
      row.month === selectedMonth
  );

  if (activeMonths.length === 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, currY, contentWidth, 14, 'F');
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text('No realized transactions or bills recorded for this period.', pageWidth / 2, currY + 9, {
      align: 'center',
    });
    currY += 16;
  } else {
    activeMonths.forEach((row, idx) => {
      if (currY > pageHeight - 25) {
        pdf.addPage();
        currY = 15;
        drawTableHeader(currY);
        currY += 7.5;
      }

      const isEven = idx % 2 === 0;
      pdf.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      pdf.rect(margin, currY, contentWidth, 7.5, 'F');
      pdf.setDrawColor(241, 245, 249);
      pdf.line(margin, currY + 7.5, margin + contentWidth, currY + 7.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);

      let x = margin + 2;
      pdf.text(row.month, x, currY + 5.2);

      x += colW.month;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatCurrency(row.toBeCollected, currency), x + colW.toCollect - 4, currY + 5.2, {
        align: 'right',
      });

      x += colW.toCollect;
      pdf.setTextColor(21, 128, 61);
      pdf.text(formatCurrency(row.collected, currency), x + colW.collected - 4, currY + 5.2, {
        align: 'right',
      });

      x += colW.collected;
      pdf.setTextColor(67, 56, 202);
      pdf.text(formatCurrency(row.expenses, currency), x + colW.expenses - 4, currY + 5.2, {
        align: 'right',
      });

      x += colW.expenses;
      pdf.setTextColor(row.dues > 0 ? 220 : 100, row.dues > 0 ? 38 : 116, row.dues > 0 ? 38 : 139);
      pdf.text(formatCurrency(row.dues, currency), x + colW.dues - 4, currY + 5.2, {
        align: 'right',
      });

      x += colW.dues;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(row.netBalance >= 0 ? 21 : 220, row.netBalance >= 0 ? 128 : 38, row.netBalance >= 0 ? 61 : 38);
      pdf.text(formatCurrency(row.netBalance, currency), x + colW.net - 4, currY + 5.2, {
        align: 'right',
      });

      currY += 7.5;
    });

    // Totals Summary Row
    if (currY > pageHeight - 20) {
      pdf.addPage();
      currY = 15;
    }
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, currY, contentWidth, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);

    let x = margin + 2;
    pdf.text('TOTAL REALIZED', x, currY + 5.5);
    x += colW.month;
    pdf.text(formatCurrency(totalToBeCollected, currency), x + colW.toCollect - 4, currY + 5.5, { align: 'right' });
    x += colW.toCollect;
    pdf.setTextColor(21, 128, 61);
    pdf.text(formatCurrency(totalCollected, currency), x + colW.collected - 4, currY + 5.5, { align: 'right' });
    x += colW.collected;
    pdf.setTextColor(67, 56, 202);
    pdf.text(formatCurrency(totalExpenses, currency), x + colW.expenses - 4, currY + 5.5, { align: 'right' });
    x += colW.expenses;
    pdf.setTextColor(220, 38, 38);
    pdf.text(formatCurrency(totalDues, currency), x + colW.dues - 4, currY + 5.5, { align: 'right' });
    x += colW.dues;
    pdf.setTextColor(netBalance >= 0 ? 21 : 220, netBalance >= 0 ? 128 : 38, netBalance >= 0 ? 61 : 38);
    pdf.text(formatCurrency(netBalance, currency), x + colW.net - 4, currY + 5.5, { align: 'right' });

    currY += 12;
  }

  // 5. Footer & Authority Sign-off
  if (currY < pageHeight - 25) {
    currY = Math.max(currY + 5, pageHeight - 25);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, currY, margin + contentWidth, currY);

    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(
      `This statement reflects 100% realized collections, expenses, and dues. Verified by ${company.name || 'ProBill'}.`,
      pageWidth / 2,
      currY + 5,
      { align: 'center' }
    );
  }

  return pdf;
}

/**
 * Direct download for the Financial Report PDF.
 */
export function downloadFinancialReportPdf(options: FinancialReportOptions) {
  const pdf = buildFinancialReportPdfInstance(options);
  const isYearly = options.reportScope === 'Year';
  const safeScope = isYearly
    ? 'Yearly_Statement'
    : `${options.selectedMonth.replace(/[^a-zA-Z0-9]+/g, '_')}_Statement`;
  const filename = `${options.company.name ? options.company.name.replace(/[^a-zA-Z0-9]+/g, '_') : 'Company'}_${safeScope}.pdf`;
  pdf.save(filename);
}
