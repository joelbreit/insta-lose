const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME || "InstaLoseConnections";

/**
 * WebSocket $connect handler
 * Stores connection information when a client connects
 * 
 * Connection URL format:
 * wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}?gameId={gameId}&playerId={playerId}&isHost={true|false}
 */
exports.handler = async (event) => {
	try {
		const connectionId = event.requestContext.connectionId;
		const queryParams = event.queryStringParameters || {};
		
		const gameId = queryParams.gameId;
		const playerId = queryParams.playerId || null;
		const isHost = queryParams.isHost === "true";
		
		// Validate required parameters
		if (!gameId) {
			console.error("Missing gameId in connection request");
			return {
				statusCode: 400,
				body: JSON.stringify({ error: "Missing gameId parameter" }),
			};
		}
		
		// Calculate TTL (24 hours from now)
		const ttl = Math.floor(Date.now() / 1000) + 86400;
		
		// Store connection in DynamoDB
		const connection = {
			connectionId,
			gameId,
			playerId,
			isHost,
			connectedAt: Date.now(),
			ttl,
		};
		
		const command = new PutCommand({
			TableName: CONNECTIONS_TABLE_NAME,
			Item: connection,
		});
		
		await docClient.send(command);
		
		console.log(`Connection stored: ${connectionId} for game ${gameId}`, {
			playerId,
			isHost,
		});
		
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "Connected" }),
		};
	} catch (error) {
		console.error("Error in onConnect:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: "Failed to connect" }),
		};
	}
};

