#!/bin/bash
# Notes SaaS - Rollback Script
# Usage: ./rollback.sh [target] [version]
# Targets: backend, frontend

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET=${1:-backend}
VERSION=${2:-previous}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Notes SaaS - Rollback Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Target: ${YELLOW}$TARGET${NC}"
echo -e "Version: ${YELLOW}$VERSION${NC}"
echo ""

# Load Terraform outputs
cd "$PROJECT_ROOT/infra"
export ECR_REPO=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
export ECS_CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
export ECS_SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")
export AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "us-east-1")

rollback_backend() {
    echo -e "${YELLOW}Rolling back backend...${NC}"
    
    if [ "$VERSION" = "previous" ]; then
        # List recent images
        echo "Recent images:"
        aws ecr describe-images \
            --repository-name notes-saas-api \
            --query 'sort_by(imageDetails,& imagePushedAt)[-5:].{digest:imageDigest,pushed:imagePushedAt}' \
            --output table \
            --region $AWS_REGION
        
        echo ""
        read -p "Enter image digest to rollback to: " IMAGE_DIGEST
    else
        IMAGE_DIGEST=$VERSION
    fi
    
    # Update task definition to use specific image
    TASK_DEF=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $ECS_SERVICE \
        --query 'services[0].taskDefinition' \
        --output text \
        --region $AWS_REGION)
    
    # Get current task definition
    aws ecs describe-task-definition \
        --task-definition $TASK_DEF \
        --query 'taskDefinition' \
        --output json \
        --region $AWS_REGION > /tmp/task-def.json
    
    # Update image in task definition
    NEW_IMAGE="$ECR_REPO@$IMAGE_DIGEST"
    cat /tmp/task-def.json | \
        jq --arg img "$NEW_IMAGE" '.containerDefinitions[0].image = $img | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
        > /tmp/new-task-def.json
    
    # Register new task definition
    NEW_TASK_ARN=$(aws ecs register-task-definition \
        --cli-input-json file:///tmp/new-task-def.json \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text \
        --region $AWS_REGION)
    
    # Update service
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_SERVICE \
        --task-definition $NEW_TASK_ARN \
        --region $AWS_REGION
    
    echo -e "${GREEN}✓ Backend rolled back to: $IMAGE_DIGEST${NC}"
}

rollback_frontend() {
    echo -e "${YELLOW}⚠️  Frontend rollback requires manual S3 versioning${NC}"
    echo ""
    echo "To rollback frontend:"
    echo "1. Enable S3 versioning on your bucket (if not already)"
    echo "2. Use AWS Console or CLI to restore previous versions"
    echo ""
    echo "Or redeploy from a previous git commit:"
    echo "  git checkout <commit-hash>"
    echo "  ./scripts/deploy.sh frontend"
}

case $TARGET in
    backend)
        rollback_backend
        ;;
    frontend)
        rollback_frontend
        ;;
    *)
        echo "Usage: $0 [target] [version]"
        echo "Targets: backend, frontend"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Rollback complete!${NC}"
