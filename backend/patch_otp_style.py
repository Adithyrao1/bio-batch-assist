"""Replace InputOTP in Signup.tsx and ForgotPassword.tsx with custom circular OTP inputs."""

import re

# ── Custom OTP component (inline JSX replacement) ─────────────────
# This replaces the whole InputOTP block in both files
# We'll use a useRef array for focus management.

# ── Signup.tsx ────────────────────────────────────────────────────
SIGNUP_PATH = 'c:/Users/62880/Desktop/Lab_Culture/bio-batch-assist/src/pages/Signup.tsx'

with open(SIGNUP_PATH, 'r', encoding='utf-8') as f:
    signup = f.read()

# 1. Remove InputOTP import line
signup = signup.replace(
    'import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";\n',
    ''
)

# 2. Add otpRefs ref after confettiFired ref
OLD_REF = '  const confettiFired = useRef(false);'
NEW_REF = (
    '  const confettiFired = useRef(false);\n'
    '  const otpRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));'
)
assert signup.count(OLD_REF) == 1
signup = signup.replace(OLD_REF, NEW_REF, 1)

# 3. Add handleOtpChange helper before handleRequestOTP
OLD_HANDLER = '  const handleRequestOTP = async'
NEW_HANDLER = (
    '  const handleOtpInput = (idx: number, val: string) => {\n'
    '    if (!/^[0-9]?$/.test(val)) return;\n'
    '    const digits = otp.split("");\n'
    '    digits[idx] = val;\n'
    '    const next = digits.join("");\n'
    '    setOtp(next);\n'
    '    if (val && idx < 5) otpRefs[idx + 1].current?.focus();\n'
    '  };\n'
    '\n'
    '  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {\n'
    '    if (e.key === "Backspace") {\n'
    '      if (otp[idx]) {\n'
    '        const digits = otp.split("");\n'
    '        digits[idx] = "";\n'
    '        setOtp(digits.join(""));\n'
    '      } else if (idx > 0) {\n'
    '        otpRefs[idx - 1].current?.focus();\n'
    '      }\n'
    '    }\n'
    '    if (e.key === "ArrowLeft" && idx > 0) otpRefs[idx - 1].current?.focus();\n'
    '    if (e.key === "ArrowRight" && idx < 5) otpRefs[idx + 1].current?.focus();\n'
    '  };\n'
    '\n'
    '  const handleRequestOTP = async'
)
assert signup.count(OLD_HANDLER) == 1
signup = signup.replace(OLD_HANDLER, NEW_HANDLER, 1)

# 4. Replace the InputOTP JSX block in verify step
OLD_OTP_JSX = (
    '              <div className="flex justify-center mb-6">\n'
    '                <InputOTP maxLength={6} value={otp} onChange={setOtp}>\n'
    '                  <InputOTPGroup>\n'
    '                    {[0, 1, 2, 3, 4, 5].map((i) => (\n'
    '                      <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg font-bold" />\n'
    '                    ))}\n'
    '                  </InputOTPGroup>\n'
    '                </InputOTP>\n'
    '              </div>'
)
NEW_OTP_JSX = (
    '              <div className="flex justify-center gap-3 mb-6">\n'
    '                {[0, 1, 2, 3, 4, 5].map((i) => (\n'
    '                  <input\n'
    '                    key={i}\n'
    '                    ref={otpRefs[i]}\n'
    '                    type="text"\n'
    '                    inputMode="numeric"\n'
    '                    maxLength={1}\n'
    '                    value={otp[i] || ""}\n'
    '                    onChange={(e) => handleOtpInput(i, e.target.value)}\n'
    '                    onKeyDown={(e) => handleOtpKeyDown(i, e)}\n'
    '                    onFocus={(e) => e.target.select()}\n'
    '                    className={\n'
    '                      "w-12 h-12 rounded-full text-center text-xl font-bold outline-none transition-all duration-150 " +\n'
    '                      "bg-white dark:bg-gray-800 text-gray-900 dark:text-white " +\n'
    '                      (otp[i]\n'
    '                        ? "border-2 border-violet-500 shadow-[0_0_0_3px_rgba(124,58,237,0.25)]"\n'
    '                        : "border-2 border-gray-200 dark:border-gray-600 hover:border-violet-400 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.25)]")\n'
    '                    }\n'
    '                  />\n'
    '                ))}\n'
    '              </div>'
)
assert signup.count(OLD_OTP_JSX) == 1, f"OTP JSX found {signup.count(OLD_OTP_JSX)} times in Signup"
signup = signup.replace(OLD_OTP_JSX, NEW_OTP_JSX, 1)

# 5. Update useEffect dependency note (otp auto-submit still works via setOtp)
with open(SIGNUP_PATH, 'w', encoding='utf-8') as f:
    f.write(signup)
print("Signup.tsx patched.")

# ── ForgotPassword.tsx ────────────────────────────────────────────
FP_PATH = 'c:/Users/62880/Desktop/Lab_Culture/bio-batch-assist/src/pages/ForgotPassword.tsx'

with open(FP_PATH, 'r', encoding='utf-8') as f:
    fp = f.read()

# 1. Remove InputOTP import
fp = fp.replace(
    'import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";\n',
    ''
)

# 2. Add useRef import if not already present
fp = fp.replace(
    'import { useState, useEffect } from "react";',
    'import { useState, useEffect, useRef } from "react";'
)

# 3. Add refs and handlers in ForgotPassword
OLD_FP_STATE = '  const [resetLoading, setResetLoading] = useState(false);'
NEW_FP_STATE = (
    '  const [resetLoading, setResetLoading] = useState(false);\n'
    '  const fpOtpRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));\n'
    '\n'
    '  const handleFpOtpInput = (idx: number, val: string) => {\n'
    '    if (!/^[0-9]?$/.test(val)) return;\n'
    '    const digits = otp.split("");\n'
    '    digits[idx] = val;\n'
    '    const next = digits.join("");\n'
    '    setOtp(next);\n'
    '    if (val && idx < 5) fpOtpRefs[idx + 1].current?.focus();\n'
    '  };\n'
    '\n'
    '  const handleFpOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {\n'
    '    if (e.key === "Backspace") {\n'
    '      if (otp[idx]) {\n'
    '        const digits = otp.split("");\n'
    '        digits[idx] = "";\n'
    '        setOtp(digits.join(""));\n'
    '      } else if (idx > 0) {\n'
    '        fpOtpRefs[idx - 1].current?.focus();\n'
    '      }\n'
    '    }\n'
    '    if (e.key === "ArrowLeft" && idx > 0) fpOtpRefs[idx - 1].current?.focus();\n'
    '    if (e.key === "ArrowRight" && idx < 5) fpOtpRefs[idx + 1].current?.focus();\n'
    '  };'
)
assert fp.count(OLD_FP_STATE) == 1
fp = fp.replace(OLD_FP_STATE, NEW_FP_STATE, 1)

# 4. Replace FP OTP JSX
OLD_FP_OTP_JSX = (
    '                <div className="flex justify-center">\n'
    '                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>\n'
    '                      <InputOTPGroup>\n'
    '                        {[0, 1, 2, 3, 4, 5].map((i) => (\n'
    '                          <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg font-bold" />\n'
    '                        ))}\n'
    '                      </InputOTPGroup>\n'
    '                    </InputOTP>\n'
    '                  </div>'
)
NEW_FP_OTP_JSX = (
    '                <div className="flex justify-center gap-3">\n'
    '                    {[0, 1, 2, 3, 4, 5].map((i) => (\n'
    '                      <input\n'
    '                        key={i}\n'
    '                        ref={fpOtpRefs[i]}\n'
    '                        type="text"\n'
    '                        inputMode="numeric"\n'
    '                        maxLength={1}\n'
    '                        value={otp[i] || ""}\n'
    '                        onChange={(e) => handleFpOtpInput(i, e.target.value)}\n'
    '                        onKeyDown={(e) => handleFpOtpKeyDown(i, e)}\n'
    '                        onFocus={(e) => e.target.select()}\n'
    '                        className={\n'
    '                          "w-12 h-12 rounded-full text-center text-xl font-bold outline-none transition-all duration-150 " +\n'
    '                          "bg-white dark:bg-gray-800 text-gray-900 dark:text-white " +\n'
    '                          (otp[i]\n'
    '                            ? "border-2 border-violet-500 shadow-[0_0_0_3px_rgba(124,58,237,0.25)]"\n'
    '                            : "border-2 border-gray-200 dark:border-gray-600 hover:border-violet-400 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.25)]")\n'
    '                        }\n'
    '                      />\n'
    '                    ))}\n'
    '                  </div>'
)

count = fp.count(OLD_FP_OTP_JSX)
if count != 1:
    print(f"FP OTP JSX found {count} times — searching for actual text...")
    # Try to find the InputOTP block
    idx = fp.find('<InputOTP')
    if idx >= 0:
        print("Found at:", idx)
        print(repr(fp[idx-200:idx+400]))
else:
    fp = fp.replace(OLD_FP_OTP_JSX, NEW_FP_OTP_JSX, 1)
    print("FP OTP JSX replaced.")

with open(FP_PATH, 'w', encoding='utf-8') as f:
    f.write(fp)
print("ForgotPassword.tsx patched.")
