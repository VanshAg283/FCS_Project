from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, VerificationDocument, OTPVerification, Report, UserBlock

class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(source="is_staff", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "is_admin"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    bio = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Profile
        fields = ["user", "profile_picture", "is_verified", "bio", "email_verified"]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["profile_picture", "bio"]


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


class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class OTPVerificationSerializer(serializers.Serializer):
    username = serializers.CharField()
    otp = serializers.CharField(max_length=6)


class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.SerializerMethodField()
    reported_username = serializers.SerializerMethodField()
    report_type_display = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ['id', 'reporter', 'reporter_username', 'reported_user', 'reported_username',
                  'report_type', 'report_type_display', 'content', 'evidence_screenshot',
                  'created_at', 'status', 'admin_notes', 'resolved_at']
        read_only_fields = ['reporter', 'status', 'admin_notes', 'resolved_at', 'resolved_by']

    def get_reporter_username(self, obj):
        return obj.reporter.username

    def get_reported_username(self, obj):
        return obj.reported_user.username

    def get_report_type_display(self, obj):
        return obj.get_report_type_display()


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['reported_user', 'report_type', 'content', 'evidence_screenshot']


class UserBlockSerializer(serializers.ModelSerializer):
    blocked_username = serializers.SerializerMethodField()

    class Meta:
        model = UserBlock
        fields = ['id', 'blocked', 'blocked_username', 'created_at']
        read_only_fields = ['blocker', 'created_at']

    def get_blocked_username(self, obj):
        return obj.blocked.username
