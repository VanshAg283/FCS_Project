import { encode as base64Encode, decode as base64Decode } from 'base64-arraybuffer';

export class E2EEManager {
  constructor() {
    this.keyPair = null;
    this.publicKey = null;
    this.privateKey = null;
  }

  // Generate key pair for a user
  async generateKeyPair() {
    try {
      // Generate RSA key pair
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256"
        },
        true,  // extractable
        ["encrypt", "decrypt"]
      );

      this.keyPair = keyPair;
      this.publicKey = keyPair.publicKey;
      this.privateKey = keyPair.privateKey;

      // Export public key for sharing
      const exportedPublicKey = await window.crypto.subtle.exportKey(
        "spki",
        keyPair.publicKey
      );

      // Convert to base64 for storage/transmission
      return base64Encode(exportedPublicKey);
    } catch (error) {
      console.error("Error generating key pair:", error);
      throw error;
    }
  }

  // Import someone else's public key
  async importPublicKey(base64PublicKey) {
    try {
      const binaryKey = base64Decode(base64PublicKey);
      return await window.crypto.subtle.importKey(
        "spki",
        binaryKey,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        true,
        ["encrypt"]
      );
    } catch (error) {
      console.error("Error importing public key:", error);
      throw error;
    }
  }

  // Encrypt message for a recipient
  async encryptMessage(message, recipientPublicKey) {
    try {
      // Generate a random AES key for this message
      const messageKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the message with AES key
      const encodedMessage = new TextEncoder().encode(message);
      const encryptedMessage = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        messageKey,
        encodedMessage
      );

      // Export and encrypt the AES key with recipient's public key
      const exportedMessageKey = await window.crypto.subtle.exportKey(
        "raw",
        messageKey
      );
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        recipientPublicKey,
        exportedMessageKey
      );

      // Combine everything into a single message
      return {
        encryptedMessage: base64Encode(encryptedMessage),
        encryptedKey: base64Encode(encryptedKey),
        iv: base64Encode(iv)
      };
    } catch (error) {
      console.error("Error encrypting message:", error);
      throw error;
    }
  }

  // Decrypt message with our private key
  async decryptMessage(encryptedData) {
    try {
      // Decode the encrypted key and message from base64
      const encryptedKey = base64Decode(encryptedData.encryptedKey);
      const encryptedMessage = base64Decode(encryptedData.encryptedMessage);
      const iv = base64Decode(encryptedData.iv);

      // Decrypt the message key using our private key
      const messageKey = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP"
        },
        this.privateKey,
        encryptedKey
      );

      // Import the decrypted message key
      const importedMessageKey = await window.crypto.subtle.importKey(
        "raw",
        messageKey,
        {
          name: "AES-GCM",
          length: 256
        },
        false,
        ["decrypt"]
      );

      // Decrypt the message
      const decryptedMessage = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(iv)
        },
        importedMessageKey,
        encryptedMessage
      );

      // Convert the decrypted message to text
      return new TextDecoder().decode(decryptedMessage);
    } catch (error) {
      console.error("Error decrypting message:", error);
      throw error;
    }
  }
}
