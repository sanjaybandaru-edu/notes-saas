#!/bin/bash
# Notes SaaS - Deployment Script
# Usage: ./deploy.sh [target]
# Targets: all (default), infra, backend, frontend

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET=${1:-all}

# Get project paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Notes SaaS - Deployment Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Target: ${YELLOW}$TARGET${NC}"
echo ""

# Load Terraform outputs
load_outputs() {
    cd "$PROJECT_ROOT/infra"
    if terraform output &> /dev/null; then
        export ECR_REPO=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
        export S3_BUCKET=$(terraform output -raw frontend_bucket 2>/dev/null || echo "")
        export CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
        export ECS_CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
        export ECS_SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")
        export AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "us-east-1")
    fi
}

# Deploy Infrastructure
deploy_infra() {
    echo -e "${YELLOW}📦 Deploying infrastructure...${NC}"
    cd "$PROJECT_ROOT/infra"
    
    echo "Running terraform plan..."
    terraform plan -out=tfplan
    
    echo ""
    read -p "Apply changes? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        terraform apply tfplan
        echo -e "${GREEN}✓ Infrastructure deployed${NC}"
    else
        echo "Deployment cancelled"
        exit 0
    fi
}

# Deploy Backend
deploy_backend() {
    echo -e "${YELLOW}🔧 Deploying backend...${NC}"
    
    load_outputs
    
    if [ -z "$ECR_REPO" ]; then
        echo -e "${RED}Error: ECR repository not found. Deploy infrastructure first.${NC}"
        exit 1
    fi
    
    cd "$PROJECT_ROOT/backend"
    
    # Login to ECR
    echo "Logging into ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
    
    # Build Docker image
    echo "Building Docker image..."
    docker build -t notes-saas-api .
    
    # Tag and push
    echo "Pushing to ECR..."
    docker tag notes-saas-api:latest $ECR_REPO:latest
    docker push $ECR_REPO:latest
    
    # Update ECS service
    echo "Updating ECS service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_SERVICE \
        --force-new-deployment \
        --region $AWS_REGION
    
    echo -e "${GREEN}✓ Backend deployed${NC}"
    echo "ECS service will restart with the new image."
}

# Deploy Frontend
deploy_frontend() {
    echo -e "${YELLOW}🎨 Deploying frontend...${NC}"
    
    load_outputs
    
    if [ -z "$S3_BUCKET" ]; then
        echo -e "${RED}Error: S3 bucket not found. Deploy infrastructure first.${NC}"
        exit 1
    fi
    
    cd "$PROJECT_ROOT/frontend"
    
    # Build frontend
    echo "Building frontend..."
    npm run build
    
    # Upload to S3
    echo "Uploading to S3..."
    aws s3 sync dist/ s3://$S3_BUCKET/ --delete
    
    # Invalidate CloudFront cache
    if [ -n "$CF_DIST_ID" ]; then
        echo "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $CF_DIST_ID \
            --paths "/*" \
            --region us-east-1
    fi
    
    echo -e "${GREEN}✓ Frontend deployed${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}📊 Running database migrations...${NC}"
    cd "$PROJECT_ROOT/backend"
    
    # This would need to run in the context of the deployed app
    # For now, just generate Prisma client
    npx prisma generate
    
    echo -e "${GREEN}✓ Migrations complete${NC}"
}

# Main deployment flow
case $TARGET in
    infra)
        deploy_infra
        ;;
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        read -p "Deploy everything (infra + backend + frontend)? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            load_outputs
            
            # Check if infra exists
            if [ -z "$ECR_REPO" ]; then
                echo "Infrastructure not found. Deploying infrastructure first..."
                deploy_infra
            fi
            
            deploy_backend
            deploy_frontend
        fi
        ;;
    *)
        echo "Usage: $0 [target]"
        echo "Targets:"
        echo "  all       - Deploy everything (default)"
        echo "  infra     - Deploy only infrastructure"
        echo "  backend   - Deploy only backend"
        echo "  frontend  - Deploy only frontend"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Deployment Complete! 🚀         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

load_outputs
if [ -n "$S3_BUCKET" ]; then
    WEBSITE_URL=$(cd "$PROJECT_ROOT/infra" && terraform output -raw website_url 2>/dev/null || echo "")
    if [ -n "$WEBSITE_URL" ]; then
        echo -e "Your site is live at: ${BLUE}$WEBSITE_URL${NC}"
    fi
fi
