const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME || "InstaLoseConnections";

/**
 * Get the WebSocket endpoint URL from environment or event
 * The endpoint is needed to send messages back to connected clients
 */
function getWebSocketEndpoint() {
	// Set by environment variable during deployment
	// Format: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
	return process.env.WEBSOCKET_ENDPOINT;
}

/**
 * Get all connections for a specific game
 * @param {string} gameId - The game ID to get connections for
 * @returns {Promise<Array>} - Array of connection objects
 */
async function getConnectionsForGame(gameId) {
	const command = new QueryCommand({
		TableName: CONNECTIONS_TABLE_NAME,
		IndexName: "gameId-index",
		KeyConditionExpression: "gameId = :gameId",
		ExpressionAttributeValues: {
			":gameId": gameId,
		},
	});
	
	const result = await docClient.send(command);
	return result.Items || [];
}

/**
 * Remove a stale connection from the database
 * Called when PostToConnection fails (connection no longer exists)
 * @param {string} connectionId - The connection ID to remove
 */
async function removeStaleConnection(connectionId) {
	try {
		const command = new DeleteCommand({
			TableName: CONNECTIONS_TABLE_NAME,
			Key: { connectionId },
		});
		await docClient.send(command);
		console.log(`Removed stale connection: ${connectionId}`);
	} catch (error) {
		console.error(`Failed to remove stale connection ${connectionId}:`, error);
	}
}

/**
 * Filter game state based on the recipient (player vs host/spectator)
 * This matches the logic in getGameState Lambda
 * 
 * @param {Object} game - Full game state from DynamoDB
 * @param {string|null} playerId - The player ID to filter for (null for spectator)
 * @returns {Object} - Filtered game state
 */
function filterGameStateForRecipient(game, playerId) {
	// For spectators/hosts, return state without hands
	if (!playerId) {
		return {
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
			myHand: [],
			actions: game.actions?.slice(-10) || [],
			updatedAt: game.updatedAt,
			winnerId: game.winnerId,
		};
	}
	
	// For players, include their hand but hide others
	let myHand = [];
	const filteredPlayers = game.players.map((player) => {
		if (player.playerId === playerId) {
			myHand = player.hand || [];
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
	
	return {
		gameId: game.gameId,
		status: game.status,
		hostPlayerId: game.hostPlayerId,
		currentTurnPlayerId: game.currentTurnPlayerId,
		turnOrder: game.turnOrder,
		deckCount: game.deck?.length || 0,
		discardPileCount: game.discardPile?.length || 0,
		players: filteredPlayers,
		myHand,
		actions: game.actions?.slice(-10) || [],
		updatedAt: game.updatedAt,
		winnerId: game.winnerId,
	};
}

/**
 * Broadcast game state update to all connected clients for a game
 * 
 * @param {string} gameId - The game ID to broadcast to
 * @param {Object} game - The full game state from DynamoDB
 * @param {Object} options - Optional settings
 * @param {Object} options.actionResult - Additional action result to include (e.g., peeked cards)
 * @returns {Promise<{sent: number, failed: number}>} - Broadcast statistics
 */
async function broadcastToGame(gameId, game, options = {}) {
	const wsEndpoint = getWebSocketEndpoint();
	
	if (!wsEndpoint) {
		console.warn("WebSocket endpoint not configured, skipping broadcast");
		return { sent: 0, failed: 0 };
	}
	
	// Get all connections for this game
	const connections = await getConnectionsForGame(gameId);
	
	if (connections.length === 0) {
		console.log(`No connections found for game ${gameId}`);
		return { sent: 0, failed: 0 };
	}
	
	console.log(`Broadcasting to ${connections.length} connections for game ${gameId}`);
	
	// Create API Gateway Management client
	const apiClient = new ApiGatewayManagementApiClient({
		endpoint: wsEndpoint,
	});
	
	let sent = 0;
	let failed = 0;
	
	// Send to each connection
	const sendPromises = connections.map(async (connection) => {
		try {
			// Filter game state based on recipient
			const filteredState = filterGameStateForRecipient(game, connection.playerId);
			
			// Build message
			const message = {
				type: "gameStateUpdate",
				data: filteredState,
			};
			
			// Include action result for the specific player if applicable
			if (options.actionResult && options.actionResult.playerId === connection.playerId) {
				message.actionResult = options.actionResult;
			}
			
			const command = new PostToConnectionCommand({
				ConnectionId: connection.connectionId,
				Data: JSON.stringify(message),
			});
			
			await apiClient.send(command);
			sent++;
		} catch (error) {
			if (error.statusCode === 410 || error.name === "GoneException") {
				// Connection is stale, remove it
				await removeStaleConnection(connection.connectionId);
			} else {
				console.error(`Failed to send to connection ${connection.connectionId}:`, error);
			}
			failed++;
		}
	});
	
	await Promise.all(sendPromises);
	
	console.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
	return { sent, failed };
}

module.exports = {
	broadcastToGame,
	getConnectionsForGame,
	filterGameStateForRecipient,
};

