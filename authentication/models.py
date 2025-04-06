from django.contrib.auth.models import User
from django.db import models

class Profile(models.Model):
    VERIFICATION_STATUS_CHOICES = [
        ('UNVERIFIED', 'Not Submitted'),
        ('PENDING', 'Pending Verification'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Verification Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to="profile_pics/", blank=True, null=True)

    verification_status = models.CharField(
        max_length=10,
        choices=VERIFICATION_STATUS_CHOICES,
        default='UNVERIFIED'
    )

    is_verified = models.BooleanField(default=False)  # Keeping for backwards compatibility
    verification_notes = models.TextField(blank=True, null=True)  # Admin feedback for rejection
    verification_date = models.DateTimeField(blank=True, null=True)  # When verification was completed

    def __str__(self):
        return f"{self.user.username} - {self.verification_status}"

    def save(self, *args, **kwargs):
        # Keep is_verified flag in sync with verification_status
        self.is_verified = (self.verification_status == 'VERIFIED')
        super().save(*args, **kwargs)


class VerificationDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('ID_CARD', 'ID Card'),
        ('AADHAR', 'Aadhar Card'),
        ('DRIVERS_LICENSE', 'Driver\'s License'),
        ('OTHER', 'Other Document'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    document_file = models.FileField(upload_to='verification_docs/')
    description = models.CharField(max_length=255, blank=True, null=True)  # Added this field
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s {self.get_document_type_display()}"


class Friendship(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected')
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendship_requests_sent')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendship_requests_received')
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('sender', 'receiver')
