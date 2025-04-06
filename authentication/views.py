import os
import mimetypes
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken, AccessToken, TokenError
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import (ProfileSerializer, ProfileUpdateSerializer, UserUpdateSerializer,
                          UserSerializer, VerificationDocumentSerializer,
                          VerificationDocumentSubmitSerializer, PendingVerificationSerializer)
from .models import Profile, Friendship, VerificationDocument
from django.db import models
from django.utils import timezone

@api_view(["POST"])
def register_user(request):
    data = request.data
    if User.objects.filter(username=data["username"]).exists():
        return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create(
        username=data["username"],
        email=data["email"],
        password=make_password(data["password"]),  # Hash password securely
    )
    Profile.objects.create(user=user)  # Create a profile for the user

    return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)

@api_view(["POST"])
def login_user(request):
    data = request.data
    user = authenticate(username=data["username"], password=data["password"])

    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "profile_picture": user.profile.profile_picture.url if user.profile.profile_picture else None,
                "is_admin": user.is_superuser
            }
        })
    return Response({"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "profile_picture": request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
        "is_admin": request.user.is_superuser
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

    # Update profile picture if provided
    if "profile_picture" in request.data:
        profile_serializer = ProfileUpdateSerializer(profile, data={"profile_picture": request.data["profile_picture"]}, partial=True)
        if profile_serializer.is_valid():
            profile_serializer.save()

    return Response({
        "message": "Profile updated successfully",
        "username": user.username,
        "profile_picture": request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None
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
