from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .models import Message
from .serializers import MessageSerializer
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



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_messages(request, receiver_id):
    messages = Message.objects.filter(
        models.Q(sender=request.user, receiver_id=receiver_id) |
        models.Q(sender_id=receiver_id, receiver=request.user)
    ).order_by("timestamp")

    serializer = MessageSerializer(messages, many=True, context={"request": request})
    return Response(serializer.data)
