from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from .models import MediaAttachment, Message
from django.db.models import Q
import jwt
from django.conf import settings

@api_view(["GET"])
@authentication_classes([])  # Remove default authentication
@permission_classes([])  # Remove default permission requirements
def serve_media(request, attachment_id):
    """
    Serve decrypted media files to authorized users
    """
    # First try token from query params (for direct image/media requests)
    auth_token = request.query_params.get('auth_token')

    user = None

    # If we have an auth token, try to authenticate
    if auth_token:
        try:
            # Decode the token directly
            decoded_token = jwt.decode(
                auth_token,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )

            # Get user ID from token
            user_id = decoded_token.get('user_id')

            # Import User model here to avoid circular imports
            from django.contrib.auth.models import User

            # Get user by ID
            user = User.objects.get(id=user_id)
        except (jwt.InvalidTokenError, User.DoesNotExist, Exception) as e:
            # Log the specific error for debugging
            print(f"Token authentication error: {str(e)}")
            return HttpResponse("Invalid token", status=401)

    # If authentication failed, return 401
    if not user:
        return HttpResponse("Authentication required", status=401)

    try:
        # Get the attachment
        attachment = get_object_or_404(MediaAttachment, id=attachment_id)
        message = attachment.message

        # Check if the user is either the sender or receiver of the message
        if user != message.sender and user != message.receiver:
            return HttpResponse("Access denied", status=403)

        # Get the decrypted data
        decrypted_data = attachment.get_decrypted_data()
        if not decrypted_data:
            return HttpResponse("Media content not available", status=404)

        # Determine content type based on file_type and filename
        content_type = "application/octet-stream"  # Default
        if attachment.file_type == 'svg':
            content_type = 'image/svg+xml'
        elif attachment.file_type == 'image':
            if hasattr(attachment, 'original_filename') and attachment.original_filename:
                if attachment.original_filename.lower().endswith('.jpg') or attachment.original_filename.lower().endswith('.jpeg'):
                    content_type = 'image/jpeg'
                elif attachment.original_filename.lower().endswith('.png'):
                    content_type = 'image/png'
                else:
                    content_type = 'image/jpeg'  # Fallback
            else:
                content_type = 'image/jpeg'  # Fallback
        elif attachment.file_type == 'gif':
            content_type = 'image/gif'
        elif attachment.file_type == 'video':
            if hasattr(attachment, 'original_filename') and attachment.original_filename:
                if attachment.original_filename.lower().endswith('.mp4'):
                    content_type = 'video/mp4'
                elif attachment.original_filename.lower().endswith('.webm'):
                    content_type = 'video/webm'
                else:
                    content_type = 'video/mp4'  # Fallback
            else:
                content_type = 'video/mp4'  # Fallback

        # Create a response with the decrypted data
        response = HttpResponse(decrypted_data, content_type=content_type)

        # Set filename for download if needed
        if hasattr(attachment, 'original_filename') and attachment.original_filename:
            response['Content-Disposition'] = f'inline; filename="{attachment.original_filename}"'

        return response

    except Exception as e:
        # Log any other errors
        print(f"Media serving error: {str(e)}")
        return HttpResponse("Error serving media", status=500)
