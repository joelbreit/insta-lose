#!/bin/bash

# Deploy Lambda functions for Insta-Lose

set -e

REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="insta-lose"
TABLE_NAME="InstaLoseGames"
ROLE_ARN=$(cat scripts/output/lambda-role-arn.txt 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${PROJECT_NAME}-lambda-role"
fi

echo "Using role: $ROLE_ARN"

# Lambda functions to deploy
FUNCTIONS=("createGame" "joinGame" "getGameState" "startGame" "takeAction")

# Create temp directory for packaging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

deploy_function() {
    local func_name=$1
    local lambda_name="${PROJECT_NAME}-${func_name}"
    local source_dir="src/lambda/${func_name}"
    
    echo ""
    echo "Deploying: $lambda_name"
    
    # Check source exists
    if [ ! -f "$source_dir/index.js" ]; then
        echo "Error: $source_dir/index.js not found"
        return 1
    fi
    
    # Create package directory
    local pkg_dir="$TEMP_DIR/$func_name"
    mkdir -p "$pkg_dir"
    
    # Copy source
    cp "$source_dir/index.js" "$pkg_dir/"
    
    # Install dependencies (AWS SDK v3)
    cd "$pkg_dir"
    cat > package.json << 'EOF'
{
  "name": "lambda-function",
  "version": "1.0.0",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
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
        echo "Updating existing function..."
        aws lambda update-function-code \
            --function-name "$lambda_name" \
            --zip-file "fileb://${zip_file}" \
            --region "$REGION" > /dev/null
        
        # Wait for code update to complete
        echo "Waiting for code update to complete..."
        local max_attempts=30
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            local status=$(aws lambda get-function \
                --function-name "$lambda_name" \
                --region "$REGION" \
                --query 'Configuration.LastUpdateStatus' \
                --output text 2>/dev/null)
            
            if [ "$status" = "Successful" ]; then
                break
            elif [ "$status" = "Failed" ]; then
                echo "Error: Function update failed"
                return 1
            fi
            
            sleep 1
            attempt=$((attempt + 1))
        done
        
        if [ $attempt -eq $max_attempts ]; then
            echo "Warning: Timeout waiting for function update, proceeding anyway..."
        fi
        
        # Update configuration
        aws lambda update-function-configuration \
            --function-name "$lambda_name" \
            --environment "Variables={TABLE_NAME=$TABLE_NAME}" \
            --timeout 30 \
            --region "$REGION" > /dev/null
    else
        echo "Creating new function..."
        aws lambda create-function \
            --function-name "$lambda_name" \
            --runtime "nodejs20.x" \
            --role "$ROLE_ARN" \
            --handler "index.handler" \
            --zip-file "fileb://${zip_file}" \
            --environment "Variables={TABLE_NAME=$TABLE_NAME}" \
            --timeout 30 \
            --region "$REGION" > /dev/null
    fi
    
    # Get function ARN
    local func_arn=$(aws lambda get-function --function-name "$lambda_name" --region "$REGION" --query 'Configuration.FunctionArn' --output text)
    echo "$func_arn" >> scripts/output/lambda-arns.txt
    
    echo "Deployed: $lambda_name"
}

# Clear previous ARNs
> scripts/output/lambda-arns.txt

# Deploy all functions
for func in "${FUNCTIONS[@]}"; do
    deploy_function "$func"
done

echo ""
echo "All Lambda functions deployed successfully!"
