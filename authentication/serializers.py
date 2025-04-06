from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, VerificationDocument

class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(source="is_staff", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "is_admin"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ["user", "profile_picture", "is_verified"]

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["profile_picture"]

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username"]

class VerificationDocumentSerializer(serializers.ModelSerializer):
    document_file_url = serializers.SerializerMethodField()

    class Meta:
        model = VerificationDocument
        fields = ['id', 'document_type', 'document_file', 'document_file_url', 'description', 'uploaded_at']

    def get_document_file_url(self, obj):
        request = self.context.get('request')
        if request:
            # Return the authentication-protected URL instead of direct media URL
            return request.build_absolute_uri(f'/api/auth/document/{obj.id}/')
        return None

class VerificationDocumentSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationDocument
        fields = ['document_type', 'document_file', 'description']

class PendingVerificationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    documents = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'user', 'verification_status', 'verification_notes', 'verification_date', 'documents']

    def get_documents(self, obj):
        documents = VerificationDocument.objects.filter(user=obj.user)
        return VerificationDocumentSerializer(documents, many=True, context=self.context).data
