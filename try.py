from cryptography.fernet import Fernet

key = Fernet.generate_key()
print(key.decode())  # Copy this key and add it to settings.py
