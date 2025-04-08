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
    blocked = models.BooleanField(default=False)  # Whether this message was sent to someone who blocked the sender

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

        decrypted = cipher.decrypt(encrypted_data).decode().strip()
        # If message is just a space (our placeholder for empty messages), return empty string
        return "" if decrypted == " " else decrypted

class MediaAttachment(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to='message_attachments/')
    file_type = models.CharField(max_length=20)  # 'image', 'video', or 'gif'
    encrypted_data = models.BinaryField(null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """Encrypt file data before saving"""
        # Store the original filename
        if self.file and not self.original_filename:
            self.original_filename = self.file.name

        # If we're uploading a new file, we should encrypt it
        if not self.id and self.file:
            # Read the file data
            file_data = self.file.read()

            # Encrypt the file data
            encrypted_data = cipher.encrypt(file_data)

            # Save the encrypted data
            self.encrypted_data = encrypted_data

            # Reset the file pointer
            self.file.seek(0)

        super().save(*args, **kwargs)

    def get_file_url(self):
        """Return the URL for the file"""
        return self.file.url

    def get_decrypted_data(self):
        """Decrypt and return the file data"""
        if not self.encrypted_data:
            return None

        if isinstance(self.encrypted_data, memoryview):
            encrypted_data = bytes(self.encrypted_data)
        else:
            encrypted_data = self.encrypted_data

        return cipher.decrypt(encrypted_data)
