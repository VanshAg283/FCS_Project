import os
import mimetypes
from datetime import timedelta
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken, TokenError
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from .serializers import (ProfileSerializer, ProfileUpdateSerializer, UserUpdateSerializer,
                          UserSerializer, VerificationDocumentSerializer,
                          VerificationDocumentSubmitSerializer, PendingVerificationSerializer,
                          EmailVerificationSerializer, OTPVerificationSerializer,
                          ReportCreateSerializer, ReportSerializer, UserBlockSerializer)
from .models import Profile, Friendship, VerificationDocument, OTPVerification, LoginAttempt, Report, UserBlock
from django.db import models, transaction
from django.utils import timezone
from .utils import generate_otp, send_otp_email, check_suspicious_activity

@api_view(["POST"])
def register_user(request):
    """
    Register a new user - Step 1: Create unverified user and send OTP
    """
    serializer = EmailVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data["username"]
    email = serializer.validated_data["email"]
    password = serializer.validated_data["password"]

    # Check if username already exists
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)

    # Check if email already exists
    if User.objects.filter(email=email).exists():
        return Response({"error": "Email already registered"}, status=status.HTTP_400_BAD_REQUEST)

    # Create user but set is_active=False until email is verified
    with transaction.atomic():
        user = User.objects.create(
            username=username,
            email=email,
            password=make_password(password),
            is_active=False  # User cannot login until email is verified
        )
        Profile.objects.create(user=user)

        # Generate and save OTP
        otp = generate_otp()
        OTPVerification.objects.create(
            user=user,
            otp=otp,
            purpose="EMAIL_VERIFICATION"
        )

        # Send verification email
        send_otp_email(user, otp)

    return Response({
        "message": "Registration initiated. Please verify your email with the OTP sent.",
        "username": username
    }, status=status.HTTP_201_CREATED)

@api_view(["POST"])
def verify_email(request):
    """
    Verify user's email using OTP - Step 2 of registration
    """
    serializer = OTPVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data["username"]
    otp = serializer.validated_data["otp"]

    try:
        user = User.objects.get(username=username, is_active=False)
    except User.DoesNotExist:
        return Response({"error": "Invalid username or already verified"},
                        status=status.HTTP_400_BAD_REQUEST)

    # Find the most recent unused OTP for this user
    otp_record = OTPVerification.objects.filter(
        user=user,
        is_used=False,
        purpose="EMAIL_VERIFICATION",
        created_at__gte=timezone.now() - timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    ).order_by('-created_at').first()

    if not otp_record or otp_record.otp != otp:
        return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

    # Mark OTP as used
    otp_record.is_used = True
    otp_record.save()

    # Activate user
    user.is_active = True
    user.save()

    # Update profile
    profile = Profile.objects.get(user=user)
    profile.email_verified = True
    profile.save()

    # Generate tokens for immediate login
    refresh = RefreshToken.for_user(user)

    return Response({
        "message": "Email verified successfully",
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_staff
        }
    })

@api_view(["POST"])
def resend_verification_email(request):
    """Resend verification email with new OTP"""
    username = request.data.get("username")
    if not username:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username, is_active=False)
    except User.DoesNotExist:
        return Response({"error": "User not found or already verified"},
                        status=status.HTTP_400_BAD_REQUEST)

    # Generate and save new OTP
    otp = generate_otp()
    OTPVerification.objects.create(
        user=user,
        otp=otp,
        purpose="EMAIL_VERIFICATION"
    )

    # Send verification email
    send_otp_email(user, otp)

    return Response({"message": "Verification email resent"})

@api_view(["POST"])
def login_user(request):
    try:
        data = request.data
        username = data.get("username", "")
        password = data.get("password", "")

        # Get IP and user agent for suspicious activity detection
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT')

        # Check if settings exist, if not create defaults to avoid errors
        if not hasattr(settings, 'LOGIN_ATTEMPT_WINDOW'):
            setattr(settings, 'LOGIN_ATTEMPT_WINDOW', timedelta(hours=24))

        # Check for suspicious activity before login attempt
        try:
            is_suspicious, reason = check_suspicious_activity(
                username, ip_address, user_agent, login_success=False
            )

            if is_suspicious:
                # Create a flagged login attempt
                LoginAttempt.objects.filter(
                    username=username,
                    timestamp__gte=timezone.now() - settings.LOGIN_ATTEMPT_WINDOW
                ).update(flagged=True)

                # Calculate when the account will auto-unblock
                auto_unblock_hours = getattr(settings, 'ACCOUNT_AUTO_UNBLOCK_HOURS', 1)
                unblock_time = timezone.now() + timedelta(hours=auto_unblock_hours)

                return Response({
                    "error": f"Account temporarily locked due to suspicious activity. The account will be automatically unlocked in {auto_unblock_hours} hours at {unblock_time.strftime('%Y-%m-%d %H:%M:%S')}."
                }, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            # If there's an error in suspicious activity check, just log it and continue
            print(f"Error checking suspicious activity: {str(e)}")
            # Don't block the login due to this error

        user = authenticate(username=username, password=password)

        if user is not None:
            # Record successful login
            try:
                check_suspicious_activity(username, ip_address, user_agent, login_success=True)
            except Exception as e:
                print(f"Error recording successful login: {str(e)}")
                # Don't block the login due to this error

            refresh = RefreshToken.for_user(user)

            # Get profile picture URL safely
            profile_picture = None
            try:
                profile = Profile.objects.get(user=user)
                if profile.profile_picture:
                    profile_picture = request.build_absolute_uri(profile.profile_picture.url)
            except Exception as e:
                print(f"Error getting profile picture: {str(e)}")
                # Don't fail if we can't get the profile picture

            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "profile_picture": profile_picture,
                    "is_admin": user.is_superuser
                }
            })

        # Login failed
        return Response({"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    except Exception as e:
        print(f"Login error: {str(e)}")
        return Response({"error": "An error occurred during login. Please try again."},
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "profile_picture": request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
        "bio": profile.bio,
        "is_admin": request.user.is_superuser,
        "email_verified": profile.email_verified
    })

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_profile(request):
    user = request.user
    profile = Profile.objects.get(user=user)

    # Update username if provided
    if "username" in request.data:
        user_serializer = UserUpdateSerializer(user, data={"username": request.data["username"]}, partial=True)
        if user_serializer.is_valid():
            user_serializer.save()

    # Update profile fields if provided
    profile_data = {}
    if "profile_picture" in request.data:
        profile_data["profile_picture"] = request.data["profile_picture"]
    if "bio" in request.data:
        profile_data["bio"] = request.data["bio"]

    if profile_data:
        profile_serializer = ProfileUpdateSerializer(profile, data=profile_data, partial=True)
        if profile_serializer.is_valid():
            profile_serializer.save()

    return Response({
        "message": "Profile updated successfully",
        "username": user.username,
        "profile_picture": request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
        "bio": profile.bio
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_suspicious_activity(request):
    """Get flagged login attempts for admin review"""
    flagged_attempts = LoginAttempt.objects.filter(flagged=True).order_by('-timestamp')

    data = []
    for attempt in flagged_attempts:
        data.append({
            "id": attempt.id,
            "username": attempt.username,
            "ip_address": attempt.ip_address,
            "user_agent": attempt.user_agent,
            "success": attempt.success,
            "timestamp": attempt.timestamp,
            "reason": "Multiple failed attempts"  # This could be more specific
        })

    return Response(data)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def resolve_suspicious_activity(request, attempt_id):
    """Mark suspicious activity as resolved"""
    try:
        attempt = LoginAttempt.objects.get(id=attempt_id)
        attempt.flagged = False
        attempt.save()

        # Also unflag other related attempts
        LoginAttempt.objects.filter(
            username=attempt.username,
            timestamp__gte=timezone.now() - settings.LOGIN_ATTEMPT_WINDOW
        ).update(flagged=False)

        return Response({"message": "Suspicious activity resolved"})
    except LoginAttempt.DoesNotExist:
        return Response({"error": "Login attempt not found"}, status=404)

@api_view(["POST"])
def admin_account_unlock(request):
    """Special endpoint to unlock admin accounts that were locked due to suspicious activity"""
    username = request.data.get('username')
    master_key = request.data.get('master_key')

    # Check if the master key matches the one in settings
    if not hasattr(settings, 'ADMIN_MASTER_KEY') or master_key != settings.ADMIN_MASTER_KEY:
        return Response({"error": "Invalid master key"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Find the user
        user = User.objects.get(username=username)

        # Check if the user is an admin
        if not (user.is_staff or user.is_superuser):
            return Response({"error": "This feature is only for admin accounts"},
                          status=status.HTTP_403_FORBIDDEN)

        # Delete all login attempts for this user to completely reset the account's login history
        LoginAttempt.objects.filter(username=username).delete()

        # Ensure account is active
        if not user.is_active:
            user.is_active = True
            user.save()

        # Generate tokens so admin can login immediately
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": f"Admin account {username} has been unlocked successfully. You can now log in.",
            "refresh": str(refresh),
            "access": str(refresh.access_token)
        })
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_reset_login_attempts(request):
    """Reset all login attempts for a user to completely unblock them"""
    username = request.data.get('username')
    if not username:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Delete all login attempts for this user
    deleted_count = LoginAttempt.objects.filter(username=username).delete()[0]

    # Ensure user account is active
    try:
        user = User.objects.get(username=username)
        if not user.is_active:
            user.is_active = True
            user.save()
    except User.DoesNotExist:
        pass  # If user doesn't exist, just continue

    return Response({
        "message": f"Successfully cleared all login history for {username}. Account is now unblocked.",
        "deleted_count": deleted_count
    })

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_profile_picture(request):
    profile = Profile.objects.get(user=request.user)

    if profile.profile_picture:
        profile.profile_picture.delete()  # ✅ Delete image from storage
        profile.profile_picture = None
        profile.save()

    return Response({"message": "Profile picture removed successfully."}, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_users(request):
    query = request.GET.get('q', '')
    if len(query) < 3:
        return Response({"error": "Search query must be at least 3 characters"}, status=400)

    users = User.objects.filter(username__icontains=query).exclude(id=request.user.id)
    serializer = UserSerializer(users, many=True)
    data = serializer.data

    # Add friendship status for each user
    for user_data in data:
        user_data['friendship_status'] = get_friendship_status(request.user.id, user_data['id'])

    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_friends(request):
    # Get all accepted friendships where the user is either sender or receiver
    friendships = Friendship.objects.filter(
        (models.Q(sender=request.user) | models.Q(receiver=request.user)),
        status='ACCEPTED'
    )

    # Extract friend users from friendships
    friends = []
    for friendship in friendships:
        friend = friendship.receiver if friendship.sender == request.user else friendship.sender
        friends.append(friend)

    serializer = UserSerializer(friends, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    receiver_id = request.data.get('receiver')
    if not receiver_id:
        return Response({"error": "Receiver ID is required"}, status=400)

    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if Friendship.objects.filter(
        (models.Q(sender=request.user, receiver=receiver) |
         models.Q(sender=receiver, receiver=request.user)),
        status='ACCEPTED'
    ).exists():
        return Response({"error": "Already friends"}, status=400)

    friendship, created = Friendship.objects.get_or_create(
        sender=request.user,
        receiver=receiver,
        defaults={'status': 'PENDING'}
    )

    if not created:
        return Response({"error": "Friend request already sent"}, status=400)

    return Response({"message": "Friend request sent successfully"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def respond_friend_request(request):
    request_id = request.data.get('request_id')
    action = request.data.get('action')

    if action not in ['accept', 'reject']:
        return Response({"error": "Invalid action"}, status=400)

    try:
        friendship = Friendship.objects.get(
            id=request_id,
            receiver=request.user,
            status='PENDING'
        )
    except Friendship.DoesNotExist:
        return Response({"error": "Friend request not found"}, status=404)

    friendship.status = 'ACCEPTED' if action == 'accept' else 'REJECTED'
    friendship.save()

    return Response({"message": f"Friend request {action}ed"})

def get_friendship_status(user1_id, user2_id):
    try:
        friendship = Friendship.objects.get(
            (models.Q(sender_id=user1_id, receiver_id=user2_id) |
             models.Q(sender_id=user2_id, receiver_id=user1_id))
        )
        return friendship.status
    except Friendship.DoesNotExist:
        return None

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_users(request):
    # Get all accepted friendships
    friendships = Friendship.objects.filter(
        (models.Q(sender=request.user) | models.Q(receiver=request.user)),
        status='ACCEPTED'
    )

    # Extract friend users from friendships
    friends = []
    for friendship in friendships:
        friend = friendship.receiver if friendship.sender == request.user else friendship.sender
        friends.append(friend)

    serializer = UserSerializer(friends, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAdminUser])  # ✅ Only Admins Can Access
def admin_dashboard(request):
    users = User.objects.all()
    user_data = []

    for u in users:
        try:
            profile = Profile.objects.get(user=u)
            # Count documents for this user
            doc_count = VerificationDocument.objects.filter(user=u).count()

            user_data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "verification_status": profile.verification_status,
                "is_verified": profile.is_verified,
                "has_documents": doc_count > 0,
                "document_count": doc_count
            })
        except Profile.DoesNotExist:
            user_data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "verification_status": "UNVERIFIED",
                "is_verified": False,
                "has_documents": False,
                "document_count": 0
            })

    return Response(user_data)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def verify_user(request, user_id):
    try:
        profile = Profile.objects.get(user_id=user_id)
        profile.verification_status = 'VERIFIED'
        profile.verification_notes = request.data.get('notes', 'Verified by admin')
        profile.verification_date = timezone.now()
        profile.save()
        return Response({"message": "User verified successfully."})
    except Profile.DoesNotExist:
        return Response({"error": "User not found."}, status=404)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def reject_user(request, user_id):
    try:
        profile = Profile.objects.get(user_id=user_id)
        profile.verification_status = 'REJECTED'
        profile.verification_notes = request.data.get('notes', 'Rejected by admin')
        profile.verification_date = timezone.now()
        profile.save()
        return Response({"message": "User rejected successfully."})
    except Profile.DoesNotExist:
        return Response({"error": "User not found."}, status=404)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def reset_user_verification(request, user_id):
    """Reset a user's verification status to UNVERIFIED or PENDING (for testing)"""
    try:
        profile = Profile.objects.get(user_id=user_id)

        # Check if user has documents
        has_documents = VerificationDocument.objects.filter(user_id=user_id).exists()

        # If user has documents, set to PENDING instead of UNVERIFIED
        if has_documents:
            profile.verification_status = 'PENDING'
            message = "User verification status reset to PENDING (documents retained)."
        else:
            profile.verification_status = 'UNVERIFIED'
            message = "User verification status reset to UNVERIFIED."

        profile.verification_notes = request.data.get('notes', 'Reset for testing by admin')
        profile.verification_date = timezone.now()
        profile.save()

        return Response({"message": message})
    except Profile.DoesNotExist:
        return Response({"error": "User not found."}, status=404)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_friend_requests(request):
    # Get pending friend requests where the current user is the receiver
    friend_requests = Friendship.objects.filter(
        receiver=request.user,
        status='PENDING'
    )

    return Response([{
        'id': request.id,
        'sender_id': request.sender.id,
        'sender_username': request.sender.username,
        'created_at': request.created_at
    } for request in friend_requests])

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_verification_status(request):
    """Get user's verification status and documents"""
    try:
        profile = Profile.objects.get(user=request.user)
        documents = VerificationDocument.objects.filter(user=request.user)

        return Response({
            "verification_status": profile.verification_status,
            "is_verified": profile.is_verified,
            "verification_notes": profile.verification_notes,
            "verification_date": profile.verification_date,
            "documents": VerificationDocumentSerializer(documents, many=True).data
        })
    except Profile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def submit_verification_document(request):
    """Submit a document for verification"""
    serializer = VerificationDocumentSubmitSerializer(data=request.data)

    if serializer.is_valid():
        # Create the document
        document = serializer.save(user=request.user)

        # Update user's profile verification status to pending
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.verification_status = 'PENDING'
        profile.save()

        return Response({
            "message": "Document submitted successfully for verification",
            "document": VerificationDocumentSerializer(document).data
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_pending_verifications(request):
    """Get all profiles with pending verification status"""
    pending_profiles = Profile.objects.filter(verification_status='PENDING')
    serializer = PendingVerificationSerializer(pending_profiles, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_document_review(request, doc_id):
    """Review a verification document and update user's verification status"""
    try:
        document = VerificationDocument.objects.get(id=doc_id)
    except VerificationDocument.DoesNotExist:
        return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action')
    notes = request.data.get('notes', '')

    if action not in ['approve', 'reject']:
        return Response({"error": "Invalid action. Use 'approve' or 'reject'"},
                        status=status.HTTP_400_BAD_REQUEST)

    profile = Profile.objects.get(user=document.user)
    profile.verification_notes = notes
    profile.verification_date = timezone.now()

    if action == 'approve':
        profile.verification_status = 'VERIFIED'
        message = "User verification approved"
    else:
        profile.verification_status = 'REJECTED'
        message = "User verification rejected"

    profile.save()

    return Response({"message": message, "user": document.user.username})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def serve_document(request, document_id):
    """Securely serve a document file with authorization check"""
    try:
        # Get the document
        document = VerificationDocument.objects.get(id=document_id)

        # Authorization check: Only document owner or admin can access
        if document.user != request.user and not request.user.is_staff:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        # Get the file path
        file_path = document.document_file.path

        # Check if file exists
        if not os.path.exists(file_path):
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        # Determine content type based on file extension
        content_type = mimetypes.guess_type(file_path)[0]
        if not content_type:
            content_type = 'application/octet-stream'  # Default content type

        # Open and serve the file
        with open(file_path, 'rb') as file:
            response = HttpResponse(file.read(), content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
            return response

    except VerificationDocument.DoesNotExist:
        return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_document_info(request, document_id):
    """Get document information without serving the actual file"""
    try:
        document = VerificationDocument.objects.get(id=document_id)

        # Authorization check: Only document owner or admin can access
        if document.user != request.user and not request.user.is_staff:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        serializer = VerificationDocumentSerializer(document, context={"request": request})
        return Response(serializer.data)

    except VerificationDocument.DoesNotExist:
        return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["GET"])
def document_view_with_token(request, document_id):
    """Serve document file with token-based authentication"""
    token = request.GET.get('token')

    if not token:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Validate the token
        validated_token = AccessToken(token)
        user_id = validated_token['user_id']
        user = User.objects.get(id=user_id)

        # Get the document
        document = VerificationDocument.objects.get(id=document_id)

        # Check authorization
        if document.user.id != user.id and not user.is_staff:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        # Get the file path
        file_path = document.document_file.path

        # Check if file exists
        if not os.path.exists(file_path):
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        # Determine content type based on file extension
        content_type = mimetypes.guess_type(file_path)[0]
        if not content_type:
            content_type = 'application/octet-stream'  # Default content type

        # Open and serve the file
        with open(file_path, 'rb') as file:
            response = HttpResponse(file.read(), content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
            return response

    except (VerificationDocument.DoesNotExist, User.DoesNotExist):
        return Response({"error": "Document or user not found"}, status=status.HTTP_404_NOT_FOUND)
    except TokenError:
        return Response({"error": "Invalid or expired token"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_user(request, user_id):
    """Delete a user account (admin only)"""
    try:
        user = User.objects.get(id=user_id)
        username = user.username

        # Delete the user
        user.delete()

        return Response({
            "message": f"User {username} deleted successfully."
        })
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_own_account(request):
    """Allow users to delete their own account"""
    user = request.user
    username = user.username

    # Require password confirmation for security
    password = request.data.get('password')
    if not password:
        return Response({"error": "Password is required to delete account"},
                       status=status.HTTP_400_BAD_REQUEST)

    # Verify password
    if not user.check_password(password):
        return Response({"error": "Incorrect password"},
                       status=status.HTTP_400_BAD_REQUEST)

    # Delete the user
    user.delete()

    return Response({
        "message": f"Your account ({username}) has been deleted successfully."
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def report_user(request):
    """Report a user for inappropriate behavior or content"""
    serializer = ReportCreateSerializer(data=request.data)

    if serializer.is_valid():
        # Check if we're trying to report ourselves
        if serializer.validated_data["reported_user"] == request.user:
            return Response({"error": "You cannot report yourself"}, status=status.HTTP_400_BAD_REQUEST)

        # Create the report
        report = serializer.save(reporter=request.user)

        return Response({
            "message": "Report submitted successfully. An admin will review it.",
            "report_id": report.id
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_my_reports(request):
    """Get reports filed by the current user"""
    reports = Report.objects.filter(reporter=request.user)
    serializer = ReportSerializer(reports, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def block_user(request):
    """Block a user"""
    try:
        # Extract the user_id from request data
        user_id = request.data.get('user_id')

        print(f"Received block request for user_id: {user_id}")

        if not user_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Convert to integer if it's a string
            if isinstance(user_id, str) and user_id.isdigit():
                user_id = int(user_id)

            user_to_block = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": f"User with ID {user_id} not found"}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"error": f"Invalid user ID format: {user_id}"}, status=status.HTTP_400_BAD_REQUEST)

        # Can't block yourself
        if user_to_block == request.user:
            return Response({"error": "You cannot block yourself"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if already blocked
        if UserBlock.objects.filter(blocker=request.user, blocked=user_to_block).exists():
            return Response({"error": "You have already blocked this user"}, status=status.HTTP_400_BAD_REQUEST)

        # Create block
        block = UserBlock.objects.create(blocker=request.user, blocked=user_to_block)

        return Response({
            "message": f"User {user_to_block.username} has been blocked",
            "block_id": block.id
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        import traceback
        print(f"Error in block_user: {str(e)}")
        traceback.print_exc()
        return Response({"error": f"An error occurred: {str(e)}"},
                     status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def unblock_user(request, user_id):
    """Unblock a previously blocked user"""
    try:
        user_to_unblock = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        block = UserBlock.objects.get(blocker=request.user, blocked=user_to_unblock)
        block.delete()
        return Response({"message": f"User {user_to_unblock.username} has been unblocked"})
    except UserBlock.DoesNotExist:
        return Response({"error": "You have not blocked this user"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_blocked_users(request):
    """Get list of users blocked by the current user"""
    blocks = UserBlock.objects.filter(blocker=request.user)
    serializer = UserBlockSerializer(blocks, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_reports(request):
    """Get all reports (admin only)"""
    status_filter = request.query_params.get('status')

    if status_filter:
        reports = Report.objects.filter(status=status_filter).order_by('-created_at')
    else:
        reports = Report.objects.all().order_by('-created_at')

    serializer = ReportSerializer(reports, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def update_report_status(request, report_id):
    """Update a report's status (admin only)"""
    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    admin_notes = request.data.get('admin_notes')

    if not new_status:
        return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)

    if new_status not in dict(Report.STATUS_CHOICES):
        return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

    report.status = new_status

    if admin_notes:
        report.admin_notes = admin_notes

    if new_status in ['RESOLVED', 'DISMISSED']:
        report.resolved_at = timezone.now()
        report.resolved_by = request.user

    report.save()

    return Response({
        "message": f"Report status updated to {report.get_status_display()}",
        "report_id": report.id
    })
