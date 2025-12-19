"""
AES-256-GCM encryption/decryption for sensitive data.
"""
import base64
import json
import os
from typing import Dict, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings


def _get_key() -> bytes:
    """Get encryption key from settings (base64 decoded to 32 bytes)."""
    if not settings.ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY not configured")
    
    # Decode base64 to get 32-byte key
    key_bytes = base64.b64decode(settings.ENCRYPTION_KEY)
    
    if len(key_bytes) != 32:
        raise ValueError(f"ENCRYPTION_KEY must be 32 bytes after base64 decode, got {len(key_bytes)}")
    
    return key_bytes


def encrypt_dict(data: Dict[str, Any]) -> str:
    """
    Encrypt a dictionary to base64 string.
    
    Format: base64(nonce(12) + ciphertext + tag(16))
    """
    key = _get_key()
    aesgcm = AESGCM(key)
    
    # Convert dict to JSON string
    plaintext = json.dumps(data).encode('utf-8')
    
    # Generate 12-byte nonce
    nonce = os.urandom(12)
    
    # Encrypt
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    
    # Combine: nonce(12) + ciphertext (includes tag)
    combined = nonce + ciphertext
    
    # Base64 encode
    return base64.b64encode(combined).decode('utf-8')


def decrypt_dict(encrypted_str: str) -> Dict[str, Any]:
    """
    Decrypt base64 string to dictionary.
    
    Format: base64(nonce(12) + ciphertext + tag(16))
    """
    key = _get_key()
    aesgcm = AESGCM(key)
    
    # Base64 decode
    combined = base64.b64decode(encrypted_str)
    
    # Split: nonce(12) + ciphertext (includes tag)
    nonce = combined[:12]
    ciphertext = combined[12:]
    
    # Decrypt
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    
    # Parse JSON
    return json.loads(plaintext.decode('utf-8'))

