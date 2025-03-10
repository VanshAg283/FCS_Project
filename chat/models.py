from django.db import models
from django.contrib.auth.models import User
from cryptography.fernet import Fernet
from django.conf import settings

# Ensure ENCRYPTION_KEY is correctly set in settings.py
cipher = Fernet(settings.ENCRYPTION_KEY)

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    encrypted_text = models.BinaryField()  # BinaryField stores bytes directly
    timestamp = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """Encrypt message before saving"""
        if isinstance(self.encrypted_text, str):
            self.encrypted_text = cipher.encrypt(self.encrypted_text.encode())  # Convert to bytes
        super().save(*args, **kwargs)

    def get_decrypted_message(self):
        """Decrypt message"""
        if isinstance(self.encrypted_text, memoryview):  # Convert memoryview to bytes
            encrypted_data = bytes(self.encrypted_text)
        else:
            encrypted_data = self.encrypted_text

        return cipher.decrypt(encrypted_data).decode()
