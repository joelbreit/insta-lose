const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "InstaLoseGames";

exports.handler = async (event) => {
	const headers = {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET, OPTIONS",
	};

	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200, headers, body: "" };
	}

	try {
		const gameId = event.pathParameters?.gameId;
		const playerId = event.queryStringParameters?.playerId;
		const lastUpdatedAt = event.queryStringParameters?.lastUpdatedAt;

		if (!gameId) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Missing gameId" }),
			};
		}

		const command = new GetCommand({
			TableName: TABLE_NAME,
			Key: { gameId },
		});

		const { Item: game } = await docClient.send(command);

		if (!game) {
			return {
				statusCode: 404,
				headers,
				body: JSON.stringify({ error: "Game not found" }),
			};
		}

		// Return 304 if not modified
		if (lastUpdatedAt && game.updatedAt <= parseInt(lastUpdatedAt)) {
			return {
				statusCode: 304,
				headers,
				body: "",
			};
		}

		// Handle spectator mode (no playerId) - return full state without filtering
		if (!playerId) {
			const response = {
				gameId: game.gameId,
				status: game.status,
				hostPlayerId: game.hostPlayerId,
				currentTurnPlayerId: game.currentTurnPlayerId,
				turnOrder: game.turnOrder,
				deckCount: game.deck?.length || 0,
				discardPileCount: game.discardPile?.length || 0,
				players: game.players.map((player) => ({
					playerId: player.playerId,
					name: player.name,
					icon: player.icon,
					color: player.color,
					cardCount: player.hand?.length || 0,
					isAlive: player.isAlive,
				})),
				myHand: [], // No hand for spectators
				actions: game.actions?.slice(-10) || [], // Last 10 actions
				updatedAt: game.updatedAt,
			};

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify(response),
			};
		}

		// Filter response - hide other players' hands for players
		let myHand = [];
		const filteredPlayers = game.players.map((player) => {
			if (player.playerId === playerId) {
				myHand = player.hand;
			}
			return {
				playerId: player.playerId,
				name: player.name,
				icon: player.icon,
				color: player.color,
				cardCount: player.hand?.length || 0,
				isAlive: player.isAlive,
			};
		});

		const response = {
			gameId: game.gameId,
			status: game.status,
			hostPlayerId: game.hostPlayerId,
			currentTurnPlayerId: game.currentTurnPlayerId,
			turnOrder: game.turnOrder,
			deckCount: game.deck?.length || 0,
			discardPileCount: game.discardPile?.length || 0,
			players: filteredPlayers,
			myHand,
			actions: game.actions?.slice(-10) || [], // Last 10 actions
			updatedAt: game.updatedAt,
		};

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify(response),
		};
	} catch (error) {
		console.error("Error getting game state:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Failed to get game state" }),
		};
	}
};
