"""
Entry point for Render deployment.
This file imports the FastAPI app from app.main to allow uvicorn to use 'main:app'.
"""
from app.main import app

__all__ = ["app"]

