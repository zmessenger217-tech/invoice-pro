import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Edit3,
  History,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  AccountItem,
  ActiveNavTab,
  CategoryTerminology,
  ClientEntity,
  PartnerItem,
} from '../types';
import { formatCurrency } from '../data/initialData';

interface AccountManagementViewProps {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  term: CategoryTerminology;
  accounts: AccountItem[];
  clients: ClientEntity[];
  partners: PartnerItem[];
  currency?: string;
  onSaveAccount: (account: AccountItem, isNew: boolean) => void;
  onDeleteAccount: (accountId: string) => void;
}

const EXAMPLE_ACCOUNTS = [
  'HBL Bank',
  'Meezan Bank',
  'Bank Alfalah',
  'Cash Account',
  'JazzCash',
  'Easypaisa',
];

export const AccountManagementView: React.FC<AccountManagementViewProps> = ({
  term,
  accounts,
  clients,
  partners,
  currency = 'Rs.',
  onSaveAccount,
  onDeleteAccount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilterAccount, setHistoryFilterAccount] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [accountNameInput, setAccountNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deleteConfirmAccount, setDeleteConfirmAccount] =
    useState<AccountItem | null>(null);
  const [deleteWarningData, setDeleteWarningData] = useState<{
    usedInSchools: number;
    usedInPartners: number;
  } | null>(null);
  const [viewingAccountTx, setViewingAccountTx] = useState<AccountItem | null>(null);

  // Check if an account is used in any school/client or partner payment records
  const checkAccountUsage = (account: AccountItem) => {
    let usedInSchools = 0;
    let usedInPartners = 0;
    const targetNameLower = account.accountName.trim().toLowerCase();

    clients.forEach((c) => {
      if (c.monthlyRecords) {
        Object.values(c.monthlyRecords).forEach((rec) => {
          if (rec.payments && rec.payments.length > 0) {
            rec.payments.forEach((tx) => {
              const txAccName = (
                tx.paymentFromAccountName ||
                tx.bankName ||
                ''
              )
                .trim()
                .toLowerCase();
              if (
                tx.paymentFromAccountId === account.id ||
                (txAccName && txAccName === targetNameLower)
              ) {
                usedInSchools++;
              }
            });
          }
        });
      }
    });

    partners.forEach((p) => {
      if (p.paidMonths) {
        Object.values(p.paidMonths).forEach((pm) => {
          if (pm.payments && pm.payments.length > 0) {
            pm.payments.forEach((tx) => {
              const txAccName = (
                tx.paymentFromAccountName ||
                tx.bankName ||
                ''
              )
                .trim()
                .toLowerCase();
              if (
                tx.paymentFromAccountId === account.id ||
                (txAccName && txAccName === targetNameLower)
              ) {
                usedInPartners++;
              }
            });
          }
        });
      }
    });

    return { usedInSchools, usedInPartners };
  };

  // Unified Payment History across Partners and Schools
  const allPaymentHistory = useMemo(() => {
    const items: {
      id: string;
      paymentTo: string;
      recipientType: string;
      amount: number;
      paidFromAccount: string;
      date: string;
      time?: string;
      day?: string;
      billingMonth: string;
      method: string;
      note?: string;
    }[] = [];

    // 1. Partner payments
    partners.forEach((p) => {
      if (!p.paidMonths) return;
      Object.entries(p.paidMonths).forEach(([monthKey, pm]) => {
        if (pm.payments && pm.payments.length > 0) {
          pm.payments.forEach((tx, idx) => {
            const resolvedAcc =
              tx.paymentFromAccountName ||
              tx.bankName ||
              (tx.note?.startsWith('Account: ')
                ? tx.note.split(' — ')[0].replace('Account: ', '')
                : 'Cash Account');
            items.push({
              id: tx.id || `part-${p.id}-${monthKey}-${idx}`,
              paymentTo: p.name,
              recipientType: 'Partner',
              amount: tx.amount,
              paidFromAccount: resolvedAcc,
              date: tx.date,
              time: tx.time,
              day: tx.day,
              billingMonth: tx.billingMonth || monthKey,
              method: tx.method,
              note: tx.note,
            });
          });
        } else if (pm.amountPaid && pm.amountPaid > 0 && pm.paidDate) {
          items.push({
            id: `part-legacy-${p.id}-${monthKey}`,
            paymentTo: p.name,
            recipientType: 'Partner',
            amount: pm.amountPaid,
            paidFromAccount: 'Primary Account',
            date: pm.paidDate,
            time: pm.paidTime,
            day: pm.paidDay,
            billingMonth: monthKey,
            method: 'Bank Transfer',
          });
        }
      });
    });

    // 2. School / Client payments
    clients.forEach((c) => {
      if (!c.monthlyRecords) return;
      Object.entries(c.monthlyRecords).forEach(([monthKey, rec]) => {
        if (rec.payments && rec.payments.length > 0) {
          rec.payments.forEach((tx, idx) => {
            const resolvedAcc =
              tx.paymentFromAccountName ||
              tx.bankName ||
              (tx.note?.startsWith('Bank: ')
                ? tx.note.split(' — ')[0].replace('Bank: ', '')
                : 'Cash Account');
            items.push({
              id: tx.id || `sch-${c.id}-${monthKey}-${idx}`,
              paymentTo: c.name,
              recipientType: term.singular,
              amount: tx.amount,
              paidFromAccount: resolvedAcc,
              date: tx.date,
              time: tx.time,
              day: tx.day,
              billingMonth: tx.billingMonth || monthKey,
              method: tx.method,
              note: tx.note,
            });
          });
        }
      });
    });

    return items;
  }, [clients, partners, term.singular]);

  const filteredHistory = useMemo(() => {
    return allPaymentHistory.filter((item) => {
      const matchesAccount =
        historyFilterAccount === 'ALL' ||
        item.paidFromAccount.trim().toLowerCase() ===
          historyFilterAccount.trim().toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        item.paymentTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.paidFromAccount.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesAccount && matchesSearch;
    });
  }, [allPaymentHistory, historyFilterAccount, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setAccountNameInput('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc: AccountItem) => {
    setEditingAccount(acc);
    setAccountNameInput(acc.accountName);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = accountNameInput.trim();
    if (!trimmed) {
      setErrorMsg('Account name is required.');
      return;
    }

    // Check accidental duplicate (case-insensitive)
    const duplicate = accounts.find(
      (a) =>
        a.accountName.trim().toLowerCase() === trimmed.toLowerCase() &&
        (!editingAccount || a.id !== editingAccount.id)
    );
    if (duplicate) {
      setErrorMsg('An account with this name already exists.');
      return;
    }

    const nowIso = new Date().toISOString();
    if (editingAccount) {
      onSaveAccount(
        {
          ...editingAccount,
          accountName: trimmed,
          updatedAt: nowIso,
        },
        false
      );
    } else {
      const newAcc: AccountItem = {
        id: `acc-${Date.now()}`,
        accountName: trimmed,
        ownerId: '',
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      onSaveAccount(newAcc, true);
    }

    setIsModalOpen(false);
    setAccountNameInput('');
    setEditingAccount(null);
    setErrorMsg(null);
  };

  const handlePromptDelete = (acc: AccountItem) => {
    const usage = checkAccountUsage(acc);
    setDeleteWarningData(usage);
    setDeleteConfirmAccount(acc);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmAccount) return;
    const usage = checkAccountUsage(deleteConfirmAccount);
    if (usage.usedInSchools > 0 || usage.usedInPartners > 0) {
      // Mark inactive instead of permanent deletion to preserve history safely
      onSaveAccount(
        {
          ...deleteConfirmAccount,
          isActive: false,
          updatedAt: new Date().toISOString(),
        },
        false
      );
    } else {
      onDeleteAccount(deleteConfirmAccount.id);
    }
    setDeleteConfirmAccount(null);
    setDeleteWarningData(null);
  };

  const handleReactivateAccount = (acc: AccountItem) => {
    onSaveAccount(
      {
        ...acc,
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
      false
    );
  };

  // Calculate money processed per account
  const accountStats = useMemo(() => {
    const stats: Record<string, { totalAmount: number; txCount: number }> = {};
    allPaymentHistory.forEach((item) => {
      const name = item.paidFromAccount.trim().toLowerCase();
      if (!stats[name]) {
        stats[name] = { totalAmount: 0, txCount: 0 };
      }
      stats[name].totalAmount += Number(item.amount) || 0;
      stats[name].txCount += 1;
    });
    return stats;
  }, [allPaymentHistory]);

  const filteredAccounts = accounts
    .filter((acc) =>
      acc.accountName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.accountName.localeCompare(b.accountName));

  return (
    <div className="space-y-6">
      {/* Top Header & Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Account Management
              </h1>
              <p className="text-xs text-slate-500">
                Manage your accounts, track money processed, and select them when recording payments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Total Accounts: </span>
            <span className="font-bold text-slate-900 font-mono">
              {accounts.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Account</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts or payment records by name..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Saved Accounts ({filteredAccounts.length})
          </h2>
          <span className="text-[11px] text-slate-400">
            Available in Partner &amp; {term.singular} Payment dropdowns
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[180px]">Account Name</th>
                <th className="py-3 px-4">Date Created</th>
                <th className="py-3 px-4">Money Processed</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="text-slate-600 font-medium">
                        No accounts added yet.
                      </div>
                      <p className="text-slate-400 text-xs max-w-sm">
                        Add an account (such as HBL Bank, Meezan Bank, Cash Account, JazzCash, or Easypaisa) to select it when recording partner or {term.singular.toLowerCase()} payments.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New Account</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => {
                  const stat =
                    accountStats[acc.accountName.trim().toLowerCase()] || {
                      totalAmount: 0,
                      txCount: 0,
                    };
                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/85 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                        <span>{acc.accountName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {acc.createdAt
                          ? new Date(acc.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-emerald-700">
                          {formatCurrency(stat.totalAmount, currency)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {stat.txCount}{' '}
                          {stat.txCount === 1 ? 'transaction' : 'transactions'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              acc.isActive !== false
                                ? 'bg-emerald-600'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>
                            {acc.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingAccountTx(acc)}
                            title="View Payments for this Account"
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <History className="w-3 h-3" />
                            <span>View Payments</span>
                          </button>
                          {acc.isActive === false && (
                            <button
                              type="button"
                              onClick={() => handleReactivateAccount(acc)}
                              title="Reactivate Account"
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Activate</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(acc)}
                            title="Edit Account Name"
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3 text-slate-500" />
                            <span>Edit Account Name</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDelete(acc)}
                            title="Delete Account"
                            className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Account</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Integration Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Payment History by Account
              </h2>
              <p className="text-[11px] text-slate-500">
                Complete record of Partner and {term.singular} payments showing Paid From Account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">
              Filter by Account:
            </label>
            <select
              value={historyFilterAccount}
              onChange={(e) => setHistoryFilterAccount(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Accounts ({allPaymentHistory.length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.accountName}>
                  {acc.accountName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4">Payment To</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Paid From Account</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Method &amp; Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.paymentTo}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          item.recipientType === 'Partner'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {item.recipientType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {formatCurrency(item.amount, currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-[11px]">
                        <Wallet className="w-3 h-3 text-blue-600" />
                        <span>{item.paidFromAccount}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <div>
                        {item.day ? `${item.day}, ` : ''}
                        {item.date}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.billingMonth}
                        {item.time ? ` · ${item.time}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium text-slate-700">
                        {item.method}
                      </div>
                      {item.note && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                          {item.note}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingAccount ? 'Edit Account Name' : 'Add New Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={accountNameInput}
                  onChange={(e) => {
                    setAccountNameInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. HBL Bank, Meezan Bank, Cash Account, JazzCash"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Only the account name is required. No account number, IBAN, or balance needed.
                </p>
              </div>

              {/* Quick Suggestions */}
              {!editingAccount && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Quick Examples (Click to fill)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLE_ACCOUNTS.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => {
                          setAccountNameInput(sample);
                          setErrorMsg(null);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      {deleteConfirmAccount && deleteWarningData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {deleteWarningData.usedInSchools > 0 ||
                  deleteWarningData.usedInPartners > 0
                    ? `Account Used in Payment Records — Mark "${deleteConfirmAccount.accountName}" Inactive?`
                    : `Delete Account "${deleteConfirmAccount.accountName}"?`}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {deleteWarningData.usedInSchools > 0 ||
                  deleteWarningData.usedInPartners > 0 ? (
                    <>
                      This account has already been used in{' '}
                      <strong>
                        {deleteWarningData.usedInSchools}{' '}
                        {term.singular.toLowerCase()}
                      </strong>{' '}
                      and{' '}
                      <strong>
                        {deleteWarningData.usedInPartners} partner
                      </strong>{' '}
                      payment records. To preserve historical payment records without removing the account name from existing transactions, this account will be set to{' '}
                      <strong>Inactive</strong>.
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete{' '}
                      <strong>{deleteConfirmAccount.accountName}</strong>? This action cannot be undone.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmAccount(null);
                  setDeleteWarningData(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors ${
                  deleteWarningData.usedInSchools > 0 ||
                  deleteWarningData.usedInPartners > 0
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {deleteWarningData.usedInSchools > 0 ||
                deleteWarningData.usedInPartners > 0
                  ? 'Mark as Inactive'
                  : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Account Transactions Modal */}
      {viewingAccountTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Payments made through: {viewingAccountTx.accountName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    All payment records associated with this account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAccountTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {(() => {
                const txs = allPaymentHistory.filter(
                  (item) =>
                    item.paidFromAccount.trim().toLowerCase() ===
                    viewingAccountTx.accountName.trim().toLowerCase()
                );
                const totalAmt = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

                return (
                  <>
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">Total Money Processed: </span>
                        <span className="font-bold text-emerald-700 font-mono text-sm">
                          {formatCurrency(totalAmt, currency)}
                        </span>
                      </div>
                      <div className="font-mono text-slate-600">
                        <strong>{txs.length}</strong> {txs.length === 1 ? 'transaction' : 'transactions'}
                      </div>
                    </div>

                    {txs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No payments have been recorded using this account yet.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                              <th className="py-2.5 px-3">Payment To</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Amount</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Method &amp; Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {txs.map((tx, i) => (
                              <tr key={tx.id || i} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{tx.paymentTo}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    tx.recipientType === 'Partner'
                                      ? 'bg-indigo-50 text-indigo-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    {tx.recipientType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                  {formatCurrency(tx.amount, currency)}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">
                                  {tx.date}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  <div className="font-medium">{tx.method}</div>
                                  {tx.note && <div className="text-[10px] text-slate-400">{tx.note}</div>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingAccountTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

