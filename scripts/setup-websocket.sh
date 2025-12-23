#!/bin/bash

# Setup WebSocket API Gateway and Connection Management for Insta-Lose
# This script creates the WebSocket infrastructure for real-time game updates

set -e

REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="insta-lose"
WS_API_NAME="${PROJECT_NAME}-websocket-api"
CONNECTIONS_TABLE_NAME="InstaLoseConnections"
STAGE_NAME="prod"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN=$(cat scripts/output/lambda-role-arn.txt 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
    ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${PROJECT_NAME}-lambda-role"
fi

echo "========================================"
echo "Insta-Lose WebSocket Setup"
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo "========================================"

# Create output directory if it doesn't exist
mkdir -p scripts/output

# -----------------------------------------------------------------------------
# Step 1: Create DynamoDB Connections Table
# -----------------------------------------------------------------------------
echo ""
echo "Step 1: Creating DynamoDB Connections table..."

if aws dynamodb describe-table --table-name "$CONNECTIONS_TABLE_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "Table $CONNECTIONS_TABLE_NAME already exists. Skipping creation."
else
    aws dynamodb create-table \
        --table-name "$CONNECTIONS_TABLE_NAME" \
        --attribute-definitions \
            AttributeName=connectionId,AttributeType=S \
            AttributeName=gameId,AttributeType=S \
        --key-schema \
            AttributeName=connectionId,KeyType=HASH \
        --global-secondary-indexes '[
            {
                "IndexName": "gameId-index",
                "KeySchema": [{"AttributeName": "gameId", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "ALL"}
            }
        ]' \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    
    echo "Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$CONNECTIONS_TABLE_NAME" --region "$REGION"
    
    # Enable TTL for automatic cleanup (connections expire after 24 hours)
    aws dynamodb update-time-to-live \
        --table-name "$CONNECTIONS_TABLE_NAME" \
        --time-to-live-specification "Enabled=true,AttributeName=ttl" \
        --region "$REGION" 2>/dev/null || true
    
    echo "DynamoDB connections table created successfully!"
fi

# -----------------------------------------------------------------------------
# Step 2: Update IAM Role with WebSocket permissions
# -----------------------------------------------------------------------------
echo ""
echo "Step 2: Updating IAM role with WebSocket permissions..."

# Add policy for connections table and API Gateway Management API
WEBSOCKET_POLICY='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query"
            ],
            "Resource": [
                "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/'$CONNECTIONS_TABLE_NAME'",
                "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/'$CONNECTIONS_TABLE_NAME'/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "execute-api:ManageConnections"
            ],
            "Resource": "arn:aws:execute-api:'$REGION':'$ACCOUNT_ID':*/*/@connections/*"
        }
    ]
}'

# Check if policy exists, update or create
POLICY_NAME="${PROJECT_NAME}-websocket-policy"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

if aws iam get-policy --policy-arn "$POLICY_ARN" > /dev/null 2>&1; then
    echo "Policy exists, creating new version..."
    # Delete oldest version if we have 5 versions (max allowed)
    VERSIONS=$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query 'Versions[?!IsDefaultVersion].VersionId' --output text)
    for VERSION in $VERSIONS; do
        aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$VERSION" 2>/dev/null || true
        break  # Just delete one old version
    done
    
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "$WEBSOCKET_POLICY" \
        --set-as-default > /dev/null
else
    echo "Creating new policy..."
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "$WEBSOCKET_POLICY" \
        --region "$REGION" > /dev/null
fi

# Attach policy to Lambda role
aws iam attach-role-policy \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || true

echo "IAM permissions updated!"

# -----------------------------------------------------------------------------
# Step 3: Deploy WebSocket Lambda Functions
# -----------------------------------------------------------------------------
echo ""
echo "Step 3: Deploying WebSocket Lambda functions..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

deploy_ws_function() {
    local func_name=$1
    local lambda_name="${PROJECT_NAME}-${func_name}"
    local source_dir="src/lambda/${func_name}"
    
    echo "  Deploying: $lambda_name"
    
    if [ ! -f "$source_dir/index.js" ]; then
        echo "  Error: $source_dir/index.js not found"
        return 1
    fi
    
    # Create package directory
    local pkg_dir="$TEMP_DIR/$func_name"
    mkdir -p "$pkg_dir"
    
    # Copy source
    cp "$source_dir/index.js" "$pkg_dir/"
    
    # Install dependencies
    cd "$pkg_dir"
    cat > package.json << 'EOF'
{
  "name": "lambda-function",
  "version": "1.0.0",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0",
    "@aws-sdk/client-apigatewaymanagementapi": "^3.0.0"
  }
}
EOF
    npm install --production --silent
    
    # Create zip
    zip -rq "../${func_name}.zip" .
    cd - > /dev/null
    
    local zip_file="$TEMP_DIR/${func_name}.zip"
    
    # Check if function exists
    if aws lambda get-function --function-name "$lambda_name" --region "$REGION" > /dev/null 2>&1; then
        echo "  Updating existing function..."
        aws lambda update-function-code \
            --function-name "$lambda_name" \
            --zip-file "fileb://${zip_file}" \
            --region "$REGION" > /dev/null
        
        # Wait for update
        sleep 2
        
        aws lambda update-function-configuration \
            --function-name "$lambda_name" \
            --environment "Variables={CONNECTIONS_TABLE_NAME=$CONNECTIONS_TABLE_NAME,TABLE_NAME=InstaLoseGames}" \
            --timeout 30 \
            --region "$REGION" > /dev/null
    else
        echo "  Creating new function..."
        aws lambda create-function \
            --function-name "$lambda_name" \
            --runtime "nodejs20.x" \
            --role "$ROLE_ARN" \
            --handler "index.handler" \
            --zip-file "fileb://${zip_file}" \
            --environment "Variables={CONNECTIONS_TABLE_NAME=$CONNECTIONS_TABLE_NAME,TABLE_NAME=InstaLoseGames}" \
            --timeout 30 \
            --region "$REGION" > /dev/null
    fi
    
    echo "  Deployed: $lambda_name"
}

# Deploy the three WebSocket handlers
deploy_ws_function "onConnect"
deploy_ws_function "onDisconnect"
deploy_ws_function "onDefault"

# -----------------------------------------------------------------------------
# Step 4: Create WebSocket API Gateway
# -----------------------------------------------------------------------------
echo ""
echo "Step 4: Creating WebSocket API Gateway..."

# Check if WebSocket API already exists
EXISTING_WS_API=$(aws apigatewayv2 get-apis --region "$REGION" \
    --query "Items[?Name=='$WS_API_NAME' && ProtocolType=='WEBSOCKET'].ApiId" --output text)

if [ -n "$EXISTING_WS_API" ]; then
    echo "WebSocket API already exists with ID: $EXISTING_WS_API"
    WS_API_ID="$EXISTING_WS_API"
else
    # Create WebSocket API
    WS_API_ID=$(aws apigatewayv2 create-api \
        --name "$WS_API_NAME" \
        --protocol-type WEBSOCKET \
        --route-selection-expression '$request.body.action' \
        --region "$REGION" \
        --query 'ApiId' --output text)
    
    echo "Created WebSocket API with ID: $WS_API_ID"
fi

# -----------------------------------------------------------------------------
# Step 5: Create Integrations and Routes
# -----------------------------------------------------------------------------
echo ""
echo "Step 5: Configuring WebSocket routes..."

create_ws_route() {
    local route_key=$1
    local lambda_name=$2
    
    local func_arn="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${PROJECT_NAME}-${lambda_name}"
    
    echo "  Creating route: $route_key -> $lambda_name"
    
    # Check if integration exists
    local integration_id=$(aws apigatewayv2 get-integrations \
        --api-id "$WS_API_ID" \
        --region "$REGION" \
        --query "Items[?contains(IntegrationUri, '${lambda_name}')].IntegrationId" \
        --output text 2>/dev/null)
    
    if [ -z "$integration_id" ]; then
        # Create integration
        integration_id=$(aws apigatewayv2 create-integration \
            --api-id "$WS_API_ID" \
            --integration-type AWS_PROXY \
            --integration-uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${func_arn}/invocations" \
            --region "$REGION" \
            --query 'IntegrationId' --output text)
    fi
    
    # Check if route exists
    local existing_route=$(aws apigatewayv2 get-routes \
        --api-id "$WS_API_ID" \
        --region "$REGION" \
        --query "Items[?RouteKey=='${route_key}'].RouteId" \
        --output text 2>/dev/null)
    
    if [ -z "$existing_route" ]; then
        # Create route
        aws apigatewayv2 create-route \
            --api-id "$WS_API_ID" \
            --route-key "$route_key" \
            --target "integrations/$integration_id" \
            --region "$REGION" > /dev/null
    fi
    
    # Add Lambda permission for WebSocket API Gateway
    aws lambda add-permission \
        --function-name "${PROJECT_NAME}-${lambda_name}" \
        --statement-id "websocket-${lambda_name}" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${WS_API_ID}/*" \
        --region "$REGION" 2>/dev/null || true
}

# Create routes for WebSocket events
create_ws_route '$connect' "onConnect"
create_ws_route '$disconnect' "onDisconnect"
create_ws_route '$default' "onDefault"

# -----------------------------------------------------------------------------
# Step 6: Deploy WebSocket API Stage
# -----------------------------------------------------------------------------
echo ""
echo "Step 6: Deploying WebSocket API stage..."

# Check if stage exists
EXISTING_STAGE=$(aws apigatewayv2 get-stages --api-id "$WS_API_ID" --region "$REGION" \
    --query "Items[?StageName=='$STAGE_NAME'].StageName" --output text 2>/dev/null)

if [ -z "$EXISTING_STAGE" ]; then
    aws apigatewayv2 create-stage \
        --api-id "$WS_API_ID" \
        --stage-name "$STAGE_NAME" \
        --auto-deploy \
        --region "$REGION" > /dev/null
    echo "Created stage: $STAGE_NAME"
else
    echo "Stage $STAGE_NAME already exists"
fi

# Get WebSocket endpoint
WS_ENDPOINT="wss://${WS_API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}"

# Save outputs
echo "$WS_ENDPOINT" > scripts/output/websocket-endpoint.txt
echo "$WS_API_ID" > scripts/output/websocket-api-id.txt

echo ""
echo "========================================"
echo "WebSocket Setup Complete!"
echo "========================================"
echo ""
echo "WebSocket Endpoint: $WS_ENDPOINT"
echo "WebSocket API ID: $WS_API_ID"
echo ""
echo "Connection URL format:"
echo "  ${WS_ENDPOINT}?gameId={gameId}&playerId={playerId}&isHost={true|false}"
echo ""
echo "Outputs saved to:"
echo "  scripts/output/websocket-endpoint.txt"
echo "  scripts/output/websocket-api-id.txt"
echo ""
echo "Next steps:"
echo "  1. Run ./scripts/generate-config.sh to update frontend config"
echo "  2. Proceed with Phase 2: Modify existing Lambdas to broadcast"

