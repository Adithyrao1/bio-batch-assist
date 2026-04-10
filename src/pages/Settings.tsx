import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Lock, Mail, ShieldCheck, Clock, CheckCircle2, ArrowRight } from "lucide-react";
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
  
  // States for password reset flow
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
          Account Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account profile and security preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PROFILE OVERVIEW CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card/30 backdrop-blur-md rounded-2xl border border-white/10 dark:border-white/5 shadow-xl p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10 pointer-events-none">
            <ShieldCheck className="w-48 h-48" />
          </div>
          
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-500" />
            Profile Details
          </h2>
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={user.name}
                profilePicture={user.profile_picture}
                size="lg"
              />
              <div>
                <div className="text-lg font-semibold">{user.name}</div>
                <div className="text-sm text-muted-foreground">@{user.username}</div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
              <div className="text-lg font-medium mt-1">{user.name}</div>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
              <div className="text-lg font-medium mt-1">@{user.username}</div>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-lg font-medium">{user.email}</div>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</label>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium text-sm capitalize">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user.role}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SECURITY & PASSWORD CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card/30 backdrop-blur-md rounded-2xl border border-white/10 dark:border-white/5 shadow-xl p-8 relative overflow-hidden"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" />
            Security
          </h2>

          <AnimatePresence mode="wait">
            {passwordChanged ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-10"
              >
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Password Updated</h3>
                <p className="text-muted-foreground text-sm">Your new password is now active.</p>
              </motion.div>
            ) : !otpSent ? (
              <motion.div
                key="request"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col space-y-6"
              >
                <div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    To change your password, we need to verify your identity. We'll send a 6-digit authorization code to your registered email address securely.
                  </p>
                  
                  <div className="bg-background/50 rounded-xl p-4 border border-border/50 flex items-start gap-4">
                    <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Target Email</div>
                      <div className="text-muted-foreground text-sm">{user.email}</div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleRequestOTP} 
                  disabled={isRequestingOTP}
                  className="w-full mt-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {isRequestingOTP ? "Sending..." : "Send Authorization Code"}
                  {!isRequestingOTP && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground pb-2">
                  We've sent a 6-digit code to <span className="font-medium text-foreground">{user.email}</span>.
                </p>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Authorization Code</label>
                  <div className="flex justify-center sm:justify-start">
                    <InputOTP 
                      maxLength={6} 
                      value={otp} 
                      onChange={setOtp}
                      disabled={isVerifying}
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot 
                            key={index} 
                            index={index} 
                            className="w-10 h-12 sm:w-12 sm:h-14 text-lg rounded-md border-border/50 bg-background/50 data-[state=active]:border-indigo-500 data-[state=active]:ring-1 data-[state=active]:ring-indigo-500 shadow-sm"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isVerifying}
                    className="h-12 bg-background/50 border-border/50 focus-visible:ring-indigo-500"
                  />
                </div>

                <Button 
                  onClick={handleVerifyOTP} 
                  disabled={isVerifying || otp.length !== 6 || newPassword.length < 6}
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {isVerifying ? "Verifying..." : "Update Password"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}
