import { jsPDF } from 'jspdf';
import { formatCurrency } from '../data/initialData';
import {
  InvoiceEditableDocument,
  InvoiceTheme,
  PaymentQrCodeItem,
} from '../types';
import {
  DEFAULT_BRAND_LOGO_DATA_URL,
  resolveActiveLogoUrl,
} from './usePWAInstall';

export function getResolvedQrCodes(docData: {
  qrCodes?: PaymentQrCodeItem[];
  qrCodeDataUrl?: string;
  qrLabel?: string;
  showQrCode?: boolean;
}): PaymentQrCodeItem[] {
  if (docData.showQrCode === false) return [];
  if (docData.qrCodes && docData.qrCodes.length > 0) {
    return docData.qrCodes;
  }
  if (docData.qrCodeDataUrl) {
    return [
      {
        id: 'qr-primary',
        label: docData.qrLabel || 'Scan to Pay',
        dataUrl: docData.qrCodeDataUrl,
      },
    ];
  }
  return [
    {
      id: 'qr-default',
      label: docData.qrLabel || 'Scan to Pay',
      dataUrl: '',
    },
  ];
}

function getImageFormatFromDataUrl(dataUrl: string): 'JPEG' | 'PNG' {
  if (
    dataUrl.startsWith('data:image/jpeg') ||
    dataUrl.startsWith('data:image/jpg')
  ) {
    return 'JPEG';
  }
  return 'PNG';
}

export function getClientPdfFilename(docData: InvoiceEditableDocument): string {
  const safeClientName = (docData.clientName || 'Client')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeInv = (docData.invoiceNumber || 'INV-001')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '');
  return `${safeClientName}_Invoice_${safeInv}.pdf`;
}

function getThemeColors(theme: InvoiceTheme = 'royal-blue') {
  if (theme === 'emerald-executive') {
    return {
      headerBg: [6, 78, 59] as [number, number, number], // emerald-900
      accent: [5, 150, 105] as [number, number, number], // emerald-600
      softBg: [236, 253, 245] as [number, number, number], // emerald-50
      hexHeader: '#064e3b',
      hexAccent: '#059669',
      hexSoftBg: '#ecfdf5',
    };
  }
  if (theme === 'midnight-slate') {
    return {
      headerBg: [15, 23, 42] as [number, number, number], // slate-900
      accent: [51, 65, 85] as [number, number, number], // slate-700
      softBg: [241, 245, 249] as [number, number, number], // slate-100
      hexHeader: '#0f172a',
      hexAccent: '#334155',
      hexSoftBg: '#f1f5f9',
    };
  }
  return {
    headerBg: [15, 23, 42] as [number, number, number], // slate-900
    accent: [29, 78, 216] as [number, number, number], // blue-700
    softBg: [239, 246, 255] as [number, number, number], // blue-50
    hexHeader: '#0f172a',
    hexAccent: '#1d4ed8',
    hexSoftBg: '#eff6ff',
  };
}

export function buildInvoicePdfInstance(
  docData: InvoiceEditableDocument,
  currency = 'Rs.'
): jsPDF {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
  const palette = getThemeColors(docData.theme);

  const currentMonthTotal =
    (Number(docData.softwareCharges) || 0) +
    (Number(docData.whatsappCharges) || 0) +
    (Number(docData.chatbotCharges) || 0);
  const previousDues = Number(docData.previousDues) || 0;
  const totalAmount = currentMonthTotal + previousDues;
  const amountPaid = Number(docData.amountPaid) || 0;
  const remainingDues = Math.max(0, totalAmount - amountPaid);

  // Page Background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Executive Header Banner
  pdf.setFillColor(...palette.headerBg);
  pdf.rect(0, 0, pageWidth, 42, 'F');

  // Accent Stripe under Header Banner
  pdf.setFillColor(...palette.accent);
  pdf.rect(0, 42, pageWidth, 2, 'F');

  // Brand Logo or Monogram Box
  let textStartX = 18;
  const pdfLogoUrl =
    docData.logoDataUrl && docData.logoDataUrl.startsWith('data:image/')
      ? docData.logoDataUrl
      : DEFAULT_BRAND_LOGO_DATA_URL;
  if (pdfLogoUrl && pdfLogoUrl.startsWith('data:image/')) {
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(18, 10, 20, 20, 2.5, 2.5, 'F');
      pdf.addImage(
        pdfLogoUrl,
        getImageFormatFromDataUrl(pdfLogoUrl),
        19.5,
        11.5,
        17,
        17
      );
      textStartX = 42;
    } catch {
      pdf.setFillColor(...palette.accent);
      pdf.roundedRect(18, 11, 16, 16, 2.5, 2.5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(
        (docData.companyName || 'IP').slice(0, 2).toUpperCase(),
        26,
        21.5,
        { align: 'center' }
      );
      textStartX = 38;
    }
  } else {
    pdf.setFillColor(...palette.accent);
    pdf.roundedRect(18, 11, 16, 16, 2.5, 2.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(
      (docData.companyName || 'IP').slice(0, 2).toUpperCase(),
      26,
      21.5,
      { align: 'center' }
    );
    textStartX = 38;
  }

  // Company Name, Tagline & Header Note
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text(docData.companyName || 'Your Company Name', textStartX, 17.5);

  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text(
    docData.companyTagline || 'Smart Solutions for Better Education',
    textStartX,
    23.5
  );

  if (docData.headerNote) {
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(8.5);
    pdf.text(docData.headerNote, textStartX, 29.5);
  }

  // Right Side Header: INVOICE Title & Number
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(
    (docData.headerTitle || 'INVOICE').toUpperCase(),
    pageWidth - 18,
    17.5,
    { align: 'right' }
  );

  const invFormatted = docData.invoiceNumber.startsWith('#')
    ? docData.invoiceNumber
    : `#${docData.invoiceNumber}`;
  pdf.setTextColor(147, 197, 253);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11.5);
  pdf.text(invFormatted, pageWidth - 18, 24.5, { align: 'right' });

  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(
    `Billing Period: ${docData.billingMonth}`,
    pageWidth - 18,
    31,
    { align: 'right' }
  );

  // Metadata Strip & Bill To Section (Y: 50 to 80)
  // Left Box: Bill To
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(18, 50, 145, 28, 2, 2, 'FD');

  pdf.setTextColor(...palette.accent);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('BILLED TO', 23, 56.5);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(docData.clientName || 'Client Name', 23, 63);

  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const clientMeta = [docData.clientAddress, docData.clientPhone]
    .filter(Boolean)
    .join('  •  ');
  pdf.text(clientMeta || 'Address / Phone', 23, 69.5);

  // Right Box: Issue Date, Due Date & Payment Status
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(170, 50, pageWidth - 188, 28, 2, 2, 'FD');

  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('ISSUE DATE', 176, 56.5);
  pdf.text('DUE DATE', 216, 56.5);
  pdf.text('STATUS', pageWidth - 24, 56.5, { align: 'right' });

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(docData.invoiceDate || `05 ${docData.billingMonth}`, 176, 63.5);

  pdf.setTextColor(220, 38, 38);
  pdf.text(docData.dueDate || `15 ${docData.billingMonth}`, 216, 63.5);

  const statusText =
    remainingDues === 0
      ? 'PAID'
      : amountPaid > 0
      ? 'PARTIALLY PAID'
      : 'UNPAID';
  if (remainingDues === 0) {
    pdf.setTextColor(22, 101, 52);
  } else if (amountPaid > 0) {
    pdf.setTextColor(180, 83, 9);
  } else {
    pdf.setTextColor(185, 28, 28);
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(statusText, pageWidth - 24, 63.5, { align: 'right' });

  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.text(
    `Invoice Ref: ${invFormatted}  |  Currency: ${currency}`,
    176,
    72
  );

  // Left Table: Description & Amount
  const tableLeft = 18;
  const tableWidth = 160;
  const tableTop = 84;

  // Table Header
  pdf.setFillColor(...palette.headerBg);
  pdf.roundedRect(tableLeft, tableTop, tableWidth, 10, 1.5, 1.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text('#', tableLeft + 4, tableTop + 6.5);
  pdf.text('SERVICE DESCRIPTION', tableLeft + 14, tableTop + 6.5);
  pdf.text('AMOUNT', tableLeft + tableWidth - 5, tableTop + 6.5, {
    align: 'right',
  });

  // Rows
  let y = tableTop + 17;
  const rows = [
    {
      no: '01',
      label: docData.softwareLabel || 'Software Charges',
      amount: formatCurrency(docData.softwareCharges, currency),
    },
    {
      no: '02',
      label:
        docData.whatsappLabel ||
        (docData.whatsappBillingType === 'per_month'
          ? 'WhatsApp Charges'
          : `WhatsApp Charges (${docData.whatsappRate} × ${docData.whatsappMessages})`),
      amount: formatCurrency(docData.whatsappCharges, currency),
    },
    {
      no: '03',
      label: docData.chatbotLabel || 'Chatbot Charges',
      amount: formatCurrency(docData.chatbotCharges, currency),
    },
  ];

  pdf.setFontSize(10);
  for (const row of rows) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(148, 163, 184);
    pdf.text(row.no, tableLeft + 4, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    pdf.text(row.label, tableLeft + 14, y);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(row.amount, tableLeft + tableWidth - 5, y, { align: 'right' });

    pdf.setDrawColor(226, 232, 240);
    pdf.line(tableLeft, y + 3.5, tableLeft + tableWidth, y + 3.5);
    y += 10.5;
  }

  // Current Month Total Row
  pdf.setFillColor(248, 250, 252);
  pdf.rect(tableLeft, y - 5, tableWidth, 10, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Current Month Subtotal', tableLeft + 14, y + 1.5);
  pdf.text(
    formatCurrency(currentMonthTotal, currency),
    tableLeft + tableWidth - 5,
    y + 1.5,
    { align: 'right' }
  );
  y += 11;

  // Previous Dues Row
  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(tableLeft, y - 5, tableWidth, 10.5, 1.5, 1.5, 'F');
  pdf.setTextColor(220, 38, 38);
  pdf.setFont('helvetica', 'bold');
  pdf.text(
    docData.previousDuesLabel || 'Previous Dues',
    tableLeft + 14,
    y + 2
  );
  pdf.text(
    formatCurrency(previousDues, currency),
    tableLeft + tableWidth - 5,
    y + 2,
    { align: 'right' }
  );

  // Right Summary Card (Total Payable, Amount Paid, Remaining Balance)
  const summaryLeft = 185;
  const summaryWidth = pageWidth - 18 - summaryLeft;
  const summaryTop = 84;

  pdf.setDrawColor(226, 232, 240);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(summaryLeft, summaryTop, summaryWidth, 52, 2.5, 2.5, 'FD');

  pdf.setFillColor(...palette.headerBg);
  pdf.roundedRect(summaryLeft, summaryTop, summaryWidth, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text('PAYMENT SUMMARY', summaryLeft + 5, summaryTop + 6.5);

  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Total Payable', summaryLeft + 5, summaryTop + 19);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    formatCurrency(totalAmount, currency),
    summaryLeft + summaryWidth - 5,
    summaryTop + 19,
    { align: 'right' }
  );

  pdf.setDrawColor(226, 232, 240);
  pdf.line(
    summaryLeft + 5,
    summaryTop + 23,
    summaryLeft + summaryWidth - 5,
    summaryTop + 23
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text('Amount Paid', summaryLeft + 5, summaryTop + 31);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(22, 163, 74);
  pdf.text(
    formatCurrency(amountPaid, currency),
    summaryLeft + summaryWidth - 5,
    summaryTop + 31,
    { align: 'right' }
  );

  // Remaining Dues Highlight Box
  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(
    summaryLeft + 3,
    summaryTop + 36,
    summaryWidth - 6,
    12,
    1.5,
    1.5,
    'F'
  );
  pdf.setTextColor(220, 38, 38);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.text('Balance Due', summaryLeft + 6, summaryTop + 43.5);
  pdf.text(
    formatCurrency(remainingDues, currency),
    summaryLeft + summaryWidth - 6,
    summaryTop + 43.5,
    { align: 'right' }
  );

  // Optional Invoice Note Box (under Payment Summary / above Footer)
  const cleanInvoiceNote = (docData.invoiceNote || '').trim();
  if (cleanInvoiceNote) {
    const noteTop = summaryTop + 55;
    pdf.setDrawColor(203, 213, 225);
    pdf.setFillColor(255, 251, 235); // soft amber/warm note tint
    pdf.roundedRect(summaryLeft, noteTop, summaryWidth, 21, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 83, 9);
    pdf.text('INVOICE NOTE:', summaryLeft + 4, noteTop + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(51, 65, 85);
    const wrappedNote = pdf.splitTextToSize(
      cleanInvoiceNote,
      summaryWidth - 8
    ) as string[];
    pdf.text(wrappedNote.slice(0, 3), summaryLeft + 4, noteTop + 10.5);
  }

  // Bottom Executive Footer Band (holds Thank-You, Terms, Contact & ALL QR Codes at Footer)
  const footerHeight = 46;
  const footerTop = pageHeight - footerHeight;
  pdf.setFillColor(...palette.softBg);
  pdf.rect(0, footerTop, pageWidth, footerHeight, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(0, footerTop, pageWidth, footerTop);

  // QR Code Boxes on Bottom Footer (all added QR codes shown at footer with complete titles)
  const qrList =
    docData.showQrCode !== false ? getResolvedQrCodes(docData) : [];
  const qrCount = qrList.length;

  // Dynamically size QR boxes so ALL QR codes and their complete titles fit cleanly in the footer
  const maxQrAreaWidth = 195;
  const gap = qrCount > 4 ? 2.5 : 3.5;
  const defaultQrImgSize = qrCount > 3 ? 21 : 23;

  // Measure required width for each QR box so titles show completely
  pdf.setFont('helvetica', 'bold');
  const titleFontSize = qrCount > 4 ? 6.5 : 7.2;
  const acctFontSize = qrCount > 4 ? 5.8 : 6.4;

  const boxWidths = qrList.map((qr) => {
    const titleStr = (qr.bankName || qr.label || 'Scan to Pay').trim();
    const acctStr = (qr.accountNumber || qr.accountTitle || '').trim();
    pdf.setFontSize(titleFontSize);
    const titleW = pdf.getTextWidth(titleStr);
    pdf.setFontSize(acctFontSize);
    const acctW = pdf.getTextWidth(acctStr);
    const neededTextW = Math.max(titleW, acctW) + 6;
    const minBoxW = defaultQrImgSize + 7;
    const maxSingleBoxW =
      qrCount === 1
        ? 85
        : qrCount === 2
        ? 75
        : qrCount === 3
        ? 58
        : Math.floor((maxQrAreaWidth - (qrCount - 1) * gap) / qrCount);
    return Math.min(maxSingleBoxW, Math.max(minBoxW, Math.ceil(neededTextW)));
  });

  let totalQrWidth =
    qrCount > 0
      ? boxWidths.reduce((acc, w) => acc + w, 0) + (qrCount - 1) * gap
      : 0;
  if (totalQrWidth > maxQrAreaWidth && qrCount > 0) {
    const scale = (maxQrAreaWidth - (qrCount - 1) * gap) / (totalQrWidth - (qrCount - 1) * gap);
    for (let i = 0; i < boxWidths.length; i++) {
      boxWidths[i] = Math.max(22, Math.floor(boxWidths[i] * scale));
    }
    totalQrWidth =
      boxWidths.reduce((acc, w) => acc + w, 0) + (qrCount - 1) * gap;
  }

  const leftTextMaxWidth =
    qrCount > 0
      ? Math.max(68, pageWidth - 18 - totalQrWidth - 22)
      : pageWidth - 36;

  pdf.setTextColor(...palette.accent);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.text(
    (docData.footerThankYou || 'Thank you for your business & trust!').slice(
      0,
      75
    ),
    18,
    footerTop + 11
  );

  if (docData.footerTerms) {
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const wrappedTerms = pdf.splitTextToSize(
      docData.footerTerms,
      leftTextMaxWidth
    ) as string[];
    pdf.text(wrappedTerms.slice(0, 2), 18, footerTop + 18);
  }

  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const contactParts = [
    docData.companyWebsite,
    docData.companyEmail,
    docData.companyPhone,
  ].filter(Boolean);
  pdf.text(
    contactParts.length > 0
      ? contactParts.join('   |   ')
      : 'Official Billing Statement',
    18,
    pageHeight - 7.5
  );

  if (qrCount > 0) {
    let curQrX = pageWidth - 18 - totalQrWidth;

    for (let idx = 0; idx < qrList.length; idx++) {
      const qr = qrList[idx];
      const qrBoxW = boxWidths[idx];
      const fullBankLabel = (qr.bankName || qr.label || 'Scan to Pay').trim();
      const fullAcct = (qr.accountNumber || qr.accountTitle || '').trim();

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(titleFontSize);
      const wrappedTitle = pdf.splitTextToSize(
        fullBankLabel,
        qrBoxW - 3
      ) as string[];
      const titleLines = wrappedTitle.slice(0, 2);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(acctFontSize);
      const wrappedAcct = fullAcct
        ? (pdf.splitTextToSize(fullAcct, qrBoxW - 3) as string[]).slice(0, 2)
        : [];

      const textLinesCount = titleLines.length + wrappedAcct.length;
      const qrSize =
        textLinesCount >= 3
          ? Math.min(defaultQrImgSize, 19)
          : defaultQrImgSize;
      const qrBoxH = Math.min(42, qrSize + 4 + textLinesCount * 3.1 + 1.5);
      const qrBoxY = pageHeight - qrBoxH - 2;

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(curQrX, qrBoxY, qrBoxW, qrBoxH, 2, 2, 'FD');

      const imgX = curQrX + (qrBoxW - qrSize) / 2;
      const imgY = qrBoxY + 1.6;

      if (qr.dataUrl && qr.dataUrl.startsWith('data:image/')) {
        try {
          pdf.addImage(
            qr.dataUrl,
            getImageFormatFromDataUrl(qr.dataUrl),
            imgX,
            imgY,
            qrSize,
            qrSize
          );
        } catch {
          drawMatrixQr(pdf, imgX, imgY, qrSize);
        }
      } else {
        drawMatrixQr(pdf, imgX, imgY, qrSize);
      }

      let textCursorY = imgY + qrSize + 3.2;
      pdf.setFontSize(titleFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      for (const line of titleLines) {
        pdf.text(line, curQrX + qrBoxW / 2, textCursorY, { align: 'center' });
        textCursorY += 2.9;
      }

      if (wrappedAcct.length > 0) {
        pdf.setFontSize(acctFontSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        for (const line of wrappedAcct) {
          pdf.text(line, curQrX + qrBoxW / 2, textCursorY, { align: 'center' });
          textCursorY += 2.7;
        }
      }

      curQrX += qrBoxW + gap;
    }
  }

  return pdf;
}

function drawMatrixQr(pdf: jsPDF, qrX: number, qrY: number, qrSize: number) {
  pdf.setFillColor(15, 23, 42);
  const cell = qrSize / 7;
  const pattern = [
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [0, 1, 0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 0],
    [1, 1, 1, 0, 1, 0, 1],
  ];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (pattern[r][c]) {
        pdf.rect(qrX + c * cell, qrY + r * cell, cell - 0.2, cell - 0.2, 'F');
      }
    }
  }
}

export function downloadInvoicePdfWithClientName(
  docData: InvoiceEditableDocument,
  currency = 'Rs.'
): string {
  const pdf = buildInvoicePdfInstance(docData, currency);
  const filename = getClientPdfFilename(docData);
  pdf.save(filename);
  return filename;
}

/**
 * Reliable cross-browser & iframe-compatible Print handler.
 * Injects the printable sheet directly into document.body (#invoice-print-container),
 * triggers window.print() synchronously with user gesture, and displays an interactive
 * Print Preview dialog with direct Print & Save PDF actions.
 */
export function printInvoiceDocument(
  docData: InvoiceEditableDocument,
  currency = 'Rs.'
): void {
  const palette = getThemeColors(docData.theme);
  const currentMonthTotal =
    (Number(docData.softwareCharges) || 0) +
    (Number(docData.whatsappCharges) || 0) +
    (Number(docData.chatbotCharges) || 0);
  const previousDues = Number(docData.previousDues) || 0;
  const totalAmount = currentMonthTotal + previousDues;
  const amountPaid = Number(docData.amountPaid) || 0;
  const remainingDues = Math.max(0, totalAmount - amountPaid);

  const statusText =
    remainingDues === 0
      ? 'PAID'
      : amountPaid > 0
      ? 'PARTIALLY PAID'
      : 'UNPAID';
  const statusColor =
    remainingDues === 0
      ? '#15803d'
      : amountPaid > 0
      ? '#b45309'
      : '#dc2626';

  const invFormatted = docData.invoiceNumber.startsWith('#')
    ? docData.invoiceNumber
    : `#${docData.invoiceNumber}`;

  const activeLogoSrc = resolveActiveLogoUrl(docData.logoDataUrl);
  const contactParts = [
    docData.companyWebsite,
    docData.companyEmail,
    docData.companyPhone,
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');

  const resolvedQrs = getResolvedQrCodes(docData);
  const qrHtml =
    docData.showQrCode !== false && resolvedQrs.length > 0
      ? `<div style="display:flex;align-items:stretch;gap:12px;flex-wrap:wrap;justify-content:flex-end;">
          ${resolvedQrs
            .map(
              (qr) => `
            <div style="background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;text-align:center;min-width:128px;max-width:220px;box-shadow:0 1px 2px rgba(0,0,0,0.04);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;">
              ${
                qr.dataUrl && qr.dataUrl.startsWith('data:image/')
                  ? `<img src="${qr.dataUrl}" alt="QR" style="width:96px;height:96px;object-fit:contain;display:block;margin:0 auto;" />`
                  : `<div style="width:96px;height:96px;margin:0 auto;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;background:#f8fafc;padding:4px;border:1px solid #e2e8f0;">
                      <div style="background:#0f172a"></div><div style="background:#0f172a"></div><div></div><div style="background:#0f172a"></div><div style="background:#0f172a"></div>
                      <div style="background:#0f172a"></div><div></div><div style="background:#0f172a"></div><div></div><div style="background:#0f172a"></div>
                      <div></div><div style="background:#0f172a"></div><div style="background:#0f172a"></div><div style="background:#0f172a"></div><div></div>
                      <div style="background:#0f172a"></div><div></div><div style="background:#0f172a"></div><div></div><div style="background:#0f172a"></div>
                      <div style="background:#0f172a"></div><div style="background:#0f172a"></div><div></div><div style="background:#0f172a"></div><div style="background:#0f172a"></div>
                    </div>`
              }
              <div style="font-size:11px;font-weight:700;color:#1e293b;margin-top:6px;white-space:normal;word-break:break-word;line-height:1.35;width:100%;">${
                qr.bankName || qr.label || 'Scan to Pay'
              }</div>
              ${
                qr.accountNumber || qr.accountTitle
                  ? `<div class="mono" style="font-size:9.5px;color:#475569;margin-top:2px;white-space:normal;word-break:break-word;line-height:1.3;width:100%;">${
                      qr.accountNumber || qr.accountTitle
                    }</div>`
                  : ''
              }
            </div>`
            )
            .join('')}
        </div>`
      : '';

  const noteHtml =
    docData.invoiceNote && docData.invoiceNote.trim()
      ? `<div style="margin-top:12px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:11.5px;color:#334155;">
          <span style="font-weight:800;color:#b45309;text-transform:uppercase;font-size:10px;letter-spacing:0.05em;display:block;margin-bottom:3px;">Note / Instructions</span>
          <div style="white-space:pre-wrap;line-height:1.45;">${docData.invoiceNote.trim()}</div>
        </div>`
      : '';

  const sheetMarkup = `
    <style>
      .print-sheet-wrap {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #0f172a;
        background: #ffffff;
        width: 100%;
      }
      .print-sheet-wrap * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-sheet {
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        overflow: hidden;
        background: #ffffff;
      }
      .print-header {
        background: ${palette.hexHeader};
        border-bottom: 4px solid ${palette.hexAccent};
        color: #ffffff;
        padding: 20px 26px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .print-brand { display: flex; align-items: center; gap: 14px; }
      .print-logo-box {
        width: 52px; height: 52px; border-radius: 10px; background: #ffffff; padding: 4px;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
      }
      .print-logo-box img { width: 100%; height: 100%; object-fit: contain; }
      .print-body { padding: 20px 26px; }
      .print-meta-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; margin-bottom: 18px; }
      .print-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; }
      .print-main-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 18px; align-items: start; }
      .print-sheet table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .print-sheet th { background: ${palette.hexHeader}; color: #ffffff; padding: 9px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
      .print-sheet td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
      .print-sheet .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
      .print-footer {
        background: ${palette.hexSoftBg};
        border-top: 1px solid #e2e8f0;
        padding: 16px 26px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        margin-top: 16px;
      }
    </style>
    <div class="print-sheet-wrap">
      <div class="print-sheet">
        <div class="print-header">
          <div class="print-brand">
            <div class="print-logo-box">
              <img src="${activeLogoSrc}" alt="Logo" onerror="this.style.display='none'" />
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;">${docData.companyName || 'Your Company Name'}</div>
              <div style="font-size:12px;color:#cbd5e1;margin-top:2px;">${docData.companyTagline || ''}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${docData.headerNote || ''}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:800;letter-spacing:0.04em;">${(docData.headerTitle || 'INVOICE').toUpperCase()}</div>
            <div class="mono" style="font-size:13px;font-weight:700;color:#93c5fd;margin-top:3px;">${invFormatted}</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">Billing Period: <strong>${docData.billingMonth}</strong></div>
          </div>
        </div>

        <div class="print-body">
          <div class="print-meta-grid">
            <div class="print-card">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${palette.hexAccent};letter-spacing:0.06em;">Billed To</div>
              <div style="font-size:16px;font-weight:800;margin-top:4px;">${docData.clientName || 'Client Name'}</div>
              <div style="font-size:12px;color:#475569;margin-top:4px;">${[docData.clientAddress, docData.clientPhone].filter(Boolean).join(' &nbsp;•&nbsp; ')}</div>
            </div>
            <div class="print-card" style="display:flex;flex-direction:column;justify-content:space-between;">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <div>
                  <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Issue Date</div>
                  <div class="mono" style="font-size:12px;font-weight:700;margin-top:3px;">${docData.invoiceDate}</div>
                </div>
                <div>
                  <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Due Date</div>
                  <div class="mono" style="font-size:12px;font-weight:700;color:#dc2626;margin-top:3px;">${docData.dueDate}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Status</div>
                  <div style="font-size:12px;font-weight:800;color:${statusColor};margin-top:3px;">${statusText}</div>
                </div>
              </div>
              <div style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px;margin-top:8px;">
                Invoice Ref: <span class="mono" style="font-weight:700;color:#0f172a;">${invFormatted}</span> &nbsp;|&nbsp; Currency: <span class="mono" style="font-weight:700;color:#0f172a;">${currency}</span>
              </div>
            </div>
          </div>

          <div class="print-main-grid">
            <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <table>
                <thead>
                  <tr>
                    <th style="width:40px;">#</th>
                    <th>Service Description</th>
                    <th style="text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="mono" style="color:#94a3b8;font-weight:700;">01</td>
                    <td style="font-weight:600;">${docData.softwareLabel || 'Software Charges'}</td>
                    <td class="mono" style="text-align:right;font-weight:700;">${formatCurrency(docData.softwareCharges, currency)}</td>
                  </tr>
                  <tr>
                    <td class="mono" style="color:#94a3b8;font-weight:700;">02</td>
                    <td style="font-weight:600;">${docData.whatsappLabel || (docData.whatsappBillingType === 'per_month' ? 'WhatsApp Charges' : `WhatsApp Charges (${docData.whatsappRate} × ${docData.whatsappMessages})`)}</td>
                    <td class="mono" style="text-align:right;font-weight:700;">${formatCurrency(docData.whatsappCharges, currency)}</td>
                  </tr>
                  <tr>
                    <td class="mono" style="color:#94a3b8;font-weight:700;">03</td>
                    <td style="font-weight:600;">${docData.chatbotLabel || 'Chatbot Charges'}</td>
                    <td class="mono" style="text-align:right;font-weight:700;">${formatCurrency(docData.chatbotCharges, currency)}</td>
                  </tr>
                  <tr style="background:#f8fafc;">
                    <td></td>
                    <td style="font-weight:700;">Current Month Subtotal</td>
                    <td class="mono" style="text-align:right;font-weight:800;">${formatCurrency(currentMonthTotal, currency)}</td>
                  </tr>
                  <tr style="background:#fef2f2;color:#dc2626;">
                    <td></td>
                    <td style="font-weight:700;">${docData.previousDuesLabel || 'Previous Dues'}</td>
                    <td class="mono" style="text-align:right;font-weight:800;">${formatCurrency(previousDues, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#f8fafc;">
              <div style="background:${palette.hexHeader};color:#fff;padding:9px 14px;font-size:11px;font-weight:700;text-transform:uppercase;">
                Payment Summary
              </div>
              <div style="padding:14px;display:flex;flex-direction:column;gap:10px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="color:#475569;font-weight:600;">Total Payable</span>
                  <span class="mono" style="font-size:15px;font-weight:800;">${formatCurrency(totalAmount, currency)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:10px;">
                  <span style="color:#475569;font-weight:600;">Amount Paid</span>
                  <span class="mono" style="font-size:14px;font-weight:700;color:#15803d;">${formatCurrency(amountPaid, currency)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;color:#dc2626;">
                  <span style="font-weight:800;">Balance Due</span>
                  <span class="mono" style="font-size:15px;font-weight:800;">${formatCurrency(remainingDues, currency)}</span>
                </div>
              </div>
            </div>
          </div>
          ${noteHtml}
        </div>

        <div class="print-footer">
          <div style="flex:1;min-width:200px;">
            <div style="font-size:13px;font-weight:800;color:${palette.hexAccent};">${docData.footerThankYou || 'Thank you for your business & trust!'}</div>
            <div style="font-size:11px;color:#475569;margin-top:3px;">${docData.footerTerms || ''}</div>
            <div style="font-size:11px;font-weight:700;color:#64748b;margin-top:5px;">${contactParts || 'Official Billing Statement'}</div>
          </div>
          ${qrHtml}
        </div>
      </div>
    </div>
  `;

  // 1. Mount #invoice-print-container directly on document.body for @media print
  let printContainer = document.getElementById('invoice-print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'invoice-print-container';
    document.body.appendChild(printContainer);
  }
  printContainer.innerHTML = sheetMarkup;
  document.body.classList.add('printing-invoice');

  // 2. Also mount an interactive on-screen Print Preview Modal (.no-print) so the user always sees
  // immediate feedback and can click "Print Now" or "Save PDF" even in sandboxed preview environments.
  let existingModal = document.getElementById('invoice-print-preview-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'invoice-print-preview-modal';
  modalOverlay.className = 'no-print';
  modalOverlay.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.75);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px;overflow-y:auto;backdrop-filter:blur(3px);';

  const modalCard = document.createElement('div');
  modalCard.style.cssText =
    'background:#f8fafc;border-radius:16px;max-width:1060px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;border:1px solid #cbd5e1;margin:auto;';

  const toolbar = document.createElement('div');
  toolbar.style.cssText =
    'background:#0f172a;color:#ffffff;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;';
  toolbar.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:14px;font-weight:800;letter-spacing:0.01em;">Print Preview — ${
        docData.clientName || 'Invoice'
      } (${invFormatted})</span>
      <span style="font-size:11px;background:#1e293b;color:#93c5fd;padding:3px 9px;border-radius:6px;font-weight:600;">A4 Landscape Ready</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button id="modal-trigger-system-print" type="button" style="background:#2563eb;color:#ffffff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
        🖨️ Print Now
      </button>
      <button id="modal-trigger-pdf-download" type="button" style="background:#059669;color:#ffffff;border:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
        ⬇️ Save as PDF
      </button>
      <button id="modal-close-print-preview" type="button" style="background:#334155;color:#e2e8f0;border:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">
        Close
      </button>
    </div>
  `;

  const previewViewport = document.createElement('div');
  previewViewport.style.cssText = 'padding:22px;background:#e2e8f0;overflow-x:auto;';
  previewViewport.innerHTML = sheetMarkup;

  modalCard.appendChild(toolbar);
  modalCard.appendChild(previewViewport);
  modalOverlay.appendChild(modalCard);
  document.body.appendChild(modalOverlay);

  const cleanupPrintMode = () => {
    document.body.classList.remove('printing-invoice');
    modalOverlay.remove();
  };

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) cleanupPrintMode();
  });

  const closeBtn = modalCard.querySelector('#modal-close-print-preview');
  closeBtn?.addEventListener('click', cleanupPrintMode);

  const pdfBtn = modalCard.querySelector('#modal-trigger-pdf-download');
  pdfBtn?.addEventListener('click', () => {
    downloadInvoicePdfWithClientName(docData, currency);
  });

  const executeSystemPrint = () => {
    document.body.classList.add('printing-invoice');
    try {
      window.focus();
      window.print();
    } catch {
      // ignore if blocked by sandbox
    }
  };

  const printNowBtn = modalCard.querySelector('#modal-trigger-system-print');
  printNowBtn?.addEventListener('click', executeSystemPrint);

  // Trigger native system print immediately during the user click event
  executeSystemPrint();
}

/**
 * Prepares WhatsApp invoice share WITHOUT downloading the PDF file.
 */
export async function prepareWhatsAppPdfShare(
  docData: InvoiceEditableDocument,
  currency = 'Rs.'
): Promise<{
  filename: string;
  whatsappUrl: string;
  messageText: string;
  sharedNatively: boolean;
}> {
  const filename = getClientPdfFilename(docData);

  const currentMonthTotal =
    (Number(docData.softwareCharges) || 0) +
    (Number(docData.whatsappCharges) || 0) +
    (Number(docData.chatbotCharges) || 0);
  const previousDues = Number(docData.previousDues) || 0;
  const totalAmount = currentMonthTotal + previousDues;
  const amountPaid = Number(docData.amountPaid) || 0;
  const remainingDues = Math.max(0, totalAmount - amountPaid);

  const lines = [
    `*${docData.companyName || 'InvoicePro'}* — ${docData.headerTitle || 'Official Invoice'}`,
    `Invoice No: *#${docData.invoiceNumber.replace(/^#/, '')}*`,
    `Billing Month: *${docData.billingMonth}*`,
    `Issue Date: *${docData.invoiceDate}* | Due Date: *${docData.dueDate}*`,
    `Bill To: *${docData.clientName}*`,
    `--------------------------------`,
    `• ${docData.softwareLabel}: ${formatCurrency(docData.softwareCharges, currency)}`,
    `• ${docData.whatsappLabel}: ${formatCurrency(docData.whatsappCharges, currency)}`,
    `• ${docData.chatbotLabel}: ${formatCurrency(docData.chatbotCharges, currency)}`,
    `*Current Month Total:* ${formatCurrency(currentMonthTotal, currency)}`,
  ];

  if (previousDues > 0) {
    lines.push(
      `*${docData.previousDuesLabel}:* ${formatCurrency(previousDues, currency)}`
    );
  }

  lines.push(
    `--------------------------------`,
    `*Total Payable:* ${formatCurrency(totalAmount, currency)}`,
    `*Amount Paid:* ${formatCurrency(amountPaid, currency)}`,
    `*Balance Due:* ${formatCurrency(remainingDues, currency)}`
  );

  if (docData.invoiceNote && docData.invoiceNote.trim()) {
    lines.push(``, `*Note:* ${docData.invoiceNote.trim()}`);
  }

  lines.push(``, `${docData.footerThankYou}`);

  const messageText = lines.join('\n');
  const cleanPhone = (docData.clientPhone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  // NOTE: Do NOT call pdf.save(filename) here so sharing via WhatsApp never triggers a file download.
  let sharedNatively = false;
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const pdf = buildInvoicePdfInstance(docData, currency);
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], filename, {
        type: 'application/pdf',
      });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${docData.clientName} - Invoice ${docData.invoiceNumber}`,
          text: messageText,
          files: [pdfFile],
        });
        sharedNatively = true;
      }
    } catch {
      // User cancelled or browser blocked native file share; proceed to WhatsApp chat link
    }
  }

  return {
    filename,
    whatsappUrl,
    messageText,
    sharedNatively,
  };
}
