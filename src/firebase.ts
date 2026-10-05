import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
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
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  ClientEntity,
  CompanyProfile,
  ExpenseItem,
  PartnerItem,
} from './types';

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
    await getDocFromServer(doc(db, 'workspaces', sanitizeId(auth.currentUser.uid)));
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

function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || 'item-1';
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, workspacePath);
    }
  }
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
  // Ensure fresh auth token is ready before making Firestore calls
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
      category: defaultCompany.category,
      currency: clampString(defaultCompany.currency, 10, 'Rs.'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(workspaceRef, workspacePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, workspacePath);
    }

    if (
      defaultClients.length > 0 ||
      defaultExpenses.length > 0 ||
      defaultPartners.length > 0
    ) {
      const batch = writeBatch(db);
      for (const c of defaultClients) {
        const cId = sanitizeId(c.id);
        const cRef = doc(db, 'workspaces', userId, 'clients', cId);
        batch.set(cRef, {
          ownerId: userId,
          name: clampString(c.name, 120, 'Client'),
          address: clampString(c.address, 250, ''),
          phone: clampString(c.phone, 40, ''),
          enabled: Boolean(c.enabled),
          softwareEnabled: Boolean(c.softwareEnabled),
          softwareCharges: Math.max(0, Number(c.softwareCharges) || 0),
          whatsappEnabled: Boolean(c.whatsappEnabled),
          whatsappRate: Math.max(0, Number(c.whatsappRate) || 0),
          whatsappMessages: Math.max(0, Number(c.whatsappMessages) || 0),
          whatsappCharges: Math.max(0, Number(c.whatsappCharges) || 0),
          chatbotEnabled: Boolean(c.chatbotEnabled),
          chatbotCharges: Math.max(0, Number(c.chatbotCharges) || 0),
          monthlyRecords: c.monthlyRecords || {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const e of defaultExpenses) {
        const eId = sanitizeId(e.id);
        const eRef = doc(db, 'workspaces', userId, 'expenses', eId);
        batch.set(eRef, {
          ownerId: userId,
          description: clampString(e.description, 160, 'Expense'),
          amount: Math.max(0, Number(e.amount) || 0),
          category: e.category,
          date: clampString(e.date, 30, '15-05-2026'),
          month: clampString(e.month, 40, 'May 2026'),
          partnerName: clampString(e.partnerName, 120, ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const p of defaultPartners) {
        const pId = sanitizeId(p.id);
        const pRef = doc(db, 'workspaces', userId, 'partners', pId);
        batch.set(pRef, {
          ownerId: userId,
          name: clampString(p.name, 120, 'Partner'),
          phone: clampString(p.phone, 40, ''),
          monthlyPayment: Math.max(0, Number(p.monthlyPayment) || 0),
          paidMonths: p.paidMonths || {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, workspacePath);
      }
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
  const company: CompanyProfile = {
    ...defaultCompany,
    name:
      wsData.name === 'My Company' ? '' : wsData.name || defaultCompany.name,
    tagline: wsData.tagline ?? defaultCompany.tagline,
    phone: wsData.phone ?? defaultCompany.phone,
    email: wsData.email ?? defaultCompany.email,
    website: wsData.website ?? defaultCompany.website,
    category: wsData.category || defaultCompany.category,
    currency: wsData.currency || defaultCompany.currency,
  };

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
        whatsappRate: Number(data.whatsappRate) || 0,
        whatsappMessages: Number(data.whatsappMessages) || 0,
        whatsappCharges: Number(data.whatsappCharges) || 0,
        chatbotEnabled: Boolean(data.chatbotEnabled),
        chatbotCharges: Number(data.chatbotCharges) || 0,
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
        name: clampString(company.name, 120, 'My Company'),
        tagline: clampString(company.tagline, 200, ''),
        phone: clampString(company.phone, 40, ''),
        email: clampString(company.email, 120, ''),
        website: clampString(company.website, 120, ''),
        category: company.category,
        currency: clampString(company.currency, 10, 'Rs.'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: clampString(company.name, 120, 'My Company'),
        tagline: clampString(company.tagline, 200, ''),
        phone: clampString(company.phone, 40, ''),
        email: clampString(company.email, 120, ''),
        website: clampString(company.website, 120, ''),
        category: company.category,
        currency: clampString(company.currency, 10, 'Rs.'),
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
        whatsappRate: Math.max(0, Number(client.whatsappRate) || 0),
        whatsappMessages: Math.max(0, Number(client.whatsappMessages) || 0),
        whatsappCharges: Math.max(0, Number(client.whatsappCharges) || 0),
        chatbotEnabled: Boolean(client.chatbotEnabled),
        chatbotCharges: Math.max(0, Number(client.chatbotCharges) || 0),
        monthlyRecords: client.monthlyRecords || {},
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
        whatsappRate: Math.max(0, Number(client.whatsappRate) || 0),
        whatsappMessages: Math.max(0, Number(client.whatsappMessages) || 0),
        whatsappCharges: Math.max(0, Number(client.whatsappCharges) || 0),
        chatbotEnabled: Boolean(client.chatbotEnabled),
        chatbotCharges: Math.max(0, Number(client.chatbotCharges) || 0),
        monthlyRecords: client.monthlyRecords || {},
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
  try {
    await setDoc(doc(db, 'workspaces', cleanUid, 'expenses', cleanId), {
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
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
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
