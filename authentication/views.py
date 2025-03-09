from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import ProfileSerializer, ProfileUpdateSerializer, UserUpdateSerializer
from .models import Profile

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
                "profile_picture": user.profile.profile_picture.url if user.profile.profile_picture else None
            }
        })
    return Response({"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    profile = Profile.objects.get(user=request.user)
    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "profile_picture": request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None
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
