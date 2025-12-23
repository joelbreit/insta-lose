const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME || "InstaLoseConnections";

/**
 * WebSocket $disconnect handler
 * Removes connection information when a client disconnects
 */
exports.handler = async (event) => {
	try {
		const connectionId = event.requestContext.connectionId;
		
		// Delete connection from DynamoDB
		const command = new DeleteCommand({
			TableName: CONNECTIONS_TABLE_NAME,
			Key: { connectionId },
		});
		
		await docClient.send(command);
		
		console.log(`Connection removed: ${connectionId}`);
		
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "Disconnected" }),
		};
	} catch (error) {
		console.error("Error in onDisconnect:", error);
		// Return success anyway - connection cleanup is best-effort
		// The TTL will clean up stale connections eventually
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "Disconnected" }),
		};
	}
};

