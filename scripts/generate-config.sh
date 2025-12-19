#!/bin/bash

# Generate frontend config with API endpoint

set -e

API_ENDPOINT=$(cat scripts/output/api-endpoint.txt 2>/dev/null)

if [ -z "$API_ENDPOINT" ]; then
    echo "Error: API endpoint not found. Run setup-aws.sh first."
    exit 1
fi

# Create config file for frontend
cat > src/config.js << EOF
// Auto-generated API configuration
// Generated on: $(date)

export const API_BASE_URL = "$API_ENDPOINT";

export const API_ENDPOINTS = {
    createGame: \`\${API_BASE_URL}/games\`,
    joinGame: (gameId) => \`\${API_BASE_URL}/games/\${gameId}/join\`,
    getGameState: (gameId) => \`\${API_BASE_URL}/games/\${gameId}\`,
    startGame: (gameId) => \`\${API_BASE_URL}/games/\${gameId}/start\`,
    takeAction: (gameId) => \`\${API_BASE_URL}/games/\${gameId}/action\`,
};
EOF

echo "Config generated at src/config.js"
echo "API_BASE_URL: $API_ENDPOINT"
