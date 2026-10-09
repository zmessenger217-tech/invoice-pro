export type SoftwareCategory =
  | 'School Management'
  | 'Store Management'
  | 'Hospital Management'
  | 'Restaurant Management'
  | 'Other';

export type InvoiceTheme =
  | 'royal-blue'
  | 'midnight-slate'
  | 'emerald-executive';

export interface PaymentQrCodeItem {
  id: string;
  label: string; // Bank name or wallet label (e.g. Meezan Bank, HBL, JazzCash, EasyPaisa, Raast)
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  dataUrl: string;
}

export interface GeneratedReceiptItem {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  invoiceNumber: string;
  month: string;
  invoiceDate: string;
  dueDate: string;
  softwareCharges: number;
  whatsappBillingType?: 'per_message' | 'per_month';
  whatsappRate: number;
  whatsappMessages: number;
  whatsappCharges: number;
  chatbotCharges: number;
  previousDues: number;
  currentMonthTotal: number;
  totalAmount: number;
  amountPaid: number;
  remainingDues: number;
  status: PaymentStatus;
  generatedAt: string;
  invoiceNote?: string;
  doc: InvoiceEditableDocument;
}

export interface CategoryTerminology {
  category: SoftwareCategory;
  singular: string;
  plural: string;
  addressPlaceholder: string;
  sampleName: string;
  tagline: string;
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  logoDataUrl?: string;
  qrCodeDataUrl?: string;
  qrCodes?: PaymentQrCodeItem[];
  showQrCode?: boolean;
  qrLabel?: string;
  defaultIssueDate?: string;
  defaultDueDate?: string;
  invoiceHeaderTitle?: string;
  invoiceHeaderNote?: string;
  defaultInvoiceNote?: string;
  invoiceFooterThankYou?: string;
  invoiceFooterTerms?: string;
  invoiceTheme?: InvoiceTheme;
  defaultSoftwareLabel?: string;
  defaultChatbotLabel?: string;
  category: SoftwareCategory;
  customSingular?: string;
  customPlural?: string;
  currency: string;
  receiptLog?: GeneratedReceiptItem[];
  receiptLogMonth?: string;
}

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number;
  method: 'Bank Transfer' | 'Cash' | 'Online / QR' | 'Cheque';
  bankName?: string;
  note?: string;
  month: string;
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';

export interface MonthlyLedgerRecord {
  month: string; // e.g., 'May 2026', 'September 2026', 'October 2026'
  softwareCharges: number;
  whatsappBillingType?: 'per_message' | 'per_month';
  whatsappRate: number;
  whatsappMessages: number;
  whatsappCharges: number;
  chatbotCharges: number;
  previousDues: number;
  previousDuesLabel: string; // e.g., 'Previous Dues (April 2026)' or 'Previous Dues — September 2026'
  currentMonthTotal: number;
  totalAmount: number;
  amountPaid: number;
  remainingDues: number;
  status: PaymentStatus;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  invoiceGenerated?: boolean;
  invoiceGeneratedAt?: string;
  payments: PaymentTransaction[];
  // Partner Payment & Service Commission details for this school/client in this month
  partnerId?: string;
  partnerName?: string;
  partnerPaymentEnabled?: boolean;
  partnerSoftwareCharges?: number;
  partnerWhatsappCharges?: number;
  partnerChatbotCharges?: number;
  partnerTotalPayment?: number;
  partnerNote?: string;
  invoiceNote?: string;
}

export interface ClientEntity {
  id: string;
  name: string;
  address: string;
  phone: string;
  enabled: boolean;
  createdAt: string;
  // Default recurring monthly fee structure (editable anytime)
  softwareEnabled: boolean;
  softwareCharges: number;
  whatsappEnabled: boolean;
  whatsappBillingType?: 'per_message' | 'per_month';
  whatsappRate: number;
  whatsappMessages: number;
  whatsappCharges: number;
  chatbotEnabled: boolean;
  chatbotCharges: number;
  // Partner payment configuration for this school/client
  partnerId?: string;
  partnerName?: string;
  partnerPaymentEnabled?: boolean;
  partnerSoftwareCharges?: number;
  partnerWhatsappCharges?: number;
  partnerChatbotCharges?: number;
  partnerTotalPayment?: number;
  partnerNote?: string;
  // Monthly billing & payment ledger keyed by month string e.g. 'May 2026'
  monthlyRecords: Record<string, MonthlyLedgerRecord>;
}

export type ExpenseCategory =
  | 'Office Expenses'
  | 'Salaries'
  | 'Marketing'
  | 'Internet'
  | 'Partner Payout'
  | 'Other Expenses';

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // DD-MM-YYYY or YYYY-MM-DD
  month: string; // e.g., 'May 2026'
  partnerId?: string;
  partnerName?: string;
}

export interface PartnerItem {
  id: string;
  name: string;
  phone: string;
  monthlyPayment: number;
  paidMonths: Record<
    string,
    {
      paid: boolean;
      amountPaid?: number;
      paidDate?: string;
      expenseId?: string;
    }
  >;
}

export interface InvoiceEditableDocument {
  id: string;
  clientId: string;
  headerTitle: string;
  headerNote: string;
  invoiceNumber: string;
  invoiceDate: string; // Issue Date
  dueDate: string; // Due Date
  billingMonth: string;
  companyName: string;
  companyTagline: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  softwareLabel: string;
  softwareCharges: number;
  whatsappLabel: string;
  whatsappBillingType?: 'per_message' | 'per_month';
  whatsappRate: number;
  whatsappMessages: number;
  whatsappCharges: number;
  chatbotLabel: string;
  chatbotCharges: number;
  previousDuesLabel: string;
  previousDues: number;
  amountPaid: number;
  invoiceNote?: string;
  footerThankYou: string;
  footerTerms: string;
  qrLabel: string;
  showQrCode: boolean;
  logoDataUrl?: string;
  qrCodeDataUrl?: string;
  qrCodes?: PaymentQrCodeItem[];
  theme: InvoiceTheme;
  status: PaymentStatus;
}

export type ActiveNavTab =
  | 'dashboard'
  | 'add-client'
  | 'check-balance'
  | 'school-charges-list'
  | 'invoices'
  | 'invoice-editor'
  | 'invoice-log'
  | 'receipt-log'
  | 'expenses'
  | 'partners'
  | 'finance-report'
  | 'enable-disable'
  | 'settings';

export type AuthScreenMode =
  | 'app'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'company-setup';
