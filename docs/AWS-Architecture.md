# AWS Architecture

## Overview

Insta-Lose uses a serverless architecture on AWS to minimize costs and eliminate server management. The game state is stored in DynamoDB, accessed via Lambda functions through API Gateway, with the frontend hosted on S3/Amplify.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│ API Gateway │────▶│   Lambda    │────▶│  DynamoDB   │
│  (React)    │◀────│   (HTTP)    │◀────│  Functions  │◀────│   (Games)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │
       │ Static Assets
       ▼
┌─────────────┐
│  S3 / CDN   │
│  (Amplify)  │
└─────────────┘
```

---

## DynamoDB

### Table: `InstaLoseGames`

Single-table design storing all game state in one item per game.

**Key Schema:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `gameId` (PK) | String | 6-character game code (e.g., "XRAY42") |

**Item Structure:**
```json
{
  "gameId": "XRAY42",
  "hostPlayerId": "player-uuid-1",
  "status": "waiting | in-progress | finished",
  "createdAt": 1234567890,
  "updatedAt": 1234567890,
  "maxPlayers": 100,
  "currentTurnPlayerId": "player-uuid-2",
  "turnOrder": ["player-uuid-1", "player-uuid-2", "player-uuid-3"],
  "deck": [
    { "id": "card-123", "type": "skip" },
    { "id": "card-124", "type": "insta-lose" }
  ],
  "discardPile": [],
  "players": [
    {
      "playerId": "player-uuid-1",
      "name": "Joel",
      "icon": "🐱",
      "color": "bg-blue-500",
      "hand": [{ "id": "card-100", "type": "panic" }],
      "isAlive": true
    }
  ],
  "actions": [
    { "playerId": "...", "type": "drew", "cardType": "skip", "timestamp": 1234567890 }
  ],
  "winnerId": null,
  "ttl": 1234654290
}
```

**Configuration:**
- **Billing Mode:** Pay-per-request (on-demand) - ideal for sporadic game traffic
- **TTL:** Enabled on `ttl` attribute - games auto-delete 24 hours after last update
- **No GSIs needed:** All access is by `gameId` primary key

**Cost Estimate:** ~$0.00 for low usage (free tier covers 25 GB storage, 25 WCU, 25 RCU)

---

## API Gateway

### API: `insta-lose-api` (HTTP API)

HTTP API (not REST API) for lower latency and cost.

**Base URL:** `https://{api-id}.execute-api.{region}.amazonaws.com/prod`

### Endpoints

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| `POST` | `/games` | createGame | Create a new game room |
| `POST` | `/games/{gameId}/join` | joinGame | Join an existing game |
| `GET` | `/games/{gameId}` | getGameState | Poll current game state |
| `POST` | `/games/{gameId}/start` | startGame | MVP starts the game |
| `POST` | `/games/{gameId}/action` | takeAction | Play card or draw |

### CORS Configuration

```json
{
  "AllowOrigins": ["*"],
  "AllowMethods": ["GET", "POST", "OPTIONS"],
  "AllowHeaders": ["Content-Type"]
}
```

**Note:** For production, restrict `AllowOrigins` to your domain.

### Request/Response Flow

1. Browser makes HTTP request to API Gateway
2. API Gateway routes to appropriate Lambda based on path/method
3. Lambda processes request, interacts with DynamoDB
4. Response flows back through API Gateway to browser

**Cost Estimate:** $1.00 per million requests (HTTP API pricing)

---

## Lambda

### Functions

All functions use Node.js 20.x runtime with AWS SDK v3.

#### 1. `insta-lose-createGame`
- **Trigger:** `POST /games`
- **Purpose:** Generate unique game code, initialize game state
- **Input:**
  ```json
  {
    "hostPlayerId": "player-uuid",
    "hostName": "Joel",
    "hostIcon": "🐱",
    "hostColor": "bg-blue-500"
  }
  ```
- **Output:** `{ "gameId": "XRAY42", "game": {...} }`

#### 2. `insta-lose-joinGame`
- **Trigger:** `POST /games/{gameId}/join`
- **Purpose:** Add player to waiting game
- **Validations:** Game exists, status is "waiting", not full, player not already in

#### 3. `insta-lose-getGameState`
- **Trigger:** `GET /games/{gameId}?playerId={id}&lastUpdatedAt={ts}`
- **Purpose:** Return filtered game state (hides other players' hands)
- **Polling:** Clients call every 2 seconds
- **304 Support:** Returns "Not Modified" if `lastUpdatedAt` hasn't changed

#### 4. `insta-lose-startGame`
- **Trigger:** `POST /games/{gameId}/start`
- **Purpose:** Deal cards, set turn order, change status to "in-progress"
- **Authorization:** Only MVP (first player) can start

#### 5. `insta-lose-takeAction`
- **Trigger:** `POST /games/{gameId}/action`
- **Purpose:** Handle all game actions (draw, play card)
- **Actions:**
  - `draw` - Draw card from deck, handle insta-lose logic
  - `playCard` - Play a card, apply its effect
- **Turn Management:** Validates it's player's turn, advances to next player

### IAM Role: `insta-lose-lambda-role`

**Attached Policies:**
1. `AWSLambdaBasicExecutionRole` - CloudWatch Logs access
2. `insta-lose-dynamodb-policy` - DynamoDB CRUD on `InstaLoseGames` table

**DynamoDB Policy:**
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem"
  ],
  "Resource": "arn:aws:dynamodb:{region}:{account}:table/InstaLoseGames"
}
```

### Configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20.x |
| Timeout | 30 seconds |
| Memory | 128 MB (default) |
| Environment | `TABLE_NAME=InstaLoseGames` |

**Cost Estimate:** ~$0.00 for low usage (free tier covers 1M requests/month)

---

## S3

### Bucket: `insta-lose-frontend` (or via Amplify)

Hosts the built React application.

**Structure:**
```
/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── vite.svg
```

**Configuration:**
- **Static Website Hosting:** Enabled
- **Index Document:** `index.html`
- **Error Document:** `index.html` (for SPA routing)
- **Public Access:** Enabled for website hosting

**Bucket Policy:**
```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::insta-lose-frontend/*"
}
```

**Deployment:**
```bash
npm run build
aws s3 sync dist/ s3://insta-lose-frontend --delete
```

**Cost Estimate:** ~$0.02/month for storage + $0.09/GB transfer

---

## Amplify

Alternative to manual S3 + CloudFront setup. Recommended for simplicity.

### Amplify Hosting

**Features:**
- Automatic builds from Git repository
- Built-in CI/CD pipeline
- Free SSL certificate
- Global CDN distribution
- Preview deployments for PRs

### Setup

1. Connect GitHub repository to Amplify Console
2. Configure build settings:

**amplify.yml:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

3. Set environment variable:
   - `VITE_API_URL` = `https://{api-id}.execute-api.{region}.amazonaws.com/prod`

### Custom Domain (Optional)

1. Add domain in Amplify Console
2. Amplify automatically provisions SSL certificate
3. Configure DNS records as instructed

**Cost Estimate:** Free tier covers 1000 build minutes/month, 15 GB served/month

---

## Cost Summary

For a low-traffic family game:

| Service | Estimated Monthly Cost |
|---------|----------------------|
| DynamoDB | $0.00 (free tier) |
| Lambda | $0.00 (free tier) |
| API Gateway | $0.00 - $1.00 |
| S3 / Amplify | $0.00 - $0.50 |
| **Total** | **$0.00 - $1.50** |

---

## Security Considerations

1. **No Authentication (by design):** Game is meant to be frictionless for family use
2. **Game Code as Security:** 6-character codes provide ~1.07 billion combinations
3. **Rate Limiting:** Consider adding API Gateway throttling if abuse occurs
4. **CORS:** Restrict to your domain in production
5. **Input Validation:** All Lambdas validate required fields
6. **TTL Cleanup:** Old games automatically deleted after 24 hours

---

## Monitoring

### CloudWatch

- **Lambda Logs:** Automatic via `AWSLambdaBasicExecutionRole`
- **API Gateway Logs:** Enable in stage settings if needed
- **Metrics:** Invocations, errors, duration available in CloudWatch

### Useful Queries

```sql
-- Find errors in Lambda logs
fields @timestamp, @message
| filter @message like /Error/
| sort @timestamp desc
| limit 20
```

---

## Scaling Notes

Current architecture easily handles:
- Hundreds of concurrent games
- Thousands of players
- No cold start concerns for casual gaming pace

If scaling beyond this:
- Consider DynamoDB DAX for caching
- Add API Gateway caching for `getGameState`
- Implement WebSocket API instead of polling (significant refactor)
