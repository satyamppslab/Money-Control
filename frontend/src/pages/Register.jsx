import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, Phone, ChevronDown, CheckCircle2, RotateCcw } from 'lucide-react';

const COUNTRY_RULES = {
  '+91': { min: 10, max: 10, label: '10 digits', name: 'India' },
  '+1': { min: 10, max: 10, label: '10 digits', name: 'US/Canada' },
  '+44': { min: 10, max: 11, label: '10 or 11 digits', name: 'United Kingdom' },
  '+61': { min: 9, max: 9, label: '9 digits', name: 'Australia' },
  '+81': { min: 10, max: 10, label: '10 digits', name: 'Japan' },
  '+971': { min: 9, max: 9, label: '9 digits', name: 'UAE' }
};

const CURRENCY_TO_COUNTRY = {
  INR: '+91',
  USD: '+1',
  CAD: '+1',
  GBP: '+44',
  AUD: '+61',
  JPY: '+81',
  EUR: '+44',
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email OTP States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const { verifyOtp, sendOtp, currency } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const defaultCode = CURRENCY_TO_COUNTRY[currency] || '+91';
    setCountryCode(defaultCode);
  }, [currency]);

  // Resend cooldown timer tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Normalize phone number for E.164 if provided
  const getE164Phone = () => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) return '';
    const nationalNumber = cleanDigits.startsWith('0') ? cleanDigits.slice(1) : cleanDigits;
    return `${countryCode}${nationalNumber}`;
  };

  // Step 1: Request OTP code via Email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setToastMsg('');

    // Password matching validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Password strength validation
    const hasCapital = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasCapital || !hasNumber || !hasSpecial) {
      setError('Password must contain at least one capital letter, one number, and one special character.');
      return;
    }

    // Phone number validation (optional)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone) {
      const rule = COUNTRY_RULES[countryCode];
      if (rule && (cleanPhone.length < rule.min || cleanPhone.length > rule.max)) {
        setError(`For ${rule.name} (${countryCode}), the phone number must be exactly ${rule.label}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const res = await sendOtp(email.trim());
      setIsOtpSent(true);
      setToastMsg(res.message || 'Verification code sent to your email.');
      setCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send verification code. Please check your email.';
      setError(msg);
      if (err.response?.data?.retryAfter) {
        setCooldown(err.response.data.retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Register Account
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Verification code must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    const fullPhoneNumber = getE164Phone();

    try {
      await verifyOtp(username.trim(), email.trim(), password, fullPhoneNumber, otp.trim());
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    setToastMsg('');

    try {
      await sendOtp(email.trim());
      setToastMsg('A fresh verification code has been sent to your email.');
      setCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend verification code.';
      setError(msg);
      if (err.response?.data?.retryAfter) {
        setCooldown(err.response.data.retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-xl p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10 transition-colors duration-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isOtpSent ? 'Verify Email' : 'Create Account'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {isOtpSent
              ? `Enter the 6-digit code sent to ${email}`
              : 'Join MoneyControl and take charge of your finances'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {toastMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-sm mb-6 font-semibold flex items-center justify-center gap-2 text-center">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}



        {isOtpSent ? (
          /* Step 2: OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  minLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 tracking-widest text-center text-lg font-mono transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-slate-950 font-bold py-3 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Verifying...' : 'Verify & Register'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex justify-between items-center text-xs mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || cooldown > 0}
                className={`flex items-center gap-1 font-semibold transition-colors ${
                  cooldown > 0 || loading
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'text-brand-600 dark:text-brand-400 hover:underline cursor-pointer'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOtpSent(false);
                  setOtp('');
                  setError('');
                  setToastMsg('');
                }}
                className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Change Email
              </button>
            </div>
          </form>
        ) : (
          /* Step 1: Initial Registration Details Form */
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5">
                Phone Number <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      const targetVal = e.target.value;
                      setCountryCode(targetVal);
                      const rule = COUNTRY_RULES[targetVal];
                      if (rule) {
                        setPhone((prev) => prev.slice(0, rule.max));
                      }
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-7 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-sm transition-all cursor-pointer appearance-none"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+971">+971 (AE)</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450 dark:text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={COUNTRY_RULES[countryCode]?.label || 'Phone number'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={COUNTRY_RULES[countryCode]?.max || 15}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-slate-950 font-bold py-3 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Sending Code...' : 'Continue to Verify'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
