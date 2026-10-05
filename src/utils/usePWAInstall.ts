import { useEffect, useState } from 'react';
import bundledBrandLogoUrl from '../assets/images/invoicepro_app_logo_1791180224663.jpg';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Generates a crisp, self-contained PNG Data URL fallback logo in memory
 * so jsPDF, print sheets, and Vercel deployments always have a valid data:image/png logo.
 */
function createInlineBrandLogoDataUrl(): string {
  if (typeof document === 'undefined') {
    return bundledBrandLogoUrl;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (!ctx) return bundledBrandLogoUrl;

    // Deep Navy to Royal Blue rounded background
    const grad = ctx.createLinearGradient(0, 0, 192, 192);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.55, '#1e293b');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 192, 192, 42);
    ctx.fill();

    // Inner White Invoice Card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(38, 30, 116, 132, 18);
    ctx.fill();

    // Top Blue Header Band on Card
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(38, 30, 116, 30, [18, 18, 0, 0]);
    ctx.fill();

    // Invoice Ledger Bars
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.roundRect(54, 76, 68, 10, 5);
    ctx.fill();

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(54, 96, 52, 10, 5);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(54, 116, 38, 10, 5);
    ctx.fill();

    // Emerald Verification Badge on Bottom Right
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(130, 132, 24, 0, Math.PI * 2);
    ctx.fill();

    // White Checkmark inside Badge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(119, 132);
    ctx.lineTo(127, 140);
    ctx.lineTo(142, 124);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  } catch {
    return bundledBrandLogoUrl;
  }
}

export const DEFAULT_BRAND_LOGO_DATA_URL = createInlineBrandLogoDataUrl();

// Bundled URL resolved by Vite for production deployments (Vercel, Netlify, etc.)
export const DEFAULT_BRAND_LOGO_PATH =
  bundledBrandLogoUrl || DEFAULT_BRAND_LOGO_DATA_URL;

/**
 * Ensures any stale dev path ('/src/assets/...') saved in localStorage is replaced
 * with the production-safe bundled logo or base64 data URL.
 */
export function resolveActiveLogoUrl(logoDataUrl?: string): string {
  if (!logoDataUrl || logoDataUrl.trim() === '' || logoDataUrl.startsWith('/src/')) {
    return DEFAULT_BRAND_LOGO_PATH;
  }
  return logoDataUrl;
}

export function usePWAInstall(customLogoDataUrl?: string) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Dynamically sync favicon and apple-touch-icon with the active brand logo
  useEffect(() => {
    const activeIcon = resolveActiveLogoUrl(customLogoDataUrl);
    const faviconEl = document.getElementById(
      'dynamic-favicon'
    ) as HTMLLinkElement | null;
    const appleIconEl = document.getElementById(
      'dynamic-apple-touch-icon'
    ) as HTMLLinkElement | null;

    if (faviconEl) {
      faviconEl.href = activeIcon;
      faviconEl.type = activeIcon.startsWith('data:image/jpeg')
        ? 'image/jpeg'
        : 'image/png';
    }
    if (appleIconEl) {
      appleIconEl.href = activeIcon;
    }
  }, [customLogoDataUrl]);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
