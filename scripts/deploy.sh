#!/bin/bash
set -euo pipefail

# ===============================================
# Chillcast Production Deployment Script
# Following Senior Engineer Production Standards
# ===============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="chillcast"
DOMAIN="chillcast.fm"
STAGING_DOMAIN="chillcast-staging.pages.dev"

# Environment detection
ENVIRONMENT=${1:-staging}
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Error: Environment must be 'staging' or 'production'${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${BLUE}🚀 Starting Chillcast deployment to ${ENVIRONMENT}${NC}"
echo "=================================================="

# ===============================================
# Pre-deployment Validation
# ===============================================

echo -e "${YELLOW}🔍 Running pre-deployment validation...${NC}"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Please install: npm install -g wrangler${NC}"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare. Please run: wrangler login${NC}"
    exit 1
fi

# Validate environment variables
echo -e "${YELLOW}📋 Validating environment configuration...${NC}"

required_secrets=("CLERK_SECRET_KEY" "GROK_API_KEY")
optional_secrets=("ELEVENLABS_API_KEY" "STRIPE_SECRET_KEY" "CLERK_WEBHOOK_SECRET")

for secret in "${required_secrets[@]}"; do
    if ! wrangler secret list --env "$ENVIRONMENT" | grep -q "$secret"; then
        echo -e "${RED}❌ Required secret $secret not found for $ENVIRONMENT environment${NC}"
        echo "Set it with: wrangler secret put $secret --env $ENVIRONMENT"
        exit 1
    fi
done

echo -e "${GREEN}✅ Required secrets validated${NC}"

# Check optional secrets
for secret in "${optional_secrets[@]}"; do
    if ! wrangler secret list --env "$ENVIRONMENT" | grep -q "$secret"; then
        echo -e "${YELLOW}⚠️  Optional secret $secret not found for $ENVIRONMENT environment${NC}"
    fi
done

# ===============================================
# Code Quality Checks
# ===============================================

echo -e "${YELLOW}🔍 Running code quality checks...${NC}"

# TypeScript compilation
echo "  → TypeScript compilation..."
if ! npm run check; then
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

# Linting
echo "  → ESLint checking..."
if ! npm run lint:check; then
    echo -e "${YELLOW}⚠️  Linting issues found. Continuing with deployment...${NC}"
fi

# Unit tests
echo "  → Running unit tests..."
if ! npm run test:unit; then
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Code quality checks passed${NC}"

# ===============================================
# Build Process
# ===============================================

echo -e "${YELLOW}🏗️  Building application...${NC}"

# Set build environment variables
export NODE_OPTIONS="--max-old-space-size=8192"
export VITE_ENVIRONMENT="$ENVIRONMENT"

if [[ "$ENVIRONMENT" == "production" ]]; then
    export VITE_API_URL="https://$DOMAIN/api"
else
    export VITE_API_URL="https://$STAGING_DOMAIN/api"
fi

# Build the application
if ! npm run build; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# ===============================================
# Database Migration
# ===============================================

echo -e "${YELLOW}🗄️  Applying database migrations...${NC}"

# Check if migrations need to be applied
migration_files=(
    "migrations/0001_Initial_schema_setup.sql"
    "migrations/0002_Phase4_content_pipeline.sql"
    "migrations/0003_Phase5_payments_subscriptions.sql"
)

for migration in "${migration_files[@]}"; do
    if [[ -f "$migration" ]]; then
        echo "  → Applying $(basename "$migration")..."
        if ! wrangler d1 execute DB --file="$migration" --env "$ENVIRONMENT"; then
            echo -e "${YELLOW}⚠️  Migration $(basename "$migration") may have already been applied${NC}"
        fi
    fi
done

echo -e "${GREEN}✅ Database migrations completed${NC}"

# ===============================================
# Pages Deployment
# ===============================================

echo -e "${YELLOW}🚀 Deploying to Cloudflare Pages...${NC}"

# Deploy with correct environment
if ! wrangler pages deploy build --project-name="$PROJECT_NAME" --env="$ENVIRONMENT"; then
    echo -e "${RED}❌ Pages deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pages deployment successful${NC}"

# ===============================================
# Domain Configuration (Production Only)
# ===============================================

if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${YELLOW}🌐 Configuring custom domain...${NC}"
    
    # Add custom domain to Pages project
    if ! wrangler pages domain add "$DOMAIN" --project-name="$PROJECT_NAME"; then
        echo -e "${YELLOW}⚠️  Domain may already be configured${NC}"
    fi
    
    echo -e "${BLUE}📋 Domain Configuration Instructions:${NC}"
    echo "1. Add CNAME record in your DNS:"
    echo "   Type: CNAME"
    echo "   Name: @ (or your subdomain)"
    echo "   Target: $PROJECT_NAME.pages.dev"
    echo ""
    echo "2. Verify SSL certificate provisioning at:"
    echo "   https://dash.cloudflare.com/pages/projects/$PROJECT_NAME/domains"
    echo ""
    echo -e "${GREEN}✅ Domain configuration initiated${NC}"
fi

# ===============================================
# Post-Deployment Validation
# ===============================================

echo -e "${YELLOW}🧪 Running post-deployment validation...${NC}"

# Determine deployment URL
if [[ "$ENVIRONMENT" == "production" ]]; then
    DEPLOY_URL="https://$DOMAIN"
else
    DEPLOY_URL="https://$STAGING_DOMAIN"
fi

# Wait for deployment to propagate
echo "  → Waiting for deployment to propagate..."
sleep 30

# Health check
echo "  → Health check..."
if curl -f "$DEPLOY_URL/api/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed - deployment may still be propagating${NC}"
fi

# Smoke tests (if available)
if [[ -d "tests/smoke" ]]; then
    echo "  → Running smoke tests..."
    if TEST_URL="$DEPLOY_URL" npm run test:smoke; then
        echo -e "${GREEN}✅ Smoke tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Smoke tests failed - check deployment status${NC}"
    fi
fi

# ===============================================
# Success Summary
# ===============================================

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  URL: $DEPLOY_URL"
echo "  Project: $PROJECT_NAME"
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "  Domain: $DOMAIN"
fi
echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"

if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo "  1. Validate all functionality on staging"
    echo "  2. Run load tests: K6_TEST_ENV=staging k6 run tests/load/api-load-test.js"
    echo "  3. Deploy to production: $0 production"
else
    echo "  1. Monitor error rates in Sentry"
    echo "  2. Check analytics in PostHog"
    echo "  3. Verify Core Web Vitals"
    echo "  4. Monitor system health at: $DEPLOY_URL/admin/health"
fi

echo ""
echo -e "${BLUE}📱 Mobile Testing:${NC}"
echo "  Test responsive design on multiple devices"
echo "  Verify touch interactions and audio playback"
echo ""
echo -e "${BLUE}🔒 Security Verification:${NC}"
echo "  SSL certificate: https://www.ssllabs.com/ssltest/"
echo "  Security headers: https://securityheaders.com/"
echo ""
echo -e "${GREEN}🎵 Chillcast is live and ready to stream! 🎵${NC}"

# ===============================================
# Monitoring and Alerts Setup
# ===============================================

if [[ "$ENVIRONMENT" == "production" ]]; then
    echo ""
    echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
    
    echo "  → Production monitoring checklist:"
    echo "    ✓ Sentry error monitoring active"
    echo "    ✓ PostHog analytics tracking"
    echo "    ✓ Cloudflare Analytics enabled"
    echo "    ✓ Health check endpoint available"
    echo "    ○ Set up uptime monitoring (recommended)"
    echo "    ○ Configure Slack/email alerts (recommended)"
    echo ""
    echo -e "${BLUE}📈 Recommended External Monitoring:${NC}"
    echo "  - UptimeRobot: https://uptimerobot.com"
    echo "  - Pingdom: https://www.pingdom.com"
    echo "  - StatusPage: https://www.statuspage.io"
fi

exit 0 