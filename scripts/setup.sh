#!/bin/bash
# Notes SaaS - Initial Setup Script
# This script sets up the development environment and AWS infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Notes SaaS - Initial Setup Script    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
        return 0
    fi
}

echo -e "${YELLOW}Checking prerequisites...${NC}"
echo ""

MISSING_TOOLS=()

check_command "node" || MISSING_TOOLS+=("node")
check_command "npm" || MISSING_TOOLS+=("npm")
check_command "docker" || MISSING_TOOLS+=("docker")
check_command "aws" || MISSING_TOOLS+=("aws")
check_command "terraform" || MISSING_TOOLS+=("terraform")

echo ""

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo -e "${RED}Missing tools: ${MISSING_TOOLS[*]}${NC}"
    echo ""
    echo "Please install missing tools:"
    echo ""
    
    for tool in "${MISSING_TOOLS[@]}"; do
        case $tool in
            node|npm)
                echo "  Node.js: brew install node  OR  https://nodejs.org"
                ;;
            docker)
                echo "  Docker: brew install docker  OR  https://docker.com"
                ;;
            aws)
                echo "  AWS CLI: brew install awscli  OR  https://aws.amazon.com/cli/"
                ;;
            terraform)
                echo "  Terraform: brew install terraform  OR  https://terraform.io"
                ;;
        esac
    done
    
    echo ""
    exit 1
fi

echo -e "${GREEN}All prerequisites are installed!${NC}"
echo ""

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓ AWS credentials configured (Account: $ACCOUNT_ID)${NC}"
else
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo ""
    echo "Please configure AWS credentials:"
    echo "  1. Run: aws configure"
    echo "  2. Enter your Access Key ID and Secret Access Key"
    echo ""
    exit 1
fi
echo ""

# Setup Terraform variables
echo -e "${YELLOW}Setting up Terraform configuration...${NC}"
cd "$PROJECT_ROOT/infra"

if [ ! -f "terraform.tfvars" ]; then
    echo ""
    echo -e "${BLUE}Please provide the following configuration:${NC}"
    echo ""
    
    read -p "Domain name (e.g., notes.example.com): " DOMAIN_NAME
    read -p "Hosted zone name (e.g., example.com): " HOSTED_ZONE
    read -p "AWS region [us-east-1]: " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)
    
    cat > terraform.tfvars <<EOF
# Auto-generated configuration
aws_region       = "$AWS_REGION"
environment      = "production"
domain_name      = "$DOMAIN_NAME"
hosted_zone_name = "$HOSTED_ZONE"

# Database (auto-generated secure password)
db_username = "postgres"
db_password = "$DB_PASSWORD"

# JWT Secret (auto-generated)
jwt_secret = "$JWT_SECRET"

# ECS Configuration
ecs_cpu           = "256"
ecs_memory        = "512"
ecs_desired_count = 1
db_instance_class = "db.t3.micro"
EOF

    echo ""
    echo -e "${GREEN}✓ Created terraform.tfvars${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Your database password and JWT secret have been auto-generated.${NC}"
    echo -e "${YELLOW}   They are stored in infra/terraform.tfvars - keep this file secure!${NC}"
else
    echo -e "${GREEN}✓ terraform.tfvars already exists${NC}"
fi
echo ""

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init
echo ""

# Install dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd "$PROJECT_ROOT/backend"
npm install
echo ""

echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "$PROJECT_ROOT/frontend"
npm install
echo ""

# Create local .env files
echo -e "${YELLOW}Creating local environment files...${NC}"

if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
    echo -e "${GREEN}✓ Created backend/.env (update for local development)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "  1. Review and update: infra/terraform.tfvars"
echo ""
echo "  2. Deploy infrastructure:"
echo "     ./scripts/deploy.sh infra"
echo ""
echo "  3. Deploy application:"
echo "     ./scripts/deploy.sh"
echo ""
echo "  4. For local development:"
echo "     - Start PostgreSQL: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15"
echo "     - Update backend/.env with local database URL"
echo "     - Run: cd backend && npm run dev"
echo "     - Run: cd frontend && npm run dev"
echo ""
