const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	GetCommand,
	UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { broadcastToGame } = require("../shared/broadcast");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "InstaLoseGames";

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
		const { playerId, name, icon, color } = body;

		if (!gameId || !playerId || !name) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Missing required fields" }),
			};
		}

		// Get current game state
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

		if (game.status !== "waiting") {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Game already started" }),
			};
		}

		if (game.players.length >= game.maxPlayers) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Game is full" }),
			};
		}

		// Check if player already in game
		if (game.players.some((p) => p.playerId === playerId)) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Player already in game" }),
			};
		}

		const newPlayer = {
			playerId,
			name,
			icon: icon || "🐶",
			color: color || "bg-pink-500",
			hand: [],
			isAlive: true,
		};

		const updateCommand = new UpdateCommand({
			TableName: TABLE_NAME,
			Key: { gameId },
			UpdateExpression:
				"SET players = list_append(players, :newPlayer), updatedAt = :now",
			ExpressionAttributeValues: {
				":newPlayer": [newPlayer],
				":now": Date.now(),
			},
			ReturnValues: "ALL_NEW",
		});

		const { Attributes: updatedGame } = await docClient.send(updateCommand);

		// Broadcast updated player list to all connected clients
		try {
			await broadcastToGame(gameId, updatedGame);
		} catch (broadcastError) {
			// Log but don't fail the request if broadcast fails
			console.error("Failed to broadcast player join:", broadcastError);
		}

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({ success: true, game: updatedGame }),
		};
	} catch (error) {
		console.error("Error joining game:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Failed to join game" }),
		};
	}
};
