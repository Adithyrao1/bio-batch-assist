"""Patch views.py: split VerifyOTPView, add CompleteSignupView + ForgotPassword views."""
import sys

VIEWS_PATH = 'core/views.py'

NEW_VERIFY_AND_COMPLETE = '''class VerifyOTPView(APIView):
    """
    POST /api/auth/verify-otp/
    Body: {"email": "user@example.com", "otp": "123456"}
    Verifies the OTP and returns a short-lived signed token to proceed to complete-signup.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .serializers import VerifyOTPSerializer
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp']

        # Find valid OTP
        otp_record = UserOTP.objects.filter(
            email=email,
            otp=otp_code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()

        if not otp_record:
            return Response(
                {'error': 'Invalid or expired verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()

        # Issue a short-lived signed token so the profile step can prove email ownership
        verification_token = signing.dumps({'email': email}, salt='signup-email-verification')

        return Response({
            'email_verified': True,
            'verification_token': verification_token,
        })


class CompleteSignupView(APIView):
    """
    POST /api/auth/complete-signup/
    Body: {"verification_token": "...", "first_name": "John", "last_name": "Doe",
           "employee_id": "EMP001", "mobile_number": "9999999999", "gender": "male"}
    Completes registration after email OTP verification.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('verification_token', '').strip()
        if not token:
            return Response(
                {'error': 'Verification token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Valid for 30 minutes
            data = signing.loads(token, salt='signup-email-verification', max_age=1800)
            email = data['email']
        except signing.SignatureExpired:
            return Response(
                {'error': 'Verification session expired. Please restart signup.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except signing.BadSignature:
            return Response(
                {'error': 'Invalid verification token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'This email is already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )

        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        employee_id = request.data.get('employee_id', '').strip() or None
        mobile_number = request.data.get('mobile_number', '').strip() or None
        gender = request.data.get('gender', '').strip() or None

        username = email.split('@')[0]
        if User.objects.filter(username=username).exists():
            username = f"{username}_{random.randint(100, 999)}"

        temp_password = _generate_password()

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=temp_password,
            role='viewer',
            status='active',
            employee_id=employee_id,
            mobile_number=mobile_number,
            gender=gender,
        )

        full_name = f"{first_name} {last_name}".strip() or username

        user_subject = 'Welcome to DCM LabNest: Your Login Credentials'
        user_text = (
            f'Welcome {full_name},\\n\\n'
            f'Your account has been created.\\n'
            f'Username: {username}\\n'
            f'Temporary Password: {temp_password}\\n\\n'
            f'Please log in and change your password immediately.'
        )
        user_html = f"""
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f5f4ff;border-radius:16px;">
            <div style="text-align:center;margin-bottom:30px;">
                <h1 style="color:#1a1035;margin-bottom:5px;">DCM LabNest</h1>
                <p style="color:#6b7280;margin-top:0;font-size:14px;">Account Created Successfully</p>
            </div>
            <div style="background-color:#ffffff;padding:30px;border-radius:12px;box-shadow:0 4px 6px rgba(124,58,237,0.05);border:1px solid rgba(124,58,237,0.1);">
                <h2 style="color:#1a1035;margin-top:0;font-size:20px;">Welcome, {first_name}!</h2>
                <p style="color:#4b5563;line-height:1.5;margin-bottom:15px;">Your account has been successfully created. Here are your temporary login credentials:</p>
                <div style="background-color:#f8fafc;padding:15px;border-radius:8px;border-left:4px solid #7c3aed;margin-bottom:25px;">
                    <p style="margin:0;color:#4b5563;"><strong>Email:</strong> {email}</p>
                    <p style="margin:8px 0 0 0;color:#4b5563;"><strong>Username:</strong> {username}</p>
                    <p style="margin:8px 0 0 0;color:#4b5563;"><strong>Temporary Password:</strong>
                        <span style="font-family:monospace;font-size:16px;font-weight:bold;color:#7c3aed;">{temp_password}</span>
                    </p>
                </div>
                <p style="color:#ef4444;font-size:13px;font-weight:500;margin-bottom:0;">
                    Important: For your security, please change your password immediately after logging in.
                </p>
            </div>
        </div>
        """

        admin_email = 'adithyananuvala001@gmail.com'
        admin_subject = f'New User Registration: {full_name}'
        admin_text = f'New user {full_name} ({email}) signed up. Username: {username}. Temp password: {temp_password}'
        admin_html = f"""
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;border-radius:16px;">
            <div style="background-color:#ffffff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;">
                <h2 style="color:#0f172a;margin-top:0;font-size:18px;">New User Registration</h2>
                <p style="color:#475569;margin-bottom:8px;"><strong>Name:</strong> {full_name}</p>
                <p style="color:#475569;margin-bottom:8px;"><strong>Email:</strong> {email}</p>
                <p style="color:#475569;margin-bottom:8px;"><strong>Username:</strong> {username}</p>
                <p style="color:#475569;margin-bottom:8px;"><strong>Employee ID:</strong> {employee_id or 'N/A'}</p>
                <p style="color:#475569;margin-bottom:8px;"><strong>Mobile:</strong> {mobile_number or 'N/A'}</p>
                <p style="color:#475569;margin-bottom:8px;"><strong>Gender:</strong> {gender or 'N/A'}</p>
                <p style="color:#475569;margin-bottom:0;"><strong>Generated Password:</strong>
                    <span style="font-family:monospace;padding:2px 6px;background:#f1f5f9;border-radius:4px;">{temp_password}</span>
                </p>
            </div>
        </div>
        """

        from django.core.mail import EmailMultiAlternatives
        try:
            user_msg = EmailMultiAlternatives(user_subject, user_text, settings.EMAIL_HOST_USER, [email])
            user_msg.attach_alternative(user_html, "text/html")
            user_msg.send(fail_silently=False)

            admin_msg = EmailMultiAlternatives(admin_subject, admin_text, settings.EMAIL_HOST_USER, [admin_email])
            admin_msg.attach_alternative(admin_html, "text/html")
            admin_msg.send(fail_silently=True)
        except Exception:
            pass

        return Response({
            'message': 'Account created successfully. Your login credentials have been sent to your email.',
            'username': username,
        }, status=status.HTTP_201_CREATED)


class ForgotPasswordRequestView(APIView):
    """
    POST /api/auth/forgot-password/request-otp/
    Body: {"email": "user@example.com"}
    Sends a password-reset OTP to the registered email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'No account found with this email address'},
                status=status.HTTP_404_NOT_FOUND
            )

        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timedelta(minutes=10)

        UserOTP.objects.filter(email=email, is_used=False).update(is_used=True)
        UserOTP.objects.create(email=email, otp=otp_code, expires_at=expires_at)

        subject = 'DCM LabNest: Password Reset Code'
        text_content = (
            f'Hello {user.first_name or user.username}, '
            f'your password reset code is: {otp_code}. '
            f'It expires in 10 minutes.'
        )
        html_content = f"""
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f5f4ff;border-radius:16px;">
            <div style="text-align:center;margin-bottom:30px;">
                <h1 style="color:#1a1035;margin-bottom:5px;">DCM LabNest</h1>
                <p style="color:#6b7280;margin-top:0;font-size:14px;">Password Reset Request</p>
            </div>
            <div style="background-color:#ffffff;padding:30px;border-radius:12px;box-shadow:0 4px 6px rgba(124,58,237,0.05);border:1px solid rgba(124,58,237,0.1);">
                <h2 style="color:#1a1035;margin-top:0;font-size:20px;">Reset Your Password</h2>
                <p style="color:#4b5563;line-height:1.5;margin-bottom:25px;">
                    We received a request to reset the password for your account. Use the code below:
                </p>
                <div style="text-align:center;margin:30px 0;">
                    <div style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(79,70,229,0.1));padding:20px;border-radius:12px;display:inline-block;border:1px solid rgba(124,58,237,0.2);">
                        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#7c3aed;">{otp_code}</span>
                    </div>
                </div>
                <p style="color:#6b7280;font-size:13px;text-align:center;margin-bottom:8px;">This code expires in 10 minutes.</p>
                <p style="color:#ef4444;font-size:13px;text-align:center;margin-bottom:0;">If you did not request this, please ignore this email.</p>
            </div>
        </div>
        """

        try:
            from django.core.mail import EmailMultiAlternatives
            msg = EmailMultiAlternatives(subject, text_content, settings.EMAIL_HOST_USER, [email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            return Response({'message': 'Password reset code sent to your email'})
        except Exception as e:
            return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ForgotPasswordResetView(APIView):
    """
    POST /api/auth/forgot-password/reset/
    Body: {"email": "user@example.com", "otp": "123456", "new_password": "newpass123"}
    Verifies OTP and resets the password.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp_code = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '').strip()

        if not email or not otp_code or not new_password:
            return Response(
                {'error': 'Email, OTP, and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'No account found with this email address'},
                status=status.HTTP_404_NOT_FOUND
            )

        otp_record = UserOTP.objects.filter(
            email=email,
            otp=otp_code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()

        if not otp_record:
            return Response(
                {'error': 'Invalid or expired verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_record.is_used = True
        otp_record.save()

        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password reset successfully. You can now log in with your new password.'})


'''

def patch():
    with open(VIEWS_PATH, 'r', encoding='utf-8') as f:
        original = f.read()

    # 1. Add signing import after 'from django.utils import timezone'
    if 'from django.core import signing' not in original:
        original = original.replace(
            'from django.utils import timezone',
            'from django.utils import timezone\nfrom django.core import signing'
        )

    # 2. Replace VerifyOTPView up through the blank lines before '# AUTH SETTINGS VIEWS'
    verify_start = original.find('class VerifyOTPView(')
    auth_settings_start = original.find('# AUTH SETTINGS VIEWS (OTP PASSWORD CHANGE)')

    if verify_start == -1:
        print("ERROR: Could not find VerifyOTPView", file=sys.stderr)
        sys.exit(1)
    if auth_settings_start == -1:
        print("ERROR: Could not find AUTH SETTINGS VIEWS marker", file=sys.stderr)
        sys.exit(1)

    # Strip trailing whitespace/newlines in the section between end of VerifyOTPView and the comment
    # We keep everything before VerifyOTPView, then put new section, then the divider + AUTH SETTINGS
    prefix = original[:verify_start]
    suffix = original[auth_settings_start:]

    patched = prefix + NEW_VERIFY_AND_COMPLETE + suffix

    with open(VIEWS_PATH, 'w', encoding='utf-8') as f:
        f.write(patched)

    print("views.py patched successfully.")

if __name__ == '__main__':
    patch()
