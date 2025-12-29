const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const { broadcastToGame } = require("./shared/broadcast");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "InstaLoseGames";

const CARDS_PER_PLAYER = 5;
const STARTING_HAND_SIZE = 7;
// Minimum cards needed per player for initial hands (excluding save card)
const CARDS_FOR_INITIAL_HANDS = STARTING_HAND_SIZE - 1;

// Card types for deck building
const CARD_TYPES = {
	SAVE: "save",
	PAIRS_A: "pairs-A",
	PAIRS_B: "pairs-B",
	PAIRS_C: "pairs-C",
	PEEK: "peek",
	SKIP: "skip",
	SHUFFLE: "shuffle",
	INSTA_LOSE: "insta-lose",
};

function shuffleArray(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function generateCardId() {
	return `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function buildDeck(numPlayers) {
	const cards = [];

	// Calculate deck size:
	// - Initial hands: numPlayers * CARDS_FOR_INITIAL_HANDS
	// - Plus buffer for gameplay: numPlayers * CARDS_PER_PLAYER
	// NOTE: Insta-Lose cards are NOT added here - they're added AFTER dealing initial hands
	const minCardsNeeded = numPlayers * CARDS_FOR_INITIAL_HANDS;
	const bufferCards = numPlayers * CARDS_PER_PLAYER;
	const totalRandomCards = minCardsNeeded + bufferCards;

	const randomCardTypes = [
		CARD_TYPES.PAIRS_A,
		CARD_TYPES.PAIRS_A,
		CARD_TYPES.PAIRS_B,
		CARD_TYPES.PAIRS_B,
		CARD_TYPES.PAIRS_C,
		CARD_TYPES.PAIRS_C,
		CARD_TYPES.PEEK,
		CARD_TYPES.PEEK,
		CARD_TYPES.PEEK,
		CARD_TYPES.SKIP,
		CARD_TYPES.SKIP,
		CARD_TYPES.SKIP,
		CARD_TYPES.SHUFFLE,
		CARD_TYPES.SHUFFLE,
	];

	// Add enough random cards to cover initial hands + gameplay buffer
	for (let i = 0; i < totalRandomCards; i++) {
		const type = randomCardTypes[i % randomCardTypes.length];
		cards.push({
			id: generateCardId(),
			type,
		});
	}

	// DO NOT add insta-lose cards here - they go in the deck AFTER initial hands are dealt
	return shuffleArray(cards);
}

function addInstaLoseCardsToDeck(deck, numPlayers) {
	// Add insta-lose cards (numPlayers - 1) to the remaining deck
	for (let i = 0; i < numPlayers - 1; i++) {
		deck.push({
			id: generateCardId(),
			type: CARD_TYPES.INSTA_LOSE,
		});
	}
	// Shuffle again to mix in the insta-lose cards
	return shuffleArray(deck);
}

function dealInitialHands(players, deck) {
	const updatedPlayers = players.map((player) => ({
		...player,
		hand: [
			// Everyone starts with 1 save card
			{ id: generateCardId(), type: CARD_TYPES.SAVE },
		],
	}));

	// Deal remaining cards (STARTING_HAND_SIZE - 1 since they have save)
	const cardsPerPlayer = STARTING_HAND_SIZE - 1;

	for (let i = 0; i < cardsPerPlayer; i++) {
		for (let j = 0; j < updatedPlayers.length; j++) {
			if (deck.length > 0) {
				updatedPlayers[j].hand.push(deck.pop());
			}
		}
	}

	return { updatedPlayers, remainingDeck: deck };
}

exports.handler = async (event) => {
	const headers = {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
	};

	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200, headers, body: "" };
	}

	try {
		const gameId = event.pathParameters?.gameId;
		const body = JSON.parse(event.body);
		const { playerId } = body;

		if (!gameId || !playerId) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Missing required fields" }),
			};
		}

		// Get current game
		const getCommand = new GetCommand({
			TableName: TABLE_NAME,
			Key: { gameId },
		});

		const { Item: game } = await docClient.send(getCommand);

		if (!game) {
			return {
				statusCode: 404,
				headers,
				body: JSON.stringify({ error: "Game not found" }),
			};
		}

		// Verify player is the MVP (first player)
		if (game.players[0]?.playerId !== playerId) {
			return {
				statusCode: 403,
				headers,
				body: JSON.stringify({ error: "Only MVP can start the game" }),
			};
		}

		if (game.status !== "waiting") {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Game already started" }),
			};
		}

		if (game.players.length < 2) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					error: "Need at least 2 players to start",
				}),
			};
		}

		const numPlayers = game.players.length;

		// Build and shuffle deck (WITHOUT insta-lose cards)
		let deck = buildDeck(numPlayers);

		// Deal initial hands
		const { updatedPlayers, remainingDeck } = dealInitialHands(
			game.players,
			deck
		);

		// NOW add insta-lose cards to the remaining deck
		// This ensures insta-lose cards are NEVER in initial hands
		const finalDeck = addInstaLoseCardsToDeck(remainingDeck, numPlayers);

		// Randomize turn order
		const turnOrder = shuffleArray(
			updatedPlayers.map((p) => p.playerId)
		);

		// Ensure we have a valid first player
		if (turnOrder.length === 0) {
			return {
				statusCode: 500,
				headers,
				body: JSON.stringify({ error: "Failed to create turn order" }),
			};
		}

		const firstPlayerId = turnOrder[0];

		// Verify the first player ID exists in updatedPlayers
		const firstPlayerExists = updatedPlayers.some(
			(p) => p.playerId === firstPlayerId
		);

		if (!firstPlayerExists) {
			console.error("First player ID not found in updatedPlayers", {
				firstPlayerId,
				updatedPlayers: updatedPlayers.map((p) => p.playerId),
			});
			return {
				statusCode: 500,
				headers,
				body: JSON.stringify({ error: "Invalid turn order" }),
			};
		}

		const updatedGame = {
			...game,
			status: "in-progress",
			players: updatedPlayers,
			deck: finalDeck, // Use the deck with insta-lose cards added
			discardPile: game.discardPile || [],
			turnOrder,
			currentTurnPlayerId: firstPlayerId,
			updatedAt: Date.now(),
			actions: [
				{
					type: "game-started",
					timestamp: Date.now(),
				},
			],
		};

		const putCommand = new PutCommand({
			TableName: TABLE_NAME,
			Item: updatedGame,
		});

		await docClient.send(putCommand);

		// Broadcast game start to all connected clients
		try {
			await broadcastToGame(gameId, updatedGame);
		} catch (broadcastError) {
			// Log but don't fail the request if broadcast fails
			console.error("Failed to broadcast game start:", broadcastError);
		}

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({ success: true, game: updatedGame }),
		};
	} catch (error) {
		console.error("Error starting game:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Failed to start game" }),
		};
	}
};
