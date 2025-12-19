#!/bin/bash

# Setup DynamoDB table for Insta-Lose

set -e

REGION="${AWS_REGION:-us-east-1}"
TABLE_NAME="InstaLoseGames"

echo "Creating DynamoDB table: $TABLE_NAME"

# Check if table already exists
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "Table $TABLE_NAME already exists. Skipping creation."
    exit 0
fi

# Create table
aws dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions \
        AttributeName=gameId,AttributeType=S \
    --key-schema \
        AttributeName=gameId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"

echo "Waiting for table to be active..."
aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"

# Enable TTL for automatic cleanup of old games (optional)
# Games will be deleted 24 hours after last update
aws dynamodb update-time-to-live \
    --table-name "$TABLE_NAME" \
    --time-to-live-specification "Enabled=true,AttributeName=ttl" \
    --region "$REGION" 2>/dev/null || true

echo "DynamoDB table created successfully!"
