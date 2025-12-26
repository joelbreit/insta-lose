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

function shuffleArray(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function getNextTurnPlayerId(game) {
	const alivePlayers = game.turnOrder.filter((playerId) => {
		const player = game.players.find((p) => p.playerId === playerId);
		return player?.isAlive;
	});

	if (alivePlayers.length <= 1) return null;

	// Find the current player's position in the original turnOrder
	const currentIndexInTurnOrder = game.turnOrder.indexOf(
		game.currentTurnPlayerId
	);

	// If current player not found in turnOrder, fallback to first alive player
	if (currentIndexInTurnOrder === -1) {
		return alivePlayers[0];
	}

	// Find the next alive player in clockwise order from current position
	// Start searching from the next position in turnOrder
	for (let i = 1; i < game.turnOrder.length; i++) {
		const nextIndex = (currentIndexInTurnOrder + i) % game.turnOrder.length;
		const nextPlayerId = game.turnOrder[nextIndex];
		const nextPlayer = game.players.find((p) => p.playerId === nextPlayerId);

		if (nextPlayer?.isAlive) {
			return nextPlayerId;
		}
	}

	// Fallback (shouldn't reach here if there's at least one alive player)
	return alivePlayers[0];
}

function checkWinCondition(game) {
	const alivePlayers = game.players.filter((p) => p.isAlive);
	if (alivePlayers.length === 1) {
		return alivePlayers[0].playerId;
	}
	return null;
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
		const { playerId, actionType, cardId, targetPlayerId } = body;

		if (!gameId || !playerId || !actionType) {
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

		if (game.status !== "in-progress") {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Game not in progress" }),
			};
		}

		if (game.currentTurnPlayerId !== playerId) {
			return {
				statusCode: 403,
				headers,
				body: JSON.stringify({ error: "Not your turn" }),
			};
		}

		const playerIndex = game.players.findIndex(
			(p) => p.playerId === playerId
		);
		if (playerIndex === -1 || !game.players[playerIndex].isAlive) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({ error: "Invalid player" }),
			};
		}

		let updatedGame = { ...game };
		const action = { playerId, type: actionType, timestamp: Date.now() };

		switch (actionType) {
			case "draw": {
				if (updatedGame.deck.length === 0) {
					return {
						statusCode: 400,
						headers,
						body: JSON.stringify({ error: "Deck is empty" }),
					};
				}

				const drawnCard = updatedGame.deck.pop();
				action.cardType = drawnCard.type;

				if (drawnCard.type === "insta-lose") {
					// Check if player has panic card
					const panicIndex = updatedGame.players[
						playerIndex
					].hand.findIndex((c) => c.type === "panic");

					if (panicIndex === -1) {
						// Player is eliminated
						updatedGame.players[playerIndex].isAlive = false;
						action.result = "eliminated";

						// Insta-lose card is removed from deck (not put back)
						// This ensures the deck always has numPlayers - 1 insta-lose cards
					} else {
						// Auto-play panic card
						updatedGame.players[playerIndex].hand.splice(
							panicIndex,
							1
						);
						updatedGame.discardPile.push({
							id: `panic-${Date.now()}`,
							type: "panic",
						});

						// Put insta-lose back in deck and shuffle
						updatedGame.deck.push(drawnCard);
						updatedGame.deck = shuffleArray(updatedGame.deck);
						action.result = "saved-by-panic";
					}
				} else {
					// Normal card - add to hand
					updatedGame.players[playerIndex].hand.push(drawnCard);
					action.result = "drew-card";
				}

				// Move to next turn
				updatedGame.currentTurnPlayerId = getNextTurnPlayerId(updatedGame);
				break;
			}

			case "playCard": {
				if (!cardId) {
					return {
						statusCode: 400,
						headers,
						body: JSON.stringify({ error: "Missing cardId" }),
					};
				}

				const cardIndex = updatedGame.players[
					playerIndex
				].hand.findIndex((c) => c.id === cardId);

				if (cardIndex === -1) {
					return {
						statusCode: 400,
						headers,
						body: JSON.stringify({ error: "Card not in hand" }),
					};
				}

				const card = updatedGame.players[playerIndex].hand[cardIndex];
				action.cardType = card.type;

				// Validate card can be played
				// Panic cards can only be auto-played when drawing insta-lose, not manually
				if (card.type === "panic") {
					return {
						statusCode: 400,
						headers,
						body: JSON.stringify({
							error: "Panic cards can only be played automatically when you draw an Insta-Lose card",
						}),
					};
				}

				// Pair cards can only be played if player has a matching pair
				if (card.type.startsWith("pairs-")) {
					const pairType = card.type;
					const matchingPairs = updatedGame.players[
						playerIndex
					].hand.filter((c) => c.type === pairType);

					// Player must have at least 2 matching pairs (including the one they're trying to play)
					if (matchingPairs.length < 2) {
						return {
							statusCode: 400,
							headers,
							body: JSON.stringify({
								error: "You need a matching pair card to play this card",
							}),
						};
					}
				}

				// Remove card from hand
				updatedGame.players[playerIndex].hand.splice(cardIndex, 1);
				updatedGame.discardPile.push(card);

				// Apply card effects
				switch (card.type) {
					case "skip":
						// End turn without drawing
						updatedGame.currentTurnPlayerId =
							getNextTurnPlayerId(updatedGame);
						action.result = "skipped";
						break;

					case "misdeal":
						// Shuffle the deck
						updatedGame.deck = shuffleArray(updatedGame.deck);
						action.result = "shuffled";
						break;

					case "peek":
						// Return top 3 cards (client will display them)
						action.peekedCards = updatedGame.deck.slice(-3);
						action.result = "peeked";
						break;

					case "pairs-A":
					case "pairs-B":
					case "pairs-C": {
						// Check if player has another matching pair
						const pairType = card.type;
						const matchIndex = updatedGame.players[
							playerIndex
						].hand.findIndex((c) => c.type === pairType);

						if (matchIndex !== -1 && targetPlayerId) {
							// Remove second pair card
							updatedGame.players[playerIndex].hand.splice(
								matchIndex,
								1
							);

							// Steal random card from target
							const targetIndex = updatedGame.players.findIndex(
								(p) => p.playerId === targetPlayerId
							);

							if (
								targetIndex !== -1 &&
								updatedGame.players[targetIndex].hand.length > 0
							) {
								const randomIndex = Math.floor(
									Math.random() *
									updatedGame.players[targetIndex].hand
										.length
								);
								const stolenCard =
									updatedGame.players[targetIndex].hand.splice(
										randomIndex,
										1
									)[0];
								updatedGame.players[playerIndex].hand.push(
									stolenCard
								);
								action.result = "stole-card";
								action.targetPlayerId = targetPlayerId;
								action.stolenCardType = stolenCard.type;
							}
						} else {
							action.result = "pair-played";
						}
						break;
					}

					default:
						action.result = "played";
				}
				break;
			}

			default:
				return {
					statusCode: 400,
					headers,
					body: JSON.stringify({ error: "Invalid action type" }),
				};
		}

		// Check win condition
		const winner = checkWinCondition(updatedGame);
		if (winner) {
			updatedGame.status = "finished";
			updatedGame.winnerId = winner;
			action.winner = winner;
		}

		// Track total action count for persistent numbering
		updatedGame.totalActionCount = (updatedGame.totalActionCount || 0) + 1;

		// Add action number to the action
		action.actionNumber = updatedGame.totalActionCount;

		// Add action to log
		updatedGame.actions = [...(updatedGame.actions || []), action].slice(
			-50
		);
		updatedGame.updatedAt = Date.now();

		// Save updated game
		const putCommand = new PutCommand({
			TableName: TABLE_NAME,
			Item: updatedGame,
		});

		await docClient.send(putCommand);

		// Broadcast updated game state to all connected clients
		try {
			await broadcastToGame(gameId, updatedGame, {
				actionResult: action.peekedCards ? { playerId, peekedCards: action.peekedCards } : null,
			});
		} catch (broadcastError) {
			// Log but don't fail the request if broadcast fails
			console.error("Failed to broadcast game state:", broadcastError);
		}

		// Return filtered response
		const response = {
			success: true,
			action,
			gameStatus: updatedGame.status,
			currentTurnPlayerId: updatedGame.currentTurnPlayerId,
			winnerId: updatedGame.winnerId,
		};

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify(response),
		};
	} catch (error) {
		console.error("Error taking action:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Failed to take action" }),
		};
	}
};
