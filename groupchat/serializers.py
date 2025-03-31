from rest_framework import serializers
from .models import Group, GroupMessage
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class GroupSerializer(serializers.ModelSerializer):
    creator_username = serializers.ReadOnlyField(source='creator.username')
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'creator', 'creator_username', 'description', 'created_at', 'members_count']

    def get_members_count(self, obj):
        return obj.members.count()

class GroupMemberSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ['members']

class GroupMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    timestamp = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    decrypted_text = serializers.SerializerMethodField()
    is_sender = serializers.SerializerMethodField()

    class Meta:
        model = GroupMessage
        fields = ["id", "sender", "sender_username", "group", "decrypted_text", "timestamp", "is_sender"]

    def get_decrypted_text(self, obj):
        try:
            return obj.get_decrypted_message()
        except Exception:
            return "[Error decrypting message]"

    def get_is_sender(self, obj):
        request = self.context.get("request")
        return request and obj.sender == request.user
