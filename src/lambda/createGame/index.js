const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	PutCommand,
	GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "InstaLoseGames";

// Generate a 6-character game code
function generateGameId() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let result = "";
	for (let i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Check if game ID already exists
async function gameExists(gameId) {
	const command = new GetCommand({
		TableName: TABLE_NAME,
		Key: { gameId },
		ProjectionExpression: "gameId",
	});

	const response = await docClient.send(command);
	return !!response.Item;
}

// Generate unique game ID
async function generateUniqueGameId() {
	let gameId;
	let attempts = 0;
	const maxAttempts = 10;

	do {
		gameId = generateGameId();
		attempts++;
		if (attempts > maxAttempts) {
			throw new Error("Failed to generate unique game ID");
		}
	} while (await gameExists(gameId));

	return gameId;
}

exports.handler = async (event) => {
	const headers = {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
	};

	// Handle CORS preflight
	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200, headers, body: "" };
	}

	try {
		const body = JSON.parse(event.body);
		const { hostPlayerId, hostName, hostIcon, hostColor } = body;

		// Validate required fields
		if (!hostPlayerId || !hostName) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Missing required fields" }),
			};
		}

		const gameId = await generateUniqueGameId();
		const now = Date.now();

		const game = {
			gameId,
			hostPlayerId,
			status: "waiting",
			createdAt: now,
			updatedAt: now,
			maxPlayers: 100,
			currentTurnPlayerId: null,
			turnOrder: [],
			deck: [],
			discardPile: [],
			players: [
				{
					playerId: hostPlayerId,
					name: hostName,
					icon: hostIcon || "🐱",
					color: hostColor || "bg-blue-500",
					hand: [],
					isAlive: true,
				},
			],
			actions: [],
		};

		const command = new PutCommand({
			TableName: TABLE_NAME,
			Item: game,
			ConditionExpression: "attribute_not_exists(gameId)",
		});

		await docClient.send(command);

		return {
			statusCode: 201,
			headers,
			body: JSON.stringify({ gameId, game }),
		};
	} catch (error) {
		console.error("Error creating game:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Failed to create game" }),
		};
	}
};
