"""Utility functions for the marketplace app"""

def send_transaction_otp_email(user, otp, amount, listing_title):
    """Send OTP via email for transaction verification"""
    from django.core.mail import send_mail
    from django.conf import settings

    subject = f"Transaction OTP for Your Purchase: {listing_title}"

    message = f"""
Hello {user.username},

Your OTP for purchasing "{listing_title}" (${amount}) is: {otp}

This OTP will expire in 10 minutes.

If you didn't initiate this purchase, please ignore this email.

Regards,
The SecureChat Marketplace Team
    """

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')

    try:
        # Send the email
        send_mail(
            subject,
            message,
            from_email,
            [user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending email to {user.email}: {str(e)}")
        return False

def generate_demo_categories():
    """Create some example marketplace categories"""
    from .models import Category
    from django.utils.text import slugify

    categories = [
        "Electronics",
        "Books",
        "Clothing",
        "Home & Garden",
        "Sports & Outdoors",
        "Collectibles",
        "Health & Beauty",
        "Toys & Games",
        "Automotive",
        "Musical Instruments",
    ]

    for category_name in categories:
        Category.objects.get_or_create(
            name=category_name,
            slug=slugify(category_name)
        )

    return len(categories)
