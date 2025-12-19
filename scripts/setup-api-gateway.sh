#!/bin/bash

# Setup API Gateway for Insta-Lose

set -e

REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="insta-lose"
API_NAME="${PROJECT_NAME}-api"
STAGE_NAME="prod"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Creating API Gateway: $API_NAME"

# Check if API already exists
EXISTING_API=$(aws apigatewayv2 get-apis --region "$REGION" \
    --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -n "$EXISTING_API" ]; then
    echo "API already exists with ID: $EXISTING_API"
    API_ID="$EXISTING_API"
else
    # Create HTTP API
    API_ID=$(aws apigatewayv2 create-api \
        --name "$API_NAME" \
        --protocol-type HTTP \
        --cors-configuration '{
            "AllowOrigins": ["*"],
            "AllowMethods": ["GET", "POST", "OPTIONS"],
            "AllowHeaders": ["Content-Type"]
        }' \
        --region "$REGION" \
        --query 'ApiId' --output text)
    
    echo "Created API with ID: $API_ID"
fi

# Function to create integration and route
create_route() {
    local lambda_name=$1
    local method=$2
    local path=$3
    
    local func_arn="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${PROJECT_NAME}-${lambda_name}"
    
    echo "Creating route: $method $path -> $lambda_name"
    
    # Check if integration exists
    local integration_id=$(aws apigatewayv2 get-integrations \
        --api-id "$API_ID" \
        --region "$REGION" \
        --query "Items[?contains(IntegrationUri, '${lambda_name}')].IntegrationId" \
        --output text)
    
    if [ -z "$integration_id" ]; then
        # Create integration
        integration_id=$(aws apigatewayv2 create-integration \
            --api-id "$API_ID" \
            --integration-type AWS_PROXY \
            --integration-uri "$func_arn" \
            --payload-format-version "2.0" \
            --region "$REGION" \
            --query 'IntegrationId' --output text)
    fi
    
    # Create route (ignore if exists)
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "$method $path" \
        --target "integrations/$integration_id" \
        --region "$REGION" 2>/dev/null || true
    
    # Add Lambda permission for API Gateway
    aws lambda add-permission \
        --function-name "${PROJECT_NAME}-${lambda_name}" \
        --statement-id "apigateway-${lambda_name}-${method//\//-}" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
        --region "$REGION" 2>/dev/null || true
}

# Create routes for each endpoint
create_route "createGame" "POST" "/games"
create_route "joinGame" "POST" "/games/{gameId}/join"
create_route "getGameState" "GET" "/games/{gameId}"
create_route "startGame" "POST" "/games/{gameId}/start"
create_route "takeAction" "POST" "/games/{gameId}/action"

# Create/update stage
EXISTING_STAGE=$(aws apigatewayv2 get-stages --api-id "$API_ID" --region "$REGION" \
    --query "Items[?StageName=='$STAGE_NAME'].StageName" --output text)

if [ -z "$EXISTING_STAGE" ]; then
    aws apigatewayv2 create-stage \
        --api-id "$API_ID" \
        --stage-name "$STAGE_NAME" \
        --auto-deploy \
        --region "$REGION" > /dev/null
fi

# Get API endpoint
API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}"

echo "$API_ENDPOINT" > scripts/output/api-endpoint.txt
echo "$API_ID" > scripts/output/api-id.txt

echo ""
echo "API Gateway created successfully!"
echo "Endpoint: $API_ENDPOINT"
echo ""
echo "Test endpoints:"
echo "  POST $API_ENDPOINT/games"
echo "  POST $API_ENDPOINT/games/{gameId}/join"
echo "  GET  $API_ENDPOINT/games/{gameId}?playerId={playerId}"
echo "  POST $API_ENDPOINT/games/{gameId}/start"
echo "  POST $API_ENDPOINT/games/{gameId}/action"
