// Generate secrets for deployment (Node.js - cross-platform)
// Run: node scripts/generate-secrets.js

const crypto = require('crypto');

console.log('🔐 Generating Secrets for AgentHub Deployment');
console.log('==============================================\n');

// Generate NEXTAUTH_SECRET
const nextAuthSecret = crypto.randomBytes(32).toString('base64');
console.log('NEXTAUTH_SECRET:');
console.log(nextAuthSecret);
console.log('');

// Generate AGENT_RUNTIME_SECRET (use same value in both services)
const agentRuntimeSecret = crypto.randomBytes(32).toString('base64');
console.log('AGENT_RUNTIME_SECRET (same value in both services):');
console.log(agentRuntimeSecret);
console.log('');

// Generate AGENT_SERVICE_KEY (use same value in both services)
const agentServiceKey = crypto.randomBytes(32).toString('base64');
console.log('AGENT_SERVICE_KEY (same value in both services):');
console.log(agentServiceKey);
console.log('');

console.log('✅ Secrets generated!\n');
console.log('📝 Copy these values to:');
console.log('   - Render Dashboard → Your Services → Environment Variables\n');

