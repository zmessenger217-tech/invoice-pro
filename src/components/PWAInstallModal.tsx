import React, { useState } from 'react';
import { Check, Download } from 'lucide-react';
import { CompanyProfile } from '../types';
import {
  resolveActiveLogoUrl,
  useOnlineStatus,
  usePWAInstall,
} from '../utils/usePWAInstall';

interface PWAInstallWidgetProps {
  company: CompanyProfile;
  onUpdateCompany: (updated: CompanyProfile) => void;
  variant?: 'topbar' | 'sidebar' | 'settings';
  collapsed?: boolean;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg no-print">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Offline Mode — Cached workspace data is active</span>
    </div>
  );
};

export const PWAInstallButton: React.FC<PWAInstallWidgetProps> = ({
  company,
  onUpdateCompany,
  variant = 'topbar',
  collapsed = false,
}) => {
  const activeLogo = resolveActiveLogoUrl(company.logoDataUrl);
  const { isInstallable, isInstalled, install } = usePWAInstall(
    company.logoDataUrl
  );
  const [downloadedNotice, setDownloadedNotice] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDirectDownloadClick = async () => {
    // 1. Try native browser PWA install prompt first so it installs as a real app
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setDownloadedNotice(true);
        setTimeout(() => setDownloadedNotice(false), 4000);
        return;
      }
    }

    // 2. Open native app install guide modal
    setShowModal(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateCompany({
          ...company,
          logoDataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  if (isInstalled && variant !== 'settings') {
    return null;
  }

  return (
    <>
      {variant === 'topbar' && (
        <button
          type="button"
          onClick={handleDirectDownloadClick}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs cursor-pointer"
          title="Click to install InvoicePro as a native app"
        >
          <img
            src={activeLogo}
            alt="App Logo"
            referrerPolicy="no-referrer"
            className="w-4 h-4 rounded-sm object-contain bg-white shrink-0"
          />
          {downloadedNotice ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Installed!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden sm:inline">Install App</span>
            </>
          )}
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleDirectDownloadClick}
          title={collapsed ? 'Install App' : undefined}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600/15 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {downloadedNotice ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Download className="w-4 h-4 shrink-0" />
          )}
          {!collapsed && (
            <span className="truncate whitespace-nowrap">
              {downloadedNotice ? 'App Installed!' : 'Install App'}
            </span>
          )}
        </button>
      )}

      {variant !== 'topbar' && variant !== 'sidebar' && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={activeLogo}
              alt={company.name || 'InvoicePro'}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-contain bg-white p-1 border border-slate-700 shrink-0"
            />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>
                  Install {company.name || 'InvoicePro'} as Native App (Windows, Mac &amp; Android)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Click <strong>Install App Now</strong> to add InvoicePro to your device interface as a native standalone app.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDirectDownloadClick}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs cursor-pointer"
            >
              {downloadedNotice ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Installed!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install App Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800 text-left">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeLogo}
                  alt="Logo"
                  className="w-10 h-10 rounded-xl object-contain bg-white p-1"
                />
                <div>
                  <h3 className="text-base font-bold">Install {company.name || 'InvoicePro'} as a Native App</h3>
                  <p className="text-xs text-blue-300">Run independently in its own app window</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/50">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Desktop (Chrome, Edge, Brave, Opera)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Click the <strong>Install</strong> icon (🖥️ / ➕) on the right side of your browser address bar, or click your browser menu (⋮) and select <strong>"Install InvoicePro..."</strong>. InvoicePro will be added to your desktop and taskbar as a native app!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                <div className="w-6 h-6 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Mobile (Android &amp; iPhone)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    <strong>Android:</strong> Tap menu (⋮) → <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.<br />
                    <strong>iPhone/iPad:</strong> Tap Safari Share button (⎋) → <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
