import {
  CategoryTerminology,
  ClientEntity,
  CompanyProfile,
  ExpenseItem,
  MonthlyLedgerRecord,
  PartnerItem,
  SoftwareCategory,
} from '../types';

export type { CategoryTerminology };

const MONTH_NAMES = [
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

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();

export const AVAILABLE_MONTHS: string[] = MONTH_NAMES.map(
  (m) => `${m} ${CURRENT_YEAR}`
);

export function getCurrentMonthLabel(): string {
  const monthName = MONTH_NAMES[CURRENT_DATE.getMonth()] || 'October';
  return `${monthName} ${CURRENT_YEAR}`;
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
  const defaultDay = CURRENT_DATE.getDate() || 1;
  const dayStr = extractDayFromDateInput(customIssueDate, defaultDay);
  return `${dayStr} ${month}`;
}

export function getDueDateForMonth(
  month: string,
  customDueDate?: string
): string {
  const defaultIssueDay = CURRENT_DATE.getDate() || 1;
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

export function getPreviousMonthName(month: string): string {
  const idx = AVAILABLE_MONTHS.indexOf(month);
  if (idx > 0) {
    return AVAILABLE_MONTHS[idx - 1];
  }
  return `December ${CURRENT_YEAR - 1}`;
}

export function getOrComputeMonthlyRecord(
  client: ClientEntity,
  month: string
): MonthlyLedgerRecord {
  const existing = client.monthlyRecords[month];
  const prevMonth = getPreviousMonthName(month);
  const prevRecord = client.monthlyRecords[prevMonth];

  // Carry forward unpaid dues from previous month if present
  const carriedDues = prevRecord
    ? prevRecord.remainingDues
    : existing?.previousDues ?? 0;
  const prevLabel =
    prevRecord && prevRecord.remainingDues > 0
      ? `Previous Dues — ${prevMonth}`
      : existing?.previousDuesLabel || `Previous Dues (${prevMonth})`;

  if (existing) {
    const whatsappCharges = Math.round(
      (Number(existing.whatsappRate) || 0) *
        (Number(existing.whatsappMessages) || 0)
    );
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
      whatsappCharges,
      currentMonthTotal,
      previousDues,
      previousDuesLabel: existing.previousDuesLabel || prevLabel,
      totalAmount,
      remainingDues,
      status,
      // Always ensure invoiceDate and dueDate align with the selected month
      invoiceDate: getIssueDateForMonth(month, existing.invoiceDate),
      dueDate: getDueDateForMonth(month, existing.dueDate),
    };
  }

  // Pre-fill from the default charges and WhatsApp rate/messages entered when adding the school
  const softwareCharges = client.softwareEnabled ? client.softwareCharges : 0;
  const whatsappRate = client.whatsappEnabled ? client.whatsappRate : 0;
  const whatsappMessages = client.whatsappEnabled ? client.whatsappMessages : 0;
  const whatsappCharges = client.whatsappEnabled
    ? Math.round(whatsappRate * whatsappMessages)
    : 0;
  const chatbotCharges = client.chatbotEnabled ? client.chatbotCharges : 0;
  const currentMonthTotal =
    softwareCharges + whatsappCharges + chatbotCharges;
  const previousDues = carriedDues;
  const totalAmount = currentMonthTotal + previousDues;

  const numSuffix =
    client.id.replace(/\D/g, '').slice(-3).padStart(3, '0') || '001';

  return {
    month,
    softwareCharges,
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
    payments: [],
  };
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

export const INITIAL_PARTNERS: PartnerItem[] = [];

export const MONTHLY_CHART_BASELINE: {
  shortMonth: string;
  fullMonth: string;
  revenue: number;
  expenses: number;
}[] = MONTH_NAMES.map((m) => ({
  shortMonth: m.slice(0, 3),
  fullMonth: `${m} ${CURRENT_YEAR}`,
  revenue: 0,
  expenses: 0,
}));
