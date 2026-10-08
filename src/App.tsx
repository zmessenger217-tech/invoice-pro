import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ToggleLeft,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AuthAndOnboarding } from './components/AuthAndOnboarding';
import { ClientBillingViews } from './components/ClientBillingViews';
import { FinanceAndSettingsViews } from './components/FinanceAndSettingsViews';
import { InvoiceLogView } from './components/InvoiceLogView';
import { InvoicePreviewAndEditor } from './components/InvoicePreviewAndEditor';
import { SchoolChargesAndPartnerListView } from './components/SchoolChargesAndPartnerListView';
import { OfflineIndicator } from './components/PWAInstallModal';
import {
  CATEGORY_MAP,
  getCurrentMonthLabel,
  getDueDateForMonth,
  getIssueDateForMonth,
  getOrComputeMonthlyRecord,
  getTerminology,
  INITIAL_CLIENTS,
  INITIAL_COMPANY_PROFILE,
  INITIAL_EXPENSES,
  INITIAL_PARTNERS,
} from './data/initialData';
import {
  auth,
  createExpenseInFirestore,
  deleteClientFromFirestore,
  deleteExpenseFromFirestore,
  deletePartnerFromFirestore,
  loadOrBootstrapWorkspace,
  onAuthStateChanged,
  signInWithEmailPassword,
  signOutFirebaseUser,
  signUpWithEmailPassword,
  subscribeToWorkspaceRealtime,
  syncClientToFirestore,
  syncPartnerToFirestore,
  syncWorkspaceProfileToFirestore,
  User,
} from './firebase';
import {
  ActiveNavTab,
  AuthScreenMode,
  ClientEntity,
  CompanyProfile,
  ExpenseItem,
  GeneratedReceiptItem,
  InvoiceEditableDocument,
  PartnerItem,
  PaymentStatus,
  PaymentTransaction,
  SoftwareCategory,
} from './types';
import {
  downloadInvoicePdfWithClientName,
  prepareWhatsAppPdfShare,
  printInvoiceDocument,
} from './utils/invoicePdf';
import {
  DEFAULT_BRAND_LOGO_DATA_URL,
  DEFAULT_BRAND_LOGO_PATH,
  resolveActiveLogoUrl,
} from './utils/usePWAInstall';

const SESSION_UID_KEY = 'invoicepro_active_session_uid';
function getAccountStorageKey(uid: string): string {
  return `invoicepro_workspace_uid_${uid}`;
}

function buildEditableInvoiceFromClient(
  company: CompanyProfile,
  client: ClientEntity | undefined,
  month: string
): InvoiceEditableDocument {
  const defaultIssueDate = getIssueDateForMonth(
    month,
    company.defaultIssueDate
  );
  const defaultDueDate = getDueDateForMonth(month, company.defaultDueDate);
  const headerTitle = company.invoiceHeaderTitle || 'INVOICE';
  const headerNote =
    company.invoiceHeaderNote ??
    'Official Monthly Software & Communication Billing Statement';
  const footerThankYou =
    company.invoiceFooterThankYou || 'Thank you for your business & trust!';
  const footerTerms =
    company.invoiceFooterTerms ??
    'Please remit payment by the due date via Bank Transfer or scan the QR code to pay online.';
  const qrLabel = company.qrLabel || 'Scan to Pay';
  const showQrCode = company.showQrCode !== false;
  const theme = company.invoiceTheme || 'royal-blue';
  const softwareLabel = company.defaultSoftwareLabel || 'Software Charges';
  const chatbotLabel = company.defaultChatbotLabel || 'Chatbot Charges';

  if (!client) {
    return {
      id: `draft-${month}`,
      clientId: '',
      headerTitle,
      headerNote,
      invoiceNumber: 'INV-001',
      invoiceDate: defaultIssueDate,
      dueDate: defaultDueDate,
      billingMonth: month,
      companyName: company.name || 'Your Company Name',
      companyTagline:
        company.tagline || 'Smart Solutions for Better Education',
      companyPhone: company.phone || '',
      companyEmail: company.email || '',
      companyWebsite: company.website || '',
      clientName: '',
      clientAddress: '',
      clientPhone: '',
      softwareLabel,
      softwareCharges: 0,
      whatsappLabel: 'WhatsApp Charges (0 × 0)',
      whatsappRate: 0,
      whatsappMessages: 0,
      whatsappCharges: 0,
      chatbotLabel,
      chatbotCharges: 0,
      previousDuesLabel: 'Previous Dues',
      previousDues: 0,
      amountPaid: 0,
      invoiceNote: company.defaultInvoiceNote || '',
      footerThankYou,
      footerTerms,
      qrLabel,
      showQrCode,
      logoDataUrl: resolveActiveLogoUrl(company.logoDataUrl),
      qrCodeDataUrl: company.qrCodeDataUrl,
      qrCodes: company.qrCodes,
      theme,
      status: 'Unpaid',
    };
  }

  const rec = getOrComputeMonthlyRecord(client, month);
  const isPerMonthWhatsapp =
    rec.whatsappBillingType === 'per_month' ||
    (rec.whatsappCharges > 0 &&
      (rec.whatsappRate === 0 || rec.whatsappMessages === 0));
  const whatsappLabel = isPerMonthWhatsapp
    ? 'WhatsApp Charges'
    : `WhatsApp Charges (${rec.whatsappRate} × ${rec.whatsappMessages.toLocaleString()})`;

  const savedReceiptForMonth = (company.receiptLog || []).find(
    (r) => r.clientId === client.id && r.month === month
  );
  const resolvedInvoiceNote =
    rec.invoiceNote !== undefined
      ? rec.invoiceNote
      : savedReceiptForMonth?.invoiceNote ||
        savedReceiptForMonth?.doc?.invoiceNote ||
        company.defaultInvoiceNote ||
        '';

  return {
    id: `${client.id}-${month}`,
    clientId: client.id,
    headerTitle,
    headerNote,
    invoiceNumber: rec.invoiceNumber || 'INV-001',
    invoiceDate: getIssueDateForMonth(
      month,
      company.defaultIssueDate || rec.invoiceDate
    ),
    dueDate: getDueDateForMonth(month, company.defaultDueDate || rec.dueDate),
    billingMonth: month,
    companyName: company.name || 'Your Company Name',
    companyTagline: company.tagline,
    companyPhone: company.phone,
    companyEmail: company.email,
    companyWebsite: company.website,
    clientName: client.name,
    clientAddress: client.address,
    clientPhone: client.phone,
    softwareLabel,
    softwareCharges: rec.softwareCharges,
    whatsappLabel,
    whatsappBillingType: isPerMonthWhatsapp ? 'per_month' : 'per_message',
    whatsappRate: rec.whatsappRate,
    whatsappMessages: rec.whatsappMessages,
    whatsappCharges: rec.whatsappCharges,
    chatbotLabel,
    chatbotCharges: rec.chatbotCharges,
    previousDuesLabel: rec.previousDuesLabel || 'Previous Dues',
    previousDues: rec.previousDues,
    amountPaid: rec.amountPaid,
    invoiceNote: resolvedInvoiceNote,
    footerThankYou,
    footerTerms,
    qrLabel,
    showQrCode,
    logoDataUrl: resolveActiveLogoUrl(company.logoDataUrl),
    qrCodeDataUrl: company.qrCodeDataUrl,
    qrCodes: company.qrCodes,
    theme,
    status: rec.status,
  };
}

export default function App() {
  // Always start on the Login / Sign Up flow first as requested
  const [authScreenMode, setAuthScreenMode] =
    useState<AuthScreenMode>('login');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const isSigningUpRef = useRef(false);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getCurrentMonthLabel()
  );

  // Remove any legacy shared localStorage keys on mount so accounts never share browser cache
  useEffect(() => {
    try {
      localStorage.removeItem('invoicepro_workspace_v1');
      localStorage.removeItem('invoicepro_workspace_clean_v2');
    } catch {
      // ignore
    }
  }, []);

  const [company, setCompany] = useState<CompanyProfile>(() => ({
    ...INITIAL_COMPANY_PROFILE,
    logoDataUrl: DEFAULT_BRAND_LOGO_DATA_URL,
  }));

  const [clients, setClients] = useState<ClientEntity[]>(INITIAL_CLIENTS);

  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);

  const [partners, setPartners] = useState<PartnerItem[]>(INITIAL_PARTNERS);

  const [editorClientId, setEditorClientId] = useState<string>('');
  const [invoiceDoc, setInvoiceDoc] = useState<InvoiceEditableDocument>(() =>
    buildEditableInvoiceFromClient(
      INITIAL_COMPANY_PROFILE,
      undefined,
      getCurrentMonthLabel()
    )
  );
  const noteSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef<{
    client?: ClientEntity;
    company?: CompanyProfile;
  }>({});

  // Keep invoiceDoc and editorClientId dynamically synced with the current account's clients, company, and selectedMonth
  useEffect(() => {
    const validClient =
      clients.find((c) => c.id === editorClientId) || clients[0] || undefined;
    const nextClientId = validClient ? validClient.id : '';
    if (nextClientId !== editorClientId) {
      setEditorClientId(nextClientId);
    }
    setInvoiceDoc(
      buildEditableInvoiceFromClient(company, validClient, selectedMonth)
    );
  }, [selectedMonth, clients, company]);

  // Automatically persist invoiceNote, QR codes, and charge edits (including WhatsApp charges) to client ledger & workspace Firestore as user edits
  const handleChangeInvoiceDoc = (nextDoc: InvoiceEditableDocument) => {
    const noteChanged = nextDoc.invoiceNote !== invoiceDoc.invoiceNote;
    const qrsChanged = nextDoc.qrCodes !== invoiceDoc.qrCodes;
    const chargesChanged =
      nextDoc.softwareCharges !== invoiceDoc.softwareCharges ||
      nextDoc.whatsappCharges !== invoiceDoc.whatsappCharges ||
      nextDoc.whatsappRate !== invoiceDoc.whatsappRate ||
      nextDoc.whatsappMessages !== invoiceDoc.whatsappMessages ||
      nextDoc.whatsappBillingType !== invoiceDoc.whatsappBillingType ||
      nextDoc.chatbotCharges !== invoiceDoc.chatbotCharges ||
      nextDoc.previousDues !== invoiceDoc.previousDues ||
      nextDoc.amountPaid !== invoiceDoc.amountPaid;

    const month = nextDoc.billingMonth || selectedMonth;
    const target =
      clients.find((c) => c.id === nextDoc.clientId) ||
      clients.find((c) => c.id === editorClientId) ||
      clients[0];

    let effectiveNextDoc = nextDoc;
    let updatedClientForSync: ClientEntity | undefined;

    if (target && (noteChanged || chargesChanged)) {
      const currentRec = getOrComputeMonthlyRecord(target, month);
      const billingType =
        nextDoc.whatsappBillingType ||
        currentRec.whatsappBillingType ||
        target.whatsappBillingType ||
        'per_message';
      const softwareCharges = Number(nextDoc.softwareCharges) || 0;
      const whatsappRate = Number(nextDoc.whatsappRate) || 0;
      const whatsappMessages = Number(nextDoc.whatsappMessages) || 0;
      const computedPerMsg = Math.round(whatsappRate * whatsappMessages);
      const directWhatsapp = Number(nextDoc.whatsappCharges) || 0;
      const whatsappCharges =
        billingType === 'per_month'
          ? directWhatsapp > 0
            ? directWhatsapp
            : computedPerMsg
          : computedPerMsg > 0
          ? computedPerMsg
          : directWhatsapp;
      const chatbotCharges = Number(nextDoc.chatbotCharges) || 0;
      const previousDues = Number(nextDoc.previousDues) || 0;
      const currentMonthTotal =
        softwareCharges + whatsappCharges + chatbotCharges;
      const totalAmount = currentMonthTotal + previousDues;

      // If this client was already marked Paid, and the user added WhatsApp/service charges without manually changing amountPaid, keep amountPaid synced with totalAmount so revenue updates immediately
      const wasPaidInFull =
        currentRec.status === 'Paid' &&
        currentRec.totalAmount > 0 &&
        currentRec.amountPaid >= currentRec.totalAmount;
      const userEditedAmountPaidDirectly =
        nextDoc.amountPaid !== invoiceDoc.amountPaid;
      const amountPaid =
        wasPaidInFull && !userEditedAmountPaidDirectly
          ? totalAmount
          : Number(nextDoc.amountPaid) || 0;

      const remainingDues = Math.max(0, totalAmount - amountPaid);
      const status =
        remainingDues === 0
          ? 'Paid'
          : amountPaid > 0
          ? 'Partially Paid'
          : 'Unpaid';

      effectiveNextDoc = {
        ...nextDoc,
        whatsappBillingType: billingType,
        whatsappCharges,
        whatsappLabel:
          billingType === 'per_month' && nextDoc.whatsappLabel?.includes('(')
            ? 'WhatsApp Charges'
            : nextDoc.whatsappLabel || (billingType === 'per_month' ? 'WhatsApp Charges' : `WhatsApp Charges (${whatsappRate} × ${whatsappMessages.toLocaleString()})`),
        amountPaid,
        status,
      };

      updatedClientForSync = {
        ...target,
        softwareCharges,
        whatsappEnabled: whatsappCharges > 0 ? true : target.whatsappEnabled,
        whatsappBillingType: billingType,
        whatsappRate,
        whatsappMessages,
        whatsappCharges,
        chatbotCharges,
        monthlyRecords: {
          ...target.monthlyRecords,
          [month]: {
            ...currentRec,
            softwareCharges,
            whatsappBillingType: billingType,
            whatsappRate,
            whatsappMessages,
            whatsappCharges,
            chatbotCharges,
            previousDues,
            currentMonthTotal,
            totalAmount,
            amountPaid,
            remainingDues,
            status,
            invoiceNote: effectiveNextDoc.invoiceNote ?? '',
          },
        },
      };
      setClients((prev) =>
        prev.map((c) => (c.id === target.id ? updatedClientForSync! : c))
      );
    }

    setInvoiceDoc(effectiveNextDoc);

    if (!noteChanged && !qrsChanged && !chargesChanged) return;

    const updatedReceiptLog = Array.isArray(company.receiptLog)
      ? company.receiptLog.map((r) => {
          if (target && r.clientId === target.id && r.month === month) {
            const rec = updatedClientForSync
              ? getOrComputeMonthlyRecord(updatedClientForSync, month)
              : undefined;
            return {
              ...r,
              softwareCharges:
                rec?.softwareCharges ?? effectiveNextDoc.softwareCharges,
              whatsappBillingType:
                rec?.whatsappBillingType ??
                effectiveNextDoc.whatsappBillingType,
              whatsappRate: rec?.whatsappRate ?? effectiveNextDoc.whatsappRate,
              whatsappMessages:
                rec?.whatsappMessages ?? effectiveNextDoc.whatsappMessages,
              whatsappCharges:
                rec?.whatsappCharges ?? effectiveNextDoc.whatsappCharges,
              chatbotCharges:
                rec?.chatbotCharges ?? effectiveNextDoc.chatbotCharges,
              previousDues: rec?.previousDues ?? effectiveNextDoc.previousDues,
              currentMonthTotal: rec?.currentMonthTotal ?? r.currentMonthTotal,
              totalAmount: rec?.totalAmount ?? r.totalAmount,
              amountPaid: rec?.amountPaid ?? effectiveNextDoc.amountPaid,
              remainingDues: rec?.remainingDues ?? r.remainingDues,
              status: rec?.status ?? effectiveNextDoc.status,
              invoiceNote: effectiveNextDoc.invoiceNote ?? '',
              doc: {
                ...r.doc,
                ...effectiveNextDoc,
                invoiceNote: effectiveNextDoc.invoiceNote ?? '',
                qrCodes: effectiveNextDoc.qrCodes || r.doc?.qrCodes,
              },
            };
          }
          return r;
        })
      : company.receiptLog;

    const updatedCompanyForSync: CompanyProfile = {
      ...company,
      defaultInvoiceNote: noteChanged
        ? effectiveNextDoc.invoiceNote ?? ''
        : company.defaultInvoiceNote,
      qrCodes:
        qrsChanged && effectiveNextDoc.qrCodes
          ? effectiveNextDoc.qrCodes
          : company.qrCodes,
      qrCodeDataUrl:
        qrsChanged && effectiveNextDoc.qrCodes?.[0]?.dataUrl
          ? effectiveNextDoc.qrCodes[0].dataUrl
          : company.qrCodeDataUrl,
      receiptLog: updatedReceiptLog,
    };
    setCompany(updatedCompanyForSync);

    pendingSyncRef.current = {
      client: updatedClientForSync || pendingSyncRef.current.client,
      company: updatedCompanyForSync,
    };

    if (noteSyncTimeoutRef.current) {
      clearTimeout(noteSyncTimeoutRef.current);
    }
    noteSyncTimeoutRef.current = setTimeout(async () => {
      const activeUser = firebaseUser || auth.currentUser;
      const toSync = pendingSyncRef.current;
      pendingSyncRef.current = {};
      if (!activeUser) return;
      try {
        await Promise.all([
          toSync.client
            ? syncClientToFirestore(activeUser.uid, toSync.client, false)
            : Promise.resolve(),
          toSync.company
            ? syncWorkspaceProfileToFirestore(activeUser.uid, toSync.company)
            : Promise.resolve(),
        ]);
      } catch (err) {
        console.error(err);
      }
    }, 350);
  };

  // Save cache strictly under the authenticated user's UID key only
  useEffect(() => {
    if (!firebaseUser) return;
    try {
      localStorage.setItem(
        getAccountStorageKey(firebaseUser.uid),
        JSON.stringify({ company, clients, expenses, partners })
      );
    } catch {
      // ignore
    }
  }, [firebaseUser, company, clients, expenses, partners]);

  // Ensure default brand logo is converted to a base64 Data URL so jsPDF and Print always render it
  useEffect(() => {
    if (
      company.logoDataUrl &&
      company.logoDataUrl.startsWith('data:image/') &&
      company.logoDataUrl !== DEFAULT_BRAND_LOGO_DATA_URL
    ) {
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 160, 160);
          const dataUrl = canvas.toDataURL('image/png');
          setCompany((prev) => ({ ...prev, logoDataUrl: dataUrl }));
          setInvoiceDoc((prev) => ({ ...prev, logoDataUrl: dataUrl }));
        }
      } catch {
        // ignore canvas security fallback
      }
    };
    img.src = DEFAULT_BRAND_LOGO_PATH;
  }, []);

  // Listen to Firebase Auth state changes — only restore active tab session if user explicitly logged in during this session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const activeSessionUid = sessionStorage.getItem(SESSION_UID_KEY);
        if (activeSessionUid === user.uid) {
          setFirebaseUser(user);
          if (!isSigningUpRef.current) {
            setAuthScreenMode((prev) => (prev === 'login' ? 'app' : prev));
          }
        }
      } else {
        setFirebaseUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore synchronization via onSnapshot whenever user is authenticated
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribeRealtime = subscribeToWorkspaceRealtime(
      firebaseUser,
      {
        ...INITIAL_COMPANY_PROFILE,
        logoDataUrl: DEFAULT_BRAND_LOGO_DATA_URL,
      },
      {
        onCompanyChange: (remoteCompany) => {
          setCompany(remoteCompany);
          setInvoiceDoc((prev) => ({
            ...prev,
            headerTitle:
              remoteCompany.invoiceHeaderTitle || prev.headerTitle || 'INVOICE',
            headerNote: remoteCompany.invoiceHeaderNote ?? prev.headerNote,
            invoiceDate: remoteCompany.defaultIssueDate || prev.invoiceDate,
            dueDate: remoteCompany.defaultDueDate || prev.dueDate,
            companyName: remoteCompany.name || prev.companyName,
            companyTagline: remoteCompany.tagline,
            companyPhone: remoteCompany.phone,
            companyEmail: remoteCompany.email,
            companyWebsite: remoteCompany.website,
            footerThankYou:
              remoteCompany.invoiceFooterThankYou || prev.footerThankYou,
            footerTerms: remoteCompany.invoiceFooterTerms ?? prev.footerTerms,
            qrLabel: remoteCompany.qrLabel || prev.qrLabel,
            showQrCode: remoteCompany.showQrCode !== false,
            logoDataUrl: resolveActiveLogoUrl(remoteCompany.logoDataUrl),
            qrCodeDataUrl: remoteCompany.qrCodeDataUrl,
            qrCodes:
              remoteCompany.qrCodes && remoteCompany.qrCodes.length > 0
                ? remoteCompany.qrCodes
                : prev.qrCodes,
            invoiceNote:
              prev.invoiceNote || remoteCompany.defaultInvoiceNote || '',
            theme: remoteCompany.invoiceTheme || prev.theme,
            softwareLabel:
              remoteCompany.defaultSoftwareLabel || prev.softwareLabel,
            chatbotLabel:
              remoteCompany.defaultChatbotLabel || prev.chatbotLabel,
          }));
        },
        onClientsChange: (remoteClients) => {
          setClients(remoteClients);
        },
        onExpensesChange: (remoteExpenses) => {
          setExpenses(remoteExpenses);
        },
        onPartnersChange: (remotePartners) => {
          setPartners(remotePartners);
        },
      }
    );

    return () => {
      unsubscribeRealtime();
    };
  }, [firebaseUser]);

  const term = useMemo(() => getTerminology(company), [company]);

  const activeClients = useMemo(
    () => clients.filter((c) => c.enabled),
    [clients]
  );

  const activeLedgerRecords = useMemo(
    () =>
      activeClients.map((c) => getOrComputeMonthlyRecord(c, selectedMonth)),
    [activeClients, selectedMonth]
  );

  // Monthly revenue is only updated when someone pays (actual collected cash flow), not pre-added scheduled data
  const monthlyRevenue = useMemo(
    () => activeLedgerRecords.reduce((sum, r) => sum + r.amountPaid, 0),
    [activeLedgerRecords]
  );

  const totalCollected = monthlyRevenue;

  const totalOutstandingDues = useMemo(
    () => activeLedgerRecords.reduce((sum, r) => sum + r.remainingDues, 0),
    [activeLedgerRecords]
  );

  const monthlyExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.month === selectedMonth)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, selectedMonth]
  );

  const partnerPayoutsTotal = useMemo(
    () =>
      partners.reduce((sum, p) => {
        const isPaid = p.paidMonths[selectedMonth]?.paid;
        const linkedSchoolsTotal = activeLedgerRecords
          .filter(
            (r) =>
              (r.partnerId === p.id && r.partnerPaymentEnabled) ||
              (clients.find((c) => c.id === r.invoiceNumber)?.partnerId === p.id)
          )
          .reduce((s, r) => s + (r.partnerTotalPayment || 0), 0);
        const payout =
          linkedSchoolsTotal > 0 ? linkedSchoolsTotal : p.monthlyPayment || 0;
        return sum + (isPaid ? payout : 0);
      }, 0),
    [partners, activeLedgerRecords, clients, selectedMonth]
  );

  const handleUpdateCompany = async (updated: CompanyProfile) => {
    setCompany(updated);
    setInvoiceDoc((prev) => ({
      ...prev,
      headerTitle: updated.invoiceHeaderTitle || prev.headerTitle || 'INVOICE',
      headerNote: updated.invoiceHeaderNote ?? prev.headerNote,
      invoiceDate: updated.defaultIssueDate || prev.invoiceDate,
      dueDate: updated.defaultDueDate || prev.dueDate,
      companyName: updated.name || prev.companyName,
      companyTagline: updated.tagline,
      companyPhone: updated.phone,
      companyEmail: updated.email,
      companyWebsite: updated.website,
      footerThankYou: updated.invoiceFooterThankYou || prev.footerThankYou,
      footerTerms: updated.invoiceFooterTerms ?? prev.footerTerms,
      qrLabel: updated.qrLabel || prev.qrLabel,
      showQrCode: updated.showQrCode !== false,
      logoDataUrl: updated.logoDataUrl,
      qrCodeDataUrl: updated.qrCodeDataUrl,
      qrCodes: updated.qrCodes || prev.qrCodes,
      theme: updated.invoiceTheme || prev.theme,
      softwareLabel: updated.defaultSoftwareLabel || prev.softwareLabel,
      chatbotLabel: updated.defaultChatbotLabel || prev.chatbotLabel,
    }));
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await syncWorkspaceProfileToFirestore(activeUser.uid, updated);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveAsDefaultInvoice = async (docData: InvoiceEditableDocument) => {
    const updatedCompany: CompanyProfile = {
      ...company,
      name: docData.companyName.trim() || company.name,
      tagline: docData.companyTagline.trim() || company.tagline,
      phone: docData.companyPhone.trim(),
      email: docData.companyEmail.trim(),
      website: docData.companyWebsite.trim(),
      logoDataUrl: docData.logoDataUrl,
      qrCodeDataUrl: docData.qrCodeDataUrl,
      qrCodes: docData.qrCodes || company.qrCodes,
      showQrCode: docData.showQrCode,
      qrLabel: docData.qrLabel.trim() || 'Scan to Pay',
      defaultIssueDate: docData.invoiceDate.trim(),
      defaultDueDate: docData.dueDate.trim(),
      invoiceHeaderTitle: docData.headerTitle.trim() || 'INVOICE',
      invoiceHeaderNote: docData.headerNote.trim(),
      defaultInvoiceNote: (docData.invoiceNote || '').trim(),
      invoiceFooterThankYou:
        docData.footerThankYou.trim() || 'Thank you for your business & trust!',
      invoiceFooterTerms: docData.footerTerms.trim(),
      invoiceTheme: docData.theme,
      defaultSoftwareLabel: docData.softwareLabel.trim() || 'Software Charges',
      defaultChatbotLabel: docData.chatbotLabel.trim() || 'Chatbot Charges',
    };
    await handleUpdateCompany(updatedCompany);
  };

  const handleSaveInvoiceChanges = async (docData: InvoiceEditableDocument) => {
    const target =
      clients.find((c) => c.id === docData.clientId) ||
      clients.find((c) => c.id === editorClientId);
    if (!target) return;

    const month = docData.billingMonth || selectedMonth;
    const currentRec = getOrComputeMonthlyRecord(target, month);

    const billingType =
      docData.whatsappBillingType ||
      currentRec.whatsappBillingType ||
      target.whatsappBillingType ||
      'per_message';
    const softwareCharges = Number(docData.softwareCharges) || 0;
    const whatsappRate = Number(docData.whatsappRate) || 0;
    const whatsappMessages = Number(docData.whatsappMessages) || 0;
    const whatsappCharges =
      billingType === 'per_month'
        ? Number(docData.whatsappCharges) || 0
        : Number(docData.whatsappCharges) ||
          Math.round(whatsappRate * whatsappMessages);
    const chatbotCharges = Number(docData.chatbotCharges) || 0;
    const previousDues = Number(docData.previousDues) || 0;
    const currentMonthTotal =
      softwareCharges + whatsappCharges + chatbotCharges;
    const totalAmount = currentMonthTotal + previousDues;
    const amountPaid = Number(docData.amountPaid) || 0;
    const remainingDues = Math.max(0, totalAmount - amountPaid);
    const status =
      remainingDues === 0
        ? 'Paid'
        : amountPaid > 0
        ? 'Partially Paid'
        : 'Unpaid';

    const updatedClient: ClientEntity = {
      ...target,
      name: docData.clientName || target.name,
      phone: docData.clientPhone || target.phone,
      address: docData.clientAddress || target.address,
      softwareCharges,
      whatsappBillingType: billingType,
      whatsappRate,
      whatsappMessages,
      whatsappCharges,
      chatbotCharges,
      monthlyRecords: {
        ...target.monthlyRecords,
        [month]: {
          ...currentRec,
          invoiceGenerated: true,
          invoiceGeneratedAt:
            currentRec.invoiceGeneratedAt || new Date().toISOString(),
          softwareCharges,
          whatsappBillingType: billingType,
          whatsappRate,
          whatsappMessages,
          whatsappCharges,
          chatbotCharges,
          previousDues,
          previousDuesLabel:
            docData.previousDuesLabel || currentRec.previousDuesLabel,
          currentMonthTotal,
          totalAmount,
          amountPaid,
          remainingDues,
          status,
          invoiceNumber: docData.invoiceNumber || currentRec.invoiceNumber,
          invoiceDate: docData.invoiceDate || currentRec.invoiceDate,
          dueDate: docData.dueDate || currentRec.dueDate,
          invoiceNote: docData.invoiceNote,
        },
      },
    };

    const resolvedWhatsappLabel =
      billingType === 'per_month' && docData.whatsappLabel?.includes('(')
        ? 'WhatsApp Charges'
        : docData.whatsappLabel ||
          (billingType === 'per_month'
            ? 'WhatsApp Charges'
            : `WhatsApp Charges (${whatsappRate} × ${whatsappMessages.toLocaleString()})`);

    const finalDocData: InvoiceEditableDocument = {
      ...docData,
      whatsappBillingType: billingType,
      whatsappCharges,
      whatsappLabel: resolvedWhatsappLabel,
    };

    const savedReceiptItem: GeneratedReceiptItem = {
      id: `inv-log-${Date.now()}-${target.id}`,
      clientId: target.id,
      clientName: updatedClient.name,
      clientPhone: updatedClient.phone,
      invoiceNumber:
        docData.invoiceNumber ||
        currentRec.invoiceNumber ||
        `INV-${String(Date.now()).slice(-4)}`,
      month,
      invoiceDate: docData.invoiceDate,
      dueDate: docData.dueDate,
      softwareCharges,
      whatsappBillingType: billingType,
      whatsappRate,
      whatsappMessages,
      whatsappCharges,
      chatbotCharges,
      previousDues,
      currentMonthTotal,
      totalAmount,
      amountPaid,
      remainingDues,
      status,
      generatedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      invoiceNote: docData.invoiceNote,
      doc: finalDocData,
    };

    const existingLog = (company.receiptLog || []).filter(
      (r) => !(r.clientId === target.id && r.month === month)
    );
    const updatedCompany: CompanyProfile = {
      ...company,
      qrCodes:
        docData.qrCodes && docData.qrCodes.length > 0
          ? docData.qrCodes
          : company.qrCodes,
      qrCodeDataUrl: docData.qrCodeDataUrl || company.qrCodeDataUrl,
      receiptLog: [savedReceiptItem, ...existingLog],
      receiptLogMonth: month,
    };

    setClients((prev) =>
      prev.map((c) => (c.id === target.id ? updatedClient : c))
    );
    setCompany(updatedCompany);
    setInvoiceDoc(docData);

    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await Promise.all([
          syncClientToFirestore(activeUser.uid, updatedClient, false),
          syncWorkspaceProfileToFirestore(activeUser.uid, updatedCompany),
        ]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveClient = async (client: ClientEntity, isNew: boolean) => {
    setClients((prev) => {
      if (isNew) return [...prev, client];
      return prev.map((c) => (c.id === client.id ? client : c));
    });
    setEditorClientId(client.id);
    setInvoiceDoc(buildEditableInvoiceFromClient(company, client, selectedMonth));
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await syncClientToFirestore(activeUser.uid, client, isNew);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRecordPaymentWithCharges = async (
    clientId: string,
    month: string,
    softwareCharges: number,
    whatsappRate: number,
    whatsappMessages: number,
    chatbotCharges: number,
    amountPaidNow: number,
    method: PaymentTransaction['method'],
    note: string,
    whatsappBillingType?: 'per_message' | 'per_month',
    explicitWhatsappCharges?: number
  ) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target) return;

    const currentRec = getOrComputeMonthlyRecord(target, month);
    const billingType =
      whatsappBillingType ||
      target.whatsappBillingType ||
      currentRec.whatsappBillingType ||
      'per_message';
    const whatsappCharges =
      explicitWhatsappCharges !== undefined
        ? explicitWhatsappCharges
        : billingType === 'per_month'
        ? (whatsappRate > 0
            ? whatsappRate
            : Number(currentRec.whatsappCharges) ||
              Number(target.whatsappCharges) ||
              0)
        : Math.round(whatsappRate * whatsappMessages);
    const currentMonthTotal =
      softwareCharges + whatsappCharges + chatbotCharges;
    const totalAmount = currentMonthTotal + currentRec.previousDues;
    const newTotalPaid = Math.min(
      totalAmount,
      currentRec.amountPaid + Math.max(0, amountPaidNow)
    );
    const newRemaining = Math.max(0, totalAmount - newTotalPaid);
    const newStatus: PaymentStatus =
      newRemaining === 0
        ? 'Paid'
        : newTotalPaid > 0
        ? 'Partially Paid'
        : 'Unpaid';

    const newPaymentTx: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      date: `16 ${month}`,
      amount: Math.max(0, amountPaidNow),
      method,
      note: note.trim() || undefined,
      month,
    };

    const updatedClient: ClientEntity = {
      ...target,
      softwareCharges,
      whatsappBillingType: billingType,
      whatsappRate: billingType === 'per_month' ? 0 : whatsappRate,
      whatsappMessages: billingType === 'per_month' ? 0 : whatsappMessages,
      whatsappCharges,
      chatbotCharges,
      monthlyRecords: {
        ...target.monthlyRecords,
        [month]: {
          ...currentRec,
          softwareCharges,
          whatsappBillingType: billingType,
          whatsappRate: billingType === 'per_month' ? 0 : whatsappRate,
          whatsappMessages: billingType === 'per_month' ? 0 : whatsappMessages,
          whatsappCharges,
          chatbotCharges,
          currentMonthTotal,
          totalAmount,
          amountPaid: newTotalPaid,
          remainingDues: newRemaining,
          status: newStatus,
          payments:
            amountPaidNow > 0
              ? [newPaymentTx, ...(currentRec.payments || [])]
              : currentRec.payments || [],
        },
      },
    };

    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? updatedClient : c))
    );

    let updatedCompany = company;
    if (
      company.receiptLog?.some(
        (r) => r.clientId === clientId && r.month === month
      )
    ) {
      const updatedLog = company.receiptLog.map((r) => {
        if (r.clientId === clientId && r.month === month) {
          const docData = buildEditableInvoiceFromClient(
            company,
            updatedClient,
            month
          );
          return {
            ...r,
            softwareCharges,
            whatsappBillingType: billingType,
            whatsappRate: billingType === 'per_month' ? 0 : whatsappRate,
            whatsappMessages:
              billingType === 'per_month' ? 0 : whatsappMessages,
            whatsappCharges,
            chatbotCharges,
            currentMonthTotal,
            totalAmount,
            amountPaid: newTotalPaid,
            remainingDues: newRemaining,
            status: newStatus,
            doc: docData,
          };
        }
        return r;
      });
      updatedCompany = { ...company, receiptLog: updatedLog };
      setCompany(updatedCompany);
    }

    if (editorClientId === clientId) {
      setInvoiceDoc(
        buildEditableInvoiceFromClient(updatedCompany, updatedClient, month)
      );
    }

    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await Promise.all([
          syncClientToFirestore(activeUser.uid, updatedClient, false),
          syncWorkspaceProfileToFirestore(activeUser.uid, updatedCompany),
        ]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGenerateInvoiceWithCharges = async (
    clientId: string,
    month: string,
    softwareCharges: number,
    whatsappRate: number,
    whatsappMessages: number,
    chatbotCharges: number
  ) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target) return;

    const currentRec = getOrComputeMonthlyRecord(target, month);
    const billingType =
      target.whatsappBillingType ||
      currentRec.whatsappBillingType ||
      'per_message';
    const whatsappCharges =
      billingType === 'per_month'
        ? (whatsappRate > 0
            ? whatsappRate
            : Number(currentRec.whatsappCharges) ||
              Number(target.whatsappCharges) ||
              0)
        : Math.round(whatsappRate * whatsappMessages);
    const currentMonthTotal =
      softwareCharges + whatsappCharges + chatbotCharges;
    const totalAmount = currentMonthTotal + currentRec.previousDues;
    const remainingDues = Math.max(0, totalAmount - currentRec.amountPaid);
    const status =
      remainingDues === 0
        ? 'Paid'
        : currentRec.amountPaid > 0
        ? 'Partially Paid'
        : 'Unpaid';

    const updatedClient: ClientEntity = {
      ...target,
      softwareCharges,
      whatsappBillingType: billingType,
      whatsappRate: billingType === 'per_month' ? 0 : whatsappRate,
      whatsappMessages: billingType === 'per_month' ? 0 : whatsappMessages,
      whatsappCharges,
      chatbotCharges,
      monthlyRecords: {
        ...target.monthlyRecords,
        [month]: {
          ...currentRec,
          invoiceGenerated: true,
          invoiceGeneratedAt: new Date().toISOString(),
          softwareCharges,
          whatsappBillingType: billingType,
          whatsappRate: billingType === 'per_month' ? 0 : whatsappRate,
          whatsappMessages: billingType === 'per_month' ? 0 : whatsappMessages,
          whatsappCharges,
          chatbotCharges,
          currentMonthTotal,
          totalAmount,
          remainingDues,
          status,
        },
      },
    };

    const docData = buildEditableInvoiceFromClient(
      company,
      updatedClient,
      month
    );

    const newReceiptItem: GeneratedReceiptItem = {
      id: `inv-log-${Date.now()}-${clientId}`,
      clientId,
      clientName: target.name,
      clientPhone: target.phone,
      invoiceNumber:
        currentRec.invoiceNumber ||
        `INV-${String(Date.now()).slice(-4)}`,
      month,
      invoiceDate: docData.invoiceDate,
      dueDate: docData.dueDate,
      softwareCharges,
      whatsappBillingType: billingType,
      whatsappRate,
      whatsappMessages,
      whatsappCharges,
      chatbotCharges,
      previousDues: currentRec.previousDues,
      currentMonthTotal,
      totalAmount,
      amountPaid: currentRec.amountPaid,
      remainingDues,
      status,
      generatedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      invoiceNote: docData.invoiceNote,
      doc: docData,
    };

    const existingLog = (company.receiptLog || []).filter(
      (r) => !(r.clientId === clientId && r.month === month)
    );
    const updatedCompany: CompanyProfile = {
      ...company,
      receiptLog: [newReceiptItem, ...existingLog],
      receiptLogMonth: month,
    };

    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? updatedClient : c))
    );
    setCompany(updatedCompany);
    setEditorClientId(clientId);
    setSelectedMonth(month);
    setInvoiceDoc(docData);
    setActiveTab('invoice-editor');

    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await Promise.all([
          syncClientToFirestore(activeUser.uid, updatedClient, false),
          syncWorkspaceProfileToFirestore(activeUser.uid, updatedCompany),
        ]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGenerateAllMonthlyInvoices = async (
    month: string
  ): Promise<{ count: number; totalAmount: number }> => {
    const targets = clients.filter((c) => c.enabled);
    if (targets.length === 0) return { count: 0, totalAmount: 0 };

    const targetIds = new Set(targets.map((c) => c.id));
    const nowTimestamp = Date.now();
    const formattedDateNow = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const newReceiptItems: GeneratedReceiptItem[] = [];
    const updatedClientsMap = new Map<string, ClientEntity>();
    let grandTotalAmount = 0;

    for (let i = 0; i < targets.length; i++) {
      const client = targets[i];
      const currentRec = getOrComputeMonthlyRecord(client, month);
      const clientBillingType =
        client.whatsappBillingType ||
        currentRec.whatsappBillingType ||
        'per_message';

      const softwareCharges = client.softwareEnabled
        ? Number(client.softwareCharges) || 0
        : Number(currentRec.softwareCharges) || 0;
      const whatsappRate = client.whatsappEnabled
        ? Number(client.whatsappRate) || 0
        : Number(currentRec.whatsappRate) || 0;
      const whatsappMessages = client.whatsappEnabled
        ? Number(client.whatsappMessages) || 0
        : Number(currentRec.whatsappMessages) || 0;
      const whatsappCharges = client.whatsappEnabled
        ? clientBillingType === 'per_month'
          ? Number(client.whatsappCharges) || 0
          : Math.round(whatsappRate * whatsappMessages)
        : Number(currentRec.whatsappCharges) || 0;
      const chatbotCharges = client.chatbotEnabled
        ? Number(client.chatbotCharges) || 0
        : Number(currentRec.chatbotCharges) || 0;

      const currentMonthTotal =
        softwareCharges + whatsappCharges + chatbotCharges;
      const totalAmount = currentMonthTotal + currentRec.previousDues;
      const remainingDues = Math.max(0, totalAmount - currentRec.amountPaid);
      const status =
        remainingDues === 0
          ? 'Paid'
          : currentRec.amountPaid > 0
          ? 'Partially Paid'
          : 'Unpaid';

      grandTotalAmount += totalAmount;

      const updatedClient: ClientEntity = {
        ...client,
        softwareCharges,
        whatsappBillingType: clientBillingType,
        whatsappRate,
        whatsappMessages,
        whatsappCharges,
        chatbotCharges,
        monthlyRecords: {
          ...client.monthlyRecords,
          [month]: {
            ...currentRec,
            invoiceGenerated: true,
            invoiceGeneratedAt: new Date().toISOString(),
            softwareCharges,
            whatsappBillingType: clientBillingType,
            whatsappRate,
            whatsappMessages,
            whatsappCharges,
            chatbotCharges,
            currentMonthTotal,
            totalAmount,
            remainingDues,
            status,
          },
        },
      };

      updatedClientsMap.set(client.id, updatedClient);

      const docData = buildEditableInvoiceFromClient(
        company,
        updatedClient,
        month
      );

      const newReceiptItem: GeneratedReceiptItem = {
        id: `inv-log-${nowTimestamp}-${client.id}`,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        invoiceNumber:
          currentRec.invoiceNumber || `INV-${String(i + 1).padStart(3, '0')}`,
        month,
        invoiceDate: docData.invoiceDate,
        dueDate: docData.dueDate,
        softwareCharges,
        whatsappBillingType: clientBillingType,
        whatsappRate,
        whatsappMessages,
        whatsappCharges,
        chatbotCharges,
        previousDues: currentRec.previousDues,
        currentMonthTotal,
        totalAmount,
        amountPaid: currentRec.amountPaid,
        remainingDues,
        status,
        generatedAt: formattedDateNow,
        doc: docData,
      };

      newReceiptItems.push(newReceiptItem);
    }

    const nextClients = clients.map((c) =>
      updatedClientsMap.has(c.id) ? updatedClientsMap.get(c.id)! : c
    );

    const existingLog = (company.receiptLog || []).filter(
      (r) => !(targetIds.has(r.clientId) && r.month === month)
    );

    const updatedCompany: CompanyProfile = {
      ...company,
      receiptLog: [...newReceiptItems, ...existingLog],
      receiptLogMonth: month,
    };

    setClients(nextClients);
    setCompany(updatedCompany);

    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        const clientSyncPromises = Array.from(updatedClientsMap.values()).map(
          (c) => syncClientToFirestore(activeUser.uid, c, false)
        );
        await Promise.all([
          ...clientSyncPromises,
          syncWorkspaceProfileToFirestore(activeUser.uid, updatedCompany),
        ]);
      } catch (err) {
        console.error(err);
      }
    }

    return {
      count: targets.length,
      totalAmount: grandTotalAmount,
    };
  };

  const handleDeleteInvoice = async (clientId: string, month: string) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target) return;

    const currentRec = getOrComputeMonthlyRecord(target, month);
    const updatedClient: ClientEntity = {
      ...target,
      monthlyRecords: {
        ...target.monthlyRecords,
        [month]: {
          ...currentRec,
          invoiceGenerated: false,
          invoiceGeneratedAt: undefined,
          softwareCharges: 0,
          whatsappMessages: 0,
          whatsappCharges: 0,
          chatbotCharges: 0,
          currentMonthTotal: 0,
          totalAmount: currentRec.previousDues,
          amountPaid: 0,
          remainingDues: currentRec.previousDues,
          status: currentRec.previousDues === 0 ? 'Paid' : 'Unpaid',
          payments: [],
        },
      },
    };

    const updatedReceipts = (company.receiptLog || []).filter(
      (r) => !(r.clientId === clientId && r.month === month)
    );
    const updatedCompany: CompanyProfile = {
      ...company,
      receiptLog: updatedReceipts,
    };

    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? updatedClient : c))
    );
    setCompany(updatedCompany);

    if (editorClientId === clientId && selectedMonth === month) {
      setInvoiceDoc(
        buildEditableInvoiceFromClient(company, updatedClient, month)
      );
    }

    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await Promise.all([
          syncClientToFirestore(activeUser.uid, updatedClient, false),
          syncWorkspaceProfileToFirestore(activeUser.uid, updatedCompany),
        ]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteInvoiceFromLog = async (
    logId: string,
    resetClientMonthLedger?: boolean,
    clientId?: string,
    month?: string
  ) => {
    const updatedReceipts = (company.receiptLog || []).filter(
      (r) => r.id !== logId
    );
    const updatedCompany: CompanyProfile = {
      ...company,
      receiptLog: updatedReceipts,
    };
    setCompany(updatedCompany);

    let updatedClient: ClientEntity | null = null;
    if (resetClientMonthLedger && clientId && month) {
      const target = clients.find((c) => c.id === clientId);
      if (target) {
        const currentRec = getOrComputeMonthlyRecord(target, month);
        updatedClient = {
          ...target,
          monthlyRecords: {
            ...target.monthlyRecords,
            [month]: {
              ...currentRec,
              invoiceGenerated: false,
              invoiceGeneratedAt: undefined,
              softwareCharges: 0,
              whatsappMessages: 0,
              whatsappCharges: 0,
              chatbotCharges: 0,
              currentMonthTotal: 0,
              totalAmount: currentRec.previousDues,
              amountPaid: 0,
              remainingDues: currentRec.previousDues,
              status: currentRec.previousDues === 0 ? 'Paid' : 'Unpaid',
              payments: [],
            },
          },
        };
        setClients((prev) =>
          prev.map((c) => (c.id === clientId ? updatedClient! : c))
        );

        if (editorClientId === clientId && selectedMonth === month) {
          setInvoiceDoc(
            buildEditableInvoiceFromClient(company, updatedClient, month)
          );
        }
      }
    }

    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await Promise.all([
          syncWorkspaceProfileToFirestore(activeUser.uid, updatedCompany),
          updatedClient
            ? syncClientToFirestore(activeUser.uid, updatedClient, false)
            : Promise.resolve(),
        ]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOpenInvoiceInEditor = (
    clientId: string,
    month: string,
    doc?: InvoiceEditableDocument
  ) => {
    setEditorClientId(clientId);
    setSelectedMonth(month);
    if (doc) {
      setInvoiceDoc({
        ...doc,
        logoDataUrl: resolveActiveLogoUrl(
          doc.logoDataUrl || company.logoDataUrl
        ),
        companyName: doc.companyName || company.name || 'Your Company Name',
        companyTagline: doc.companyTagline || company.tagline,
        companyPhone: doc.companyPhone || company.phone,
        companyEmail: doc.companyEmail || company.email,
        companyWebsite: doc.companyWebsite || company.website,
        qrCodes:
          doc.qrCodes && doc.qrCodes.length > 0
            ? doc.qrCodes
            : company.qrCodes,
        qrCodeDataUrl: doc.qrCodeDataUrl || company.qrCodeDataUrl,
        invoiceNote: doc.invoiceNote ?? company.defaultInvoiceNote ?? '',
      });
    } else {
      const target = clients.find((c) => c.id === clientId);
      if (target) {
        setInvoiceDoc(buildEditableInvoiceFromClient(company, target, month));
      }
    }
    setActiveTab('invoice-editor');
  };

  const handleClearInvoiceLog = async (month?: string) => {
    const updatedReceipts = month
      ? (company.receiptLog || []).filter((r) => r.month !== month)
      : [];
    const updatedCompany: CompanyProfile = {
      ...company,
      receiptLog: updatedReceipts,
    };
    setCompany(updatedCompany);

    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await syncWorkspaceProfileToFirestore(activeUser.uid, updatedCompany);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleClientEnabled = async (clientId: string) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target) return;
    const updated: ClientEntity = { ...target, enabled: !target.enabled };
    setClients((prev) => prev.map((c) => (c.id === clientId ? updated : c)));
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await syncClientToFirestore(activeUser.uid, updated, false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const remaining = clients.filter((c) => c.id !== clientId);
    setClients(remaining);
    if (editorClientId === clientId) {
      const nextClient = remaining[0];
      setEditorClientId(nextClient?.id || '');
      setInvoiceDoc(
        buildEditableInvoiceFromClient(company, nextClient, selectedMonth)
      );
    }
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await deleteClientFromFirestore(activeUser.uid, clientId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddExpense = async (expense: ExpenseItem) => {
    setExpenses((prev) => [expense, ...prev]);
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await createExpenseInFirestore(activeUser.uid, expense);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await deleteExpenseFromFirestore(activeUser.uid, expenseId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddPartner = async (partner: PartnerItem) => {
    setPartners((prev) => [...prev, partner]);
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await syncPartnerToFirestore(activeUser.uid, partner, true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTogglePartnerPaid = async (partnerId: string, month: string) => {
    const target = partners.find((p) => p.id === partnerId);
    if (!target) return;

    const currentlyPaid = Boolean(target.paidMonths[month]?.paid);
    const nextPaid = !currentlyPaid;
    const autoExpenseId = `exp-partner-${partnerId}-${month.replace(
      /\s+/g,
      '-'
    )}`;

    const updatedPartner: PartnerItem = {
      ...target,
      paidMonths: {
        ...target.paidMonths,
        [month]: {
          paid: nextPaid,
          paidDate: nextPaid ? `15 ${month}` : undefined,
          expenseId: nextPaid ? autoExpenseId : undefined,
        },
      },
    };

    setPartners((prev) =>
      prev.map((p) => (p.id === partnerId ? updatedPartner : p))
    );

    const activeUser = firebaseUser || auth.currentUser;
    if (nextPaid) {
      const partnerSchools = clients
        .filter((c) => c.enabled)
        .map((c) => getOrComputeMonthlyRecord(c, month))
        .filter((r) => r.partnerId === partnerId && r.partnerPaymentEnabled);
      const schoolsCut = partnerSchools.reduce(
        (sum, r) => sum + (r.partnerTotalPayment || 0),
        0
      );
      const payoutAmount =
        schoolsCut > 0 ? schoolsCut : target.monthlyPayment;

      const partnerExpense: ExpenseItem = {
        id: autoExpenseId,
        description: `Partner Payout — ${target.name}`,
        amount: payoutAmount,
        category: 'Partner Payout',
        date: `15 ${month}`,
        month,
        partnerId: target.id,
        partnerName: target.name,
      };
      setExpenses((prev) => [
        partnerExpense,
        ...prev.filter((e) => e.id !== autoExpenseId),
      ]);
      if (activeUser) {
        try {
          await createExpenseInFirestore(activeUser.uid, partnerExpense);
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      setExpenses((prev) => prev.filter((e) => e.id !== autoExpenseId));
      if (activeUser) {
        try {
          await deleteExpenseFromFirestore(activeUser.uid, autoExpenseId);
        } catch (err) {
          console.error(err);
        }
      }
    }

    if (activeUser) {
      try {
        await syncPartnerToFirestore(activeUser.uid, updatedPartner, false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== partnerId));
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await deletePartnerFromFirestore(activeUser.uid, partnerId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSelectEditorClientAndMonth = (
    clientId: string,
    month: string
  ) => {
    setEditorClientId(clientId);
    setSelectedMonth(month);
    const client = clients.find((c) => c.id === clientId) || clients[0];
    setInvoiceDoc(buildEditableInvoiceFromClient(company, client, month));
  };

  const handleQuickDownloadInvoice = (clientId: string, month: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const docData = buildEditableInvoiceFromClient(company, client, month);
    downloadInvoicePdfWithClientName(docData, company.currency || 'Rs.');
  };

  const handleQuickPrintInvoice = (clientId: string, month: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const docData = buildEditableInvoiceFromClient(company, client, month);
    printInvoiceDocument(docData, company.currency || 'Rs.');
  };

  const handleQuickWhatsAppInvoice = async (
    clientId: string,
    month: string
  ) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    setEditorClientId(clientId);
    setSelectedMonth(month);
    const docData = buildEditableInvoiceFromClient(company, client, month);
    setInvoiceDoc(docData);
    const res = await prepareWhatsAppPdfShare(
      docData,
      company.currency || 'Rs.'
    );
    if (!res.sharedNatively) {
      const link = document.createElement('a');
      link.href = res.whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Render Auth / Onboarding Flow first
  if (authScreenMode !== 'app') {
    return (
      <AuthAndOnboarding
        mode={authScreenMode}
        setMode={setAuthScreenMode}
        company={company}
        onSaveCompanySetup={async (updated) => {
          isSigningUpRef.current = false;
          await handleUpdateCompany(updated);
        }}
        onLogin={async (email, password, rememberMe) => {
          isSigningUpRef.current = false;
          // Clear any previous state before authenticating
          setCompany({
            ...INITIAL_COMPANY_PROFILE,
            email: email.trim(),
            logoDataUrl: DEFAULT_BRAND_LOGO_DATA_URL,
          });
          setClients([]);
          setExpenses([]);
          setPartners([]);
          setEditorClientId('');

          const user = await signInWithEmailPassword(
            email,
            password,
            rememberMe
          );
          try {
            sessionStorage.setItem(SESSION_UID_KEY, user.uid);
          } catch {
            // ignore
          }
          setFirebaseUser(user);
          const loaded = await loadOrBootstrapWorkspace(
            user,
            {
              ...INITIAL_COMPANY_PROFILE,
              email: email.trim(),
              logoDataUrl: DEFAULT_BRAND_LOGO_DATA_URL,
            },
            INITIAL_CLIENTS,
            INITIAL_EXPENSES,
            INITIAL_PARTNERS
          );
          setCompany(loaded.company);
          setClients(loaded.clients);
          setExpenses(loaded.expenses);
          setPartners(loaded.partners);
          setActiveTab('dashboard');
          setAuthScreenMode('app');
        }}
        onSignUp={async (fullName, email, password) => {
          isSigningUpRef.current = true;
          const initialProfile: CompanyProfile = {
            ...INITIAL_COMPANY_PROFILE,
            email: email.trim(),
            logoDataUrl: DEFAULT_BRAND_LOGO_DATA_URL,
          };
          setCompany(initialProfile);
          setClients([]);
          setExpenses([]);
          setPartners([]);
          setEditorClientId('');

          const user = await signUpWithEmailPassword(
            fullName,
            email,
            password,
            initialProfile
          );
          try {
            sessionStorage.setItem(SESSION_UID_KEY, user.uid);
          } catch {
            // ignore
          }
          setFirebaseUser(user);
          setCompany(initialProfile);
          setClients([]);
          setExpenses([]);
          setPartners([]);
          setActiveTab('dashboard');
          setAuthScreenMode('company-setup');
        }}
      />
    );
  }

  const navItems: {
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'add-client', label: `Add ${term.singular}`, icon: UserPlus },
    { id: 'check-balance', label: 'Check & Balance', icon: CheckSquare },
    {
      id: 'school-charges-list',
      label: `${term.plural} & Partner Cuts`,
      icon: FileSpreadsheet,
    },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'invoice-log', label: 'Invoice Log', icon: ScrollText },
    { id: 'invoice-editor', label: 'Invoice Editor', icon: Edit3 },
    { id: 'partners', label: 'Partners', icon: Users },
    { id: 'finance-report', label: 'Finance Report', icon: BarChart3 },
    {
      id: 'enable-disable',
      label: `Enable / Disable ${term.singular}`,
      icon: ToggleLeft,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Collapsible & Scrollable Deep-Navy Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-out shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left"
          >
            <img
              src={resolveActiveLogoUrl(company.logoDataUrl)}
              alt={company.name || 'InvoicePro Logo'}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shrink-0"
            />
            {!sidebarCollapsed && (
              <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap truncate max-w-[140px]">
                {company.name || 'InvoicePro'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Collapse / Expand & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-1.5 shrink-0">
          <button
            type="button"
            onClick={async () => {
              isSigningUpRef.current = false;
              if (noteSyncTimeoutRef.current) {
                clearTimeout(noteSyncTimeoutRef.current);
                noteSyncTimeoutRef.current = null;
              }
              const activeUser = firebaseUser || auth.currentUser;
              const toSync = pendingSyncRef.current;
              pendingSyncRef.current = {};
              if (activeUser && (toSync.client || toSync.company)) {
                try {
                  await Promise.all([
                    toSync.client
                      ? syncClientToFirestore(
                          activeUser.uid,
                          toSync.client,
                          false
                        )
                      : Promise.resolve(),
                    toSync.company
                      ? syncWorkspaceProfileToFirestore(
                          activeUser.uid,
                          toSync.company
                        )
                      : Promise.resolve(),
                  ]);
                } catch {
                  // ignore sync error before signout
                }
              }
              try {
                sessionStorage.removeItem(SESSION_UID_KEY);
              } catch {
                // ignore
              }
              try {
                await signOutFirebaseUser();
              } catch {
                // ignore sign out error
              }
              setFirebaseUser(null);
              setCompany({
                ...INITIAL_COMPANY_PROFILE,
                logoDataUrl: DEFAULT_BRAND_LOGO_DATA_URL,
              });
              setClients(INITIAL_CLIENTS);
              setExpenses(INITIAL_EXPENSES);
              setPartners(INITIAL_PARTNERS);
              setEditorClientId('');
              setActiveTab('dashboard');
              setAuthScreenMode('login');
            }}
            title="Log Out"
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Logout</span>}
          </button>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden md:flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Bar Contract: 3 Clean Zones */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Zone 1: Mobile Menu Trigger + Welcome Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
              Welcome{company.name ? `, ${company.name}` : ''}
            </span>
          </div>

          {/* Zone 2: Quick Top Navigation Links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'dashboard' ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('check-balance')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'check-balance'
                  ? 'text-blue-600 font-semibold'
                  : ''
              }`}
            >
              Check &amp; Balance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'text-blue-600 font-semibold'
                  : ''
              }`}
            >
              Invoices
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoice-log')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'invoice-log'
                  ? 'text-blue-600 font-semibold'
                  : ''
              }`}
            >
              Invoice Log ({company.receiptLog?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoice-editor')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'invoice-editor'
                  ? 'text-blue-600 font-semibold'
                  : ''
              }`}
            >
              Invoice Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('finance-report')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
                activeTab === 'finance-report'
                  ? 'text-blue-600 font-semibold'
                  : ''
              }`}
            >
              Finance Report
            </button>
          </nav>

          {/* Zone 3: Dynamic Terminology Category Selector + Company Setup */}
          <div className="flex items-center gap-2.5 shrink-0">
            <select
              aria-label="Software Category"
              value={company.category}
              onChange={(e) => {
                const newCat = e.target.value as SoftwareCategory;
                handleUpdateCompany({
                  ...company,
                  category: newCat,
                  tagline: CATEGORY_MAP[newCat].tagline,
                });
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-600 focus:outline-none"
              title="Dynamically switch Software Category terminology across the entire app"
            >
              <option value="School Management">School Management</option>
              <option value="Store Management">Store Management</option>
              <option value="Hospital Management">Hospital Management</option>
              <option value="Restaurant Management">
                Restaurant Management
              </option>
              <option value="Other">Other ({term.singular})</option>
            </select>

            <button
              type="button"
              onClick={() => setAuthScreenMode('company-setup')}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Company Setup
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {(activeTab === 'dashboard' ||
            activeTab === 'add-client' ||
            activeTab === 'check-balance' ||
            activeTab === 'invoices') && (
            <ClientBillingViews
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              company={company}
              term={term}
              clients={clients}
              partners={partners}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              monthlyRevenue={monthlyRevenue}
              monthlyExpenses={monthlyExpenses}
              partnerPayoutsTotal={partnerPayoutsTotal}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
              onRecordPaymentWithCharges={handleRecordPaymentWithCharges}
              onGenerateInvoiceWithCharges={handleGenerateInvoiceWithCharges}
              onQuickDownloadInvoice={handleQuickDownloadInvoice}
              onQuickPrintInvoice={handleQuickPrintInvoice}
              onQuickWhatsAppInvoice={handleQuickWhatsAppInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onGenerateAllMonthlyInvoices={handleGenerateAllMonthlyInvoices}
            />
          )}

          {activeTab === 'school-charges-list' && (
            <SchoolChargesAndPartnerListView
              company={company}
              term={term}
              clients={clients}
              partners={partners}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              setActiveTab={setActiveTab}
              onOpenInvoiceEditor={(clientId, month) => {
                handleOpenInvoiceInEditor(clientId, month);
              }}
              onRecordPayment={(client) => {
                setActiveTab('check-balance');
              }}
            />
          )}

          {(activeTab === 'invoice-log' || activeTab === 'receipt-log') && (
            <InvoiceLogView
              company={company}
              term={term}
              clients={clients}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              onDeleteInvoiceFromLog={handleDeleteInvoiceFromLog}
              onClearInvoiceLog={handleClearInvoiceLog}
              onOpenInEditor={handleOpenInvoiceInEditor}
              onQuickDownloadInvoice={handleQuickDownloadInvoice}
              onQuickPrintInvoice={handleQuickPrintInvoice}
              onQuickWhatsAppInvoice={handleQuickWhatsAppInvoice}
            />
          )}

          {activeTab === 'invoice-editor' && (
            <InvoicePreviewAndEditor
              company={company}
              term={term}
              clients={clients}
              selectedClientId={editorClientId}
              selectedMonth={selectedMonth}
              onSelectClientAndMonth={handleSelectEditorClientAndMonth}
              invoiceDoc={invoiceDoc}
              onChangeInvoiceDoc={handleChangeInvoiceDoc}
              onSaveInvoiceChanges={handleSaveInvoiceChanges}
              onDeleteInvoice={handleDeleteInvoice}
              onSaveAsDefaultInvoice={handleSaveAsDefaultInvoice}
              onResetFromLedger={() =>
                handleSelectEditorClientAndMonth(editorClientId, selectedMonth)
              }
            />
          )}

          {(activeTab === 'expenses' ||
            activeTab === 'partners' ||
            activeTab === 'finance-report' ||
            activeTab === 'enable-disable' ||
            activeTab === 'settings') && (
            <FinanceAndSettingsViews
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              company={company}
              term={term}
              clients={clients}
              expenses={expenses}
              partners={partners}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              monthlyRevenue={monthlyRevenue}
              monthlyExpenses={monthlyExpenses}
              totalCollected={totalCollected}
              totalOutstandingDues={totalOutstandingDues}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddPartner={handleAddPartner}
              onTogglePartnerPaid={handleTogglePartnerPaid}
              onDeletePartner={handleDeletePartner}
              onToggleClientEnabled={handleToggleClientEnabled}
              onDeleteClient={handleDeleteClient}
              onUpdateCompany={handleUpdateCompany}
            />
          )}
        </main>
      </div>

      <OfflineIndicator />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 h-14 bg-white border-t border-slate-200 grid grid-cols-5 md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('check-balance')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'check-balance' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>{term.plural}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoice-editor')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'invoice-editor' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-500"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
