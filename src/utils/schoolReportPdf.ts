import { jsPDF } from 'jspdf';
import { CompanyProfile, ClientEntity, MonthlyLedgerRecord } from '../types';
import {
  formatCurrency,
  AVAILABLE_MONTHS,
  isPaymentAfterDueDate,
  getOrComputeMonthlyRecord,
} from '../data/initialData';

export interface SchoolReportOptions {
  client: ClientEntity;
  company: CompanyProfile;
  selectedMonth?: string;
  currency?: string;
  record?: MonthlyLedgerRecord;
}

/**
 * Builds a comprehensive, professional PDF statement of account for an individual school.
 * Highlights late payments in RED and details remaining dues across every month.
 */
export function buildSchoolReportPdfInstance(options: SchoolReportOptions): jsPDF {
  const {
    client,
    company,
    selectedMonth,
    currency = company.currency || 'Rs.',
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

  // 1. Header Banner (Navy Gradient / Solid)
  pdf.setFillColor(15, 23, 42); // Slate-900
  pdf.roundedRect(margin, currY, contentWidth, 24, 2, 2, 'F');

  // Company Logo or Monogram
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

  // Company Details
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(company.name || 'ProBill Financial Management', textStartX, currY + 9);

  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(
    company.tagline || 'School Billing & Payment History Statement',
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

  // Right Side: Report Title & Date
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('SCHOOL LEDGER REPORT', pageWidth - margin - 5, currY + 9, { align: 'right' });

  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  const genDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  pdf.text(`Generated: ${genDate}`, pageWidth - margin - 5, currY + 15, { align: 'right' });
  if (selectedMonth) {
    pdf.text(`Target Month: ${selectedMonth}`, pageWidth - margin - 5, currY + 20, { align: 'right' });
  }

  currY += 28;

  // 2. School Profile Info Card
  pdf.setFillColor(248, 250, 252); // Slate-50
  pdf.setDrawColor(226, 232, 240); // Slate-200
  pdf.roundedRect(margin, currY, contentWidth, 22, 1.5, 1.5, 'FD');

  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('SCHOOL / CLIENT DETAILS', margin + 4, currY + 6);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(client.name || 'Unnamed School', margin + 4, currY + 13);

  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const schoolContact = [
    client.address || 'Address Not Provided',
    client.phone ? `Phone: ${client.phone}` : null,
    client.ownerName ? `Owner: ${client.ownerName}` : null,
  ]
    .filter(Boolean)
    .join('  |  ');
  pdf.text(schoolContact.slice(0, 95), margin + 4, currY + 18.5);

  currY += 26;

  // 3. Gather Monthly Records in Chronological Sequence (Realized only)
  const monthSet = new Set(Object.keys(client.monthlyRecords || {}));
  if (selectedMonth) monthSet.add(selectedMonth);
  const sortedMonths = Array.from(monthSet).sort((a, b) => {
    const idxA = AVAILABLE_MONTHS.indexOf(a);
    const idxB = AVAILABLE_MONTHS.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.localeCompare(b);
  });

  const recordsList: { month: string; rec: MonthlyLedgerRecord }[] = sortedMonths
    .map((m) => ({
      month: m,
      rec:
        selectedMonth === m && options.record
          ? options.record
          : getOrComputeMonthlyRecord(client, m),
    }))
    .filter(
      ({ month, rec }) =>
        rec.currentMonthTotal > 0 ||
        rec.amountPaid > 0 ||
        rec.remainingDues > 0 ||
        month === selectedMonth
    );

  // Calculate Aggregates
  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalLateCount = 0;
  let totalTxCount = 0;

  recordsList.forEach(({ rec }) => {
    totalBilled += Number(rec.currentMonthTotal || 0);
    totalPaid += Number(rec.amountPaid || 0);
    (rec.payments || []).forEach((p) => {
      totalTxCount++;
      if (isPaymentAfterDueDate(p.date, rec.dueDate)) {
        totalLateCount++;
      }
    });
  });

  // Current remaining dues from latest record or calculated
  if (recordsList.length > 0) {
    const latestRec = recordsList[recordsList.length - 1].rec;
    totalOutstanding = Number(latestRec.remainingDues || 0);
  }

  // 4. Executive Summary KPI Cards (4 columns)
  const kpiW = (contentWidth - 9) / 4;
  const kpiH = 15;

  // KPI 1: Total Billed
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(margin, currY, kpiW, kpiH, 1, 1, 'FD');
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('TOTAL BILLED', margin + 3, currY + 4.5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(totalBilled, currency), margin + 3, currY + 11.5);

  // KPI 2: Total Paid
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(187, 247, 208);
  pdf.roundedRect(margin + kpiW + 3, currY, kpiW, kpiH, 1, 1, 'FD');
  pdf.setTextColor(22, 101, 52);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('TOTAL COLLECTED', margin + kpiW + 6, currY + 4.5);
  pdf.setTextColor(21, 128, 61);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(totalPaid, currency), margin + kpiW + 6, currY + 11.5);

  // KPI 3: Outstanding Balance
  pdf.setFillColor(254, 242, 242);
  pdf.setDrawColor(254, 202, 202);
  pdf.roundedRect(margin + (kpiW + 3) * 2, currY, kpiW, kpiH, 1, 1, 'FD');
  pdf.setTextColor(153, 27, 27);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('OUTSTANDING DUES', margin + (kpiW + 3) * 2 + 3, currY + 4.5);
  pdf.setTextColor(220, 38, 38);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(totalOutstanding, currency), margin + (kpiW + 3) * 2 + 3, currY + 11.5);

  // KPI 4: Payment Punctuality
  pdf.setFillColor(totalLateCount > 0 ? 255 : 248, totalLateCount > 0 ? 241 : 250, totalLateCount > 0 ? 242 : 252);
  pdf.setDrawColor(totalLateCount > 0 ? 244 : 226, totalLateCount > 0 ? 63 : 232, totalLateCount > 0 ? 94 : 240);
  pdf.roundedRect(margin + (kpiW + 3) * 3, currY, kpiW, kpiH, 1, 1, 'FD');
  pdf.setTextColor(totalLateCount > 0 ? 190 : 71, totalLateCount > 0 ? 18 : 85, totalLateCount > 0 ? 60 : 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('PUNCTUALITY', margin + (kpiW + 3) * 3 + 3, currY + 4.5);
  pdf.setTextColor(totalLateCount > 0 ? 225 : 16, totalLateCount > 0 ? 29 : 185, totalLateCount > 0 ? 72 : 129);
  pdf.setFontSize(9.5);
  pdf.text(
    totalLateCount > 0 ? `${totalLateCount} LATE PAYMENT${totalLateCount === 1 ? '' : 'S'}` : '100% ON TIME',
    margin + (kpiW + 3) * 3 + 3,
    currY + 11.5
  );

  currY += 20;

  // 5. Monthly History Table Header
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text('CHRONOLOGICAL BILLING & PAYMENT LEDGER', margin, currY);

  currY += 4;

  const colW = {
    month: 32,
    dueDate: 24,
    billed: 25,
    prevDues: 23,
    totalDue: 26,
    paid: 26,
    remaining: 26,
  };

  const drawTableHeader = (y: number) => {
    pdf.setFillColor(30, 41, 59); // Slate-800
    pdf.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);

    let x = margin + 2;
    pdf.text('Month', x, y + 5);
    x += colW.month;
    pdf.text('Due Date', x, y + 5);
    x += colW.dueDate;
    pdf.text('Billed', x + colW.billed - 4, y + 5, { align: 'right' });
    x += colW.billed;
    pdf.text('Prev Dues', x + colW.prevDues - 4, y + 5, { align: 'right' });
    x += colW.prevDues;
    pdf.text('Total Due', x + colW.totalDue - 4, y + 5, { align: 'right' });
    x += colW.totalDue;
    pdf.text('Paid', x + colW.paid - 4, y + 5, { align: 'right' });
    x += colW.paid;
    pdf.text('Balance Due', x + colW.remaining - 4, y + 5, { align: 'right' });
  };

  drawTableHeader(currY);
  currY += 7;

  if (recordsList.length === 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, currY, contentWidth, 14, 'F');
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text('No monthly billing records recorded yet for this school.', pageWidth / 2, currY + 9, {
      align: 'center',
    });
    currY += 16;
  } else {
    recordsList.forEach(({ month, rec }, rIdx) => {
      // Check page overflow
      const estimatedHeight = 10 + (rec.payments?.length || 0) * 6;
      if (currY + estimatedHeight > pageHeight - 25) {
        pdf.addPage();
        currY = 15;
        drawTableHeader(currY);
        currY += 7;
      }

      const isEven = rIdx % 2 === 0;
      pdf.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      pdf.rect(margin, currY, contentWidth, 8, 'F');
      pdf.setDrawColor(241, 245, 249);
      pdf.line(margin, currY + 8, margin + contentWidth, currY + 8);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);

      let x = margin + 2;
      pdf.text(month, x, currY + 5.5);

      x += colW.month;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(rec.dueDate || '—', x, currY + 5.5);

      x += colW.dueDate;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatCurrency(rec.currentMonthTotal, currency), x + colW.billed - 4, currY + 5.5, {
        align: 'right',
      });

      x += colW.billed;
      pdf.setTextColor(rec.previousDues > 0 ? 220 : 100, rec.previousDues > 0 ? 38 : 116, rec.previousDues > 0 ? 38 : 139);
      pdf.text(formatCurrency(rec.previousDues, currency), x + colW.prevDues - 4, currY + 5.5, {
        align: 'right',
      });

      x += colW.prevDues;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(formatCurrency(rec.totalAmount, currency), x + colW.totalDue - 4, currY + 5.5, {
        align: 'right',
      });

      x += colW.totalDue;
      pdf.setTextColor(21, 128, 61);
      pdf.text(formatCurrency(rec.amountPaid, currency), x + colW.paid - 4, currY + 5.5, {
        align: 'right',
      });

      x += colW.paid;
      pdf.setTextColor(rec.remainingDues > 0 ? 220 : 21, rec.remainingDues > 0 ? 38 : 128, rec.remainingDues > 0 ? 38 : 61);
      pdf.text(formatCurrency(rec.remainingDues, currency), x + colW.remaining - 4, currY + 5.5, {
        align: 'right',
      });

      currY += 8;

      // Render payment transactions under this month (highlighting LATE payments in RED)
      if (rec.payments && rec.payments.length > 0) {
        rec.payments.forEach((tx) => {
          if (currY > pageHeight - 20) {
            pdf.addPage();
            currY = 15;
            drawTableHeader(currY);
            currY += 7;
          }

          const isLate = isPaymentAfterDueDate(tx.date, rec.dueDate);

          pdf.setFillColor(isLate ? 255 : 240, isLate ? 241 : 253, isLate ? 242 : 244);
          pdf.rect(margin + 10, currY, contentWidth - 10, 6, 'F');

          pdf.setFontSize(7);
          if (isLate) {
            // RED TEXT for Late Payment
            pdf.setTextColor(225, 29, 72); // Rose-600
            pdf.setFont('helvetica', 'bold');
            pdf.text(
              `[LATE PAYMENT] Received on: ${tx.date}${tx.time ? ` · ${tx.time}` : ''} (Due date was: ${rec.dueDate || 'N/A'})`,
              margin + 13,
              currY + 4.2
            );
          } else {
            // GREEN TEXT for On-Time Payment
            pdf.setTextColor(21, 128, 61); // Emerald-700
            pdf.setFont('helvetica', 'normal');
            pdf.text(
              `[ON-TIME] Received on: ${tx.date}${tx.time ? ` · ${tx.time}` : ''}`,
              margin + 13,
              currY + 4.2
            );
          }

          const accInfo = tx.paymentFromAccountName || tx.bankName || tx.method || 'Bank Transfer';
          pdf.setTextColor(71, 85, 105);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Via: ${accInfo}`, margin + 115, currY + 4.2);

          // Payment Amount
          pdf.setTextColor(isLate ? 225 : 21, isLate ? 29 : 128, isLate ? 72 : 61);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`+${formatCurrency(tx.amount, currency)}`, margin + contentWidth - 4, currY + 4.2, {
            align: 'right',
          });

          currY += 6;
        });
      }
    });
  }

  // 6. Authorized Signature & Footer
  if (currY < pageHeight - 25) {
    currY = Math.max(currY + 8, pageHeight - 28);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, currY, margin + contentWidth, currY);

    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(
      `This report is officially generated by ${company.name || 'ProBill Financial'}. Payments received after the due date are flagged in RED.`,
      pageWidth / 2,
      currY + 6,
      { align: 'center' }
    );
  }

  return pdf;
}

/**
 * Downloads the individual school PDF report directly.
 */
export function downloadSchoolReportPdf(options: SchoolReportOptions) {
  const pdf = buildSchoolReportPdfInstance(options);
  const safeName = (options.client.name || 'School')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `${safeName}_Ledger_Report.pdf`;
  pdf.save(filename);
}
