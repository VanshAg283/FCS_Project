import { subtle } from 'crypto';

// Generate RSA key pair
export const generateKeyPair = async () => {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    return keyPair;
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw error;
  }
};

// Export key to string format
export const exportKey = async (key, isPrivate = false) => {
  try {
    const exported = await window.crypto.subtle.exportKey(
      isPrivate ? "pkcs8" : "spki",
      key
    );

    // Convert to base64
    const exportedAsString = arrayBufferToBase64(exported);
    return exportedAsString;
  } catch (error) {
    console.error('Error exporting key:', error);
    throw error;
  }
};

// Import key from string format
export const importKey = async (keyStr, isPrivate = false) => {
  try {
    // Convert from base64
    const keyData = base64ToArrayBuffer(keyStr);

    const key = await window.crypto.subtle.importKey(
      isPrivate ? "pkcs8" : "spki",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      isPrivate ? ["decrypt"] : ["encrypt"]
    );

    return key;
  } catch (error) {
    console.error('Error importing key:', error);
    throw error;
  }
};

// Encrypt message using recipient's public key
export const encryptMessage = async (message, publicKeyStr) => {
  try {
    const publicKey = await importKey(publicKeyStr);

    // Convert message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);

    // Encrypt the message
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      messageData
    );

    // Convert to base64
    return arrayBufferToBase64(encryptedData);
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw error;
  }
};

// Decrypt message using recipient's private key
export const decryptMessage = async (encryptedMessage, privateKeyStr) => {
  try {
    const privateKey = await importKey(privateKeyStr, true);

    // Convert from base64
    const encryptedData = base64ToArrayBuffer(encryptedMessage);

    // Decrypt the message
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      encryptedData
    );

    // Convert from ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw error;
  }
};

// Generate signing key pair
export const generateSigningKeyPair = async () => {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );

    return keyPair;
  } catch (error) {
    console.error('Error generating signing key pair:', error);
    throw error;
  }
};

// Sign message using sender's private key
export const signMessage = async (message, privateKeyStr) => {
  try {
    // Import private key for signing
    const keyData = base64ToArrayBuffer(privateKeyStr);
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    // Convert message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);

    // Sign the message
    const signature = await window.crypto.subtle.sign(
      {
        name: "RSASSA-PKCS1-v1_5"
      },
      privateKey,
      messageData
    );

    // Convert to base64
    return arrayBufferToBase64(signature);
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
};

// Verify signature using sender's public key
export const verifySignature = async (message, signature, publicKeyStr) => {
  try {
    // Import public key for verification
    const keyData = base64ToArrayBuffer(publicKeyStr);
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

    // Convert message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);

    // Convert signature from base64
    const signatureData = base64ToArrayBuffer(signature);

    // Verify the signature
    const isValid = await window.crypto.subtle.verify(
      {
        name: "RSASSA-PKCS1-v1_5"
      },
      publicKey,
      signatureData,
      messageData
    );

    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw error;
  }
};

// Helper function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
