#!/bin/bash

# Generate secrets for deployment
# Run this to generate secure random secrets

echo "🔐 Generating Secrets for AgentHub Deployment"
echo "=============================================="
echo ""

if command -v openssl &> /dev/null; then
    echo "NEXTAUTH_SECRET:"
    openssl rand -base64 32
    echo ""
    
    echo "AGENT_RUNTIME_SECRET (use same value in both services):"
    openssl rand -base64 32
    echo ""
    
    echo "AGENT_SERVICE_KEY (use same value in both services):"
    openssl rand -base64 32
    echo ""
    
    echo "✅ Secrets generated!"
    echo ""
    echo "📝 Copy these values to:"
    echo "   - Render Dashboard → Your Services → Environment Variables"
    echo ""
else
    echo "❌ openssl not found. Install OpenSSL or use an online generator."
    echo ""
    echo "Alternative: Use https://generate-secret.vercel.app/32"
    exit 1
fi

