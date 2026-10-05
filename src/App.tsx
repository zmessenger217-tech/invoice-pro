import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ToggleLeft,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AuthAndOnboarding } from './components/AuthAndOnboarding';
import { ClientBillingViews } from './components/ClientBillingViews';
import { FinanceAndSettingsViews } from './components/FinanceAndSettingsViews';
import { InvoicePreviewAndEditor } from './components/InvoicePreviewAndEditor';
import {
  OfflineIndicator,
  PWAInstallButton,
} from './components/PWAInstallModal';
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
  signInWithGooglePopup,
  signOutFirebaseUser,
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
  InvoiceEditableDocument,
  PartnerItem,
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

const STORAGE_KEY = 'invoicepro_workspace_clean_v2';

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
      footerThankYou,
      footerTerms,
      qrLabel,
      showQrCode,
      logoDataUrl: resolveActiveLogoUrl(company.logoDataUrl),
      qrCodeDataUrl: company.qrCodeDataUrl,
      theme,
      status: 'Unpaid',
    };
  }

  const rec = getOrComputeMonthlyRecord(client, month);
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
    whatsappLabel: `WhatsApp Charges (${rec.whatsappRate} × ${rec.whatsappMessages.toLocaleString()})`,
    whatsappRate: rec.whatsappRate,
    whatsappMessages: rec.whatsappMessages,
    whatsappCharges: rec.whatsappCharges,
    chatbotLabel,
    chatbotCharges: rec.chatbotCharges,
    previousDuesLabel: rec.previousDuesLabel || 'Previous Dues',
    previousDues: rec.previousDues,
    amountPaid: rec.amountPaid,
    footerThankYou,
    footerTerms,
    qrLabel,
    showQrCode,
    logoDataUrl: resolveActiveLogoUrl(company.logoDataUrl),
    qrCodeDataUrl: company.qrCodeDataUrl,
    theme,
    status: rec.status,
  };
}

export default function App() {
  // Always start on the Login / Sign Up flow first as requested
  const [authScreenMode, setAuthScreenMode] =
    useState<AuthScreenMode>('login');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getCurrentMonthLabel()
  );

  // Remove old pre-seeded localStorage key on mount
  useEffect(() => {
    try {
      localStorage.removeItem('invoicepro_workspace_v1');
    } catch {
      // ignore
    }
  }, []);

  const [company, setCompany] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.company) {
          return {
            ...parsed.company,
            logoDataUrl:
              parsed.company.logoDataUrl &&
              !parsed.company.logoDataUrl.startsWith('/src/')
                ? parsed.company.logoDataUrl
                : DEFAULT_BRAND_LOGO_DATA_URL,
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      ...INITIAL_COMPANY_PROFILE,
      logoDataUrl: DEFAULT_BRAND_LOGO_DATA_URL,
    };
  });

  const [clients, setClients] = useState<ClientEntity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.clients)) {
          return parsed.clients;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_CLIENTS;
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.expenses)) return parsed.expenses;
      }
    } catch {
      // ignore
    }
    return INITIAL_EXPENSES;
  });

  const [partners, setPartners] = useState<PartnerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.partners)) return parsed.partners;
      }
    } catch {
      // ignore
    }
    return INITIAL_PARTNERS;
  });

  const [editorClientId, setEditorClientId] = useState<string>('');
  const [invoiceDoc, setInvoiceDoc] = useState<InvoiceEditableDocument>(() =>
    buildEditableInvoiceFromClient(
      INITIAL_COMPANY_PROFILE,
      undefined,
      getCurrentMonthLabel()
    )
  );

  // Keep invoiceDoc billingMonth, Issue Date, and Due Date dynamically synced when selectedMonth changes
  useEffect(() => {
    const client =
      clients.find((c) => c.id === editorClientId) || clients[0] || undefined;
    if (client && !editorClientId) {
      setEditorClientId(client.id);
    }
    setInvoiceDoc(buildEditableInvoiceFromClient(company, client, selectedMonth));
  }, [selectedMonth]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ company, clients, expenses, partners })
      );
    } catch {
      // ignore
    }
  }, [company, clients, expenses, partners]);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const loaded = await loadOrBootstrapWorkspace(
            user,
            company,
            clients,
            expenses,
            partners
          );
          setCompany(loaded.company);
          setClients(loaded.clients);
          setExpenses(loaded.expenses);
          setPartners(loaded.partners);
        } catch (err) {
          console.error('Error syncing workspace from Firestore:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

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

  const monthlyRevenue = useMemo(
    () =>
      activeLedgerRecords.reduce((sum, r) => sum + r.currentMonthTotal, 0),
    [activeLedgerRecords]
  );

  const totalCollected = useMemo(
    () => activeLedgerRecords.reduce((sum, r) => sum + r.amountPaid, 0),
    [activeLedgerRecords]
  );

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
      theme: updated.invoiceTheme || prev.theme,
      softwareLabel: updated.defaultSoftwareLabel || prev.softwareLabel,
      chatbotLabel: updated.defaultChatbotLabel || prev.chatbotLabel,
    }));
    if (firebaseUser) {
      try {
        await syncWorkspaceProfileToFirestore(firebaseUser.uid, updated);
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
      showQrCode: docData.showQrCode,
      qrLabel: docData.qrLabel.trim() || 'Scan to Pay',
      defaultIssueDate: docData.invoiceDate.trim(),
      defaultDueDate: docData.dueDate.trim(),
      invoiceHeaderTitle: docData.headerTitle.trim() || 'INVOICE',
      invoiceHeaderNote: docData.headerNote.trim(),
      invoiceFooterThankYou:
        docData.footerThankYou.trim() || 'Thank you for your business & trust!',
      invoiceFooterTerms: docData.footerTerms.trim(),
      invoiceTheme: docData.theme,
      defaultSoftwareLabel: docData.softwareLabel.trim() || 'Software Charges',
      defaultChatbotLabel: docData.chatbotLabel.trim() || 'Chatbot Charges',
    };
    await handleUpdateCompany(updatedCompany);
  };

  const handleSaveClient = async (client: ClientEntity, isNew: boolean) => {
    setClients((prev) => {
      if (isNew) return [...prev, client];
      return prev.map((c) => (c.id === client.id ? client : c));
    });
    setEditorClientId(client.id);
    setInvoiceDoc(buildEditableInvoiceFromClient(company, client, selectedMonth));
    if (firebaseUser) {
      try {
        await syncClientToFirestore(firebaseUser.uid, client, isNew);
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
    note: string
  ) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target) return;

    const currentRec = getOrComputeMonthlyRecord(target, month);
    const whatsappCharges = Math.round(whatsappRate * whatsappMessages);
    const currentMonthTotal =
      softwareCharges + whatsappCharges + chatbotCharges;
    const totalAmount = currentMonthTotal + currentRec.previousDues;
    const newTotalPaid = Math.min(
      totalAmount,
      currentRec.amountPaid + Math.max(0, amountPaidNow)
    );
    const newRemaining = Math.max(0, totalAmount - newTotalPaid);
    const newStatus =
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
      whatsappRate,
      whatsappMessages,
      whatsappCharges,
      chatbotCharges,
      monthlyRecords: {
        ...target.monthlyRecords,
        [month]: {
          ...currentRec,
          softwareCharges,
          whatsappRate,
          whatsappMessages,
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

    if (editorClientId === clientId) {
      setInvoiceDoc(
        buildEditableInvoiceFromClient(company, updatedClient, month)
      );
    }

    if (firebaseUser) {
      try {
        await syncClientToFirestore(firebaseUser.uid, updatedClient, false);
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
    const whatsappCharges = Math.round(whatsappRate * whatsappMessages);
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
      whatsappRate,
      whatsappMessages,
      whatsappCharges,
      chatbotCharges,
      monthlyRecords: {
        ...target.monthlyRecords,
        [month]: {
          ...currentRec,
          softwareCharges,
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

    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? updatedClient : c))
    );
    setEditorClientId(clientId);
    setSelectedMonth(month);
    setInvoiceDoc(
      buildEditableInvoiceFromClient(company, updatedClient, month)
    );
    setActiveTab('invoice-editor');

    if (firebaseUser) {
      try {
        await syncClientToFirestore(firebaseUser.uid, updatedClient, false);
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
    if (firebaseUser) {
      try {
        await syncClientToFirestore(firebaseUser.uid, updated, false);
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
    if (firebaseUser) {
      try {
        await deleteClientFromFirestore(firebaseUser.uid, clientId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddExpense = async (expense: ExpenseItem) => {
    setExpenses((prev) => [expense, ...prev]);
    if (firebaseUser) {
      try {
        await createExpenseInFirestore(firebaseUser.uid, expense);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    if (firebaseUser) {
      try {
        await deleteExpenseFromFirestore(firebaseUser.uid, expenseId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddPartner = async (partner: PartnerItem) => {
    setPartners((prev) => [...prev, partner]);
    if (firebaseUser) {
      try {
        await syncPartnerToFirestore(firebaseUser.uid, partner, true);
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

    if (nextPaid) {
      const partnerExpense: ExpenseItem = {
        id: autoExpenseId,
        description: `Partner Payout — ${target.name}`,
        amount: target.monthlyPayment,
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
      if (firebaseUser) {
        try {
          await createExpenseInFirestore(firebaseUser.uid, partnerExpense);
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      setExpenses((prev) => prev.filter((e) => e.id !== autoExpenseId));
      if (firebaseUser) {
        try {
          await deleteExpenseFromFirestore(firebaseUser.uid, autoExpenseId);
        } catch (err) {
          console.error(err);
        }
      }
    }

    if (firebaseUser) {
      try {
        await syncPartnerToFirestore(firebaseUser.uid, updatedPartner, false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== partnerId));
    if (firebaseUser) {
      try {
        await deletePartnerFromFirestore(firebaseUser.uid, partnerId);
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
        onSaveCompanySetup={handleUpdateCompany}
        onGoogleLogin={async () => {
          await signInWithGooglePopup();
          if (!company.name) {
            setAuthScreenMode('company-setup');
          } else {
            setAuthScreenMode('app');
          }
        }}
        onEmailAuthComplete={(email, isSignUp) => {
          if (isSignUp || !company.name) {
            setCompany((prev) => ({
              ...prev,
              email: prev.email || email,
            }));
            setAuthScreenMode('company-setup');
          } else {
            setAuthScreenMode('app');
          }
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
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'invoice-editor', label: 'Invoice Editor', icon: Edit3 },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
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
          <PWAInstallButton
            company={company}
            onUpdateCompany={handleUpdateCompany}
            variant="sidebar"
            collapsed={sidebarCollapsed}
          />

          <button
            type="button"
            onClick={() => {
              if (firebaseUser) {
                signOutFirebaseUser();
              }
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

          {/* Zone 3: Dynamic Terminology Category Selector + Download WebApp + Company Setup */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton
              company={company}
              onUpdateCompany={handleUpdateCompany}
              variant="topbar"
            />

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
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              monthlyRevenue={monthlyRevenue}
              monthlyExpenses={monthlyExpenses}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
              onRecordPaymentWithCharges={handleRecordPaymentWithCharges}
              onGenerateInvoiceWithCharges={handleGenerateInvoiceWithCharges}
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
              onChangeInvoiceDoc={setInvoiceDoc}
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
