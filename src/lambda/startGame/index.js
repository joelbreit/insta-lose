const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "InstaLoseGames";

const CARDS_PER_PLAYER = 5;
const STARTING_HAND_SIZE = 7;

// Card types for deck building
const CARD_TYPES = {
	PANIC: "panic",
	PAIRS_A: "pairs-A",
	PAIRS_B: "pairs-B",
	PAIRS_C: "pairs-C",
	PEAK: "peak",
	SKIP: "skip",
	MISDEAL: "misdeal",
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

	// Add random cards (numPlayers * CARDS_PER_PLAYER)
	const randomCardTypes = [
		CARD_TYPES.PAIRS_A,
		CARD_TYPES.PAIRS_A,
		CARD_TYPES.PAIRS_B,
		CARD_TYPES.PAIRS_B,
		CARD_TYPES.PAIRS_C,
		CARD_TYPES.PAIRS_C,
		CARD_TYPES.PEAK,
		CARD_TYPES.PEAK,
		CARD_TYPES.PEAK,
		CARD_TYPES.SKIP,
		CARD_TYPES.SKIP,
		CARD_TYPES.SKIP,
		CARD_TYPES.MISDEAL,
		CARD_TYPES.MISDEAL,
	];

	const numRandomCards = numPlayers * CARDS_PER_PLAYER;
	for (let i = 0; i < numRandomCards; i++) {
		const type = randomCardTypes[i % randomCardTypes.length];
		cards.push({
			id: generateCardId(),
			type,
		});
	}

	// Add insta-lose cards (numPlayers - 1)
	for (let i = 0; i < numPlayers - 1; i++) {
		cards.push({
			id: generateCardId(),
			type: CARD_TYPES.INSTA_LOSE,
		});
	}

	return shuffleArray(cards);
}

function dealInitialHands(players, deck) {
	const updatedPlayers = players.map((player) => ({
		...player,
		hand: [
			// Everyone starts with 1 panic card
			{ id: generateCardId(), type: CARD_TYPES.PANIC },
		],
	}));

	// Deal remaining cards (STARTING_HAND_SIZE - 1 since they have panic)
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

		// Build and shuffle deck
		let deck = buildDeck(numPlayers);

		// Deal initial hands
		const { updatedPlayers, remainingDeck } = dealInitialHands(
			game.players,
			deck
		);

		// Randomize turn order
		const turnOrder = shuffleArray(
			updatedPlayers.map((p) => p.playerId)
		);

		const updatedGame = {
			...game,
			status: "in-progress",
			players: updatedPlayers,
			deck: remainingDeck,
			turnOrder,
			currentTurnPlayerId: turnOrder[0],
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
