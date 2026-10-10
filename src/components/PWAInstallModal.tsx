import React, { useState } from 'react';
import { Check, Download, Upload } from 'lucide-react';
import { CompanyProfile } from '../types';
import {
  DEFAULT_BRAND_LOGO_DATA_URL,
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

/**
 * Directly downloads a standalone WebApp launcher file with the user's logo
 * and company name embedded so clicking "Download App" always downloads immediately.
 */
function triggerDirectWebAppDownload(
  company: CompanyProfile,
  activeLogo: string
): string {
  const appName = (company.name || 'InvoicePro').trim();
  const safeFileName = appName.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'InvoicePro';
  const filename = `InvoicePro_App.html`;
  const appUrl = window.location.origin + window.location.pathname;
  const resolvedLogo = activeLogo.startsWith('data:')
    ? activeLogo
    : activeLogo.startsWith('http')
    ? activeLogo
    : DEFAULT_BRAND_LOGO_DATA_URL;

  const standaloneHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#0f172a" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="${appName}" />
  <link rel="icon" href="${resolvedLogo}" />
  <link rel="apple-touch-icon" href="${resolvedLogo}" />
  <title>${appName} — Standalone App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #splash {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1d4ed8 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      transition: opacity 0.35s ease;
    }
    .logo-card {
      width: 96px;
      height: 96px;
      border-radius: 24px;
      background: #ffffff;
      padding: 10px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
    }
    .logo-card img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 14px;
    }
    .app-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .app-sub {
      font-size: 13px;
      color: #93c5fd;
      margin-top: 6px;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div id="splash">
    <div class="logo-card">
      <img src="${resolvedLogo}" alt="${appName} Logo" />
    </div>
    <div class="app-title">${appName}</div>
    <div class="app-sub">${company.tagline || 'Invoice Generator & Finance Manager'}</div>
  </div>
  <iframe
    src="${appUrl}"
    allow="clipboard-write; web-share"
    onload="setTimeout(function(){ var s = document.getElementById('splash'); if(s){ s.style.opacity='0'; setTimeout(function(){ s.remove(); }, 350); } }, 600);"
  ></iframe>
</body>
</html>`;

  const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return filename;
}

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

  const handleDirectDownloadClick = () => {
    // Immediately download the standalone WebApp file on click
    triggerDirectWebAppDownload(company, activeLogo);
    setDownloadedNotice(true);
    setTimeout(() => setDownloadedNotice(false), 4000);
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

  if (variant === 'topbar') {
    return (
      <button
        type="button"
        onClick={handleDirectDownloadClick}
        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs cursor-pointer"
        title="Click to directly download WebApp with your logo"
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
            <span className="hidden sm:inline">Downloading...</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden sm:inline">Download App</span>
          </>
        )}
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleDirectDownloadClick}
        title={collapsed ? 'Download App Directly' : undefined}
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
            {downloadedNotice ? 'App Downloaded!' : 'Download App'}
          </span>
        )}
      </button>
    );
  }

  return (
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
              Download {company.name || 'InvoicePro'} WebApp (Windows &amp;
              Android)
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Click <strong>Download App Now</strong> to directly download the app
            with your displayed logo.
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
              <span>Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download App Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
