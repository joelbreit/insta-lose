# Insta-Lose Plan

## Game Design

1. Players are eliminated by drawing insta-lose cards
2. The last player to not be eliminated is the winner
3. Players turns are determined at the start of the game and continue in a circular order
4. On their turn, players can play 0 or more cards before drawing a card
   1. Played cards are placed in a discard pile
5. Players end their turn by drawing a card or playing a card that allows them to do otherwise
6. Deck
   1. The deck is shuffled at the start of the game
   2. Each player player starts with [7] cards including
      1. 1 panic card
   3. numPlayers - 1 insta-lose cards are added to the deck
   4. numPlayers * [5] random cards are added to the deck
   5. The deck is then shuffled
   6. Player order is randomized and the first player is randomly chosen
   
7. Card types
   1. insta-lose: if drawn, the player must play a panic card or else they are eliminated
   2. panic: can only be played when drawing an insta-lose card - allows the player to not insta-lose and place the insta-lose card back in the deck - their turn then ends
   3. pairs: pairs of pair cards can be played to steal a random card from another player
   4. peak: allows the player to peak at the top [3] card of the deck without drawing it
   5. skip: allows the player to skip (not draw a card) and end their turn
   6. misdeal: allows the player to misdeal (shuffle the deck)

### Future

(Do not implement these yet)

- [ ] Player reactions
  - [ ] ehń: stop the action of another player
    - [ ] everyone starts with 1 ehń card
- [ ] Attack cards
  - [ ] get out: player picks a player to choose a card to discard without playing it
  - [ ] rock paper scissors: player picks a target player
    - [ ] if the target player has a rock, paper, or scissors card, their card competes with the originators card and the winner takes both cards
      - [ ] if the target player has multiple cards, they can choose which card to compete with
    - [ ] if the target player does not have a rock, paper, or scissors card, they must give a card of their choice to the originator

## Concepts / Architecture

### Host

- [x] A host machine hosts a shared view for all players to see. The host machine is the one that is hosting the game. No players use this machine during the game
- [x] The host machine creates a game but does not start or participate in the game

### Serverless

- [ ] Entire game state in one DynamoDB table entry:

```json
{
  gameId: "XRAY42",
  hostPlayerId: "player-uuid-1",
  status: "waiting" | "in-progress" | "finished",
  createdAt: 1234567890,
  updatedAt: 1234567890,
  
  // Game configuration
  maxPlayers: 100,
  
  // Current game state
  currentTurnPlayerId: "player-uuid-2",
  turnOrder: ["player-uuid-1", "player-uuid-2", "player-uuid-3"],
  deck: ["card-1", "card-2", ...], // Array of card IDs remaining
  discardPile: ["card-10", "card-5", ...],
  
  // Players array
  players: [
    {
      playerId: "player-uuid-1",
      name: "You",
      icon: "🐱",
      color: "bg-blue-500",
      hand: ["card-3", "card-7"], // Their cards
      isAlive: true
    },
    {
      playerId: "player-uuid-2",
      name: "Sarah",
      icon: "🐶",
      color: "bg-pink-500",
      hand: ["card-4", "card-8", "card-12"],
      isAlive: true
    }
  ],

  // Actions
  actions: [
    { playerId: "player-uuid-2", action: "played", cardId: "card-10", timestamp: 1234567890 },
    { playerId: "player-uuid-1", action: "drew", cardId: "card-11", timestamp: 1234567889 }
  ]
}
```

### API Endpoints

#### 1. **CreateGame**
**Endpoint:** `POST /games`

**Input:**
```javascript
{
  hostPlayerId: "player-uuid-1", // Generated client-side
  hostName: "Joel",
  hostIcon: "🐱",
  hostColor: "bg-blue-500"
}
```

**Logic:**
- Generate unique 6-character room code (check it doesn't exist)
- Initialize game with host as first player
- Set status to "waiting"
- Initialize shuffled deck

**Output:**
```javascript
{
  gameId: "XRAY42",
  game: { ...full game object... }
}
```

#### 2. **JoinGame**
**Endpoint:** `POST /games/{gameId}/join`

**Input:**
```javascript
{
  playerId: "player-uuid-2",
  name: "Sarah",
  icon: "🐶",
  color: "bg-pink-500"
}
```

**Logic:**
- Check game exists and status is "waiting"
- Check not already full (maxPlayers)
- Check player isn't already in game
- Add player to players array
- Update `updatedAt`

**Output:**
```javascript
{
  success: true,
  game: { ...full game object... }
}
```

#### 3. **GetGameState**
**Endpoint:** `GET /games/{gameId}?playerId={playerId}`

For MVP, clients will poll this endpoint every 2 seconds to get the latest game state. Gets 304 Not Modified if the game state has not changed since the last request.

**Input:**
```javascript
{
  lastUpdatedAt: 1234567890
}
```

**Logic:**
- Fetch game from DynamoDB
- **Filter the response** - don't send other players' hands to this player
- Return game state

**Output:**
```javascript
{
  gameId: "XRAY42",
  status: "in-progress",
  currentTurnPlayerId: "player-uuid-2",
  myHand: ["card-3", "card-7"], // Only this player's cards
  players: [
    { playerId: "...", name: "...", cardCount: 5, isAlive: true }, // No hand shown
    { playerId: "...", name: "...", cardCount: 3, isAlive: true }
  ],
  // ... rest of public game state
  updatedAt: 1234567890
}
```

**Important:** This is called every 2 seconds by every player.

#### 4. **StartGame**
**Endpoint:** `POST /games/{gameId}/start`

**Input:**
```javascript
{
  playerId: "player-uuid-1" // Must be host
}
```

**Logic:**
- Verify playerId is the host
- Deal initial cards to all players
- Set first player's turn
- Change status to "in-progress"

**Output:**
```javascript
{
  success: true,
  game: { ...full game object... }
}
```

#### 5. **TakeAction**
**Endpoint:** `POST /games/{gameId}/action`

**Input:**
```javascript
{
  playerId: "player-uuid-1",
  actionType: "draw" | "playCard" | "pass",
  cardId?: "card-3" // If playing a card
}
```

**Logic:**
- Verify it's this player's turn
- Validate action is legal
- Update game state:
  - Draw card: Add random card from deck to player's hand
  - Play card: Remove from hand, add to discard, apply card effect
  - Pass: Move to next player
- Apply card effects (skip, attack, etc.)
- Move to next turn if appropriate
- Check win conditions
- Add to recentActions log

**Output:**
```javascript
{
  success: true,
  game: { ...filtered game state... }
}
```

#### 6. **LeaveGame** (Not in MVP)
**Endpoint:** `POST /games/{gameId}/leave`

**Input:**
```javascript
{
  playerId: "player-uuid-2"
}
```

**Logic:**
- Remove player from game
- If host left and game is "waiting", delete game
- If host left and game is "in-progress", assign new host or end game

### Code Organization

- Scripts should be placed in src/scripts
- Lambda function source code should be placed in src/lambda in a folder named after the function e.g.
  - src/lambda/createGame/
    - index.js
    - package.json
    - README.md
    - tests/
      - test-success.js
      - test-404.js

## Features

- [ ] Create game view
  - [ ] (Settings)
- [ ] Join game view
  - [ ] Game ID
  - [ ] Name
  - [ ] Icon
  - [ ] Color
  - [ ] Join button
- [ ] Waiting room
  - [ ] Host screen
    - [ ] Show game ID
    - [ ] Show player list
    - [ ] Show messages
      - [ ] No players: "Waiting for players to join" message
      - [ ] 1+ players: "Waiting for MVP to start the game" message
  - [ ] All players
    - [ ] Player list: names, icons, colors
  - [ ] MPV (first player to join is the MVP)
    - [ ] "Start the game when all players are in" message
    - [ ] Start button
  - [ ] Players
    - [ ] "Waiting for [MVP name] to start the game" message
- [ ] Game view
  - [ ] Host screen
    - [ ] Game ID
    - [ ] Player list
      - [ ] Name, icon, color, numCards, isAlive
    - [ ] Game state
      - [ ] Current turn player
    - [ ] Recent actions
  - [ ] Your turn view
    - [ ] Bright theme
    - [ ] Draw Card button
  - [ ] Not your turn view
    - [ ] Gray theme
  - [ ] All players
    - [ ] Your cards component
      - [ ] Horizontal scroll if necessary
      - [ ] Mini cards components
        - [ ] Name, icon
        - [ ] When selected, show card actions component
      - [ ] Card actions component
        - [ ] Shown when a mini card is selected
        - [ ] Play button (only enabled when the card is playable)
        - [ ] Info button (shows the card info modal)
      - [ ] Card Info modal 
        - [ ] Activated when the info button is clicked
        - [ ] Card name/icon
        - [ ] Instructions for the card
    - [ ] Game state modal
      - [ ] Player list
        - [ ] Name, icon, color, numCards, isAlive
      - [ ] Deck
        - [ ] Cards remaining
      - [ ] Recent actions
- [ ] Game recap view
  - [ ] Player list
    - [ ] Name, icon, color, numCards, isAlive
    - [ ] Rank by elimination order
  - [ ] Winner message
  - [ ] Link to theme song

For now, the game must be restarted from the host machine for a new game to start

## Tech Stack

- [ ] React
- [ ] Tailwind v4