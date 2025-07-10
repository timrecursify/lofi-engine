# 🚀 Chillcast Deployment Setup Guide

## Current Status
✅ **Infrastructure: COMPLETE** - All Cloudflare resources created  
✅ **Project Configuration: COMPLETE** - wrangler.toml updated with real IDs  
✅ **CI/CD Pipeline: COMPLETE** - GitHub Actions workflow ready  
⚠️ **Secrets Setup: PARTIAL** - Need API keys from you  
⚠️ **Domain Configuration: PENDING** - Will be automated in deployment script  

---

## 🔑 Required API Keys & Secrets

### ✅ Already Configured
- **GROK_API_KEY**: `xai-EgzLgbHo17CyqNGAAuVR1kqfEoilxTSXzzWbKACRxZkgQmBJaEr8Gh3GB36d6nRhwyDkVieTmFGkt2xR`
- **Cloudflare Infrastructure**: All D1 databases, KV namespaces, and R2 buckets created

### 🔄 Needed From You

#### 1. **Clerk Authentication** (REQUIRED for deployment)
```bash
# You need to provide:
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
```

#### 2. **ElevenLabs TTS** (REQUIRED for content pipeline)
```bash
# You need to provide:
ELEVENLABS_API_KEY="sk_..."
ELEVENLABS_VOICE_ID="voice_id_here"
```

#### 3. **Stripe Payments** (REQUIRED for Pro subscriptions)
```bash
# You need to provide:
STRIPE_SECRET_KEY="sk_test_..." # or sk_live_ for production
STRIPE_WEBHOOK_SECRET="whsec_..."
```

#### 4. **Optional Monitoring** (Recommended for production)
```bash
# Optional but recommended:
PUBLIC_POSTHOG_API_KEY="phc_..."
PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
OPENWEATHER_API_KEY="..." # Free tier available
ALPHA_VANTAGE_API_KEY="..." # Free tier available
```

---

## 🛠️ Setup Commands

### Step 1: Set Required Secrets (Staging)
```bash
# Clerk Authentication
wrangler secret put CLERK_SECRET_KEY --env staging
# Enter your Clerk secret key when prompted

wrangler secret put CLERK_WEBHOOK_SECRET --env staging
# Enter your Clerk webhook secret when prompted

# ElevenLabs TTS
wrangler secret put ELEVENLABS_API_KEY --env staging
wrangler secret put ELEVENLABS_VOICE_ID --env staging

# Stripe Payments
wrangler secret put STRIPE_SECRET_KEY --env staging
wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
```

### Step 2: Set Required Secrets (Production)
```bash
# Clerk Authentication
wrangler secret put CLERK_SECRET_KEY --env production
wrangler secret put CLERK_WEBHOOK_SECRET --env production

# ElevenLabs TTS
wrangler secret put ELEVENLABS_API_KEY --env production
wrangler secret put ELEVENLABS_VOICE_ID --env production

# Stripe Payments (use live keys for production)
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

### Step 3: Optional Monitoring Secrets
```bash
# PostHog Analytics
wrangler secret put PUBLIC_POSTHOG_API_KEY --env staging
wrangler secret put PUBLIC_POSTHOG_API_KEY --env production

# Sentry Error Monitoring
wrangler secret put PUBLIC_SENTRY_DSN --env staging
wrangler secret put PUBLIC_SENTRY_DSN --env production

# Weather & Markets APIs
wrangler secret put OPENWEATHER_API_KEY --env staging
wrangler secret put OPENWEATHER_API_KEY --env production
wrangler secret put ALPHA_VANTAGE_API_KEY --env staging
wrangler secret put ALPHA_VANTAGE_API_KEY --env production
```

---

## 🌐 Domain Setup (chillcast.fm)

### DNS Configuration Required
After running the production deployment, you'll need to:

1. **Add CNAME Record**:
   - Type: `CNAME`
   - Name: `@` (root domain)
   - Target: `chillcast.pages.dev`
   - TTL: `Auto` or `300`

2. **Verify SSL Certificate**:
   - Check: https://dash.cloudflare.com/pages/projects/chillcast/domains
   - SSL should provision automatically within 5-10 minutes

---

## 🚀 Deployment Process

### Deploy to Staging
```bash
./scripts/deploy.sh staging
```

### Deploy to Production (after staging validation)
```bash
./scripts/deploy.sh production
```

---

## 📋 Pre-Deployment Checklist

### Required for First Deployment:
- [ ] Clerk secret key and webhook secret configured
- [ ] ElevenLabs API key and voice ID configured  
- [ ] Stripe secret key and webhook secret configured
- [ ] DNS CNAME record added for chillcast.fm (production only)

### Optional but Recommended:
- [ ] PostHog analytics key configured
- [ ] Sentry error monitoring configured
- [ ] OpenWeather API key for weather content
- [ ] Alpha Vantage API key for market content

---

## 🔍 Verification Commands

### Check Secrets Configuration
```bash
# Verify secrets are set for staging
wrangler secret list --env staging

# Verify secrets are set for production  
wrangler secret list --env production
```

### Test API Keys
```bash
# Test content pipeline with real APIs
curl -X POST https://chillcast-staging.pages.dev/api/v1/test/content-pipeline

# Check health endpoint
curl https://chillcast-staging.pages.dev/api/v1/health
```

---

## 🎯 Next Steps After Secret Setup

1. **Run Staging Deployment**:
   ```bash
   ./scripts/deploy.sh staging
   ```

2. **Validate Staging Environment**:
   - Test music generation
   - Test authentication flow
   - Test content pipeline
   - Test payment flow (with test keys)

3. **Run Production Deployment**:
   ```bash
   ./scripts/deploy.sh production
   ```

4. **Configure chillcast.fm DNS**:
   - Add CNAME record as shown above
   - Verify SSL certificate provisioning

5. **Monitor Production**:
   - Check error rates in Sentry
   - Monitor user analytics in PostHog
   - Verify Core Web Vitals
   - Set up uptime monitoring

---

## 🆘 Support & Troubleshooting

### Common Issues:

**"Secret not found" error**:
```bash
# List all secrets to verify
wrangler secret list --env staging
wrangler secret list --env production
```

**"Domain not verified" error**:
- Check DNS CNAME record is correctly set
- Wait 5-10 minutes for DNS propagation
- Verify at: https://dash.cloudflare.com/pages/projects/chillcast/domains

**"Build failed" error**:
```bash
# Increase Node.js memory and retry
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

**"Migration failed" error**:
- Migrations are idempotent and safe to re-run
- Check database connectivity in Cloudflare dashboard

### Getting Help:
- Cloudflare Support: https://support.cloudflare.com/
- Clerk Documentation: https://docs.clerk.dev/
- ElevenLabs API Docs: https://docs.elevenlabs.io/
- Stripe Integration Guide: https://docs.stripe.com/

---

## 🎵 Ready to Launch Chillcast!

Once you provide the API keys above, we can deploy to staging immediately and then to production with the chillcast.fm domain. The entire infrastructure is ready and waiting! 🚀 