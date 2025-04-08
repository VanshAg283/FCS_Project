from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from .models import Message, MediaAttachment
from .serializers import MessageSerializer, MediaAttachmentSerializer
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet

cipher = Fernet(settings.ENCRYPTION_KEY)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request):
    data = request.data
    sender = request.user
    receiver_id = data.get("receiver")
    text = data.get("text")

    # ✅ 1️⃣ Validate Request Data
    if not receiver_id or not text:
        return Response({"error": "Receiver and message text are required."}, status=400)

    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        return Response({"error": "Receiver not found."}, status=404)

    # ✅ 2️⃣ Encrypt Message
    encrypted_text = cipher.encrypt(text.encode())

    # ✅ 3️⃣ Save Message
    message = Message.objects.create(
        sender=sender,
        receiver=receiver,
        encrypted_text=encrypted_text
    )

    # ✅ 4️⃣ Return Response
    return Response(MessageSerializer(message).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_messages(request, receiver_id):
    """Get chat messages with a specific user"""
    user = request.user
    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        return Response({"error": "Receiver not found"}, status=status.HTTP_404_NOT_FOUND)

    # Check if the current user has blocked the receiver
    from authentication.models import UserBlock
    user_blocked_receiver = UserBlock.objects.filter(
        blocker=user,
        blocked=receiver
    ).exists()

    # Get all messages between these users
    messages = Message.objects.filter(
        (models.Q(sender=user, receiver=receiver) | models.Q(sender=receiver, receiver=user))
    ).order_by('timestamp')

    # Format the messages with encryption and include blocked status
    formatted_messages = []
    for message in messages:
        try:
            # Skip messages from the blocked user if the current user is the one who blocked them
            if user_blocked_receiver and message.sender == receiver:
                continue

            decrypted_text = message.get_decrypted_message()

            # Get attachments
            attachments = []
            for attachment in message.attachments.all():
                attachments.append({
                    'id': attachment.id,
                    'file_url': attachment.get_file_url(),
                    'file_type': attachment.file_type,
                    'original_filename': attachment.original_filename
                })

            formatted_messages.append({
                'id': message.id,
                'sender_id': message.sender.id,
                'receiver_id': message.receiver.id,
                'timestamp': message.timestamp,
                'decrypted_text': decrypted_text,
                'is_sender': message.sender == user,
                'attachments': attachments,
                'blocked': message.blocked
            })
        except Exception as e:
            # If decryption fails, log the error and return a placeholder
            print(f"Error decrypting message {message.id}: {e}")

            # Skip error messages from blocked users too
            if user_blocked_receiver and message.sender == receiver:
                continue

            formatted_messages.append({
                'id': message.id,
                'sender_id': message.sender.id,
                'receiver_id': message.receiver.id,
                'timestamp': message.timestamp,
                'decrypted_text': "[Error decrypting message]",
                'is_sender': message.sender == user,
                'attachments': [],
                'blocked': message.blocked
            })

    return Response(formatted_messages)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def send_message_with_media(request):
    data = request.data
    sender = request.user
    receiver_id = data.get("receiver")
    text = data.get("text", "")
    media_file = request.FILES.get("media")

    # Validate Request Data
    if not receiver_id:
        return Response({"error": "Receiver is required."}, status=400)

    if not text and not media_file:
        return Response({"error": "Either message text or media is required."}, status=400)

    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        return Response({"error": "Receiver not found."}, status=404)

    # Encrypt Message Text - ensure we never try to encrypt an empty string
    encrypted_text = cipher.encrypt(text.encode()) if text.strip() else cipher.encrypt(b' ')  # Send a space if text is empty

    # Create Message
    message = Message.objects.create(
        sender=sender,
        receiver=receiver,
        encrypted_text=encrypted_text  # Always have some encrypted text
    )

    # Handle Media Attachment
    if media_file:
        content_type = media_file.content_type.lower()

        # Determine file type
        if 'image/svg+xml' in content_type:
            file_type = 'svg'
        elif 'image/gif' in content_type:
            file_type = 'gif'
        elif 'image' in content_type:
            file_type = 'image'
        elif 'video' in content_type:
            file_type = 'video'
        else:
            file_type = 'file'  # Generic file type for other files

        try:
            # Create media attachment
            attachment = MediaAttachment.objects.create(
                message=message,
                file=media_file,
                file_type=file_type
            )
        except ValueError as e:
            # If SVG validation fails, delete the message and return error
            message.delete()
            return Response({"error": str(e)}, status=400)

    # Return Response
    return Response(MessageSerializer(message).data, status=201)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    """
    Delete a message if the authenticated user is the sender
    """
    try:
        # Get the message
        message = Message.objects.get(id=message_id)

        # Check if the authenticated user is the sender
        if message.sender != request.user:
            return Response(
                {"error": "You can only delete your own messages."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Delete any associated media attachments first
        MediaAttachment.objects.filter(message=message).delete()

        # Delete the message
        message.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
    except Message.DoesNotExist:
        return Response(
            {"error": "Message not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Error deleting message: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
