/**
 * WebSocket $default handler
 * Handles any messages that don't match a specific route
 * 
 * In v1, we don't expect clients to send messages through WebSocket.
 * All game actions go through REST API, and WebSocket is only for
 * receiving server-pushed updates.
 * 
 * This handler exists to gracefully handle any unexpected messages.
 */
exports.handler = async (event) => {
	const connectionId = event.requestContext.connectionId;
	
	console.log(`Received message on default route from ${connectionId}:`, event.body);
	
	// Parse the message if it's JSON
	let message = null;
	try {
		if (event.body) {
			message = JSON.parse(event.body);
		}
	} catch {
		// Not JSON, that's fine
	}
	
	// For v1, we just acknowledge the message but don't process it
	// Future versions could handle client-initiated actions here
	return {
		statusCode: 200,
		body: JSON.stringify({ 
			message: "Message received but not processed. Use REST API for game actions.",
			received: message ? message.action : null,
		}),
	};
};

