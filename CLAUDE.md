# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Insta-Lose** is a real-time multiplayer card elimination game. Players draw cards and use special cards to stay alive as others are eliminated. The last player standing wins. The game uses a hybrid architecture: frontend hosted locally (React + Vite) and backend on AWS serverless (Lambda + DynamoDB).

## Common Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:5173)
npm run build           # Production build
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### AWS Infrastructure
```bash
# Setup (run in order)
./scripts/setup-iam.sh           # Create IAM role for Lambda
./scripts/setup-dynamodb.sh      # Create DynamoDB table (InstaLoseGames)
./scripts/deploy-lambdas.sh      # Deploy REST Lambda functions
./scripts/setup-api-gateway.sh   # Create REST API Gateway
./scripts/setup-websocket.sh     # Setup WebSocket infrastructure (connections table, WS Lambdas, WS API Gateway)
./scripts/generate-config.sh     # Generate src/config.js with API URLs

# Teardown
./scripts/teardown-aws.sh        # Remove all AWS resources
```

## Architecture

### Client-Server Separation

**Frontend** (React SPA):
- Pages handle routing and full-screen views (`/`, `/create`, `/join`, `/waiting/:gameId`, `/game/:gameId`, `/recap/:gameId`)
- Components are reusable UI widgets (`CardHand`, `PlayerList`, `Header`)
- Services abstract API calls (`api.js`) and features (`musicService.js`)
- Hooks encapsulate React patterns (`useMusic.js`)
- Utils contain pure functions (`gameUtils.js`, `cardTypes.js`)

**Backend** (AWS Lambda + DynamoDB):
- 8 Lambda functions in `src/lambda/` (5 REST + 3 WebSocket handlers)
- DynamoDB tables: `InstaLoseGames` (game state), `InstaLoseConnections` (WebSocket connections)
- REST API Gateway exposes endpoints at `/prod/{path}`
- WebSocket API Gateway for real-time game state broadcasts

### Lambda Functions

Each Lambda function follows this pattern:
1. Parse `event.body` (JSON)
2. Validate inputs
3. Read/write DynamoDB game state
4. Return response with CORS headers

| Function | Type | Purpose |
|----------|------|---------|
| `createGame` | REST | Generate 6-char game code, create game in `waiting` status |
| `joinGame` | REST | Add player to `players` array, broadcasts update via WebSocket |
| `startGame` | REST | Build deck, deal cards, randomize turn order → `in-progress`, broadcasts |
| `getGameState` | REST | Get current game state (initial load, filters hands by playerId) |
| `takeAction` | REST | Execute player actions (`draw` or `playCard`), broadcasts update |
| `onConnect` | WS | Store WebSocket connection in `InstaLoseConnections` table |
| `onDisconnect` | WS | Remove connection from table on client disconnect |
| `onDefault` | WS | Handle unexpected messages (no-op in v1) |

**Shared Module**: `src/lambda/shared/broadcast.js` - Utility for broadcasting game state to all WebSocket connections in a game.

### Game State Structure

```javascript
{
  gameId: "ABC123",              // 6-character game code
  hostPlayerId: "host-xxx",      // Host is spectator, not player
  status: "waiting | in-progress | finished",
  currentTurnPlayerId: "player-xxx",
  turnOrder: ["p1", "p2", ...],  // Randomized rotation
  players: [{
    playerId, name, icon, color,
    hand: [...cards],            // Full card objects
    isAlive: true,
    cardCount: 7
  }],
  deck: [...cards],              // Remaining draw pile
  discardPile: [...cards],       // Played cards
  actions: [...],                // Last 50 actions (for replay/debug)
  updatedAt: timestamp,          // For 304 optimization
  winnerId: "player-xxx"         // Set when status → finished
}
```

### Card System

8 card types defined in `src/utils/cardTypes.js`:

- **Insta-Lose** (💀): Auto-eliminates player unless Panic played
- **Panic** (😱): Auto-saves from Insta-Lose, shuffles it back to deck
- **Pairs A/B/C** (👯): Requires matching pair to steal random card from target
- **Peak** (👁️): Preview top 3 deck cards
- **Skip** (⏭️): End turn without drawing
- **Misdeal** (🔀): Shuffle entire deck

**Deck Building**: `(numPlayers × 6) + (numPlayers × 5) + (numPlayers - 1) Insta-Lose` plus random distribution of other card types.

### State Management & Real-time Updates

- **No global state library**: Uses React hooks + localStorage
- **WebSocket pattern**: Frontend connects via WebSocket on page mount, receives server-pushed game state updates
- **REST for actions**: Game actions (draw, play card) still go through REST API; Lambda broadcasts result via WebSocket
- **Initial load**: Uses REST `getGameState` for immediate state on page load
- **Identity persistence**: localStorage stores `{ playerId, name, icon, color, gameId }` for players or `{ hostPlayerId, gameId, isHost: true }` for host

### Music System

Recent addition for enhanced player experience:

- **musicService.js**: Singleton audio abstraction with fade transitions
- **useMusic.js**: React hooks for game/victory music
  - `useGameMusic()`: Plays ambient game music, stops on unmount
  - `useGameEndMusic()`: Fades game music to victory theme on recap page
- **Sources**: Currently Suno CDN URLs (7 looping tracks + 1 victory theme)
- **Graceful degradation**: Handles browser autoplay policies

## Key Architectural Decisions

1. **Host as Spectator**: Host creates game but doesn't play. First joining player becomes "MVP" who can start the game. Simplifies game mechanics.

2. **WebSocket for Real-time**: Server pushes game state updates via WebSocket. REST API handles actions, Lambda broadcasts results. Connection info stored in separate DynamoDB table (`InstaLoseConnections`).

3. **Hand Filtering**: `getGameState` returns `cardCount` for other players but only sends full `hand` for requesting playerId. Prevents cheating via network inspection.

4. **Action Log**: Last 50 actions stored per game for debugging and potential replay feature.

5. **Single DynamoDB Item**: Entire game state stored as one item per `gameId`. Simpler transactions at the cost of item size (acceptable for game scale).

## Frontend Development Patterns

### Component Structure
- Pages in `src/pages/` use `useParams()` for routing params and `useNavigate()` for redirects
- Components in `src/components/` receive props and emit callbacks
- Conditional rendering based on user role (host/player/spectator)

### API Service Layer
All API calls in `src/services/api.js` follow pattern:
```javascript
const response = await fetch(API_URL + '/functionName', {
  method: 'POST',
  body: JSON.stringify({ ...params }),
  headers: { 'Content-Type': 'application/json' }
});
if (!response.ok) throw new Error(await response.text());
return response.json();
```

### Tailwind + Dark Mode
- Utility-first classes with `dark:` variants
- Custom color palette for cards and UI elements
- Responsive design with mobile-first breakpoints

## Common Development Scenarios

### Adding a New Card Type
1. Add definition to `src/utils/cardTypes.js`
2. Update deck building logic in `src/utils/gameUtils.js`
3. Add effect handler in `src/lambda/takeAction/index.js`
4. Update card rendering in `src/components/CardHand.jsx`

### Adding a New Lambda Function
1. Create folder in `src/lambda/{functionName}/`
2. Add `index.js` with handler following CORS pattern
3. Update `scripts/deploy-lambdas.sh` to include new function
4. Create corresponding method in `src/services/api.js`

### Debugging Game State
- Check browser localStorage for player identity
- Use Network tab to inspect `getGameState` polling
- Review `actions` array in DynamoDB for turn history
- Lambda CloudWatch logs show server-side errors

## Configuration

- **API URL**: Auto-generated in `src/config.js` by `scripts/generate-config.sh`
- **WebSocket URL**: Auto-generated in `src/config.js` by `scripts/generate-config.sh`
- **DynamoDB Tables**: `InstaLoseGames` (game state), `InstaLoseConnections` (WebSocket connections)
- **Region**: `us-east-1` (hardcoded in scripts)
- **Music URLs**: Configured in `src/services/musicService.js`
