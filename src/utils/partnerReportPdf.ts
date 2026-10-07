import { jsPDF } from 'jspdf';
import { formatCurrency } from '../data/initialData';
import { CompanyProfile, PartnerItem } from '../types';
import { resolveActiveLogoUrl, DEFAULT_BRAND_LOGO_DATA_URL } from './usePWAInstall';

export interface PartnerSchoolReportItem {
  client: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
  };
  softwarePay: number;
  whatsappPay: number;
  chatbotPay: number;
  totalPay: number;
  partnerNote?: string;
  schoolStatus?: string;
}

export interface PartnerReportOptions {
  partner: PartnerItem;
  partnerSchools: PartnerSchoolReportItem[];
  company: CompanyProfile;
  selectedMonth: string;
  currency?: string;
  isPaid?: boolean;
}

export interface AllPartnersReportOptions {
  partners: PartnerItem[];
  allPartnerData: {
    partner: PartnerItem;
    schools: PartnerSchoolReportItem[];
    totalSoftware: number;
    totalWhatsapp: number;
    totalChatbot: number;
    totalPayout: number;
    isPaid: boolean;
  }[];
  company: CompanyProfile;
  selectedMonth: string;
  currency?: string;
}

/**
 * Generates an individualized PDF Report for a Partner containing ONLY what the partner receives
 * from each school (Software Charges to Partner, WhatsApp Charges to Partner, Chatbot Charges to Partner, and Total Payout),
 * completely omitting internal company revenue, markups, or profits.
 */
export function buildPartnerPdfInstance(options: PartnerReportOptions): jsPDF {
  const {
    partner,
    partnerSchools,
    company,
    selectedMonth,
    currency = company.currency || 'Rs.',
    isPaid = Boolean(partner.paidMonths?.[selectedMonth]?.paid),
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

  // Header Background Gradient / Banner (Indigo / Slate theme for Partner Reports)
  pdf.setFillColor(30, 41, 59); // Slate-800
  pdf.rect(0, 0, pageWidth, 44, 'F');

  // Accent bar
  pdf.setFillColor(99, 102, 241); // Indigo-500
  pdf.rect(0, 42.5, pageWidth, 2.5, 'F');

  // Brand Logo or Monogram Box
  let textStartX = margin;
  const logoUrl = resolveActiveLogoUrl(company.logoDataUrl);
  if (logoUrl && logoUrl.startsWith('data:image/')) {
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 9, 18, 18, 2.5, 2.5, 'F');
      const format = logoUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(logoUrl, format, margin + 1, 10, 16, 16, undefined, 'FAST');
      textStartX = margin + 22;
    } catch {
      // Fallback
      pdf.setFillColor(99, 102, 241);
      pdf.roundedRect(margin, 9, 18, 18, 2.5, 2.5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(
        (company.name || 'PB').slice(0, 2).toUpperCase(),
        margin + 9,
        21,
        { align: 'center' }
      );
      textStartX = margin + 22;
    }
  } else {
    pdf.setFillColor(99, 102, 241);
    pdf.roundedRect(margin, 9, 18, 18, 2.5, 2.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(
      (company.name || 'PB').slice(0, 2).toUpperCase(),
      margin + 9,
      21,
      { align: 'center' }
    );
    textStartX = margin + 22;
  }

  // Company Name & Tagline
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(company.name || 'ProBill Management', textStartX, 17);

  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(
    company.tagline || 'Partner Commission & Service Payout Report',
    textStartX,
    23
  );

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(8);
  const companyContact = [company.phone, company.email, company.website]
    .filter(Boolean)
    .join('  •  ');
  if (companyContact) {
    pdf.text(companyContact, textStartX, 28.5);
  }

  // Right Side Header: Document Title & Month
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('PARTNER PAYOUT REPORT', pageWidth - margin, 16, { align: 'right' });

  pdf.setTextColor(165, 180, 252); // Indigo-200
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Month: ${selectedMonth}`, pageWidth - margin, 23, {
    align: 'right',
  });

  const statementId = `PRT-${selectedMonth.replace(/\s+/g, '').toUpperCase()}-${partner.id.slice(-4).toUpperCase()}`;
  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.text(`Statement ID: ${statementId}`, pageWidth - margin, 29, {
    align: 'right',
  });

  // Calculate Aggregates for this partner
  const totalSoftwareCut = partnerSchools.reduce((sum, s) => sum + s.softwarePay, 0);
  const totalWhatsappCut = partnerSchools.reduce((sum, s) => sum + s.whatsappPay, 0);
  const totalChatbotCut = partnerSchools.reduce((sum, s) => sum + s.chatbotPay, 0);
  const totalPayoutCalc = partnerSchools.reduce((sum, s) => sum + s.totalPay, 0);
  const finalTotalPayout = totalPayoutCalc > 0 ? totalPayoutCalc : partner.monthlyPayment;

  // Partner Info & Payout Status Block (Y: 50 to 76)
  let currY = 50;

  // Left Box: Partner Details
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, currY, 115, 26, 2, 2, 'FD');

  pdf.setTextColor(79, 70, 229); // Indigo-600
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('PARTNER INFORMATION (PAYEE)', margin + 4, currY + 6);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(partner.name || 'Partner Name', margin + 4, currY + 13);

  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Phone: ${partner.phone || 'N/A'}`, margin + 4, currY + 19);
  pdf.text(`Linked Schools: ${partnerSchools.length}`, margin + 65, currY + 19);

  // Right Box: Payout Status & Date
  const rightBoxWidth = contentWidth - 120;
  const rightBoxX = margin + 120;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(rightBoxX, currY, rightBoxWidth, 26, 2, 2, 'FD');

  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('PAYOUT STATUS', rightBoxX + 4, currY + 6);

  if (isPaid) {
    pdf.setFillColor(220, 252, 231); // Emerald-100
    pdf.setDrawColor(187, 247, 208);
    pdf.roundedRect(rightBoxX + 4, currY + 9, 28, 6.5, 1.5, 1.5, 'FD');
    pdf.setTextColor(22, 101, 52); // Emerald-800
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text('PAID', rightBoxX + 18, currY + 13.5, { align: 'center' });
  } else {
    pdf.setFillColor(254, 243, 199); // Amber-100
    pdf.setDrawColor(253, 230, 138);
    pdf.roundedRect(rightBoxX + 4, currY + 9, 32, 6.5, 1.5, 1.5, 'FD');
    pdf.setTextColor(146, 64, 14); // Amber-800
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text('PENDING', rightBoxX + 20, currY + 13.5, { align: 'center' });
  }

  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, rightBoxX + 4, currY + 21);

  // 4 Top Summary Metric Cards for Partner Earnings Only (Y: 80 to 100)
  currY = 80;
  const cardGap = 3;
  const cardW = (contentWidth - cardGap * 3) / 4;

  // 1. Total Partner Payout Card
  pdf.setFillColor(238, 242, 255); // Indigo-50
  pdf.setDrawColor(199, 210, 254);
  pdf.roundedRect(margin, currY, cardW, 19, 2, 2, 'FD');
  pdf.setTextColor(67, 56, 202);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('TOTAL PAYOUT', margin + 3, currY + 5.5);
  pdf.setTextColor(49, 46, 129);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(finalTotalPayout, currency), margin + 3, currY + 12.5);
  pdf.setTextColor(99, 102, 241);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('All Services Combined', margin + 3, currY + 16.5);

  // 2. Software Cut Card
  const c2X = margin + cardW + cardGap;
  pdf.setFillColor(241, 245, 249); // Slate-100
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(c2X, currY, cardW, 19, 2, 2, 'FD');
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('SOFTWARE CHARGES', c2X + 3, currY + 5.5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(totalSoftwareCut, currency), c2X + 3, currY + 12.5);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Software cut to partner', c2X + 3, currY + 16.5);

  // 3. WhatsApp Cut Card
  const c3X = margin + (cardW + cardGap) * 2;
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(c3X, currY, cardW, 19, 2, 2, 'FD');
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('WHATSAPP CHARGES', c3X + 3, currY + 5.5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(totalWhatsappCut, currency), c3X + 3, currY + 12.5);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('WhatsApp cut to partner', c3X + 3, currY + 16.5);

  // 4. Chatbot Cut Card
  const c4X = margin + (cardW + cardGap) * 3;
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(c4X, currY, cardW, 19, 2, 2, 'FD');
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('CHATBOT CHARGES', c4X + 3, currY + 5.5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.text(formatCurrency(totalChatbotCut, currency), c4X + 3, currY + 12.5);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Chatbot cut to partner', c4X + 3, currY + 16.5);

  // Table Section: School Breakdown (Partner Cut Only)
  currY = 104;

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.text('ITEMIZED SCHOOL PAYOUT BREAKDOWN (PARTNER EARNINGS)', margin, currY);

  currY += 4;

  // Table Columns Setup
  // Total Content Width = contentWidth (~182mm)
  // Col 1: # (8mm)
  // Col 2: School / Institute Name (62mm)
  // Col 3: Software Charges (28mm)
  // Col 4: WhatsApp Charges (28mm)
  // Col 5: Chatbot Charges (26mm)
  // Col 6: Total to Partner (30mm)
  const colW = {
    idx: 8,
    name: 62,
    software: 28,
    whatsapp: 28,
    chatbot: 26,
    total: 30,
  };

  const colX = {
    idx: margin,
    name: margin + colW.idx,
    software: margin + colW.idx + colW.name,
    whatsapp: margin + colW.idx + colW.name + colW.software,
    chatbot: margin + colW.idx + colW.name + colW.software + colW.whatsapp,
    total: margin + colW.idx + colW.name + colW.software + colW.whatsapp + colW.chatbot,
  };

  // Table Header Bar
  pdf.setFillColor(30, 41, 59); // Slate-800
  pdf.roundedRect(margin, currY, contentWidth, 8, 1, 1, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('#', colX.idx + 2, currY + 5.5);
  pdf.text('School / Client Name', colX.name + 2, currY + 5.5);
  pdf.text('Software Charges', colX.software + colW.software - 2, currY + 5.5, {
    align: 'right',
  });
  pdf.text('WhatsApp Charges', colX.whatsapp + colW.whatsapp - 2, currY + 5.5, {
    align: 'right',
  });
  pdf.text('Chatbot Charges', colX.chatbot + colW.chatbot - 2, currY + 5.5, {
    align: 'right',
  });
  pdf.text('Total to Partner', colX.total + colW.total - 2, currY + 5.5, {
    align: 'right',
  });

  currY += 8;

  if (partnerSchools.length === 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, currY, contentWidth, 16, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, currY, contentWidth, 16, 'S');

    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(
      `No individual schools linked. Fixed monthly payment: ${formatCurrency(partner.monthlyPayment, currency)}`,
      pageWidth / 2,
      currY + 10,
      { align: 'center' }
    );
    currY += 16;
  } else {
    partnerSchools.forEach((school, index) => {
      // Check for page overflow
      if (currY > pageHeight - 35) {
        pdf.addPage();
        currY = 18;
        // Re-draw table header on new page
        pdf.setFillColor(30, 41, 59);
        pdf.roundedRect(margin, currY, contentWidth, 8, 1, 1, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text('#', colX.idx + 2, currY + 5.5);
        pdf.text('School / Client Name', colX.name + 2, currY + 5.5);
        pdf.text('Software Charges', colX.software + colW.software - 2, currY + 5.5, { align: 'right' });
        pdf.text('WhatsApp Charges', colX.whatsapp + colW.whatsapp - 2, currY + 5.5, { align: 'right' });
        pdf.text('Chatbot Charges', colX.chatbot + colW.chatbot - 2, currY + 5.5, { align: 'right' });
        pdf.text('Total to Partner', colX.total + colW.total - 2, currY + 5.5, { align: 'right' });
        currY += 8;
      }

      const isEven = index % 2 === 0;
      const rowHeight = 9.5;

      pdf.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      pdf.rect(margin, currY, contentWidth, rowHeight, 'F');

      // Thin bottom line
      pdf.setDrawColor(241, 245, 249);
      pdf.line(margin, currY + rowHeight, margin + contentWidth, currY + rowHeight);

      // Index
      pdf.setTextColor(148, 163, 184);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(String(index + 1), colX.idx + 2, currY + 6);

      // School Name
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      const truncatedName =
        school.client.name.length > 34
          ? `${school.client.name.slice(0, 32)}...`
          : school.client.name;
      pdf.text(truncatedName, colX.name + 2, currY + 4.5);

      if (school.client.address || school.client.phone) {
        pdf.setTextColor(148, 163, 184);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        const sub = [school.client.address, school.client.phone]
          .filter(Boolean)
          .join(' · ');
        const truncatedSub = sub.length > 40 ? `${sub.slice(0, 38)}...` : sub;
        pdf.text(truncatedSub, colX.name + 2, currY + 8);
      }

      // Software Pay to Partner
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(
        formatCurrency(school.softwarePay, currency),
        colX.software + colW.software - 2,
        currY + 6,
        { align: 'right' }
      );

      // WhatsApp Pay to Partner
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(
        formatCurrency(school.whatsappPay, currency),
        colX.whatsapp + colW.whatsapp - 2,
        currY + 6,
        { align: 'right' }
      );

      // Chatbot Pay to Partner
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(
        formatCurrency(school.chatbotPay, currency),
        colX.chatbot + colW.chatbot - 2,
        currY + 6,
        { align: 'right' }
      );

      // Total Payout to Partner from this school
      pdf.setTextColor(79, 70, 229); // Indigo-600
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text(
        formatCurrency(school.totalPay, currency),
        colX.total + colW.total - 2,
        currY + 6,
        { align: 'right' }
      );

      currY += rowHeight;
    });
  }

  // Summary / Total Row
  currY += 1.5;
  pdf.setFillColor(238, 242, 255); // Indigo-50
  pdf.setDrawColor(199, 210, 254); // Indigo-200
  pdf.roundedRect(margin, currY, contentWidth, 10, 1, 1, 'FD');

  pdf.setTextColor(49, 46, 129);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('TOTAL PARTNER PAYOUT', colX.idx + 2, currY + 6.5);

  pdf.setFontSize(8.5);
  pdf.text(
    formatCurrency(totalSoftwareCut, currency),
    colX.software + colW.software - 2,
    currY + 6.5,
    { align: 'right' }
  );
  pdf.text(
    formatCurrency(totalWhatsappCut, currency),
    colX.whatsapp + colW.whatsapp - 2,
    currY + 6.5,
    { align: 'right' }
  );
  pdf.text(
    formatCurrency(totalChatbotCut, currency),
    colX.chatbot + colW.chatbot - 2,
    currY + 6.5,
    { align: 'right' }
  );

  pdf.setTextColor(67, 56, 202);
  pdf.setFontSize(9.5);
  pdf.text(
    formatCurrency(finalTotalPayout, currency),
    colX.total + colW.total - 2,
    currY + 6.5,
    { align: 'right' }
  );

  currY += 15;

  // Sign-off / Terms & Acknowledgment Section
  if (currY < pageHeight - 35) {
    const boxW = (contentWidth - 10) / 2;

    // Left Signature Box (Company)
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, currY, boxW, 20, 1.5, 1.5, 'FD');

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('PREPARED & AUTHORIZED BY', margin + 3, currY + 5);

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(company.name || 'ProBill Administrator', margin + 3, currY + 11);

    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin + 3, currY + 16, margin + boxW - 10, currY + 16);

    // Right Signature Box (Partner)
    const rightSigX = margin + boxW + 10;
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(rightSigX, currY, boxW, 20, 1.5, 1.5, 'FD');

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('PARTNER ACKNOWLEDGMENT / SIGNATURE', rightSigX + 3, currY + 5);

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(partner.name || 'Partner', rightSigX + 3, currY + 11);

    pdf.setDrawColor(203, 213, 225);
    pdf.line(rightSigX + 3, currY + 16, rightSigX + boxW - 10, currY + 16);
  }

  // Footer
  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(
    `This report details service commission cuts to partner only. Generated by ${company.name || 'ProBill'}.`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  return pdf;
}

/**
 * Downloads the individual partner PDF report directly.
 */
export function downloadPartnerReportPdf(options: PartnerReportOptions) {
  const pdf = buildPartnerPdfInstance(options);
  const safePartner = (options.partner.name || 'Partner')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_');
  const safeMonth = options.selectedMonth.replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `${safePartner}_Payout_Report_${safeMonth}.pdf`;
  pdf.save(filename);
}

/**
 * Generates an all-partners summary report PDF showing only partner payouts across all partners.
 */
export function buildAllPartnersPdfInstance(options: AllPartnersReportOptions): jsPDF {
  const {
    allPartnerData,
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

  // Header Background
  pdf.setFillColor(30, 41, 59);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  pdf.setFillColor(99, 102, 241);
  pdf.rect(0, 38.5, pageWidth, 2.5, 'F');

  // Company Branding
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(company.name || 'ProBill Management', margin, 17);

  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('All Partners Commission & Service Payout Summary', margin, 23);

  // Right Header
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('ALL PARTNERS REPORT', pageWidth - margin, 17, { align: 'right' });

  pdf.setTextColor(165, 180, 252);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.text(`Month: ${selectedMonth}`, pageWidth - margin, 24, { align: 'right' });

  // Totals
  const grandSoftware = allPartnerData.reduce((sum, p) => sum + p.totalSoftware, 0);
  const grandWhatsapp = allPartnerData.reduce((sum, p) => sum + p.totalWhatsapp, 0);
  const grandChatbot = allPartnerData.reduce((sum, p) => sum + p.totalChatbot, 0);
  const grandPayout = allPartnerData.reduce((sum, p) => sum + p.totalPayout, 0);

  // Top Summary Cards
  let currY = 48;
  const cardGap = 3;
  const cardW = (contentWidth - cardGap * 3) / 4;

  // 1. Grand Total Card
  pdf.setFillColor(238, 242, 255);
  pdf.setDrawColor(199, 210, 254);
  pdf.roundedRect(margin, currY, cardW, 18, 2, 2, 'FD');
  pdf.setTextColor(67, 56, 202);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('TOTAL ALL PARTNERS', margin + 3, currY + 5);
  pdf.setTextColor(49, 46, 129);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(grandPayout, currency), margin + 3, currY + 11.5);
  pdf.setTextColor(99, 102, 241);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text(`${allPartnerData.length} Partners Total`, margin + 3, currY + 15.5);

  // 2. Software Cut Card
  const c2X = margin + cardW + cardGap;
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(c2X, currY, cardW, 18, 2, 2, 'FD');
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('SOFTWARE CUTS', c2X + 3, currY + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(grandSoftware, currency), c2X + 3, currY + 11.5);

  // 3. WhatsApp Cut Card
  const c3X = margin + (cardW + cardGap) * 2;
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(c3X, currY, cardW, 18, 2, 2, 'FD');
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('WHATSAPP CUTS', c3X + 3, currY + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(grandWhatsapp, currency), c3X + 3, currY + 11.5);

  // 4. Chatbot Cut Card
  const c4X = margin + (cardW + cardGap) * 3;
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(c4X, currY, cardW, 18, 2, 2, 'FD');
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('CHATBOT CUTS', c4X + 3, currY + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10.5);
  pdf.text(formatCurrency(grandChatbot, currency), c4X + 3, currY + 11.5);

  // Table
  currY = 72;
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('PARTNERS SUMMARY LIST', margin, currY);
  currY += 4;

  const colW = {
    name: 50,
    phone: 30,
    schools: 18,
    software: 22,
    whatsapp: 22,
    chatbot: 20,
    total: 20,
  };

  const colX = {
    name: margin,
    phone: margin + colW.name,
    schools: margin + colW.name + colW.phone,
    software: margin + colW.name + colW.phone + colW.schools,
    whatsapp: margin + colW.name + colW.phone + colW.schools + colW.software,
    chatbot: margin + colW.name + colW.phone + colW.schools + colW.software + colW.whatsapp,
    total: margin + colW.name + colW.phone + colW.schools + colW.software + colW.whatsapp + colW.chatbot,
  };

  pdf.setFillColor(30, 41, 59);
  pdf.roundedRect(margin, currY, contentWidth, 8, 1, 1, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('Partner Name', colX.name + 2, currY + 5.5);
  pdf.text('Phone', colX.phone + 2, currY + 5.5);
  pdf.text('Schools', colX.schools + 2, currY + 5.5);
  pdf.text('Software', colX.software + colW.software - 2, currY + 5.5, { align: 'right' });
  pdf.text('WhatsApp', colX.whatsapp + colW.whatsapp - 2, currY + 5.5, { align: 'right' });
  pdf.text('Chatbot', colX.chatbot + colW.chatbot - 2, currY + 5.5, { align: 'right' });
  pdf.text('Total Pay', colX.total + colW.total - 2, currY + 5.5, { align: 'right' });

  currY += 8;

  allPartnerData.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    const rowH = 8.5;
    pdf.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    pdf.rect(margin, currY, contentWidth, rowH, 'F');
    pdf.setDrawColor(241, 245, 249);
    pdf.line(margin, currY + rowH, margin + contentWidth, currY + rowH);

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(item.partner.name, colX.name + 2, currY + 5.5);

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(item.partner.phone || 'N/A', colX.phone + 2, currY + 5.5);
    pdf.text(`${item.schools.length}`, colX.schools + 2, currY + 5.5);

    pdf.setTextColor(30, 41, 59);
    pdf.text(formatCurrency(item.totalSoftware, currency), colX.software + colW.software - 2, currY + 5.5, { align: 'right' });
    pdf.text(formatCurrency(item.totalWhatsapp, currency), colX.whatsapp + colW.whatsapp - 2, currY + 5.5, { align: 'right' });
    pdf.text(formatCurrency(item.totalChatbot, currency), colX.chatbot + colW.chatbot - 2, currY + 5.5, { align: 'right' });

    pdf.setTextColor(79, 70, 229);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(item.totalPayout, currency), colX.total + colW.total - 2, currY + 5.5, { align: 'right' });

    currY += rowH;
  });

  // Footer Total Row
  currY += 1.5;
  pdf.setFillColor(238, 242, 255);
  pdf.setDrawColor(199, 210, 254);
  pdf.roundedRect(margin, currY, contentWidth, 9, 1, 1, 'FD');

  pdf.setTextColor(49, 46, 129);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('GRAND TOTAL', colX.name + 2, currY + 6);
  pdf.text(formatCurrency(grandSoftware, currency), colX.software + colW.software - 2, currY + 6, { align: 'right' });
  pdf.text(formatCurrency(grandWhatsapp, currency), colX.whatsapp + colW.whatsapp - 2, currY + 6, { align: 'right' });
  pdf.text(formatCurrency(grandChatbot, currency), colX.chatbot + colW.chatbot - 2, currY + 6, { align: 'right' });
  pdf.setTextColor(67, 56, 202);
  pdf.setFontSize(9);
  pdf.text(formatCurrency(grandPayout, currency), colX.total + colW.total - 2, currY + 6, { align: 'right' });

  return pdf;
}

export function downloadAllPartnersReportPdf(options: AllPartnersReportOptions) {
  const pdf = buildAllPartnersPdfInstance(options);
  const safeMonth = options.selectedMonth.replace(/[^a-zA-Z0-9]+/g, '_');
  pdf.save(`All_Partners_Payout_Report_${safeMonth}.pdf`);
}
