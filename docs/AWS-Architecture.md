# AWS Architecture

## Overview

Insta-Lose uses a serverless architecture on AWS to minimize costs and eliminate server management. The game state is stored in DynamoDB, accessed via Lambda functions through API Gateway (both REST and WebSocket), with the frontend hosted on S3/Amplify.

```
                                    ┌─────────────┐
                              ┌────▶│  DynamoDB   │
                              │     │   (Games)   │
┌─────────────┐     ┌─────────────┐ │ └─────────────┘
│   Browser   │────▶│ REST API    │─┤
│  (React)    │◀────│  Gateway    │◀┤
└─────────────┘     └─────────────┘ │ ┌─────────────┐
       │ ▲                          └▶│   Lambda    │
       │ │                            │  Functions  │
       │ │          ┌─────────────┐   └─────────────┘
       │ └──────────│  WebSocket  │─┐        │
       └───────────▶│  API GW     │ │        │
       (real-time)  └─────────────┘ │        ▼
                                    │  ┌─────────────┐
                                    └─▶│  DynamoDB   │
                                       │(Connections)│
                                       └─────────────┘
       │
       │ Static Assets
       ▼
┌─────────────┐
│  S3 / CDN   │
│  (Amplify)  │
└─────────────┘
```

### Communication Pattern

- **REST API:** Used for one-time actions (create game, join game, take action, initial state load)
- **WebSocket API:** Used for real-time server-pushed updates (game state changes, player joins, turn changes)

---

## DynamoDB

### Table: `InstaLoseGames`

Single-table design storing all game state in one item per game.

**Key Schema:**
| Attribute     | Type   | Description                            |
| ------------- | ------ | -------------------------------------- |
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

### Table: `InstaLoseConnections`

Stores active WebSocket connections for real-time broadcasting.

**Key Schema:**
| Attribute           | Type   | Description                              |
| ------------------- | ------ | ---------------------------------------- |
| `connectionId` (PK) | String | WebSocket connection ID from API Gateway |

**Global Secondary Index:** `gameId-index`
| Attribute     | Type   | Description                                      |
| ------------- | ------ | ------------------------------------------------ |
| `gameId` (PK) | String | Game code for querying all connections in a game |

**Item Structure:**
```json
{
  "connectionId": "ABC123xyz=",
  "gameId": "XRAY42",
  "playerId": "player-uuid-1",
  "isHost": false,
  "connectedAt": 1234567890,
  "ttl": 1234654290
}
```

**Configuration:**
- **Billing Mode:** Pay-per-request (on-demand)
- **TTL:** Enabled on `ttl` attribute - stale connections auto-delete after 24 hours
- **GSI:** `gameId-index` for efficient lookup of all connections in a game

**Cost Estimate:** ~$0.00 for low usage (minimal storage, covered by free tier)

---

## API Gateway

### REST API: `insta-lose-api` (HTTP API)

HTTP API (not REST API) for lower latency and cost.

**Base URL:** `https://{api-id}.execute-api.{region}.amazonaws.com/prod`

#### Endpoints

| Method | Path                     | Lambda       | Description                               |
| ------ | ------------------------ | ------------ | ----------------------------------------- |
| `POST` | `/games`                 | createGame   | Create a new game room                    |
| `POST` | `/games/{gameId}/join`   | joinGame     | Join an existing game (broadcasts update) |
| `GET`  | `/games/{gameId}`        | getGameState | Get current game state (initial load)     |
| `POST` | `/games/{gameId}/start`  | startGame    | MVP starts the game (broadcasts update)   |
| `POST` | `/games/{gameId}/action` | takeAction   | Play card or draw (broadcasts update)     |

#### CORS Configuration

```json
{
  "AllowOrigins": ["*"],
  "AllowMethods": ["GET", "POST", "OPTIONS"],
  "AllowHeaders": ["Content-Type"]
}
```

**Note:** For production, restrict `AllowOrigins` to your domain.

**Cost Estimate:** $1.00 per million requests (HTTP API pricing)

---

### WebSocket API: `insta-lose-websocket-api`

WebSocket API for real-time server-pushed updates.

**Endpoint:** `wss://{api-id}.execute-api.{region}.amazonaws.com/prod`

#### Connection URL Format

```
wss://{api-id}.execute-api.{region}.amazonaws.com/prod?gameId={gameId}&playerId={playerId}&isHost={true|false}
```

| Parameter  | Required | Description                            |
| ---------- | -------- | -------------------------------------- |
| `gameId`   | Yes      | The game code to subscribe to          |
| `playerId` | No       | Player's ID (null for host/spectator)  |
| `isHost`   | No       | Whether connection is from host screen |

#### Routes

| Route         | Lambda       | Description                              |
| ------------- | ------------ | ---------------------------------------- |
| `$connect`    | onConnect    | Store connection in DynamoDB             |
| `$disconnect` | onDisconnect | Remove connection from DynamoDB          |
| `$default`    | onDefault    | Handle unexpected messages (no-op in v1) |

#### Message Format (Server → Client)

```json
{
  "type": "gameStateUpdate",
  "data": {
    "gameId": "XRAY42",
    "status": "in-progress",
    "currentTurnPlayerId": "player-uuid-2",
    "players": [...],
    "myHand": [...],
    "deckCount": 15,
    "discardPileCount": 3,
    "actions": [...],
    "updatedAt": 1234567890
  }
}
```

**Note:** `myHand` is filtered per-connection based on `playerId`. Hosts/spectators receive empty hand arrays.

**Cost Estimate:** $1.00 per million connection minutes + $1.00 per million messages

---

## Lambda

### Functions

All functions use Node.js 20.x runtime with AWS SDK v3.

#### REST API Functions

##### 1. `insta-lose-createGame`
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

##### 2. `insta-lose-joinGame`
- **Trigger:** `POST /games/{gameId}/join`
- **Purpose:** Add player to waiting game
- **Validations:** Game exists, status is "waiting", not full, player not already in
- **Side Effect:** Broadcasts game state update via WebSocket

##### 3. `insta-lose-getGameState`
- **Trigger:** `GET /games/{gameId}?playerId={id}&lastUpdatedAt={ts}`
- **Purpose:** Return filtered game state (hides other players' hands)
- **Usage:** Initial state load on page mount (no longer used for polling)
- **304 Support:** Returns "Not Modified" if `lastUpdatedAt` hasn't changed

##### 4. `insta-lose-startGame`
- **Trigger:** `POST /games/{gameId}/start`
- **Purpose:** Deal cards, set turn order, change status to "in-progress"
- **Authorization:** Only MVP (first player) can start
- **Side Effect:** Broadcasts game state update via WebSocket

##### 5. `insta-lose-takeAction`
- **Trigger:** `POST /games/{gameId}/action`
- **Purpose:** Handle all game actions (draw, play card)
- **Actions:**
  - `draw` - Draw card from deck, handle insta-lose logic
  - `playCard` - Play a card, apply its effect
- **Turn Management:** Validates it's player's turn, advances to next player
- **Side Effect:** Broadcasts game state update via WebSocket

#### WebSocket API Functions

##### 6. `insta-lose-onConnect`
- **Trigger:** WebSocket `$connect` route
- **Purpose:** Store connection information when client connects
- **Input:** Query string parameters (`gameId`, `playerId`, `isHost`)
- **Storage:** Writes to `InstaLoseConnections` table

##### 7. `insta-lose-onDisconnect`
- **Trigger:** WebSocket `$disconnect` route
- **Purpose:** Clean up connection when client disconnects
- **Storage:** Deletes from `InstaLoseConnections` table

##### 8. `insta-lose-onDefault`
- **Trigger:** WebSocket `$default` route
- **Purpose:** Handle unexpected messages (returns acknowledgment, no processing)
- **Note:** In v1, clients don't send messages; all actions go through REST API

#### Shared Module

##### `broadcast.js`
- **Location:** `src/lambda/shared/broadcast.js`
- **Purpose:** Utility for broadcasting game state to WebSocket connections
- **Functions:**
  - `broadcastToGame(gameId, game, options)` - Send updates to all connections for a game
  - `getConnectionsForGame(gameId)` - Query connections by game ID
  - `filterGameStateForRecipient(game, playerId)` - Filter state per recipient

### IAM Role: `insta-lose-lambda-role`

**Attached Policies:**
1. `AWSLambdaBasicExecutionRole` - CloudWatch Logs access
2. `insta-lose-dynamodb-policy` - DynamoDB CRUD on `InstaLoseGames` table
3. `insta-lose-websocket-policy` - WebSocket connection management

**DynamoDB Policy (Games Table):**
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

**WebSocket Policy (Connections Table + API Gateway):**
```json
{
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
        "arn:aws:dynamodb:{region}:{account}:table/InstaLoseConnections",
        "arn:aws:dynamodb:{region}:{account}:table/InstaLoseConnections/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["execute-api:ManageConnections"],
      "Resource": "arn:aws:execute-api:{region}:{account}:*/*/@connections/*"
    }
  ]
}
```

### Configuration

| Setting     | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Runtime     | Node.js 20.x                                                                     |
| Timeout     | 30 seconds                                                                       |
| Memory      | 128 MB (default)                                                                 |
| Environment | `TABLE_NAME=InstaLoseGames`                                                      |
| Environment | `CONNECTIONS_TABLE_NAME=InstaLoseConnections`                                    |
| Environment | `WEBSOCKET_ENDPOINT=https://{ws-api-id}.execute-api.{region}.amazonaws.com/prod` |

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

3. Set environment variables:
   - `VITE_API_URL` = `https://{api-id}.execute-api.{region}.amazonaws.com/prod`
   - `VITE_WS_URL` = `wss://{ws-api-id}.execute-api.{region}.amazonaws.com/prod`

### Custom Domain (Optional)

1. Add domain in Amplify Console
2. Amplify automatically provisions SSL certificate
3. Configure DNS records as instructed

**Cost Estimate:** Free tier covers 1000 build minutes/month, 15 GB served/month

---

## Cost Summary

For a low-traffic family game:

| Service                | Estimated Monthly Cost |
| ---------------------- | ---------------------- |
| DynamoDB (Games)       | $0.00 (free tier)      |
| DynamoDB (Connections) | $0.00 (free tier)      |
| Lambda                 | $0.00 (free tier)      |
| REST API Gateway       | $0.00 - $1.00          |
| WebSocket API Gateway  | $0.00 - $0.50          |
| S3 / Amplify           | $0.00 - $0.50          |
| **Total**              | **$0.00 - $2.00**      |

---

## Security Considerations

1. **No Authentication (by design):** Game is meant to be frictionless for family use
2. **Game Code as Security:** 6-character codes provide ~1.07 billion combinations
3. **Rate Limiting:** Consider adding API Gateway throttling if abuse occurs
4. **CORS:** Restrict to your domain in production
5. **Input Validation:** All Lambdas validate required fields
6. **TTL Cleanup:** Old games and connections automatically deleted after 24 hours
7. **Connection Filtering:** Game state is filtered per-connection to hide other players' hands

---

## Monitoring

### CloudWatch

- **Lambda Logs:** Automatic via `AWSLambdaBasicExecutionRole`
- **API Gateway Logs:** Enable in stage settings if needed
- **WebSocket Metrics:** Connection count, message count available in CloudWatch
- **Metrics:** Invocations, errors, duration available in CloudWatch

### Useful Queries

```sql
-- Find errors in Lambda logs
fields @timestamp, @message
| filter @message like /Error/
| sort @timestamp desc
| limit 20

-- Track WebSocket connections
fields @timestamp, @message
| filter @message like /Connection/
| sort @timestamp desc
| limit 50
```

---

## Scaling Notes

Current architecture easily handles:
- Hundreds of concurrent games
- Thousands of players
- Real-time updates via WebSocket (no polling overhead)
- No cold start concerns for casual gaming pace

If scaling beyond this:
- Consider DynamoDB DAX for caching
- Add connection pooling for high-concurrency games
- Implement connection sharding for very large games (100+ players)

---

## Setup Scripts

### Infrastructure Deployment Order

```bash
# 1. Setup IAM role
./scripts/setup-iam.sh

# 2. Setup DynamoDB tables
./scripts/setup-dynamodb.sh

# 3. Deploy Lambda functions (REST)
./scripts/deploy-lambdas.sh

# 4. Setup REST API Gateway
./scripts/setup-api-gateway.sh

# 5. Setup WebSocket infrastructure (connections table, WS Lambdas, WS API Gateway)
./scripts/setup-websocket.sh

# 6. Generate frontend config
./scripts/generate-config.sh
```

### Teardown

```bash
./scripts/teardown-aws.sh
```
