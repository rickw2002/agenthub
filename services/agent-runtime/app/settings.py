import os

from dotenv import load_dotenv


# Load environment variables from a .env file if present
load_dotenv()


AGENT_RUNTIME_SECRET = os.getenv("AGENT_RUNTIME_SECRET")

if not AGENT_RUNTIME_SECRET:
    raise RuntimeError("Environment variable AGENT_RUNTIME_SECRET is required for agent runtime service.")



