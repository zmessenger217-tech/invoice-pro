import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  initializeFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { getCurrentMonthLabel } from './data/initialData';
import {
  ClientEntity,
  CompanyProfile,
  ExpenseItem,
  GeneratedReceiptItem,
  InvoiceTheme,
  PartnerItem,
  PaymentQrCodeItem,
  SoftwareCategory,
} from './types';
import {
  DEFAULT_BRAND_LOGO_DATA_URL,
  resolveActiveLogoUrl,
} from './utils/usePWAInstall';

// Silence internal @firebase/firestore WebChannel transport retry console.error spam in iframe environments
setLogLevel('silent');

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await getDocFromServer(
      doc(db, 'workspaces', sanitizeId(auth.currentUser.uid))
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Defensive payload sanitizers matching firebase-blueprint.json maxLength and pattern constraints
function clampString(
  val: string | undefined,
  maxLen: number,
  fallback = ''
): string {
  const clean = (val ?? fallback).trim();
  if (clean.length === 0 && fallback.length > 0) {
    return fallback.slice(0, maxLen);
  }
  return clean.slice(0, maxLen);
}

/**
 * Recursively strips keys with `undefined` values so Firestore setDoc/updateDoc never fails
 * with "Unsupported field value: undefined".
 */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || 'item-1';
}

export async function compressImageDataUrl(
  dataUrl: string | undefined,
  maxDim = 220
): Promise<string | undefined> {
  if (!dataUrl) return undefined;
  if (dataUrl === DEFAULT_BRAND_LOGO_DATA_URL) return undefined;
  if (!dataUrl.startsWith('data:image/')) return undefined;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || maxDim) * scale));
        const height = Math.max(1, Math.round((img.height || maxDim) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl.slice(0, 90000));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngData = canvas.toDataURL('image/png');
        if (pngData.length <= 95000) {
          resolve(pngData);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch {
        resolve(dataUrl.length <= 120000 ? dataUrl : undefined);
      }
    };
    img.onerror = () => resolve(dataUrl.length <= 120000 ? dataUrl : undefined);
    img.src = dataUrl;
  });
}

function buildSettingsMap(company: CompanyProfile): Record<string, unknown> {
  const customLogo =
    company.logoDataUrl &&
    company.logoDataUrl.startsWith('data:image/') &&
    company.logoDataUrl !== DEFAULT_BRAND_LOGO_DATA_URL &&
    company.logoDataUrl.length <= 160000
      ? company.logoDataUrl
      : '';

  const customQr =
    company.qrCodeDataUrl &&
    company.qrCodeDataUrl.startsWith('data:image/') &&
    company.qrCodeDataUrl.length <= 160000
      ? company.qrCodeDataUrl
      : '';

  const sanitizedQrCodes = Array.isArray(company.qrCodes)
    ? company.qrCodes.slice(0, 12).map((qr, idx) => ({
        id: clampString(qr.id, 60, `qr-${idx + 1}`),
        label: clampString(qr.label || qr.bankName, 80, 'Scan to Pay'),
        bankName: clampString(qr.bankName || qr.label, 80, ''),
        accountTitle: clampString(qr.accountTitle, 80, ''),
        accountNumber: clampString(qr.accountNumber, 80, ''),
        dataUrl:
          typeof qr.dataUrl === 'string' && qr.dataUrl.length <= 160000
            ? qr.dataUrl
            : '',
      }))
    : [];

  // Invoice & Receipt log stores generated invoices with itemized software, chatbot charges, and invoiceNote
  const activeMonth =
    company.receiptLogMonth || getCurrentMonthLabel();
  const currentMonthReceipts = Array.isArray(company.receiptLog)
    ? company.receiptLog
        .slice(-200) // keep last 200 receipts
        .map((r) => {
          const noteStr = clampString(
            r.invoiceNote ?? r.doc?.invoiceNote,
            500,
            ''
          );
          const rawDoc = (r.doc || {}) as unknown as Record<string, unknown>;
          const {
            logoDataUrl: _logo,
            qrCodeDataUrl: _qr,
            qrCodes: _qrs,
            ...cleanDocRest
          } = rawDoc;

          return stripUndefinedDeep({
            id: clampString(r.id, 60, `rcp-${Date.now()}`),
            clientId: clampString(r.clientId, 60, ''),
            clientName: clampString(r.clientName, 120, 'Client'),
            clientPhone: clampString(r.clientPhone || '', 40, ''),
            invoiceNumber: clampString(r.invoiceNumber, 40, 'INV-001'),
            month: clampString(r.month, 40, activeMonth),
            invoiceDate: clampString(r.invoiceDate, 40, ''),
            dueDate: clampString(r.dueDate, 40, ''),
            softwareCharges: Number(r.softwareCharges) || 0,
            whatsappBillingType: r.whatsappBillingType || 'per_message',
            whatsappRate: Number(r.whatsappRate) || 0,
            whatsappMessages: Number(r.whatsappMessages) || 0,
            whatsappCharges: Number(r.whatsappCharges) || 0,
            chatbotCharges: Number(r.chatbotCharges) || 0,
            previousDues: Number(r.previousDues) || 0,
            currentMonthTotal: Number(r.currentMonthTotal) || 0,
            totalAmount: Number(r.totalAmount) || 0,
            amountPaid: Number(r.amountPaid) || 0,
            remainingDues: Number(r.remainingDues) || 0,
            status: r.status || 'Unpaid',
            generatedAt: clampString(r.generatedAt, 60, ''),
            invoiceNote: noteStr,
            doc: {
              ...cleanDocRest,
              invoiceNote: noteStr,
            },
          });
        })
    : [];

  return stripUndefinedDeep({
    customSingular: clampString(company.customSingular, 60, ''),
    customPlural: clampString(company.customPlural, 60, ''),
    showQrCode: company.showQrCode !== false,
    qrLabel: clampString(company.qrLabel, 80, 'Scan to Pay'),
    defaultIssueDate: clampString(company.defaultIssueDate, 40, ''),
    defaultDueDate: clampString(company.defaultDueDate, 40, ''),
    invoiceHeaderTitle: clampString(company.invoiceHeaderTitle, 60, 'INVOICE'),
    invoiceHeaderNote: clampString(
      company.invoiceHeaderNote,
      200,
      'Official Monthly Software & Communication Billing Statement'
    ),
    defaultInvoiceNote: clampString(company.defaultInvoiceNote, 500, ''),
    invoiceFooterThankYou: clampString(
      company.invoiceFooterThankYou,
      160,
      'Thank you for your business & trust!'
    ),
    invoiceFooterTerms: clampString(
      company.invoiceFooterTerms,
      300,
      'Please remit payment by the due date via Bank Transfer or scan the QR code to pay online.'
    ),
    invoiceTheme: clampString(company.invoiceTheme, 40, 'royal-blue'),
    defaultSoftwareLabel: clampString(
      company.defaultSoftwareLabel,
      80,
      'Software Charges'
    ),
    defaultChatbotLabel: clampString(
      company.defaultChatbotLabel,
      80,
      'Chatbot Charges'
    ),
    logoDataUrl: customLogo,
    qrCodeDataUrl: customQr,
    qrCodes: sanitizedQrCodes,
    receiptLog: currentMonthReceipts,
    receiptLogMonth: activeMonth,
  });
}

function parseWorkspaceDocToCompany(
  wsData: Record<string, any>,
  defaultCompany: CompanyProfile
): CompanyProfile {
  const settings =
    wsData.settings && typeof wsData.settings === 'object'
      ? wsData.settings
      : {};

  const validCategories: SoftwareCategory[] = [
    'School Management',
    'Store Management',
    'Hospital Management',
    'Restaurant Management',
    'Other',
  ];
  const category: SoftwareCategory = validCategories.includes(wsData.category)
    ? wsData.category
    : defaultCompany.category || 'School Management';

  const validThemes: InvoiceTheme[] = [
    'royal-blue',
    'midnight-slate',
    'emerald-executive',
  ];
  const invoiceTheme: InvoiceTheme = validThemes.includes(settings.invoiceTheme)
    ? settings.invoiceTheme
    : defaultCompany.invoiceTheme || 'royal-blue';

  const rawName = typeof wsData.name === 'string' ? wsData.name.trim() : '';
  const resolvedName =
    rawName && rawName !== 'My Company' ? rawName : defaultCompany.name || '';

  const savedLogo =
    typeof settings.logoDataUrl === 'string' &&
    settings.logoDataUrl.startsWith('data:image/')
      ? settings.logoDataUrl
      : undefined;

  const savedQrCodes: PaymentQrCodeItem[] = Array.isArray(settings.qrCodes)
    ? settings.qrCodes.map((q: any, idx: number) => ({
        id: String(q.id || `qr-${idx + 1}`),
        label: String(q.label || q.bankName || 'Scan to Pay'),
        bankName: q.bankName ? String(q.bankName) : String(q.label || ''),
        accountTitle: q.accountTitle ? String(q.accountTitle) : undefined,
        accountNumber: q.accountNumber ? String(q.accountNumber) : undefined,
        dataUrl: String(q.dataUrl || ''),
      }))
    : [];

  const activeMonth = getCurrentMonthLabel();
  const rawReceiptLog = Array.isArray(settings.receiptLog)
    ? settings.receiptLog
    : [];
  const filteredReceiptLog: GeneratedReceiptItem[] = rawReceiptLog
    .filter((r: any) => r && typeof r === 'object')
    .map((r: any) => {
      const note =
        typeof r.invoiceNote === 'string'
          ? r.invoiceNote
          : typeof r.doc?.invoiceNote === 'string'
          ? r.doc.invoiceNote
          : '';
      return {
        ...r,
        invoiceNote: note,
        doc: r.doc
          ? {
              ...r.doc,
              invoiceNote:
                typeof r.doc.invoiceNote === 'string'
                  ? r.doc.invoiceNote
                  : note,
            }
          : r.doc,
      };
    });

  return {
    ...defaultCompany,
    name: resolvedName,
    tagline: wsData.tagline ?? defaultCompany.tagline,
    phone: wsData.phone ?? defaultCompany.phone,
    email: wsData.email ?? defaultCompany.email,
    website: wsData.website ?? defaultCompany.website,
    category,
    currency: wsData.currency || defaultCompany.currency || 'Rs.',
    customSingular:
      settings.customSingular || defaultCompany.customSingular || undefined,
    customPlural:
      settings.customPlural || defaultCompany.customPlural || undefined,
    showQrCode:
      typeof settings.showQrCode === 'boolean'
        ? settings.showQrCode
        : defaultCompany.showQrCode !== false,
    qrLabel: settings.qrLabel || defaultCompany.qrLabel || 'Scan to Pay',
    defaultIssueDate:
      settings.defaultIssueDate ?? defaultCompany.defaultIssueDate ?? '',
    defaultDueDate:
      settings.defaultDueDate ?? defaultCompany.defaultDueDate ?? '',
    invoiceHeaderTitle:
      settings.invoiceHeaderTitle ||
      defaultCompany.invoiceHeaderTitle ||
      'INVOICE',
    invoiceHeaderNote:
      settings.invoiceHeaderNote ??
      defaultCompany.invoiceHeaderNote ??
      'Official Monthly Software & Communication Billing Statement',
    defaultInvoiceNote:
      settings.defaultInvoiceNote ?? defaultCompany.defaultInvoiceNote ?? '',
    invoiceFooterThankYou:
      settings.invoiceFooterThankYou ||
      defaultCompany.invoiceFooterThankYou ||
      'Thank you for your business & trust!',
    invoiceFooterTerms:
      settings.invoiceFooterTerms ??
      defaultCompany.invoiceFooterTerms ??
      'Please remit payment by the due date via Bank Transfer or scan the QR code to pay online.',
    invoiceTheme,
    defaultSoftwareLabel:
      settings.defaultSoftwareLabel ||
      defaultCompany.defaultSoftwareLabel ||
      'Software Charges',
    defaultChatbotLabel:
      settings.defaultChatbotLabel ||
      defaultCompany.defaultChatbotLabel ||
      'Chatbot Charges',
    logoDataUrl: resolveActiveLogoUrl(savedLogo || defaultCompany.logoDataUrl),
    qrCodeDataUrl:
      typeof settings.qrCodeDataUrl === 'string' &&
      settings.qrCodeDataUrl.startsWith('data:image/')
        ? settings.qrCodeDataUrl
        : defaultCompany.qrCodeDataUrl,
    qrCodes: savedQrCodes,
    receiptLog: filteredReceiptLog,
    receiptLogMonth: activeMonth,
  };
}

export function formatFirebaseAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  const msg = error instanceof Error ? error.message : String(error);

  if (
    code === 'auth/email-already-in-use' ||
    msg.includes('EMAIL_EXISTS') ||
    msg.includes('email-already-in-use')
  ) {
    return 'An account with this email already exists. Please switch to Login to access your workspace.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    msg.includes('INVALID_LOGIN_CREDENTIALS')
  ) {
    return 'Invalid email or password. Please check your credentials or sign up if you do not have an account.';
  }
  if (code === 'auth/weak-password' || msg.includes('WEAK_PASSWORD')) {
    return 'Password is too weak. Please enter at least 6 characters.';
  }
  if (code === 'auth/invalid-email' || msg.includes('INVALID_EMAIL')) {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment or reset your password.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while connecting to Firebase. Please check your internet connection.';
  }
  return msg || 'Authentication failed. Please try again.';
}

export async function signUpWithEmailPassword(
  fullName: string,
  email: string,
  password: string,
  defaultCompany: CompanyProfile
): Promise<User> {
  if (auth.currentUser) {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
  }
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  if (fullName.trim()) {
    try {
      await updateProfile(cred.user, { displayName: fullName.trim() });
    } catch {
      // ignore profile displayName update failure
    }
  }

  // Create initial workspace document in Firestore for this specific user UID
  const cleanUid = sanitizeId(cred.user.uid);
  const workspacePath = `workspaces/${cleanUid}`;
  const workspaceRef = doc(db, 'workspaces', cleanUid);
  try {
    await setDoc(workspaceRef, {
      ownerId: cleanUid,
      name: clampString(defaultCompany.name, 120, 'My Company'),
      tagline: clampString(
        defaultCompany.tagline,
        200,
        'Smart Solutions for Better Education'
      ),
      phone: clampString(defaultCompany.phone, 40, ''),
      email: clampString(email.trim() || defaultCompany.email, 120, ''),
      website: clampString(defaultCompany.website, 120, ''),
      category: defaultCompany.category || 'School Management',
      currency: clampString(defaultCompany.currency, 10, 'Rs.'),
      settings: buildSettingsMap(defaultCompany),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, workspacePath);
  }

  return cred.user;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
  rememberMe = true
): Promise<User> {
  if (auth.currentUser) {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
  }
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence
  );
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };

async function ensureWorkspaceDocumentExists(
  cleanUid: string,
  company?: CompanyProfile
): Promise<void> {
  const workspacePath = `workspaces/${cleanUid}`;
  const workspaceRef = doc(db, 'workspaces', cleanUid);
  let snap;
  try {
    snap = await getDoc(workspaceRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, workspacePath);
  }
  if (!snap.exists()) {
    try {
      await setDoc(workspaceRef, {
        ownerId: cleanUid,
        name: clampString(company?.name, 120, 'My Company'),
        tagline: clampString(
          company?.tagline,
          200,
          'Smart Solutions for Better Education'
        ),
        phone: clampString(company?.phone, 40, ''),
        email: clampString(
          auth.currentUser?.email || company?.email,
          120,
          ''
        ),
        website: clampString(company?.website, 120, ''),
        category: company?.category || 'School Management',
        currency: clampString(company?.currency, 10, 'Rs.'),
        settings: company ? buildSettingsMap(company) : {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, workspacePath);
    }
  }
}

export function subscribeToWorkspaceRealtime(
  user: User,
  defaultCompany: CompanyProfile,
  callbacks: {
    onCompanyChange: (company: CompanyProfile) => void;
    onClientsChange: (clients: ClientEntity[]) => void;
    onExpensesChange: (expenses: ExpenseItem[]) => void;
    onPartnersChange: (partners: PartnerItem[]) => void;
  }
): () => void {
  const userId = sanitizeId(user.uid);
  const workspacePath = `workspaces/${userId}`;
  const clientsPath = `workspaces/${userId}/clients`;
  const expensesPath = `workspaces/${userId}/expenses`;
  const partnersPath = `workspaces/${userId}/partners`;

  // Test connection on boot
  void testConnection();

  const unsubWorkspace = onSnapshot(
    doc(db, 'workspaces', userId),
    (snap) => {
      if (snap.exists()) {
        const parsedCompany = parseWorkspaceDocToCompany(
          snap.data(),
          defaultCompany
        );
        callbacks.onCompanyChange(parsedCompany);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, workspacePath);
    }
  );

  const unsubClients = onSnapshot(
    query(
      collection(db, 'workspaces', userId, 'clients'),
      where('ownerId', '==', userId)
    ),
    (snap) => {
      const list: ClientEntity[] = snap.docs.map((d) => {
        const data = d.data();
        const records = (data.monthlyRecords || {}) as Record<string, any>;
        const firstRec = Object.values(records).find(
          (r) => r && typeof r === 'object'
        );
        const partnerRec =
          Object.values(records).find(
            (r) =>
              r &&
              typeof r === 'object' &&
              (r.partnerPaymentEnabled ||
                r.partnerId ||
                Number(r.partnerTotalPayment) > 0 ||
                Number(r.partnerSoftwareCharges) > 0 ||
                Number(r.partnerWhatsappCharges) > 0 ||
                Number(r.partnerChatbotCharges) > 0)
          ) || firstRec;
        const hasPerMonthRec = Object.values(records).some(
          (r) => r && typeof r === 'object' && r.whatsappBillingType === 'per_month'
        );
        return {
          id: d.id,
          name: data.name,
          address: data.address,
          phone: data.phone,
          enabled: Boolean(data.enabled),
          createdAt: '2026-01-10',
          softwareEnabled: Boolean(data.softwareEnabled),
          softwareCharges: Number(data.softwareCharges) || 0,
          whatsappEnabled: Boolean(data.whatsappEnabled),
          whatsappBillingType:
            data.whatsappBillingType === 'per_month' ||
            firstRec?.whatsappBillingType === 'per_month' ||
            hasPerMonthRec ||
            (Number(data.whatsappCharges) > 0 &&
              Number(data.whatsappRate) === 0 &&
              Number(data.whatsappMessages) === 0)
              ? 'per_month'
              : 'per_message',
          whatsappRate: Number(data.whatsappRate) || 0,
          whatsappMessages: Number(data.whatsappMessages) || 0,
          whatsappCharges: Number(data.whatsappCharges) || 0,
          chatbotEnabled: Boolean(data.chatbotEnabled),
          chatbotCharges: Number(data.chatbotCharges) || 0,
          partnerId: partnerRec?.partnerId,
          partnerName: partnerRec?.partnerName,
          partnerPaymentEnabled: partnerRec?.partnerPaymentEnabled,
          partnerSoftwareCharges: partnerRec?.partnerSoftwareCharges,
          partnerWhatsappCharges: partnerRec?.partnerWhatsappCharges,
          partnerChatbotCharges: partnerRec?.partnerChatbotCharges,
          partnerTotalPayment: partnerRec?.partnerTotalPayment,
          partnerNote: partnerRec?.partnerNote,
          monthlyRecords: data.monthlyRecords || {},
        };
      });
      callbacks.onClientsChange(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, clientsPath);
    }
  );

  const unsubExpenses = onSnapshot(
    query(
      collection(db, 'workspaces', userId, 'expenses'),
      where('ownerId', '==', userId)
    ),
    (snap) => {
      const resetFlagKey = `probill_expenses_reset_zero_v4_${userId}`;
      let alreadyReset = false;
      try {
        alreadyReset = localStorage.getItem(resetFlagKey) === 'true';
      } catch {
        alreadyReset = false;
      }

      if (!alreadyReset) {
        try {
          localStorage.setItem(resetFlagKey, 'true');
        } catch {
          // ignore
        }
        snap.docs.forEach((d) => {
          deleteDoc(doc(db, 'workspaces', userId, 'expenses', d.id)).catch(
            () => {}
          );
        });
        callbacks.onExpensesChange([]);
        return;
      }

      const list: ExpenseItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          description: data.description,
          amount: Number(data.amount) || 0,
          category: data.category,
          date: data.date,
          month: data.month,
          partnerName: data.partnerName || undefined,
        };
      });
      callbacks.onExpensesChange(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, expensesPath);
    }
  );

  const unsubPartners = onSnapshot(
    query(
      collection(db, 'workspaces', userId, 'partners'),
      where('ownerId', '==', userId)
    ),
    (snap) => {
      const list: PartnerItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          phone: data.phone,
          monthlyPayment: Number(data.monthlyPayment) || 0,
          paidMonths: data.paidMonths || {},
        };
      });
      callbacks.onPartnersChange(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, partnersPath);
    }
  );

  return () => {
    unsubWorkspace();
    unsubClients();
    unsubExpenses();
    unsubPartners();
  };
}

export async function loadOrBootstrapWorkspace(
  user: User,
  defaultCompany: CompanyProfile,
  defaultClients: ClientEntity[],
  defaultExpenses: ExpenseItem[],
  defaultPartners: PartnerItem[]
): Promise<{
  company: CompanyProfile;
  clients: ClientEntity[];
  expenses: ExpenseItem[];
  partners: PartnerItem[];
  isNewWorkspace: boolean;
}> {
  try {
    await user.getIdToken();
  } catch {
    // ignore token refresh error and proceed
  }

  const userId = sanitizeId(user.uid);
  const workspacePath = `workspaces/${userId}`;
  const workspaceRef = doc(db, 'workspaces', userId);

  await testConnection();

  let workspaceSnap;
  try {
    workspaceSnap = await getDoc(workspaceRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, workspacePath);
  }

  if (!workspaceSnap.exists()) {
    const workspacePayload = {
      ownerId: userId,
      name: clampString(defaultCompany.name, 120, 'My Company'),
      tagline: clampString(
        defaultCompany.tagline,
        200,
        'Smart Solutions for Better Education'
      ),
      phone: clampString(defaultCompany.phone, 40, ''),
      email: clampString(user.email || defaultCompany.email, 120, ''),
      website: clampString(defaultCompany.website, 120, ''),
      category: defaultCompany.category || 'School Management',
      currency: clampString(defaultCompany.currency, 10, 'Rs.'),
      settings: buildSettingsMap(defaultCompany),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(workspaceRef, workspacePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, workspacePath);
    }

    return {
      company: {
        ...defaultCompany,
        email: user.email || defaultCompany.email,
      },
      clients: defaultClients,
      expenses: defaultExpenses,
      partners: defaultPartners,
      isNewWorkspace: true,
    };
  }

  const wsData = workspaceSnap.data();
  const company = parseWorkspaceDocToCompany(wsData, defaultCompany);

  const clientsPath = `workspaces/${userId}/clients`;
  const expensesPath = `workspaces/${userId}/expenses`;
  const partnersPath = `workspaces/${userId}/partners`;

  let clients: ClientEntity[] = [];
  let expenses: ExpenseItem[] = [];
  let partners: PartnerItem[] = [];

  try {
    const cSnap = await getDocs(
      query(
        collection(db, 'workspaces', userId, 'clients'),
        where('ownerId', '==', userId)
      )
    );
    clients = cSnap.docs.map((d) => {
      const data = d.data();
      const records = (data.monthlyRecords || {}) as Record<string, any>;
      const firstRec = Object.values(records).find(
        (r) => r && typeof r === 'object'
      );
      const partnerRec =
        Object.values(records).find(
          (r) =>
            r &&
            typeof r === 'object' &&
            (r.partnerPaymentEnabled ||
              r.partnerId ||
              Number(r.partnerTotalPayment) > 0 ||
              Number(r.partnerSoftwareCharges) > 0 ||
              Number(r.partnerWhatsappCharges) > 0 ||
              Number(r.partnerChatbotCharges) > 0)
        ) || firstRec;
      const hasPerMonthRec = Object.values(records).some(
        (r) => r && typeof r === 'object' && r.whatsappBillingType === 'per_month'
      );
      return {
        id: d.id,
        name: data.name,
        address: data.address,
        phone: data.phone,
        enabled: Boolean(data.enabled),
        createdAt: '2026-01-10',
        softwareEnabled: Boolean(data.softwareEnabled),
        softwareCharges: Number(data.softwareCharges) || 0,
        whatsappEnabled: Boolean(data.whatsappEnabled),
        whatsappBillingType:
          data.whatsappBillingType === 'per_month' ||
          firstRec?.whatsappBillingType === 'per_month' ||
          hasPerMonthRec ||
          (Number(data.whatsappCharges) > 0 &&
            Number(data.whatsappRate) === 0 &&
            Number(data.whatsappMessages) === 0)
            ? 'per_month'
            : 'per_message',
        whatsappRate: Number(data.whatsappRate) || 0,
        whatsappMessages: Number(data.whatsappMessages) || 0,
        whatsappCharges: Number(data.whatsappCharges) || 0,
        chatbotEnabled: Boolean(data.chatbotEnabled),
        chatbotCharges: Number(data.chatbotCharges) || 0,
        partnerId: partnerRec?.partnerId,
        partnerName: partnerRec?.partnerName,
        partnerPaymentEnabled: partnerRec?.partnerPaymentEnabled,
        partnerSoftwareCharges: partnerRec?.partnerSoftwareCharges,
        partnerWhatsappCharges: partnerRec?.partnerWhatsappCharges,
        partnerChatbotCharges: partnerRec?.partnerChatbotCharges,
        partnerTotalPayment: partnerRec?.partnerTotalPayment,
        partnerNote: partnerRec?.partnerNote,
        monthlyRecords: data.monthlyRecords || {},
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, clientsPath);
  }

  try {
    const eSnap = await getDocs(
      query(
        collection(db, 'workspaces', userId, 'expenses'),
        where('ownerId', '==', userId)
      )
    );
    const resetFlagKey = `probill_expenses_reset_zero_v4_${userId}`;
    let alreadyReset = false;
    try {
      alreadyReset = localStorage.getItem(resetFlagKey) === 'true';
    } catch {
      alreadyReset = false;
    }

    if (!alreadyReset) {
      try {
        localStorage.setItem(resetFlagKey, 'true');
      } catch {
        // ignore
      }
      await Promise.all(
        eSnap.docs.map((d) =>
          deleteDoc(doc(db, 'workspaces', userId, 'expenses', d.id)).catch(
            () => {}
          )
        )
      );
      expenses = [];
    } else {
      expenses = eSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          description: data.description,
          amount: Number(data.amount) || 0,
          category: data.category,
          date: data.date,
          month: data.month,
          partnerName: data.partnerName || undefined,
        };
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, expensesPath);
  }

  try {
    const pSnap = await getDocs(
      query(
        collection(db, 'workspaces', userId, 'partners'),
        where('ownerId', '==', userId)
      )
    );
    partners = pSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        phone: data.phone,
        monthlyPayment: Number(data.monthlyPayment) || 0,
        paidMonths: data.paidMonths || {},
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, partnersPath);
  }

  if (partners.length === 0) {
    partners = defaultPartners;
  }

  return {
    company,
    clients,
    expenses,
    partners,
    isNewWorkspace: false,
  };
}

export async function syncWorkspaceProfileToFirestore(
  userId: string,
  company: CompanyProfile
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  const path = `workspaces/${cleanUid}`;
  const ref = doc(db, 'workspaces', cleanUid);

  const compressedLogo = await compressImageDataUrl(company.logoDataUrl, 180);
  const compressedQr = await compressImageDataUrl(company.qrCodeDataUrl, 240);
  const compressedQrCodes: PaymentQrCodeItem[] = Array.isArray(company.qrCodes)
    ? await Promise.all(
        company.qrCodes.map(async (qr) => {
          const compUrl = qr.dataUrl
            ? await compressImageDataUrl(qr.dataUrl, 240)
            : '';
          return {
            ...qr,
            dataUrl: compUrl || qr.dataUrl || '',
          };
        })
      )
    : [];

  const sanitizedCompany: CompanyProfile = {
    ...company,
    logoDataUrl: compressedLogo || company.logoDataUrl,
    qrCodeDataUrl:
      compressedQrCodes[0]?.dataUrl || compressedQr || company.qrCodeDataUrl,
    qrCodes: compressedQrCodes,
  };

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: cleanUid,
        name: clampString(sanitizedCompany.name, 120, 'My Company'),
        tagline: clampString(sanitizedCompany.tagline, 200, ''),
        phone: clampString(sanitizedCompany.phone, 40, ''),
        email: clampString(sanitizedCompany.email, 120, ''),
        website: clampString(sanitizedCompany.website, 120, ''),
        category: sanitizedCompany.category || 'School Management',
        currency: clampString(sanitizedCompany.currency, 10, 'Rs.'),
        settings: buildSettingsMap(sanitizedCompany),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: clampString(sanitizedCompany.name, 120, 'My Company'),
        tagline: clampString(sanitizedCompany.tagline, 200, ''),
        phone: clampString(sanitizedCompany.phone, 40, ''),
        email: clampString(sanitizedCompany.email, 120, ''),
        website: clampString(sanitizedCompany.website, 120, ''),
        category: sanitizedCompany.category || 'School Management',
        currency: clampString(sanitizedCompany.currency, 10, 'Rs.'),
        settings: buildSettingsMap(sanitizedCompany),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      !snap.exists() ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function syncClientToFirestore(
  userId: string,
  client: ClientEntity,
  isCreate: boolean
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  await ensureWorkspaceDocumentExists(cleanUid);

  const cleanClientId = sanitizeId(client.id);
  const path = `workspaces/${cleanUid}/clients/${cleanClientId}`;
  const ref = doc(db, 'workspaces', cleanUid, 'clients', cleanClientId);

  let shouldCreate = isCreate;
  if (!isCreate) {
    try {
      const snap = await getDoc(ref);
      shouldCreate = !snap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  const cleanMonthlyRecords = stripUndefinedDeep(client.monthlyRecords || {});

  try {
    if (shouldCreate) {
      await setDoc(ref, {
        ownerId: cleanUid,
        name: clampString(client.name, 120, 'Client'),
        address: clampString(client.address, 250, ''),
        phone: clampString(client.phone, 40, ''),
        enabled: Boolean(client.enabled),
        softwareEnabled: Boolean(client.softwareEnabled),
        softwareCharges: Math.max(0, Number(client.softwareCharges) || 0),
        whatsappEnabled: Boolean(client.whatsappEnabled),
        whatsappBillingType:
          client.whatsappBillingType === 'per_month'
            ? 'per_month'
            : 'per_message',
        whatsappRate: Math.max(0, Number(client.whatsappRate) || 0),
        whatsappMessages: Math.max(0, Number(client.whatsappMessages) || 0),
        whatsappCharges: Math.max(0, Number(client.whatsappCharges) || 0),
        chatbotEnabled: Boolean(client.chatbotEnabled),
        chatbotCharges: Math.max(0, Number(client.chatbotCharges) || 0),
        monthlyRecords: cleanMonthlyRecords,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: clampString(client.name, 120, 'Client'),
        address: clampString(client.address, 250, ''),
        phone: clampString(client.phone, 40, ''),
        enabled: Boolean(client.enabled),
        softwareEnabled: Boolean(client.softwareEnabled),
        softwareCharges: Math.max(0, Number(client.softwareCharges) || 0),
        whatsappEnabled: Boolean(client.whatsappEnabled),
        whatsappBillingType:
          client.whatsappBillingType === 'per_month'
            ? 'per_month'
            : 'per_message',
        whatsappRate: Math.max(0, Number(client.whatsappRate) || 0),
        whatsappMessages: Math.max(0, Number(client.whatsappMessages) || 0),
        whatsappCharges: Math.max(0, Number(client.whatsappCharges) || 0),
        chatbotEnabled: Boolean(client.chatbotEnabled),
        chatbotCharges: Math.max(0, Number(client.chatbotCharges) || 0),
        monthlyRecords: cleanMonthlyRecords,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      shouldCreate ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function deleteClientFromFirestore(
  userId: string,
  clientId: string
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  const cleanId = sanitizeId(clientId);
  const path = `workspaces/${cleanUid}/clients/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', cleanUid, 'clients', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createExpenseInFirestore(
  userId: string,
  expense: ExpenseItem
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  await ensureWorkspaceDocumentExists(cleanUid);

  const cleanId = sanitizeId(expense.id);
  const path = `workspaces/${cleanUid}/expenses/${cleanId}`;
  const ref = doc(db, 'workspaces', cleanUid, 'expenses', cleanId);

  let exists = false;
  try {
    const snap = await getDoc(ref);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (!exists) {
      await setDoc(ref, {
        ownerId: cleanUid,
        description: clampString(expense.description, 160, 'Expense'),
        amount: Math.max(0, Number(expense.amount) || 0),
        category: expense.category,
        date: clampString(expense.date, 30, '15-05-2026'),
        month: clampString(expense.month, 40, 'May 2026'),
        partnerName: clampString(expense.partnerName, 120, ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        description: clampString(expense.description, 160, 'Expense'),
        amount: Math.max(0, Number(expense.amount) || 0),
        category: expense.category,
        date: clampString(expense.date, 30, '15-05-2026'),
        month: clampString(expense.month, 40, 'May 2026'),
        partnerName: clampString(expense.partnerName, 120, ''),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      exists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function clearAllExpensesInFirestore(
  userId: string
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  const expensesPath = `workspaces/${cleanUid}/expenses`;
  try {
    const eSnap = await getDocs(
      query(
        collection(db, 'workspaces', cleanUid, 'expenses'),
        where('ownerId', '==', cleanUid)
      )
    );
    await Promise.all(
      eSnap.docs.map((d) =>
        deleteDoc(doc(db, 'workspaces', cleanUid, 'expenses', d.id))
      )
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, expensesPath);
  }
}

export async function deleteExpenseFromFirestore(
  userId: string,
  expenseId: string
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  const cleanId = sanitizeId(expenseId);
  const path = `workspaces/${cleanUid}/expenses/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', cleanUid, 'expenses', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncPartnerToFirestore(
  userId: string,
  partner: PartnerItem,
  isCreate: boolean
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  await ensureWorkspaceDocumentExists(cleanUid);

  const cleanId = sanitizeId(partner.id);
  const path = `workspaces/${cleanUid}/partners/${cleanId}`;
  const ref = doc(db, 'workspaces', cleanUid, 'partners', cleanId);

  let shouldCreate = isCreate;
  if (!isCreate) {
    try {
      const snap = await getDoc(ref);
      shouldCreate = !snap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  try {
    if (shouldCreate) {
      await setDoc(ref, {
        ownerId: cleanUid,
        name: clampString(partner.name, 120, 'Partner'),
        phone: clampString(partner.phone, 40, ''),
        monthlyPayment: Math.max(0, Number(partner.monthlyPayment) || 0),
        paidMonths: partner.paidMonths || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: clampString(partner.name, 120, 'Partner'),
        phone: clampString(partner.phone, 40, ''),
        monthlyPayment: Math.max(0, Number(partner.monthlyPayment) || 0),
        paidMonths: partner.paidMonths || {},
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      shouldCreate ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function deletePartnerFromFirestore(
  userId: string,
  partnerId: string
): Promise<void> {
  const cleanUid = sanitizeId(userId);
  const cleanId = sanitizeId(partnerId);
  const path = `workspaces/${cleanUid}/partners/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', cleanUid, 'partners', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
