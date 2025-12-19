"""
Common provider utilities for authJson parsing and management.
"""
import json
from typing import Dict, Any
from app.crypto import decrypt_dict, encrypt_dict


def load_connection_auth(auth_json_str: str) -> Dict[str, Any]:
    """
    Decrypt and parse Connection.authJson string to dict.
    
    Args:
        auth_json_str: Encrypted authJson string from Connection table
        
    Returns:
        Decrypted auth data as dict
        
    Raises:
        ValueError: If decryption or JSON parsing fails
    """
    if not auth_json_str:
        raise ValueError("authJson is empty or None")
    
    try:
        auth_data = decrypt_dict(auth_json_str)
        if not isinstance(auth_data, dict):
            raise ValueError("Decrypted authJson is not a dict")
        return auth_data
    except Exception as e:
        raise ValueError(f"Failed to decrypt/parse authJson: {str(e)}") from e


def save_connection_auth(data: Dict[str, Any]) -> str:
    """
    Encrypt and serialize auth data dict to string for Connection.authJson.
    
    Args:
        data: Auth data dict to encrypt
        
    Returns:
        Encrypted string ready for authJson column
        
    Raises:
        ValueError: If encryption fails
    """
    if not isinstance(data, dict):
        raise ValueError("data must be a dict")
    
    try:
        return encrypt_dict(data)
    except Exception as e:
        raise ValueError(f"Failed to encrypt authJson: {str(e)}") from e

