"""Fix hooks violation: replace Array.from(...useRef) with useRef<HTMLInputElement[]>."""

SIGNUP_PATH = 'c:/Users/62880/Desktop/Lab_Culture/bio-batch-assist/src/pages/Signup.tsx'
FP_PATH = 'c:/Users/62880/Desktop/Lab_Culture/bio-batch-assist/src/pages/ForgotPassword.tsx'

# ── Fix Signup.tsx ─────────────────────────────────────────────────
with open(SIGNUP_PATH, 'r', encoding='utf-8') as f:
    signup = f.read()

# Replace the Array.from pattern with a proper useRef
OLD_SIGNUP_REFS = (
    '  const confettiFired = useRef(false);\n'
    '  const otpRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));'
)
NEW_SIGNUP_REFS = (
    '  const confettiFired = useRef(false);\n'
    '  const otpRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);'
)
assert signup.count(OLD_SIGNUP_REFS) == 1, f"Signup refs found {signup.count(OLD_SIGNUP_REFS)} times"
signup = signup.replace(OLD_SIGNUP_REFS, NEW_SIGNUP_REFS, 1)

# Update ref usage: otpRefs[i].current -> otpRefs.current[i]
signup = signup.replace('otpRefs[idx + 1].current?.focus()', 'otpRefs.current[idx + 1]?.focus()')
signup = signup.replace('otpRefs[idx - 1].current?.focus()', 'otpRefs.current[idx - 1]?.focus()')
signup = signup.replace('ref={otpRefs[i]}', 'ref={(el) => { otpRefs.current[i] = el; }}')

with open(SIGNUP_PATH, 'w', encoding='utf-8') as f:
    f.write(signup)
print("Signup.tsx refs fixed.")

# ── Fix ForgotPassword.tsx ─────────────────────────────────────────
with open(FP_PATH, 'r', encoding='utf-8') as f:
    fp = f.read()

OLD_FP_REFS = (
    '  const fpOtpRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));'
)
NEW_FP_REFS = (
    '  const fpOtpRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);'
)
assert fp.count(OLD_FP_REFS) == 1, f"FP refs found {fp.count(OLD_FP_REFS)} times"
fp = fp.replace(OLD_FP_REFS, NEW_FP_REFS, 1)

# Update ref usage
fp = fp.replace('fpOtpRefs[idx + 1].current?.focus()', 'fpOtpRefs.current[idx + 1]?.focus()')
fp = fp.replace('fpOtpRefs[idx - 1].current?.focus()', 'fpOtpRefs.current[idx - 1]?.focus()')
fp = fp.replace('ref={fpOtpRefs[i]}', 'ref={(el) => { fpOtpRefs.current[i] = el; }}')

with open(FP_PATH, 'w', encoding='utf-8') as f:
    f.write(fp)
print("ForgotPassword.tsx refs fixed.")
