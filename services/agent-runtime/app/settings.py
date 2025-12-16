import os

from dotenv import load_dotenv


# Load environment variables from a .env file if present
load_dotenv()


AGENT_RUNTIME_SECRET = os.getenv("AGENT_RUNTIME_SECRET")

if not AGENT_RUNTIME_SECRET:
    raise RuntimeError("Environment variable AGENT_RUNTIME_SECRET is required for agent runtime service.")


AGENT_RUNTIME_DEBUG = os.getenv("AGENT_RUNTIME_DEBUG", "0")

# Optional: callback configuration for Next.js RunLog updates
AGENTHUB_BASE_URL = os.getenv("AGENTHUB_BASE_URL")  # e.g. https://agenthub-uni1.onrender.com
AGENT_SERVICE_KEY = os.getenv("AGENT_SERVICE_KEY")  # Must match Next.js AGENT_SERVICE_KEY



