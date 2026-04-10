import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout, Mail, CheckCircle2, PartyPopper, User, Phone, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

type Step = "email" | "verify" | "profile" | "done";

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");

  // Step 1
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Step 2
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");

  // Step 3
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gender, setGender] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Step 4
  const [accountUsername, setAccountUsername] = useState("");
  const confettiFired = useRef(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

  useEffect(() => {
    if (step === "done" && !confettiFired.current) {
      confettiFired.current = true;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  }, [step]);

  const handleOtpInput = (idx: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const digits = otp.split("");
    digits[idx] = val;
    const next = digits.join("");
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otp[idx]) {
        const digits = otp.split("");
        digits[idx] = "";
        setOtp(digits.join(""));
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailLoading(true);
    try {
      await authApi.requestSignupOTP(email.trim().toLowerCase());
      toast({ title: "Verification code sent!", description: `Check ${email} for your 6-digit code.` });
      setStep("verify");
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed to send code" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setOtpLoading(true);
    try {
      const result = await authApi.verifySignupOTP(email, otp);
      setVerificationToken(result.verification_token);
      toast({ title: "Email verified!", description: "Now fill in your profile details." });
      setStep("profile");
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Verification failed", description: err instanceof Error ? err.message : "Invalid code" });
      setOtp("");
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6 && step === "verify" && !otpLoading) {
      handleVerifyOTP();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: "destructive", title: "Required fields missing", description: "First name and last name are required." });
      return;
    }
    setProfileLoading(true);
    try {
      const result = await authApi.completeSignup({
        verification_token: verificationToken,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        employee_id: employeeId.trim(),
        mobile_number: mobileNumber.trim(),
        gender,
      });
      setAccountUsername(result.username);
      setStep("done");
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Signup failed", description: err instanceof Error ? err.message : "Please try again" });
    } finally {
      setProfileLoading(false);
    }
  };

  const stepIndex = { email: 0, verify: 1, profile: 2, done: 3 };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 shadow-lg mb-3">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DCM LabNest</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your account</p>
        </div>

        {step !== "done" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["email", "verify", "profile"] as const).map((s, i) => (
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
                {i < 2 && (
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
          {step === "email" && (
            <motion.div key="email"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Enter your email</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                We'll send a 6-digit verification code to confirm your email address.
              </p>
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email" type="email" placeholder="you@company.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={emailLoading}>
                  {emailLoading ? "Sending…" : "Send Verification Code"}
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                Already have an account?{" "}
                <Link to="/login" className="text-violet-600 hover:underline font-medium">Sign in</Link>
              </p>
            </motion.div>
          )}

          {step === "verify" && (
            <motion.div key="verify"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Verify your email</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Enter the 6-digit code sent to:
              </p>
              <p className="text-sm font-medium text-violet-600 mb-6">{email}</p>

              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] || ""}
                    onChange={(e) => handleOtpInput(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    className={
                      "w-12 h-12 rounded-full text-center text-xl font-bold outline-none transition-all duration-150 " +
                      "bg-white dark:bg-gray-800 text-gray-900 dark:text-white " +
                      (otp[i]
                        ? "border-2 border-violet-500 shadow-[0_0_0_3px_rgba(124,58,237,0.25)]"
                        : "border-2 border-gray-200 dark:border-gray-600 hover:border-violet-400 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.25)]")
                    }
                  />
                ))}
              </div>

              {otpLoading && (
                <p className="text-center text-sm text-violet-500 animate-pulse mb-4">Verifying…</p>
              )}

              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 text-center mt-2"
              >
                ← Use a different email
              </button>
            </motion.div>
          )}

          {step === "profile" && (
            <motion.div key="profile"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Complete your profile</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Your login credentials will be emailed to{" "}
                <span className="font-medium text-violet-600">{email}</span> after this step.
              </p>
              <form onSubmit={handleCompleteSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                    <Input id="firstName" placeholder="John" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                    <Input id="lastName" placeholder="Doe" value={lastName}
                      onChange={(e) => setLastName(e.target.value)} required className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="employeeId" className="flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> Employee ID
                  </Label>
                  <Input id="employeeId" placeholder="EMP001 (optional)" value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="mobile" className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Mobile Number
                  </Label>
                  <Input id="mobile" type="tel" placeholder="+91 9999999999 (optional)"
                    value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="mt-1" id="gender">
                      <SelectValue placeholder="Select gender (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-700 mt-2"
                  disabled={profileLoading}
                >
                  {profileLoading ? "Creating account…" : "Create Account"}
                </Button>
              </form>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-10 border border-gray-100 dark:border-gray-800 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 mb-4">
                <PartyPopper className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're all set!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Your account has been created. Check your email for login credentials.
              </p>
              {accountUsername && (
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-3 mb-6 inline-block">
                  <p className="text-xs text-violet-500 font-medium uppercase tracking-wide mb-0.5">Your username</p>
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{accountUsername}</p>
                </div>
              )}
              <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => navigate("/login")}>
                Sign In Now
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
