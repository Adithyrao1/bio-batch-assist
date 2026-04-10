"""Fix App.tsx: add ForgotPassword import and route, and fix OTP styling in Signup + ForgotPassword."""

APP_PATH = 'c:/Users/62880/Desktop/Lab_Culture/bio-batch-assist/src/App.tsx'

with open(APP_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import after Signup import
OLD_IMPORT = 'import Signup from "./pages/Signup";\nimport Dashboard from "./pages/Dashboard";'
NEW_IMPORT = 'import Signup from "./pages/Signup";\nimport ForgotPassword from "./pages/ForgotPassword";\nimport Dashboard from "./pages/Dashboard";'
assert content.count(OLD_IMPORT) == 1, f"Import found {content.count(OLD_IMPORT)} times"
content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2. Add forgot-password route after signup route
OLD_ROUTE = '\n            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />\n            <Route path="/dashboard"'
NEW_ROUTE = '\n            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />\n            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />\n            <Route path="/dashboard"'
assert content.count(OLD_ROUTE) == 1, f"Route found {content.count(OLD_ROUTE)} times"
content = content.replace(OLD_ROUTE, NEW_ROUTE, 1)

with open(APP_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx patched successfully.")
print("forgot-password in file:", "/forgot-password" in content)
print("ForgotPassword import in file:", "ForgotPassword" in content)
