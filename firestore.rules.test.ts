/**
 * Firestore Security Rules Test Suite — Verifies all "Dirty Dozen" adversarial payloads
 * return PERMISSION_DENIED and valid operations succeed.
 */
export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Workspace Create',
    collectionPath: '/workspaces/user_A',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_B', name: 'ABC Software' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-Tenant PII Read',
    collectionPath: '/workspaces/user_A',
    operation: 'get',
    auth: { uid: 'user_B', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write',
    collectionPath: '/workspaces/user_A',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: false },
    payload: { ownerId: 'user_A', name: 'ABC Software' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow / Ghost Field Injection',
    collectionPath: '/workspaces/user_A',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', name: 'ABC Software', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Subcollection Write Without Parent Workspace',
    collectionPath: '/workspaces/user_A/clients/sch-1',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', name: 'Green Valley School' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Path ID Poisoning',
    collectionPath: '/workspaces/user_A/clients/invalid$id!@#',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', name: 'Green Valley School' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Denial-of-Wallet String Overflow',
    collectionPath: '/workspaces/user_A/clients/sch-1',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', name: 'A'.repeat(500) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client-Spoofed Timestamp',
    collectionPath: '/workspaces/user_A/expenses/exp-1',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immortal Field Mutation on Update',
    collectionPath: '/workspaces/user_A/clients/sch-1',
    operation: 'update',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_B' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Invalid Enum Injection',
    collectionPath: '/workspaces/user_A/expenses/exp-1',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', category: 'Crypto Speculation' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning on Update',
    collectionPath: '/workspaces/user_A/partners/part-1',
    operation: 'update',
    auth: { uid: 'user_A', email_verified: true },
    payload: { monthlyPayment: '10000' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized List Scraping',
    collectionPath: '/workspaces/user_A/clients',
    operation: 'list',
    auth: { uid: 'user_B', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
