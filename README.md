# Notes SaaS Platform

A production-ready documentation and notes platform with React frontend, Node.js backend, and full AWS deployment.

## 🚀 Quick Start

### 1. Run Setup
```bash
chmod +x scripts/*.sh
./scripts/setup.sh
```

This will:
- Check for required tools (Node.js, Docker, AWS CLI, Terraform)
- Configure AWS credentials
- Create Terraform configuration
- Install dependencies

### 2. Deploy to AWS
```bash
./scripts/deploy.sh
```

Or deploy individual components:
```bash
./scripts/deploy.sh infra     # Deploy infrastructure only
./scripts/deploy.sh backend   # Deploy backend only
./scripts/deploy.sh frontend  # Deploy frontend only
```

## 📁 Project Structure

```
├── backend/          # Node.js/Express API
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── middleware/
│   │   └── lib/
│   ├── prisma/       # Database schema
│   └── Dockerfile
├── frontend/         # React SPA
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── stores/
│   │   └── api/
│   └── index.html
├── infra/            # Terraform AWS infrastructure
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── scripts/          # Deployment scripts
│   ├── setup.sh
│   ├── deploy.sh
│   └── rollback.sh
└── .github/workflows/  # CI/CD
```

## 🛠️ Local Development

### Start PostgreSQL
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=notes_saas postgres:15
```

### Backend
```bash
cd backend
cp .env.example .env    # Edit with your settings
npm install
npx prisma db push      # Create tables
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Get current user |
| `/api/topics` | GET/POST | List/Create topics |
| `/api/topics/:id` | GET/PATCH/DELETE | Topic CRUD |
| `/api/notes` | GET/POST | List/Create notes |
| `/api/notes/:id` | GET/PATCH/DELETE | Note CRUD |
| `/api/files/upload` | POST | Upload file |
| `/api/files/:id/download` | GET | Get download URL |

## 🔐 GitHub Secrets for CI/CD

Add these secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET` (from Terraform output)
- `CLOUDFRONT_DISTRIBUTION_ID` (from Terraform output)

## 💰 Estimated Monthly Costs

| Service | Cost |
|---------|------|
| RDS (db.t3.micro) | ~$15 |
| ECS Fargate | ~$15-25 |
| NAT Gateway | ~$32 |
| CloudFront | ~$1-5 |
| S3 | ~$1 |
| Route53 | ~$0.50 |
| **Total** | **~$65-80** |

*All covered by AWS credits*

## 📝 License

MIT
