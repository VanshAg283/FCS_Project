from rest_framework import serializers
from .models import Message

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    timestamp = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    decrypted_text = serializers.SerializerMethodField()  # ✅ Correctly fetching text
    is_sender = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender", "sender_username", "receiver", "decrypted_text", "timestamp", "is_sender"]

    def get_decrypted_text(self, obj):
        try:
            return obj.get_decrypted_message()  # ✅ Decrypt message before sending to frontend
        except Exception as e:
            return "[Error decrypting message]"

    def get_is_sender(self, obj):
        """Check if the authenticated user is the sender of the message"""
        request = self.context.get("request")
        return request and obj.sender == request.user  # ✅ Fix sender check
