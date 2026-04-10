import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Step = "email" | "reset" | "done";

function getPasswordStrength(password: string): { score: number; label: string; color: string; textColor: string } {
  if (!password) return { score: 0, label: '', color: '', textColor: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500' };
  return { score: 4, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color, textColor } = getPasswordStrength(password);
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColor}`}>{label}</p>
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");

  // Step 1
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Step 2
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const fpOtpRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

  const handleFpOtpInput = (idx: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const digits = otp.split("");
    digits[idx] = val;
    const next = digits.join("");
    setOtp(next);
    if (val && idx < 5) fpOtpRefs.current[idx + 1]?.focus();
  };

  const handleFpOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otp[idx]) {
        const digits = otp.split("");
        digits[idx] = "";
        setOtp(digits.join(""));
      } else if (idx > 0) {
        fpOtpRefs.current[idx - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) fpOtpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) fpOtpRefs.current[idx + 1]?.focus();
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Incomplete code", description: "Please enter all 6 digits first." });
      return;
    }
    setVerifyLoading(true);
    try {
      await authApi.forgotPasswordVerifyOTP(email, otp);
      setOtpVerified(true);
      toast({ title: "Code verified!", description: "Now set your new password." });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Invalid code", description: err instanceof Error ? err.message : "Please try again" });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailLoading(true);
    try {
      await authApi.forgotPasswordRequestOTP(email.trim().toLowerCase());
      toast({ title: "Reset code sent!", description: `Check ${email} for your 6-digit code.` });
      setStep("reset");
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed to send code" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid code", description: "Please enter the 6-digit code." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please make sure both passwords are the same." });
      return;
    }
    setResetLoading(true);
    try {
      await authApi.forgotPasswordReset(email, otp, newPassword);
      toast({ title: "Password reset!", description: "You can now log in with your new password." });
      setStep("done");
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Reset failed", description: err instanceof Error ? err.message : "Please try again" });
    } finally {
      setResetLoading(false);
    }
  };

  const stepIndex: Record<Step, number> = { email: 0, reset: 1, done: 2 };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 shadow-lg mb-3">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bio-Batch Assist</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Reset your password</p>
        </div>

        {/* Step indicators */}
        {step !== "done" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["email", "reset"] as const).map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  stepIndex[step] > i
                    ? "bg-violet-600 text-white"
                    : stepIndex[step] === i
                      ? "bg-violet-600 text-white ring-4 ring-violet-200"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
                ].join(" ")}>
                  {stepIndex[step] > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < 1 && (
                  <div className={[
                    "w-10 h-0.5 mx-1",
                    stepIndex[step] > i ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700",
                  ].join(" ")} />
                )}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {step === "email" && (
            <motion.div key="email"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Find your account</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Enter your registered email address and we'll send you a reset code.
              </p>
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email" type="email" placeholder="you@company.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={emailLoading}>
                  {emailLoading ? "Sending…" : "Send Reset Code"}
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                Remember your password?{" "}
                <Link to="/login" className="text-violet-600 hover:underline font-medium">Sign in</Link>
              </p>
            </motion.div>
          )}

          {/* Step 2: OTP + New Password */}
          {step === "reset" && (
            <motion.div key="reset"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Reset your password</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Enter the 6-digit code sent to:
              </p>
              <p className="text-sm font-medium text-violet-600 mb-6">{email}</p>

              <div className="space-y-5">
                {/* OTP Entry */}
                <div>
                  <Label className="mb-2 block">Verification Code</Label>
                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <input
                        key={i}
                        ref={(el) => { fpOtpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[i] || ""}
                        onChange={(e) => handleFpOtpInput(i, e.target.value)}
                        onKeyDown={(e) => handleFpOtpKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        disabled={otpVerified}
                        className={
                          "w-12 h-12 rounded-full text-center text-xl font-bold outline-none transition-all duration-150 " +
                          "bg-white dark:bg-gray-800 text-gray-900 dark:text-white " +
                          (otpVerified
                            ? "border-2 border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)] opacity-70 cursor-not-allowed"
                            : otp[i]
                              ? "border-2 border-violet-500 shadow-[0_0_0_3px_rgba(124,58,237,0.25)]"
                              : "border-2 border-gray-200 dark:border-gray-600 hover:border-violet-400 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.25)]")
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Verify Code button — shown until OTP is verified */}
                {!otpVerified && (
                  <Button
                    type="button"
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    onClick={handleVerifyOTP}
                    disabled={verifyLoading || otp.replace(/\s/g, '').length !== 6}
                  >
                    {verifyLoading ? "Verifying…" : "Verify Code"}
                  </Button>
                )}

                {/* Verified confirmation banner */}
                {otpVerified && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">Code verified! Set your new password below.</p>
                  </div>
                )}

                {/* Password section — only shown after OTP verified */}
                {otpVerified && (
                  <form onSubmit={handleReset} className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative mt-1">
                        <Input
                          id="newPassword" type={showNewPwd ? "text" : "password"} placeholder="At least 6 characters"
                          value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                        <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthBar password={newPassword} />
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative mt-1">
                        <Input
                          id="confirmPassword" type={showConfirmPwd ? "text" : "password"} placeholder="Repeat your new password"
                          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={resetLoading}>
                      {resetLoading ? "Resetting…" : "Reset Password"}
                    </Button>
                  </form>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 text-center mt-4"
              >
                ← Use a different email
              </button>
            </motion.div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-10 border border-gray-100 dark:border-gray-800 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Your password has been updated. You can now log in with your new password.
              </p>
              <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => navigate("/login")}>
                Go to Sign In
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
