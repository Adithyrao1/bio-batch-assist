import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Lock, Mail, ShieldCheck, CheckCircle2, ArrowRight,
  User, KeyRound, BadgeCheck, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { UserAvatar } from "@/components/UserAvatar";

export default function Settings() {
  const { user } = useAuth();

  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);

  if (!user) return null;

  const handleRequestOTP = async () => {
    try {
      setIsRequestingOTP(true);
      await authApi.requestSettingsOTP();
      setOtpSent(true);
      toast.success("Authorization code sent to your email!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send code");
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return toast.error("Please enter a valid 6-digit code");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    try {
      setIsVerifying(true);
      await authApi.verifySettingsOTP(otp, newPassword);
      setPasswordChanged(true);
      toast.success("Password successfully changed!");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify code");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-zinc-700 px-8 py-6 shadow-xl"
      >
        <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-slate-400/20 blur-2xl pointer-events-none" />
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.10] hidden lg:block pointer-events-none">
          <Settings2 className="h-28 w-28 text-white" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center">
              <Settings2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Account
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">Settings</h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Manage your profile and security preferences
          </p>
        </div>
      </motion.div>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Profile card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border/40">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm flex-shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Profile Details</span>
          </div>

          <div className="p-6 space-y-5">
            {/* Avatar + name row */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/40">
              <UserAvatar
                name={user.name}
                profilePicture={user.profile_picture}
                size="lg"
              />
              <div>
                <p className="text-base font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {[
                { label: "Full Name", value: user.name, icon: <User className="h-3.5 w-3.5" /> },
                { label: "Username", value: `@${user.username}`, icon: <BadgeCheck className="h-3.5 w-3.5" /> },
              ].map(({ label, value, icon }) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {label}
                  </p>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-muted/40 border border-border/50">
                    <span className="text-muted-foreground">{icon}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                </div>
              ))}

              {/* Email with verified badge */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </p>
                <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-muted/40 border border-border/50">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">{user.email}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Role badge */}
            <div className="pt-4 border-t border-border/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Role</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 capitalize">
                <ShieldCheck className="h-4 w-4" />
                {user.role}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Security card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border/40">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm flex-shrink-0">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Security</span>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">

              {/* ── Success state ── */}
              {passwordChanged ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center justify-center text-center py-12 gap-4"
                >
                  <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Password Updated</h3>
                    <p className="text-sm text-muted-foreground mt-1">Your new password is now active.</p>
                  </div>
                </motion.div>

              ) : !otpSent ? (
                /* ── Request OTP state ── */
                <motion.div
                  key="request"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To change your password, we'll verify your identity by sending a 6-digit code to your registered email.
                  </p>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/70 dark:text-indigo-400/70 mb-0.5">
                        Sending code to
                      </p>
                      <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{user.email}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleRequestOTP}
                    disabled={isRequestingOTP}
                    className="w-full h-11 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl shadow-md shadow-indigo-500/20 font-semibold mt-2"
                  >
                    {isRequestingOTP ? (
                      "Sending…"
                    ) : (
                      <>Send Authorization Code <ArrowRight className="h-4 w-4 ml-1.5" /></>
                    )}
                  </Button>
                </motion.div>

              ) : (
                /* ── Verify & set password state ── */
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-muted-foreground">
                    Code sent to{" "}
                    <span className="font-semibold text-foreground">{user.email}</span>
                  </p>

                  {/* OTP field */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Authorization Code
                    </p>
                    <div className="flex justify-center sm:justify-start">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        disabled={isVerifying}
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className="w-10 h-12 sm:w-11 sm:h-13 text-lg rounded-xl border-border/50 bg-muted/40 data-[active=true]:border-indigo-500 data-[active=true]:ring-1 data-[active=true]:ring-indigo-500 shadow-sm font-mono"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {/* New password */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      New Password
                    </p>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isVerifying}
                        className="pl-9 h-11 rounded-xl bg-muted/40 border-border/50 focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isVerifying || otp.length !== 6 || newPassword.length < 6}
                    className="w-full h-11 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 font-semibold"
                  >
                    {isVerifying ? "Verifying…" : "Update Password"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
