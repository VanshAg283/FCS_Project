from django.db import models
from django.contrib.auth.models import User
from cryptography.fernet import Fernet
from django.conf import settings

cipher = Fernet(settings.ENCRYPTION_KEY)

class Group(models.Model):
    name = models.CharField(max_length=255)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_groups", null=True)
    members = models.ManyToManyField(User, related_name="group_memberships")
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class GroupMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    encrypted_text = models.BinaryField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """Encrypt message before saving"""
        if isinstance(self.encrypted_text, str):
            self.encrypted_text = cipher.encrypt(self.encrypted_text.encode())
        super().save(*args, **kwargs)

    def get_decrypted_message(self):
        """Decrypt message"""
        if isinstance(self.encrypted_text, memoryview):
            encrypted_data = bytes(self.encrypted_text)
        else:
            encrypted_data = self.encrypted_text

        return cipher.decrypt(encrypted_data).decode()

    def __str__(self):
        return f"Message in {self.group.name} by {self.sender.username}"
