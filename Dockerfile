FROM n8nio/n8n:latest

# n8n draait standaard op poort 5678
EXPOSE 5678

# n8n start automatisch via de base image CMD
# Geen extra configuratie nodig - environment variables worden via Render doorgegeven

