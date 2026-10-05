import React, { useState } from 'react';
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Phone,
  UploadCloud,
  User as UserIcon,
} from 'lucide-react';
import { CATEGORY_MAP } from '../data/initialData';
import {
  AuthScreenMode,
  CompanyProfile,
  SoftwareCategory,
} from '../types';
import { DEFAULT_BRAND_LOGO_PATH } from '../utils/usePWAInstall';

interface AuthAndOnboardingProps {
  mode: AuthScreenMode;
  setMode: (mode: AuthScreenMode) => void;
  company: CompanyProfile;
  onSaveCompanySetup: (updated: CompanyProfile) => void;
  onGoogleLogin: () => Promise<void>;
  onEmailAuthComplete: (email: string, isSignUp: boolean) => void;
}

const CATEGORIES: SoftwareCategory[] = [
  'School Management',
  'Store Management',
  'Hospital Management',
  'Restaurant Management',
  'Other',
];

export const AuthAndOnboarding: React.FC<AuthAndOnboardingProps> = ({
  mode,
  setMode,
  company,
  onSaveCompanySetup,
  onGoogleLogin,
  onEmailAuthComplete,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company setup state — starts with whatever the user entered or empty
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [companyName, setCompanyName] = useState(company.name || '');
  const [phone, setPhone] = useState(company.phone || '');
  const [companyEmail, setCompanyEmail] = useState(company.email || '');
  const [website, setWebsite] = useState(company.website || '');
  const [category, setCategory] = useState<SoftwareCategory>(
    company.category || 'School Management'
  );
  const [customSingular, setCustomSingular] = useState(
    company.customSingular || ''
  );
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(
    company.logoDataUrl
  );

  const term = CATEGORY_MAP[category];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!companyEmail && email) {
      setCompanyEmail(email);
    }
    onEmailAuthComplete(email, false);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setAuthError('Please agree to the Terms & Conditions to continue.');
      return;
    }
    setAuthError(null);
    if (!companyEmail && email) {
      setCompanyEmail(email);
    }
    onEmailAuthComplete(email, true);
  };

  const handleGoogleClick = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await onGoogleLogin();
    } catch {
      onEmailAuthComplete(email || 'user@company.com', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteCompanySetup = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTerm = CATEGORY_MAP[category];
    onSaveCompanySetup({
      ...company,
      name: companyName.trim(),
      phone: phone.trim(),
      email: companyEmail.trim() || email.trim(),
      website: website.trim(),
      category,
      tagline: selectedTerm.tagline,
      customSingular:
        category === 'Other' ? customSingular.trim() || 'Client' : undefined,
      customPlural:
        category === 'Other'
          ? `${customSingular.trim() || 'Client'}s`
          : undefined,
      logoDataUrl,
    });
    setMode('app');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center">
      {/* 1. LOGIN SCREEN */}
      {mode === 'login' && (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
            {/* Left Form */}
            <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-2.5 mb-2">
                <img
                  src={company.logoDataUrl || DEFAULT_BRAND_LOGO_PATH}
                  alt="InvoicePro Logo"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl object-contain bg-slate-900 p-0.5 border border-slate-200 shadow-xs"
                />
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  {company.name || 'InvoicePro'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-7">
                Manage Your {term.singular} Finances Easily
              </p>

              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetSent(false);
                      setMode('forgot-password');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-xs"
                >
                  Login
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>

            {/* Right Navy Showcase Panel */}
            <div className="md:col-span-5 bg-slate-900 text-white p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-36 h-44 rounded-2xl bg-slate-800/90 border border-slate-700 p-4 mb-6 flex flex-col justify-between shadow-lg relative">
                <div className="space-y-2">
                  <div className="w-10 h-2.5 rounded bg-blue-400" />
                  <div className="w-full h-2 rounded bg-slate-600" />
                  <div className="w-4/5 h-2 rounded bg-slate-600" />
                  <div className="w-full h-2 rounded bg-slate-700 mt-3" />
                  <div className="w-2/3 h-2 rounded bg-slate-700" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                    Rs
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold tracking-tight mb-2.5 max-w-xs">
                Simplify Your Invoicing &amp; Finances
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                Track payments, manage expenses, create invoices and grow your business — all in one place.
              </p>

              <div className="flex items-center gap-1.5 mt-8">
                <span className="w-5 h-1.5 rounded-full bg-blue-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIGN UP SCREEN */}
      {mode === 'signup' && (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <img
                src={company.logoDataUrl || DEFAULT_BRAND_LOGO_PATH}
                alt="InvoicePro Logo"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-contain bg-slate-900 p-0.5 border border-slate-200 shadow-xs"
              />
              <span className="text-xl font-bold tracking-tight text-slate-900">
                {company.name || 'InvoicePro'}
              </span>
            </div>
            <h1 className="text-center text-lg font-bold text-slate-900">
              Create Your Account
            </h1>
            <p className="text-center text-xs text-slate-500 mt-1 mb-6">
              Get started in seconds
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {authError}
              </div>
            )}

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  I agree to the{' '}
                  <span className="text-blue-600 font-medium">
                    Terms &amp; Conditions
                  </span>
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                Sign Up
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD SCREEN */}
      {mode === 'forgot-password' && (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <img
                src={company.logoDataUrl || DEFAULT_BRAND_LOGO_PATH}
                alt="InvoicePro Logo"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-contain bg-slate-900 p-0.5 border border-slate-200 shadow-xs"
              />
              <span className="text-xl font-bold tracking-tight text-slate-900">
                {company.name || 'InvoicePro'}
              </span>
            </div>
            <h1 className="text-center text-lg font-bold text-slate-900">
              Reset Your Password
            </h1>
            <p className="text-center text-xs text-slate-500 mt-1 mb-6">
              Enter your registered email address and we will send a recovery link.
            </p>

            {resetSent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 text-center">
                  Password reset instructions have been sent to{' '}
                  <strong>{email}</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setResetSent(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  Send Recovery Link
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-2 px-4 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel and return to Login
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. COMPANY SETUP SCREEN */}
      {mode === 'company-setup' && (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12">
            {/* Left Stepper */}
            <div className="md:col-span-4 bg-slate-50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-200">
              <div className="flex items-center gap-2.5 mb-8">
                <img
                  src={logoDataUrl || DEFAULT_BRAND_LOGO_PATH}
                  alt="InvoicePro Logo"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-contain bg-slate-900 p-0.5 border border-slate-200"
                />
                <span className="text-base font-bold tracking-tight text-slate-900">
                  {companyName || 'InvoicePro'}
                </span>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSetupStep(1)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-colors ${
                    setupStep === 1
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      setupStep >= 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    1
                  </span>
                  <span>Company Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSetupStep(2)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-colors ${
                    setupStep === 2
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      setupStep >= 2
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    2
                  </span>
                  <span>Software Category</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSetupStep(3)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-colors ${
                    setupStep === 3
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      setupStep === 3
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    3
                  </span>
                  <span>Complete</span>
                </button>
              </div>

              <div className="mt-10 p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-900">
                  Dynamic Terminology
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Selected category:{' '}
                  <strong className="text-blue-600">{category}</strong>. The app
                  will use <strong>&ldquo;{term.singular}&rdquo;</strong> and{' '}
                  <strong>&ldquo;{term.plural}&rdquo;</strong> across all
                  screens and invoices.
                </p>
              </div>
            </div>

            {/* Right Setup Form */}
            <div className="md:col-span-8 p-6 md:p-8">
              <h2 className="text-lg font-bold text-slate-900">
                Tell us about your company
              </h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                This information will be used in your invoices and profile.
              </p>

              <form
                onSubmit={handleCompleteCompanySetup}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Company Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="support@company.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Upload Logo
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60">
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={logoDataUrl || DEFAULT_BRAND_LOGO_PATH}
                        alt="Company Logo Preview"
                        referrerPolicy="no-referrer"
                        className="h-12 w-auto object-contain rounded bg-white p-1 border border-slate-200"
                      />
                      <span className="text-xs text-blue-600 font-medium">
                        Click to change company &amp; app logo
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Software Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as SoftwareCategory);
                      setSetupStep(2);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-blue-600 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {category === 'Other' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Custom Client Terminology (Singular)
                    </label>
                    <input
                      type="text"
                      value={customSingular}
                      onChange={(e) => setCustomSingular(e.target.value)}
                      placeholder="e.g., Gym, Clinic, Agency"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Next</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
