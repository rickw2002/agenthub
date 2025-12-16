#!/bin/bash

# Deployment Pre-Check Script
# Run this before deploying to verify everything is ready

echo "🔍 AgentHub Deployment Pre-Check"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this from the project root."
    exit 1
fi

echo "✅ Project root found"
echo ""

# Check Prisma
echo "📦 Checking Prisma..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Install Node.js first."
    exit 1
fi

echo "✅ npx available"

# Check if Prisma Client is generated
if [ ! -d "node_modules/.prisma/client" ]; then
    echo "⚠️  Prisma Client not generated. Running prisma generate..."
    npx prisma generate
fi

echo "✅ Prisma Client ready"
echo ""

# Check migrations
echo "📊 Checking migrations..."
MIGRATION_COUNT=$(ls -1 prisma/migrations | grep -E '^[0-9]' | wc -l)
echo "   Found $MIGRATION_COUNT migrations"

# Check for required migrations
if [ ! -d "prisma/migrations/20251216145244_add_project_models" ]; then
    echo "⚠️  Warning: add_project_models migration not found"
fi

if [ ! -d "prisma/migrations/20251216150250_add_document_scope_and_status" ]; then
    echo "⚠️  Warning: add_document_scope_and_status migration not found"
fi

echo "✅ Migrations checked"
echo ""

# Check Python service
echo "🐍 Checking Python service..."
if [ ! -f "services/agent-runtime/main.py" ]; then
    echo "❌ Error: Python service not found at services/agent-runtime/main.py"
    exit 1
fi

if [ ! -f "services/agent-runtime/requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found"
    exit 1
fi

echo "✅ Python service files found"
echo ""

# Check environment variables (if .env exists)
if [ -f ".env" ]; then
    echo "🔐 Checking environment variables..."
    
    REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "AGENT_RUNTIME_URL" "AGENT_RUNTIME_SECRET")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" .env; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo "⚠️  Missing environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
    else
        echo "✅ Required environment variables found"
    fi
else
    echo "⚠️  .env file not found (this is OK for production)"
fi

echo ""
echo "================================"
echo "✅ Pre-check complete!"
echo ""
echo "📝 Next steps:"
echo "1. Push code to GitHub"
echo "2. Create services in Render (or use render.yaml)"
echo "3. Set environment variables in Render"
echo "4. Deploy services"
echo "5. Run 'npx prisma migrate deploy' in Render Shell"
echo ""

