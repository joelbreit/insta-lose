#!/bin/bash

# Setup IAM role for Lambda functions

set -e

REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="insta-lose"
ROLE_NAME="${PROJECT_NAME}-lambda-role"
TABLE_NAME="InstaLoseGames"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Creating IAM role: $ROLE_NAME"

# Trust policy for Lambda
TRUST_POLICY='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}'

# Check if role already exists
if aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
    echo "Role $ROLE_NAME already exists. Skipping creation."
else
    # Create role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document "$TRUST_POLICY"
    
    echo "Waiting for role to propagate..."
    sleep 10
fi

# Attach basic Lambda execution policy
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" 2>/dev/null || true

# Create DynamoDB policy
DYNAMODB_POLICY='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/'$TABLE_NAME'"
        }
    ]
}'

POLICY_NAME="${PROJECT_NAME}-dynamodb-policy"

# Check if policy exists
if aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}" > /dev/null 2>&1; then
    echo "Policy $POLICY_NAME already exists."
else
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "$DYNAMODB_POLICY"
fi

# Attach DynamoDB policy to role
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}" 2>/dev/null || true

# Save role ARN for later use
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo "$ROLE_ARN" > scripts/output/lambda-role-arn.txt

echo "IAM role created successfully!"
echo "Role ARN: $ROLE_ARN"
