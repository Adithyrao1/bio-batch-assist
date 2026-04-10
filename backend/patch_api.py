"""Patch src/lib/api.ts to update verifySignupOTP and add completeSignup + forgotPassword functions."""
import sys

API_PATH = '../src/lib/api.ts'

OLD_VERIFY_SIGNUP = "async verifySignupOTP(email: string, otp: string): Promise<{ message: string; username: string }> {\n    const response = await fetch(`${API_BASE_URL}/auth/verify-otp/`, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ email, otp }),\n      credentials: 'include',\n    });\n    if (!response.ok) {\n      const error = await response.json();\n      throw new Error(error.error || 'Invalid or expired code');\n    }\n    return response.json();\n  },"

NEW_VERIFY_AND_COMPLETE = (
    "async verifySignupOTP(email: string, otp: string): Promise<{ email_verified: boolean; verification_token: string }> {\n"
    "    const response = await fetch(`${API_BASE_URL}/auth/verify-otp/`, {\n"
    "      method: 'POST',\n"
    "      headers: { 'Content-Type': 'application/json' },\n"
    "      body: JSON.stringify({ email, otp }),\n"
    "      credentials: 'include',\n"
    "    });\n"
    "    if (!response.ok) {\n"
    "      const error = await response.json();\n"
    "      throw new Error(error.error || 'Invalid or expired code');\n"
    "    }\n"
    "    return response.json();\n"
    "  },\n"
    "\n"
    "  async completeSignup(data: {\n"
    "    verification_token: string;\n"
    "    first_name: string;\n"
    "    last_name: string;\n"
    "    employee_id: string;\n"
    "    mobile_number: string;\n"
    "    gender: string;\n"
    "  }): Promise<{ message: string; username: string }> {\n"
    "    const response = await fetch(`${API_BASE_URL}/auth/complete-signup/`, {\n"
    "      method: 'POST',\n"
    "      headers: { 'Content-Type': 'application/json' },\n"
    "      body: JSON.stringify(data),\n"
    "      credentials: 'include',\n"
    "    });\n"
    "    if (!response.ok) {\n"
    "      const error = await response.json();\n"
    "      throw new Error(error.error || 'Failed to complete signup');\n"
    "    }\n"
    "    return response.json();\n"
    "  },\n"
    "\n"
    "  async forgotPasswordRequestOTP(email: string): Promise<{ message: string }> {\n"
    "    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/request-otp/`, {\n"
    "      method: 'POST',\n"
    "      headers: { 'Content-Type': 'application/json' },\n"
    "      body: JSON.stringify({ email }),\n"
    "      credentials: 'include',\n"
    "    });\n"
    "    if (!response.ok) {\n"
    "      const error = await response.json();\n"
    "      throw new Error(error.error || 'Failed to send reset code');\n"
    "    }\n"
    "    return response.json();\n"
    "  },\n"
    "\n"
    "  async forgotPasswordReset(email: string, otp: string, new_password: string): Promise<{ message: string }> {\n"
    "    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset/`, {\n"
    "      method: 'POST',\n"
    "      headers: { 'Content-Type': 'application/json' },\n"
    "      body: JSON.stringify({ email, otp, new_password }),\n"
    "      credentials: 'include',\n"
    "    });\n"
    "    if (!response.ok) {\n"
    "      const error = await response.json();\n"
    "      throw new Error(error.error || 'Failed to reset password');\n"
    "    }\n"
    "    return response.json();\n"
    "  },"
)

with open(API_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

if OLD_VERIFY_SIGNUP not in content:
    print("ERROR: Could not find verifySignupOTP in api.ts", file=sys.stderr)
    sys.exit(1)

patched = content.replace(OLD_VERIFY_SIGNUP, NEW_VERIFY_AND_COMPLETE)

with open(API_PATH, 'w', encoding='utf-8') as f:
    f.write(patched)

print("api.ts patched successfully.")
