#!/bin/bash

# Teardown Insta-Lose AWS resources
# Use with caution!

set -e

REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="insta-lose"
TABLE_NAME="InstaLoseGames"
ROLE_NAME="${PROJECT_NAME}-lambda-role"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "========================================"
echo "Insta-Lose AWS Teardown"
echo "Region: $REGION"
echo "========================================"
echo ""
echo "This will DELETE all Insta-Lose AWS resources!"
read -p "Are you sure? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Delete API Gateway
echo ""
echo "Deleting API Gateway..."
API_ID=$(cat scripts/output/api-id.txt 2>/dev/null || echo "")
if [ -n "$API_ID" ]; then
    aws apigatewayv2 delete-api --api-id "$API_ID" --region "$REGION" 2>/dev/null || true
    echo "API Gateway deleted."
else
    echo "No API Gateway found."
fi

# Delete Lambda functions
echo ""
echo "Deleting Lambda functions..."
FUNCTIONS=("createGame" "joinGame" "getGameState" "startGame" "takeAction")
for func in "${FUNCTIONS[@]}"; do
    lambda_name="${PROJECT_NAME}-${func}"
    echo "  Deleting $lambda_name..."
    aws lambda delete-function --function-name "$lambda_name" --region "$REGION" 2>/dev/null || true
done
echo "Lambda functions deleted."

# Detach and delete IAM policies
echo ""
echo "Cleaning up IAM..."
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${PROJECT_NAME}-dynamodb-policy"

aws iam detach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" 2>/dev/null || true

aws iam detach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || true

aws iam delete-policy --policy-arn "$POLICY_ARN" 2>/dev/null || true
aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || true
echo "IAM resources deleted."

# Delete DynamoDB table
echo ""
echo "Deleting DynamoDB table..."
aws dynamodb delete-table --table-name "$TABLE_NAME" --region "$REGION" 2>/dev/null || true
echo "DynamoDB table deleted."

# Clean up output files
rm -rf scripts/output

echo ""
echo "========================================"
echo "Teardown complete!"
echo "========================================"
