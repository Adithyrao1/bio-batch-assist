"""Fix App.tsx: add ForgotPassword import and route."""

APP_PATH = 'c:/Users/62880/Desktop/Lab_Culture/bio-batch-assist/src/App.tsx'

with open(APP_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
old_import = 'import Signup from "./pages/Signup";\nimport Dashboard from "./pages/Dashboard";'
new_import = 'import Signup from "./pages/Signup";\nimport ForgotPassword from "./pages/ForgotPassword";\nimport Dashboard from "./pages/Dashboard";'

# 2. Add route - find signup route line
signup_route = 'path="/signup"'
dashboard_route = 'path="/dashboard"'

count_import = content.count(old_import)
print(f'import match count: {count_import}')

idx_signup = content.find(signup_route)
idx_dash = content.find(dashboard_route)
print(f'signup route at: {idx_signup}, dash route at: {idx_dash}')
print(repr(content[idx_signup-20:idx_signup+80]))
print(repr(content[idx_dash-20:idx_dash+10]))
