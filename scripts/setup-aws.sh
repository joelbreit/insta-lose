#!/bin/bash

# Insta-Lose AWS Infrastructure Setup
# Run this script from the project root directory

set -e

# Configuration
PROJECT_NAME="insta-lose"
REGION="${AWS_REGION:-us-east-1}"
TABLE_NAME="InstaLoseGames"
LAMBDA_ROLE_NAME="${PROJECT_NAME}-lambda-role"
API_NAME="${PROJECT_NAME}-api"

echo "========================================"
echo "Insta-Lose AWS Setup"
echo "Region: $REGION"
echo "========================================"

# Check AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "Error: AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account: $ACCOUNT_ID"

# Create scripts directory for output
mkdir -p scripts/output

# Step 1: Create DynamoDB Table
echo ""
echo "Step 1: Creating DynamoDB table..."
./scripts/setup-dynamodb.sh

# Step 2: Create IAM Role for Lambda
echo ""
echo "Step 2: Creating IAM role..."
./scripts/setup-iam.sh

# Step 3: Package and Deploy Lambda Functions
echo ""
echo "Step 3: Deploying Lambda functions..."
./scripts/deploy-lambdas.sh

# Step 4: Create API Gateway
echo ""
echo "Step 4: Creating API Gateway..."
./scripts/setup-api-gateway.sh

echo ""
echo "========================================"
echo "Setup complete!"
echo ""
echo "API Endpoint saved to: scripts/output/api-endpoint.txt"
cat scripts/output/api-endpoint.txt 2>/dev/null || echo "(run setup-api-gateway.sh to generate)"
echo "========================================"
