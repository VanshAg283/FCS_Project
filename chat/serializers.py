from rest_framework import serializers
from .models import Message, MediaAttachment

class MediaAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAttachment
        fields = ['id', 'file_type', 'file_url', 'timestamp']

    def get_file_url(self, obj):
        # Don't use absolute URLs here - the frontend will handle authentication
        return f"/api/chat/media/{obj.id}/"

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    timestamp = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    decrypted_text = serializers.SerializerMethodField()
    is_sender = serializers.SerializerMethodField()
    attachments = MediaAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "sender_username", "receiver", "decrypted_text", "timestamp", "is_sender", "attachments"]

    def get_decrypted_text(self, obj):
        try:
            text = obj.get_decrypted_message()
            # If we have attachments but empty text, return empty string - not an error
            if not text.strip() and obj.attachments.exists():
                return ""
            return text
        except Exception as e:
            return "[Error decrypting message]"

    def get_is_sender(self, obj):
        """Check if the authenticated user is the sender of the message"""
        request = self.context.get("request")
        return request and obj.sender == request.user
