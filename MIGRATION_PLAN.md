# Alpha-Orion Migration Plan: GCP → Alternative Platform

## Overview

This document outlines the migration plan for moving Alpha-Orion from Google Cloud Platform to alternative platforms with free tiers.

## Requirements

- **Free Deployment**: Production-grade, not hobby
- **Free AI Services**: Reliable, quality equivalent to Google Gemini
- **Serious Project**: Commercial-grade infrastructure

## Recommended Stack

| Component | Current (GCP) | Recommended Alternative | Free Tier |
|-----------|---------------|----------------------|-----------|
| **Deployment** | Cloud Run | Render | 750 hrs/month |
| **AI/ML** | Gemini | OpenAI | $5 credits |
| **Database** | AlloyDB | Neon | Serverless PostgreSQL |
| **Cache** | Redis | Upstash | Redis-compatible |
| **Storage** | Cloud Storage | Cloudflare R2 | 1GB/month |

## Why This Stack?

### Render
- Stable free tier (750 hours/month)
- Production-ready infrastructure
- Supports Docker containers
- Automatic SSL
- Good for serious projects

### OpenAI
- Reliable AI API
- GPT-4o and GPT-4o-mini models
- $5 free credits to start
- High-quality outputs

### Neon
- Free PostgreSQL
- Serverless scaling
- Branching for development
- Good performance

### Upstash
- Free Redis tier
- Serverless Redis
- Kafka also available
- Great for caching

## Migration Steps

### Phase 1: AI Integration (Replace Gemini)
1. Update brain-orchestrator to use OpenAI API
2. Add openai to requirements.txt
3. Update environment variables
4. Test AI integration

### Phase 2: Database Migration
1. Create Neon account and database
2. Export data from AlloyDB
3. Import to Neon
4. Update connection strings

### Phase 3: Deployment Migration
1. Create Render account
2. Configure render.yaml
3. Deploy services
4. Update DNS

### Phase 4: Cache & Storage
1. Set up Upstash Redis
2. Configure Cloudflare R2
3. Update application config

## Cost Estimation

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Render | 750 hrs | Enough for small project |
| OpenAI | $5 credits | ~1000-5000 requests |
| Neon | Free | 0.5GB storage |
| Upstash | 10K commands | Enough for caching |
| Cloudflare R2 | 1GB storage | For static files |

## Total: $0/month (with potential to scale)

## Next Steps

1. Run migration scripts
2. Test each component
3. Deploy to production
4. Monitor costs

## Support

For issues, refer to:
- Render docs: render.com/docs
- OpenAI docs: platform.openai.com
- Neon docs: neon.tech/docs
- Upstash docs: upstash.com/docs
