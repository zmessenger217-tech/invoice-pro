import {
  AccountItem,
  CategoryTerminology,
  ClientEntity,
  CompanyProfile,
  ExpenseItem,
  MonthlyLedgerRecord,
  PartnerItem,
  SoftwareCategory,
} from '../types';

export type { CategoryTerminology };

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getYearFromMonthString(monthStr: string): number {
  const parts = monthStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const y = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(y) && y >= 2000 && y <= 2100) return y;
  }
  return new Date().getFullYear();
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function parseMonthLabel(monthStr: string): {
  monthIndex: number;
  year: number;
  serial: number;
} | null {
  if (!monthStr) return null;
  const parts = monthStr.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const mIdx = MONTH_NAMES.indexOf(parts[0]);
  const year = parseInt(parts[parts.length - 1], 10);
  if (mIdx < 0 || isNaN(year) || year < 2000 || year > 2100) return null;
  return { monthIndex: mIdx, year, serial: year * 12 + mIdx };
}

export function getCurrentYearMonths(year?: number): string[] {
  const y = typeof year === 'number' && !isNaN(year) ? year : new Date().getFullYear();
  return MONTH_NAMES.map((m) => `${m} ${y}`);
}

/**
 * By default contains all 12 months of the current year (e.g., January 2026 ... December 2026).
 * Automatically updates every year.
 */
export const AVAILABLE_MONTHS: string[] = getCurrentYearMonths();

export function getDynamicAvailableMonths(selectedMonth?: string): string[] {
  const currentYear = new Date().getFullYear();
  const baseMonths = getCurrentYearMonths(currentYear);
  if (!selectedMonth) return baseMonths;
  const parsed = parseMonthLabel(selectedMonth);
  if (parsed && parsed.year !== currentYear) {
    const selectedYearMonths = getCurrentYearMonths(parsed.year);
    return parsed.year < currentYear
      ? [...selectedYearMonths, ...baseMonths]
      : [...baseMonths, ...selectedYearMonths];
  }
  return baseMonths;
}

export function getCurrentMonthLabel(): string {
  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()] || 'October';
  return `${monthName} ${now.getFullYear()}`;
}

export function getYearMonths(year: number): string[] {
  return MONTH_NAMES.map((m) => `${m} ${year}`);
}

export function getPreviousMonthName(month: string): string {
  const parts = month.trim().split(/\s+/);
  if (parts.length >= 2) {
    const mName = parts[0];
    const year = parseInt(parts[parts.length - 1], 10) || new Date().getFullYear();
    const idx = MONTH_NAMES.indexOf(mName);
    if (idx > 0) {
      return `${MONTH_NAMES[idx - 1]} ${year}`;
    } else if (idx === 0) {
      return `December ${year - 1}`;
    }
  }
  const fallbackYear = new Date().getFullYear();
  return `December ${fallbackYear - 1}`;
}

export function getNextMonthName(month: string): string {
  const parts = month.trim().split(/\s+/);
  if (parts.length >= 2) {
    const mName = parts[0];
    const year = parseInt(parts[parts.length - 1], 10) || new Date().getFullYear();
    const idx = MONTH_NAMES.indexOf(mName);
    if (idx >= 0 && idx < 11) {
      return `${MONTH_NAMES[idx + 1]} ${year}`;
    } else if (idx === 11) {
      return `January ${year + 1}`;
    }
  }
  const fallbackYear = new Date().getFullYear();
  return `January ${fallbackYear + 1}`;
}

/**
 * Extracts a 1-31 day number from a user-supplied string (e.g. "05", "5 October 2026", "2026-10-05")
 * and formats it as "<DD> <Selected Month>" so Issue Date and Due Date always match the selected month.
 */
export function extractDayFromDateInput(
  input: string | undefined,
  fallbackDay: number
): string {
  if (!input || !input.trim()) {
    return String(fallbackDay).padStart(2, '0');
  }
  const trimmed = input.trim();
  // Match YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const day = Math.min(31, Math.max(1, Number(isoMatch[3]) || fallbackDay));
    return String(day).padStart(2, '0');
  }
  // Match leading day number e.g. "05 October 2026" or "5" or "15-10-2026"
  const leadingDayMatch = trimmed.match(/^(\d{1,2})\b/);
  if (leadingDayMatch) {
    const day = Math.min(
      31,
      Math.max(1, Number(leadingDayMatch[1]) || fallbackDay)
    );
    return String(day).padStart(2, '0');
  }
  return String(fallbackDay).padStart(2, '0');
}

export function getIssueDateForMonth(
  month: string,
  customIssueDate?: string
): string {
  const defaultDay = new Date().getDate() || 1;
  const dayStr = extractDayFromDateInput(customIssueDate, defaultDay);
  return `${dayStr} ${month}`;
}

export function getDueDateForMonth(
  month: string,
  customDueDate?: string
): string {
  const defaultIssueDay = new Date().getDate() || 1;
  const defaultDueDay = Math.min(28, defaultIssueDay + 10);
  const dayStr = extractDayFromDateInput(customDueDate, defaultDueDay);
  return `${dayStr} ${month}`;
}

export const CATEGORY_MAP: Record<SoftwareCategory, CategoryTerminology> = {
  'School Management': {
    category: 'School Management',
    singular: 'School',
    plural: 'Schools',
    addressPlaceholder: '123 School Road, Lahore',
    sampleName: 'Green Valley School',
    tagline: 'Smart Solutions for Better Education',
  },
  'Store Management': {
    category: 'Store Management',
    singular: 'Store',
    plural: 'Stores',
    addressPlaceholder: '45 Commercial Market, Lahore',
    sampleName: 'Green Valley Superstore',
    tagline: 'Smart Retail & Inventory Solutions',
  },
  'Hospital Management': {
    category: 'Hospital Management',
    singular: 'Hospital',
    plural: 'Hospitals',
    addressPlaceholder: '14 Medical Complex Road, Lahore',
    sampleName: 'City Care Hospital',
    tagline: 'Digital Healthcare & Patient Management',
  },
  'Restaurant Management': {
    category: 'Restaurant Management',
    singular: 'Restaurant',
    plural: 'Restaurants',
    addressPlaceholder: '22 Food Street, Gulberg, Lahore',
    sampleName: 'Olive Garden Bistro',
    tagline: 'Modern POS & Restaurant Automation',
  },
  Other: {
    category: 'Other',
    singular: 'Client',
    plural: 'Clients',
    addressPlaceholder: '100 Business Avenue, Suite 4B',
    sampleName: 'Apex Enterprise',
    tagline: 'Enterprise Software & Cloud Solutions',
  },
};

export function getTerminology(company: CompanyProfile): CategoryTerminology {
  const base =
    CATEGORY_MAP[company.category] || CATEGORY_MAP['School Management'];
  if (company.category === 'Other' && company.customSingular) {
    return {
      ...base,
      singular: company.customSingular.trim(),
      plural:
        company.customPlural?.trim() || `${company.customSingular.trim()}s`,
    };
  }
  return base;
}

export function formatCurrency(amount: number, currency = 'Rs.'): string {
  const formatted = Math.round(amount).toLocaleString('en-US');
  return `${currency} ${formatted}`;
}

export function createPaymentTimestamp(billingMonth: string): {
  date: string;
  time: string;
  day: string;
  month: string;
} {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const day = now.toLocaleDateString('en-US', {
    weekday: 'long',
  });
  return {
    date,
    time,
    day,
    month: billingMonth,
  };
}

export function formatPaymentTimestamp(tx: {
  date?: string;
  time?: string;
  day?: string;
  billingMonth?: string;
}): string {
  const parts: string[] = [];
  if (tx.day) parts.push(tx.day);
  if (tx.date) parts.push(tx.date);
  if (tx.billingMonth && (!tx.date || !tx.date.includes(tx.billingMonth))) {
    parts.push(`(${tx.billingMonth})`);
  }
  if (tx.time) parts.push(`at ${tx.time}`);
  return parts.join(', ');
}

function findEarliestSavedMonthSerial(client: ClientEntity): number | null {
  const keys = Object.keys(client.monthlyRecords || {});
  let minSerial: number | null = null;
  for (const k of keys) {
    const parsed = parseMonthLabel(k);
    if (parsed && (minSerial === null || parsed.serial < minSerial)) {
      minSerial = parsed.serial;
    }
  }
  return minSerial;
}

export function getOrComputeMonthlyRecord(
  client: ClientEntity,
  month: string,
  depth = 0
): MonthlyLedgerRecord {
  const existing = client.monthlyRecords?.[month];
  const prevMonth = getPreviousMonthName(month);
  const prevParsed = parseMonthLabel(prevMonth);
  const earliestSerial = findEarliestSavedMonthSerial(client);

  const shouldComputePrevRecursively =
    depth < 24 &&
    (Boolean(client.monthlyRecords?.[prevMonth]) ||
      (prevParsed !== null &&
        earliestSerial !== null &&
        prevParsed.serial >= earliestSerial));

  const prevRecord = shouldComputePrevRecursively
    ? getOrComputeMonthlyRecord(client, prevMonth, depth + 1)
    : client.monthlyRecords?.[prevMonth];

  // Carry forward unpaid dues from previous month if present
  const carriedDues = prevRecord
    ? prevRecord.remainingDues
    : existing?.previousDues ?? 0;
  const prevLabel =
    prevRecord && prevRecord.remainingDues > 0
      ? `Previous Dues — ${prevMonth}`
      : existing?.previousDuesLabel || `Previous Dues (${prevMonth})`;

  if (existing) {
    const rawRate = Number(existing.whatsappRate) || 0;
    const rawMessages = Number(existing.whatsappMessages) || 0;
    const computedFromPerMsg = Math.round(rawRate * rawMessages);
    const savedDirectWhatsapp = Number(existing.whatsappCharges) || 0;
    const billingType =
      existing.whatsappBillingType ??
      client.whatsappBillingType ??
      (savedDirectWhatsapp > 0 && computedFromPerMsg === 0
        ? 'per_month'
        : 'per_message');
    const whatsappCharges =
      billingType === 'per_month'
        ? savedDirectWhatsapp > 0
          ? savedDirectWhatsapp
          : computedFromPerMsg
        : computedFromPerMsg > 0
        ? computedFromPerMsg
        : savedDirectWhatsapp;
    const currentMonthTotal =
      (Number(existing.softwareCharges) || 0) +
      whatsappCharges +
      (Number(existing.chatbotCharges) || 0);
    const previousDues =
      prevRecord !== undefined ? carriedDues : existing.previousDues;
    const totalAmount = currentMonthTotal + previousDues;
    const remainingDues = Math.max(0, totalAmount - existing.amountPaid);
    const status =
      remainingDues === 0
        ? 'Paid'
        : existing.amountPaid > 0
        ? 'Partially Paid'
        : 'Unpaid';

    return {
      ...existing,
      whatsappBillingType: billingType,
      whatsappCharges,
      currentMonthTotal,
      previousDues,
      previousDuesLabel: existing.previousDuesLabel || prevLabel,
      totalAmount,
      remainingDues,
      status,
      // Carry forward partner fields from client if not explicitly set in record
      partnerId: existing.partnerId ?? client.partnerId,
      partnerName: existing.partnerName ?? client.partnerName,
      partnerPaymentEnabled:
        existing.partnerPaymentEnabled ?? client.partnerPaymentEnabled,
      partnerSoftwareCharges:
        existing.partnerSoftwareCharges ?? client.partnerSoftwareCharges,
      partnerWhatsappCharges:
        existing.partnerWhatsappCharges ?? client.partnerWhatsappCharges,
      partnerChatbotCharges:
        existing.partnerChatbotCharges ?? client.partnerChatbotCharges,
      partnerTotalPayment:
        existing.partnerTotalPayment ?? client.partnerTotalPayment,
      partnerNote: existing.partnerNote ?? client.partnerNote,
      // Always ensure invoiceDate and dueDate align with the selected month
      invoiceDate: getIssueDateForMonth(month, existing.invoiceDate),
      dueDate: getDueDateForMonth(month, existing.dueDate),
      invoiceGenerated: existing.invoiceGenerated ?? false,
      invoiceGeneratedAt: existing.invoiceGeneratedAt,
    };
  }

  // Pre-fill charges for new month with carry-forward rules:
  // "Per month whatsapp charges will carry on for next month but per messages will not carry out for next month"
  const softwareCharges = client.softwareEnabled
    ? Number(client.softwareCharges) || 0
    : 0;

  const hasAnySavedMonthRecord =
    client.monthlyRecords && Object.keys(client.monthlyRecords).length > 0;
  const resolvedBillingType: 'per_month' | 'per_message' =
    prevRecord?.whatsappBillingType ||
    client.whatsappBillingType ||
    'per_message';

  let initialBillingType: 'per_month' | 'per_message' = resolvedBillingType;
  let initialWhatsappRate = client.whatsappEnabled
    ? Number(prevRecord?.whatsappRate ?? client.whatsappRate) || 0
    : 0;
  let initialWhatsappMessages = 0;
  let initialWhatsappCharges = 0;

  if (client.whatsappEnabled) {
    if (resolvedBillingType === 'per_month') {
      // Per-month WhatsApp charges carry on for next month
      initialBillingType = 'per_month';
      initialWhatsappCharges =
        Number(prevRecord?.whatsappCharges) ||
        Number(client.whatsappCharges) ||
        0;
      initialWhatsappRate = 0;
      initialWhatsappMessages = 0;
    } else {
      // Per-message WhatsApp counts do NOT carry out for next month
      initialBillingType = 'per_message';
      initialWhatsappRate =
        Number(prevRecord?.whatsappRate ?? client.whatsappRate) || 0;
      initialWhatsappMessages = hasAnySavedMonthRecord
        ? 0
        : Number(client.whatsappMessages) || 0;
      initialWhatsappCharges = 0;
    }
  }

  const computedClientPerMsg = Math.round(initialWhatsappRate * initialWhatsappMessages);
  const billingType = initialBillingType;
  const whatsappCharges = client.whatsappEnabled
    ? billingType === 'per_month'
      ? initialWhatsappCharges
      : computedClientPerMsg
    : 0;
  const whatsappRate = initialWhatsappRate;
  const whatsappMessages = initialWhatsappMessages;
  const chatbotCharges = client.chatbotEnabled
    ? Number(client.chatbotCharges) || 0
    : 0;
  const currentMonthTotal =
    softwareCharges + whatsappCharges + chatbotCharges;
  const previousDues = carriedDues;
  const totalAmount = currentMonthTotal + previousDues;

  const numSuffix =
    client.id.replace(/\D/g, '').slice(-3).padStart(3, '0') || '001';

  return {
    month,
    softwareCharges,
    whatsappBillingType: billingType,
    whatsappRate,
    whatsappMessages,
    whatsappCharges,
    chatbotCharges,
    previousDues,
    previousDuesLabel: `Previous Dues — ${prevMonth}`,
    currentMonthTotal,
    totalAmount,
    amountPaid: 0,
    remainingDues: totalAmount,
    status: totalAmount === 0 ? 'Paid' : 'Unpaid',
    invoiceNumber: `INV-${numSuffix}`,
    invoiceDate: getIssueDateForMonth(month),
    dueDate: getDueDateForMonth(month),
    invoiceGenerated: false,
    payments: [],
    partnerId: client.partnerId,
    partnerName: client.partnerName,
    partnerPaymentEnabled: client.partnerPaymentEnabled,
    partnerSoftwareCharges: client.partnerSoftwareCharges,
    partnerWhatsappCharges: client.partnerWhatsappCharges,
    partnerChatbotCharges: client.partnerChatbotCharges,
    partnerTotalPayment: client.partnerTotalPayment,
    partnerNote: client.partnerNote,
  };
}

/**
 * Checks whether an invoice has actually been generated for a specific client in a specific month.
 * Invoices of one month do NOT show on the next month until the user generates them.
 */
export function isClientInvoiceGenerated(
  client: ClientEntity,
  month: string,
  receiptLog?: { clientId: string; month: string }[]
): boolean {
  if (receiptLog) {
    return receiptLog.some((r) => r.clientId === client.id && r.month === month);
  }
  const rec = client.monthlyRecords?.[month];
  return Boolean(rec?.invoiceGenerated);
}

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: '',
  tagline: 'Smart Solutions for Better Education',
  phone: '',
  email: '',
  website: '',
  showQrCode: true,
  qrLabel: 'Scan to Pay',
  defaultIssueDate: '',
  defaultDueDate: '',
  invoiceHeaderTitle: 'INVOICE',
  invoiceHeaderNote:
    'Official Monthly Software & Communication Billing Statement',
  invoiceFooterThankYou: 'Thank you for your business & trust!',
  invoiceFooterTerms:
    'Please remit payment by the due date via Bank Transfer or scan the QR code to pay online.',
  invoiceTheme: 'royal-blue',
  defaultSoftwareLabel: 'Software Charges',
  defaultChatbotLabel: 'Chatbot Charges',
  category: 'School Management',
  currency: 'Rs.',
};

// Clean empty initial arrays — no pre-entered data
export const INITIAL_CLIENTS: ClientEntity[] = [];

export const INITIAL_EXPENSES: ExpenseItem[] = [];

export const INITIAL_ACCOUNTS: AccountItem[] = [];

export const INITIAL_PARTNERS: PartnerItem[] = [
  {
    id: 'part-abdul-sattar',
    name: 'ABDUL SATTAR',
    phone: '+92 300 1234567',
    monthlyPayment: 0,
    paidMonths: {},
  },
];

export function getMonthlyChartBaseline(monthOrYear?: string | number): {
  shortMonth: string;
  fullMonth: string;
  revenue: number;
  expenses: number;
}[] {
  const year =
    typeof monthOrYear === 'number'
      ? monthOrYear
      : typeof monthOrYear === 'string'
      ? getYearFromMonthString(monthOrYear)
      : new Date().getFullYear();

  return MONTH_NAMES.map((m) => ({
    shortMonth: m.slice(0, 3),
    fullMonth: `${m} ${year}`,
    revenue: 0,
    expenses: 0,
  }));
}

export const MONTHLY_CHART_BASELINE = getMonthlyChartBaseline();
