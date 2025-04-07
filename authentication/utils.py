import random
import string
import logging
from django.conf import settings
from django.core.mail import send_mail
from .models import LoginAttempt
from django.utils import timezone
from datetime import timedelta

# Setup logger
logger = logging.getLogger(__name__)

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email(user, otp, purpose="EMAIL_VERIFICATION"):
    """Send OTP email to the user"""
    subject = "Verification Code"

    if purpose == "EMAIL_VERIFICATION":
        message = f"""
Hello {user.username},

Your email verification code is: {otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Regards,
The Secure Chat App Team
        """
    elif purpose == "PASSWORD_RESET":
        message = f"""
Hello {user.username},

Your password reset code is: {otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Regards,
The Secure Chat App Team
        """

    # Get from_email, defaulting if not set
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')

    try:
        # Send the actual email
        result = send_mail(
            subject,
            message,
            from_email,
            [user.email],
            fail_silently=False,
        )

        logger.info(f"Email sending result for {user.email}: {result}")
        return result
    except Exception as e:
        logger.error(f"Error sending email to {user.email}: {str(e)}")
        return 0  # Return 0 to indicate failure

def check_suspicious_activity(username, ip_address=None, user_agent=None, login_success=False):
    """
    Check for suspicious login activity
    Returns: (is_suspicious, reason)
    """
    # Define defaults for missing settings
    login_window = getattr(settings, 'LOGIN_ATTEMPT_WINDOW', timedelta(hours=24))
    max_failed = getattr(settings, 'MAX_FAILED_LOGINS', 5)
    max_rapid = getattr(settings, 'MAX_RAPID_ATTEMPTS', 10)
    rapid_seconds = getattr(settings, 'RAPID_ATTEMPT_SECONDS', 60)
    suspicious_ip_count = getattr(settings, 'SUSPICIOUS_IP_COUNT', 3)

    # Get recent login attempts for this username
    recent_attempts = LoginAttempt.objects.filter(
        username=username,
        timestamp__gte=timezone.now() - login_window
    )

    # Record this attempt
    LoginAttempt.objects.create(
        username=username,
        ip_address=ip_address,
        user_agent=user_agent,
        success=login_success
    )

    # Check for excessive failed attempts
    failed_attempts = recent_attempts.filter(success=False).count()
    if failed_attempts >= max_failed - 1:  # -1 because we're not counting the current attempt yet
        return True, "Excessive failed login attempts"

    # Check for rapid-fire attempts (potential brute force)
    if recent_attempts.count() >= max_rapid:
        first_attempt = recent_attempts.order_by('timestamp').first()
        last_attempt = recent_attempts.order_by('-timestamp').first()
        if first_attempt and last_attempt:
            time_diff = (last_attempt.timestamp - first_attempt.timestamp).total_seconds()
            if time_diff < rapid_seconds:
                return True, "Too many rapid login attempts"

    # Check for multiple IP addresses
    if ip_address:  # Only check if we have an IP address
        ip_addresses = set(attempt.ip_address for attempt in recent_attempts if attempt.ip_address)
        if len(ip_addresses) >= suspicious_ip_count:
            return True, "Multiple IP addresses used for login"

    return False, ""
