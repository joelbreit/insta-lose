import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PlayerList from "../components/PlayerList";
import PlayerCircle from "../components/PlayerCircle";
import CardHand from "../components/CardHand";
import { getGameState, takeAction } from "../services/api";
import { gameWebSocket } from "../services/websocket";
import { CARD_TYPES } from "../utils/cardTypes";
import {
	Users,
	Layers,
	Volume2,
	VolumeX,
	SkipForward,
	Wifi,
	WifiOff,
	Skull,
	AlertCircle,
	Eye,
} from "lucide-react";
import { useMusic } from "../hooks/useMusic";
import Header from "../components/Header";
import { PlayerIcon } from "../components/PlayerIcon";

const POLL_INTERVAL = 3000; // Fallback polling interval (3 seconds)

function formatActionText(action, gameState) {
	const normalizedCardType = action.cardType?.startsWith("pairs-")
		? "pairs"
		: action.cardType;
	const cardTypeInfo = action.cardType
		? CARD_TYPES[normalizedCardType]
		: null;
	const cardName = cardTypeInfo?.name || action.cardType?.toUpperCase() || "";

	if (action.type === "draw") {
		if (action.result === "eliminated") {
			return "INSTA-LOST!!!";
		} else if (action.result === "saved-by-panic") {
			return "WAS SAVED BY A PANIC CARD!";
		} else if (action.result === "drew-card") {
			return "DREW A CARD!";
		}
	} else if (action.type === "playCard") {
		if (action.cardType === "skip") {
			return "SKIPPED THEIR TURN!";
		} else if (action.cardType === "misdeal") {
			return "MISDEALT THE DECK!";
		} else if (action.cardType === "peek") {
			return "PEEKED AT THE DECK!";
		} else if (action.result === "stole-card" && action.targetPlayerId) {
			const targetPlayer = gameState.players.find(
				(p) => p.playerId === action.targetPlayerId
			);
			const targetName = targetPlayer?.name || "UNKNOWN";
			return `STOLE A CARD FROM ${targetName.toUpperCase()}!`;
		} else if (
			action.result === "played" ||
			action.result === "pair-played"
		) {
			return `PLAYED ${cardName.toUpperCase()}`;
		}
	}

	// Fallback for any unhandled cases
	return action.type.toUpperCase();
}

// Group actions by turn for host view
function groupActionsByTurn(actions) {
	if (!actions || actions.length === 0) return [];

	// Actions already have actionNumber from server (persistent across all game actions)
	const turns = [];
	let currentTurn = null;

	for (const action of actions) {
		// Start a new turn if:
		// 1. No current turn
		// 2. Different player
		// 3. Previous action ended the turn
		if (
			!currentTurn ||
			currentTurn.playerId !== action.playerId ||
			(currentTurn.actions.length > 0 &&
				(currentTurn.actions[currentTurn.actions.length - 1].type ===
					"draw" ||
					(currentTurn.actions[currentTurn.actions.length - 1]
						.type === "playCard" &&
						currentTurn.actions[currentTurn.actions.length - 1]
							.cardType === "skip")))
		) {
			// Save previous turn if it exists
			if (currentTurn) {
				// Reverse actions within turn to show newest on top
				currentTurn.actions.reverse();
				turns.push(currentTurn);
			}
			// Start new turn
			currentTurn = {
				playerId: action.playerId,
				actions: [action],
			};
		} else {
			// Add to current turn
			currentTurn.actions.push(action);
		}
	}

	// Don't forget the last turn
	if (currentTurn) {
		// Reverse actions within turn to show newest on top
		currentTurn.actions.reverse();
		turns.push(currentTurn);
	}

	// Reverse to show most recent turns first
	return turns.reverse();
}

function Game() {
	const { gameId } = useParams();
	const navigate = useNavigate();
	const [player, setPlayer] = useState(null);
	const [selectedCard, setSelectedCard] = useState(null);
	const [isActing, setIsActing] = useState(false);
	const [error, setError] = useState(null);
	const [showGameState, setShowGameState] = useState(false);
	const [peekedCards, setPeekedCards] = useState(null);
	const [actionResult, setActionResult] = useState(null);
	const [wsConnected, setWsConnected] = useState(false);

	// Refs for polling fallback
	const pollIntervalRef = useRef(null);
	const lastUpdatedAtRef = useRef(null);

	const {
		isPlaying,
		playGameMusic,
		stop,
		pause,
		resume,
		playNextTrack,
		status,
	} = useMusic();

	// Game state from server
	const [gameState, setGameState] = useState({
		status: "in-progress",
		currentTurnPlayerId: null,
		deckCount: 0,
		discardPileCount: 0,
		players: [],
		myHand: [],
		actions: [],
		turnOrder: [],
	});

	const [isHost, setIsHost] = useState(false);

	// Load player or host from localStorage
	useEffect(() => {
		const storedPlayer = localStorage.getItem("player");
		const storedHost = localStorage.getItem("host");

		if (storedHost) {
			const hostData = JSON.parse(storedHost);
			// Verify this host belongs to this game
			if (hostData.gameId === gameId) {
				setIsHost(true);
			} else {
				// Wrong game, redirect
				navigate("/");
			}
		} else if (storedPlayer) {
			setPlayer(JSON.parse(storedPlayer));
			setIsHost(false);
		} else {
			navigate("/");
		}
	}, [gameId, navigate]);

	// Fetch game state (for initial load and fallback polling)
	const fetchGameState = useCallback(
		async (forceRefresh = false) => {
			try {
				const playerId = isHost ? null : player?.playerId;
				const lastUpdatedAt = forceRefresh
					? null
					: lastUpdatedAtRef.current;
				const state = await getGameState(
					gameId,
					playerId,
					lastUpdatedAt
				);

				if (state === null) {
					// Not modified (304)
					return;
				}

				// Check if game has finished
				if (state.status === "finished") {
					navigate(`/recap/${gameId}`);
					return;
				}

				setGameState(state);
				lastUpdatedAtRef.current = state.updatedAt;
				setError(null);
			} catch (err) {
				console.error("Failed to fetch game state:", err);
			}
		},
		[gameId, player, isHost, navigate]
	);

	// Handle WebSocket messages
	const handleWebSocketMessage = useCallback(
		(message) => {
			if (message.type === "gameStateUpdate" && message.data) {
				const state = message.data;

				// Check if game has finished
				if (state.status === "finished") {
					navigate(`/recap/${gameId}`);
					return;
				}

				setGameState(state);
				lastUpdatedAtRef.current = state.updatedAt;
				setError(null);

				// Handle peeked cards from action result
				if (message.actionResult?.peekedCards) {
					setPeekedCards(message.actionResult.peekedCards);
				}
			}
		},
		[gameId, navigate]
	);

	// Start fallback polling
	const startPolling = useCallback(() => {
		if (pollIntervalRef.current) return; // Already polling
		console.log("Starting fallback polling");
		pollIntervalRef.current = setInterval(
			() => fetchGameState(false),
			POLL_INTERVAL
		);
	}, [fetchGameState]);

	// Stop fallback polling
	const stopPolling = useCallback(() => {
		if (pollIntervalRef.current) {
			console.log("Stopping fallback polling");
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
	}, []);

	// WebSocket connection and fallback polling
	useEffect(() => {
		if (!player && !isHost) return;

		const playerId = isHost ? null : player?.playerId;

		// Initial fetch (always do this)
		fetchGameState(true);

		// Try WebSocket connection
		if (gameWebSocket.isAvailable()) {
			gameWebSocket
				.connect(gameId, playerId, isHost)
				.then(() => {
					setWsConnected(true);
					stopPolling(); // Stop polling if WebSocket connected
				})
				.catch((err) => {
					console.warn(
						"WebSocket connection failed, using polling:",
						err
					);
					setWsConnected(false);
					startPolling();
				});

			// Register message handler
			const removeMessageHandler = gameWebSocket.onMessage(
				handleWebSocketMessage
			);

			// Handle WebSocket close - fall back to polling
			const removeCloseHandler = gameWebSocket.onClose(() => {
				setWsConnected(false);
				startPolling();
			});

			// Handle WebSocket reconnect
			const removeOpenHandler = gameWebSocket.onOpen(() => {
				setWsConnected(true);
				stopPolling();
				fetchGameState(true); // Refresh state on reconnect
			});

			return () => {
				removeMessageHandler();
				removeCloseHandler();
				removeOpenHandler();
				gameWebSocket.disconnect();
				stopPolling();
			};
		} else {
			// WebSocket not available, use polling
			startPolling();
			return () => stopPolling();
		}
	}, [
		player,
		isHost,
		gameId,
		fetchGameState,
		handleWebSocketMessage,
		startPolling,
		stopPolling,
	]);

	// Auto-start music when game loads
	useEffect(() => {
		if (isHost) {
			// Try to start music (may fail due to autoplay policy)
			playGameMusic();
		}

		// Clean up music when leaving game
		return () => {
			stop();
		};
	}, [isHost]); // can't add playGameMusic to dependencies because it will cause a loop

	const isMyTurn =
		!isHost && gameState.currentTurnPlayerId === player?.playerId;

	const handleDrawCard = async () => {
		if (!player || !isMyTurn || isActing) return;

		setIsActing(true);
		setError(null);
		setActionResult(null);

		try {
			const result = await takeAction(gameId, {
				playerId: player.playerId,
				actionType: "draw",
			});

			// Handle special results
			if (result.action?.result === "eliminated") {
				setActionResult({
					type: "eliminated",
					message:
						"You drew an Insta-Lose card and had no Panic card! You're out!",
					icon: Skull,
				});
			} else if (result.action?.result === "saved-by-panic") {
				setActionResult({
					type: "saved",
					message:
						"You drew an Insta-Lose card but your Panic card saved you!",
					icon: AlertCircle,
				});
			}

			// If not using WebSocket, fetch updated state
			if (!wsConnected) {
				await fetchGameState(true);
			}
		} catch (err) {
			console.error("Failed to draw card:", err);
			setError(err.message || "Failed to draw card");
		} finally {
			setIsActing(false);
		}
	};

	const handlePlayCard = async (cardId, targetPlayerId = null) => {
		if (!player || !isMyTurn || isActing) return;

		const card = gameState.myHand.find((c) => c.id === cardId);
		if (!card) return;

		// Panic cards can only be auto-played when drawing insta-lose, not manually
		if (card.type === "panic") {
			setError(
				"Panic cards can only be played automatically when you draw an Insta-Lose card"
			);
			return;
		}

		// Check if pairs card needs a target
		if (card.type.startsWith("pairs-") && !targetPlayerId) {
			// Check if player has a matching pair
			const matchingPairs = gameState.myHand.filter(
				(c) => c.type === card.type
			);
			if (matchingPairs.length >= 2) {
				// Need to select a target - show target selection UI
				setSelectedCard({ ...card, needsTarget: true });
				return;
			} else {
				// Player doesn't have a matching pair
				setError("You need a matching pair card to play this card");
				return;
			}
		}

		setIsActing(true);
		setError(null);
		setActionResult(null);
		setPeekedCards(null);

		try {
			const result = await takeAction(gameId, {
				playerId: player.playerId,
				actionType: "playCard",
				cardId,
				targetPlayerId,
			});

			// Handle peek result (from REST response, WebSocket will also send this)
			if (result.action?.peekedCards) {
				setPeekedCards(result.action.peekedCards);
			}

			// Handle steal result
			if (result.action?.result === "stole-card") {
				const targetPlayer = gameState.players.find(
					(p) => p.playerId === result.action.targetPlayerId
				);
				setActionResult({
					type: "steal",
					message: `You stole a card from ${
						targetPlayer?.name || "another player"
					}!`,
					icon: Users,
				});
			}

			setSelectedCard(null);

			// If not using WebSocket, fetch updated state
			if (!wsConnected) {
				await fetchGameState(true);
			}
		} catch (err) {
			console.error("Failed to play card:", err);
			setError(err.message || "Failed to play card");
		} finally {
			setIsActing(false);
		}
	};

	// Find current player info (only for actual players, not hosts)
	const myPlayerInfo = isHost
		? null
		: gameState.players.find((p) => p.playerId === player?.playerId);
	const isAlive = isHost ? true : myPlayerInfo?.isAlive ?? true;

	// Get target selection for pairs (only for players)
	const otherAlivePlayers = isHost
		? []
		: gameState.players.filter(
				(p) => p.playerId !== player?.playerId && p.isAlive
		  );

	// Check if a card is playable
	const isCardPlayable = (card) => {
		// Panic cards can only be auto-played when drawing insta-lose, not manually
		if (card.type === "panic") {
			return false;
		}

		// Pair cards can only be played if player has a matching pair
		if (card.type.startsWith("pairs-")) {
			const matchingPairs = gameState.myHand.filter(
				(c) => c.type === card.type
			);
			// Player must have at least 2 matching pairs (including the one they're trying to play)
			return matchingPairs.length >= 2;
		}

		// All other cards are playable
		return true;
	};

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			{/* Top bar */}
			<div className="px-4 py-4">
				<div className="flex justify-between items-center max-w-7xl mx-auto">
					<div className="flex items-center gap-3">
						<div className="font-mono text-2xl font-bold text-yellow-300 tracking-widest">
							{gameId}
						</div>
						{/* Connection status indicator */}
						<div
							title={
								wsConnected
									? "Real-time connected"
									: "Using polling"
							}
						>
							{wsConnected ? (
								<Wifi className="h-5 w-5 text-green-400" />
							) : (
								<WifiOff className="h-5 w-5 text-yellow-500" />
							)}
						</div>
					</div>
					<div className="flex items-center gap-6 text-lg">
						{isHost && (
							// Music Controls
							<div className="flex items-center gap-2">
								<button
									onClick={() =>
										isPlaying
											? pause()
											: status.hasAudio
											? resume()
											: playGameMusic()
									}
									className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-purple-600 to-purple-800 border-4 border-purple-900 hover:from-purple-500 hover:to-purple-700"
									title={
										isPlaying
											? "Mute Music"
											: "Unmute Music"
									}
								>
									{isPlaying ? (
										<Volume2 className="h-6 w-6 text-yellow-300" />
									) : (
										<VolumeX className="h-6 w-6 text-gray-400" />
									)}
								</button>
								<button
									onClick={playNextTrack}
									className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-purple-600 to-purple-800 border-4 border-purple-900 hover:from-purple-500 hover:to-purple-700"
									title="Next Track"
								>
									<SkipForward className="h-6 w-6 text-cyan-300" />
								</button>
								<div className="px-4 py-2 bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-600">
									<span className="font-bold text-green-300 tracking-wide text-sm">
										TRACK {status.currentTrackIndex + 1}
									</span>
								</div>
							</div>
						)}

						<div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-600">
							<Layers className="h-6 w-6 text-cyan-300" />
							<span className="font-bold text-yellow-300 tracking-wide">
								{gameState.deckCount}
							</span>
						</div>
						<button
							onClick={() => setShowGameState(true)}
							className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-blue-600 to-blue-800 border-4 border-blue-900 hover:from-blue-500 hover:to-blue-700"
						>
							<Users className="h-6 w-6 text-cyan-300" />
							<span className="font-bold text-yellow-300 tracking-wide">
								{
									gameState.players.filter((p) => p.isAlive)
										.length
								}
							</span>
						</button>
					</div>
				</div>
			</div>

			{/* Main game area */}
			<div className="flex-1 flex flex-col p-4">
				{/* SPECTATOR VIEW - Only for Host */}
				{isHost ? (
					<div className="mx-auto w-full h-full flex gap-4">
						{/* Left side - Players Circle (2/3 width) */}
						<div className="basis-2/3 beveled-box">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-4 h-full flex flex-col">
								<div className="flex-1 flex items-center justify-center">
									<PlayerCircle
										players={gameState.players}
										currentTurnPlayerId={
											gameState.currentTurnPlayerId
										}
										showCardCount
										large
										turnOrder={gameState.turnOrder}
										centerElement={
											<div className="relative">
												{/* Stack effect - bottom cards */}
												<div className="absolute top-4 left-2 w-32 h-44 bg-gray-800 border-4 border-gray-900 rounded-sm" />
												<div className="absolute top-2 left-1 w-32 h-44 bg-gray-700 border-4 border-gray-800 rounded-sm" />
												{/* Top card */}
												<div className="relative w-32 h-44 bg-gradient-to-br from-blue-600 to-blue-800 border-4 border-blue-900 rounded-sm flex flex-col items-center justify-center shadow-lg">
													<Layers
														className="w-12 h-12 text-cyan-300"
														strokeWidth={2.5}
													/>
													<div className="text-4xl font-bold text-yellow-300 mt-2">
														{gameState.deckCount}
													</div>
												</div>
												<div className="text-center mt-3 text-base font-bold text-cyan-300 tracking-wide">
													DRAW PILE
												</div>
											</div>
										}
									/>
								</div>
							</div>
						</div>

						{/* Right side - Recent Turns (1/3 width) */}
						<div className="basis-1/3 beveled-box">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-4 h-full flex flex-col">
								{/* Current Turn Indicator */}
								<div className="mb-4 px-4 py-3 bg-gradient-to-b from-yellow-600 to-yellow-800 border-4 border-yellow-900 text-center">
									<div className="text-xs font-bold text-black/70 tracking-wide mb-1">
										CURRENT TURN
									</div>
									<div className="flex items-center justify-center gap-2">
										{(() => {
											const currentPlayer =
												gameState.players.find(
													(p) =>
														p.playerId ===
														gameState.currentTurnPlayerId
												);
											return currentPlayer ? (
												<>
													<PlayerIcon
														iconName={
															currentPlayer.icon
														}
														colorName={
															currentPlayer.color
														}
														size="sm"
													/>
													<span className="text-lg font-bold text-black tracking-wider">
														{currentPlayer.name.toUpperCase()}
													</span>
												</>
											) : (
												<span className="text-lg font-bold text-black tracking-wider">
													...
												</span>
											);
										})()}
									</div>
								</div>
								<div className="text-lg font-bold text-cyan-300 tracking-wider mb-3 text-center">
									RECENT TURNS
								</div>
								<div className="flex-1 overflow-y-auto space-y-3">
									{groupActionsByTurn(gameState.actions)
										.slice(0, 6)
										.map((turn, turnIndex) => {
											const turnPlayer =
												gameState.players.find(
													(p) =>
														p.playerId ===
														turn.playerId
												);
											return (
												<div
													key={turnIndex}
													className="bg-gray-900 border-2 border-gray-600 p-2"
												>
													{/* Turn header */}
													<div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
														{turnPlayer && (
															<PlayerIcon
																iconName={
																	turnPlayer.icon
																}
																colorName={
																	turnPlayer.color
																}
																size="sm"
															/>
														)}
														<div className="text-sm font-bold text-green-300 tracking-wide truncate">
															{(
																turnPlayer?.name ||
																"HOST"
															).toUpperCase()}
															{"'S TURN"}
														</div>
													</div>
													{/* Turn actions */}
													<div className="space-y-1">
														{turn.actions.map(
															(
																action,
																actionIndex
															) => (
																<div
																	key={
																		actionIndex
																	}
																	className="text-xs text-yellow-300 font-bold tracking-wide pl-2 flex items-center gap-2"
																>
																	<span className="text-cyan-300 font-mono">
																		{
																			action.actionNumber
																		}
																		.
																	</span>
																	<span>
																		{formatActionText(
																			action,
																			gameState
																		)}
																	</span>
																</div>
															)
														)}
													</div>
												</div>
											);
										})}
								</div>
							</div>
						</div>
					</div>
				) : (
					<>
						{/* PLAYER VIEW */}
						{/* Error display */}
						{error && (
							<div className="mb-6 p-6 bg-red-900 border-4 border-red-500 text-center">
								<p className="text-xl font-bold text-yellow-300 tracking-wide">
									{error.toUpperCase()}
								</p>
							</div>
						)}

						{/* Action result display */}
						{actionResult && (
							<div
								className={`mb-6 p-6 border-4 text-center ${
									actionResult.type === "eliminated"
										? "bg-red-900 border-red-500"
										: actionResult.type === "saved"
										? "bg-yellow-900 border-yellow-500"
										: "bg-purple-900 border-purple-500"
								}`}
							>
								<div className="flex items-center justify-center gap-3 mb-3">
									{actionResult.icon && (
										<actionResult.icon
											className="w-8 h-8 text-yellow-300"
											strokeWidth={2.5}
										/>
									)}
									<p className="text-xl font-bold text-yellow-300 tracking-wide">
										{actionResult.message.toUpperCase()}
									</p>
								</div>
								<button
									onClick={() => setActionResult(null)}
									className="px-4 py-2 bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-gray-900 text-cyan-300 font-bold tracking-wide"
								>
									DISMISS
								</button>
							</div>
						)}

						{/* Peeked cards display */}
						{peekedCards && (
							<div className="mb-6 beveled-box">
								<div className="bevel-outer" />
								<div className="bevel-inner" />
								<div className="bevel-content p-6">
									<div className="flex items-center justify-center gap-3 text-center text-cyan-300 font-bold text-xl tracking-wide mb-6">
										<Eye
											className="w-6 h-6"
											strokeWidth={2.5}
										/>
										<span>TOP 3 CARDS OF THE DECK:</span>
									</div>
									<div className="flex justify-center gap-4">
										{peekedCards
											.slice()
											.reverse()
											.map((card, index) => {
												const normalizedType =
													card.type?.startsWith(
														"pairs-"
													)
														? "pairs"
														: card.type;
												const cardType =
													CARD_TYPES[normalizedType];
												const drawOrder = index + 1;
												const orderLabels = [
													"1ST",
													"2ND",
													"3RD",
												];
												return (
													<div
														key={card.id}
														className="flex flex-col items-center gap-2"
													>
														<div className="text-sm font-bold text-yellow-300 tracking-wide">
															DRAW{" "}
															{orderLabels[index]}
														</div>
														<div
															className={`relative w-24 h-32 border-4 border-black flex flex-col items-center justify-center ${
																cardType?.bgColor ||
																"bg-slate-500"
															} ${
																cardType?.textColor ||
																"text-white"
															}`}
															style={{
																boxShadow:
																	"0 4px 0 #000",
															}}
														>
															{/* Order indicator badge */}
															<div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-b from-yellow-600 to-yellow-800 border-4 border-yellow-900 rounded-full flex items-center justify-center shadow-lg">
																<span className="text-sm font-bold text-black">
																	{drawOrder}
																</span>
															</div>
															{cardType?.icon ? (
																<cardType.icon
																	className="w-8 h-8"
																	strokeWidth={
																		2.5
																	}
																/>
															) : (
																<span className="text-3xl">
																	?
																</span>
															)}
															{card.type.startsWith(
																"pairs-"
															) ? (
																<span className="text-sm font-bold text-center px-1 tracking-wide">
																	{
																		card.type.split(
																			"-"
																		)[1]
																	}
																</span>
															) : (
																<span className="text-xs font-bold text-center px-1 tracking-wide">
																	{cardType?.name.toUpperCase()}
																</span>
															)}
														</div>
													</div>
												);
											})}
									</div>
									<button
										onClick={() => setPeekedCards(null)}
										className="block mx-auto mt-6 px-6 py-3 bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-gray-900 text-cyan-300 font-bold text-lg tracking-wide"
									>
										CLOSE
									</button>
								</div>
							</div>
						)}

						{/* Turn indicator */}
						<div className="text-center mb-8">
							{!isAlive ? (
								<div className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-b from-red-600 to-red-800 border-4 border-red-900">
									<Skull
										className="w-8 h-8 text-yellow-300"
										strokeWidth={2.5}
									/>
									<span className="text-2xl font-bold text-yellow-300 tracking-wider">
										ELIMINATED
									</span>
								</div>
							) : isMyTurn ? (
								<div className="inline-block px-10 py-4 bg-gradient-to-b from-yellow-600 to-yellow-800 border-4 border-yellow-900 animate-pulse">
									<span className="text-2xl font-bold text-black tracking-wider">
										YOUR TURN!
									</span>
								</div>
							) : (
								<div className="inline-block px-10 py-4 bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-gray-900">
									<span className="text-2xl font-bold text-cyan-300 tracking-wider">
										{(
											gameState.players.find(
												(p) =>
													p.playerId ===
													gameState.currentTurnPlayerId
											)?.name || "..."
										).toUpperCase()}
										'S TURN
									</span>
								</div>
							)}
						</div>

						{/* Player circle (compact) */}
						<div className="beveled-box mb-8">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-6">
								<PlayerCircle
									players={gameState.players}
									currentTurnPlayerId={
										gameState.currentTurnPlayerId
									}
									currentPlayerId={player?.playerId}
									showCardCount
									compact
									turnOrder={gameState.turnOrder}
								/>
							</div>
						</div>

						{/* Spacer */}
						<div className="flex-1" />
					</>
				)}

				{/* Target selection for pairs - only for players */}
				{!isHost && selectedCard?.needsTarget && (
					<div className="mb-8 beveled-box">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6">
							<div className="flex items-center justify-center gap-3 text-center text-yellow-300 font-bold text-2xl tracking-wide mb-6">
								<Users className="w-8 h-8" strokeWidth={2.5} />
								<span>CHOOSE A PLAYER TO STEAL FROM:</span>
							</div>
							<div className="flex flex-wrap justify-center gap-4">
								{otherAlivePlayers.map((p) => (
									<button
										key={p.playerId}
										onClick={() =>
											handlePlayCard(
												selectedCard.id,
												p.playerId
											)
										}
										className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-purple-600 to-purple-800 border-4 border-purple-900 hover:from-purple-500 hover:to-purple-700"
									>
										<PlayerIcon
											iconName={p.icon}
											colorName={p.color}
											size="md"
										/>
										<span className="font-bold text-xl text-cyan-300 tracking-wide">
											{p.name.toUpperCase()}
										</span>
										<span className="text-lg text-yellow-300 font-bold">
											({p.cardCount})
										</span>
									</button>
								))}
							</div>
							<button
								onClick={() => setSelectedCard(null)}
								className="block mx-auto mt-6 px-6 py-3 bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-gray-900 text-cyan-300 font-bold text-lg tracking-wide"
							>
								CANCEL
							</button>
						</div>
					</div>
				)}

				{/* Draw button - only for players, not hosts */}
				{!isHost && isMyTurn && isAlive && (
					<button
						onClick={handleDrawCard}
						disabled={isActing}
						className="n64-button mx-auto mb-8 block"
					>
						<div className="n64-button-shadow bg-gradient-to-b from-green-600 to-green-800" />
						<div className="n64-button-face bg-gradient-to-b from-green-500 to-green-700 border-green-900 px-16 py-6 text-yellow-300">
							<div className="flex items-center justify-center gap-3">
								{!isActing && (
									<Layers
										className="w-8 h-8"
										strokeWidth={2.5}
									/>
								)}
								<span className="text-3xl font-bold">
									{isActing ? "..." : "DRAW CARD"}
								</span>
							</div>
						</div>
					</button>
				)}
			</div>

			{/* Card hand - only for players, not hosts */}
			{!isHost && isAlive && (
				<CardHand
					cards={gameState.myHand}
					selectedCard={
						selectedCard?.needsTarget ? null : selectedCard
					}
					onSelectCard={setSelectedCard}
					onPlayCard={handlePlayCard}
					canPlay={isMyTurn && !isActing}
					isCardPlayable={isCardPlayable}
				/>
			)}

			{/* Game state modal */}
			{showGameState && (
				<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
					<div className="beveled-box max-w-2xl w-full max-h-[80vh] overflow-y-auto">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-8">
							<h3 className="text-3xl font-bold mb-8 text-yellow-300 tracking-wider">
								GAME STATE
							</h3>

							<div className="space-y-6">
								<div className="p-4 bg-gray-900 border-4 border-gray-600">
									<div className="text-lg text-cyan-300 font-bold tracking-wide mb-2">
										DECK
									</div>
									<div className="font-bold text-2xl text-yellow-300">
										{gameState.deckCount} CARDS REMAINING
									</div>
								</div>

								<div className="p-4 bg-gray-900 border-4 border-gray-600">
									<div className="text-lg text-cyan-300 font-bold tracking-wide mb-2">
										DISCARD PILE
									</div>
									<div className="font-bold text-2xl text-yellow-300">
										{gameState.discardPileCount} CARDS
									</div>
								</div>

								<div>
									<div className="text-lg text-cyan-300 font-bold tracking-wide mb-4">
										PLAYERS
									</div>
									<PlayerList
										players={gameState.players}
										currentTurnPlayerId={
											gameState.currentTurnPlayerId
										}
										showCardCount
									/>
								</div>

								<div>
									<div className="text-lg text-cyan-300 font-bold tracking-wide mb-4">
										RECENT ACTIONS
									</div>
									<div className="space-y-2">
										{gameState.actions
											.slice(-5)
											.reverse()
											.map((action, i) => {
												const actionPlayer =
													gameState.players.find(
														(p) =>
															p.playerId ===
															action.playerId
													);
												return (
													<div
														key={i}
														className="text-green-300 font-bold tracking-wide p-2 bg-gray-900 border-2 border-gray-700"
													>
														{(
															actionPlayer?.name ||
															"HOST"
														).toUpperCase()}
														:{" "}
														{action.type.toUpperCase()}
														{action.cardType &&
															!(
																action.type ===
																	"draw" &&
																action.playerId !==
																	player?.playerId
															) &&
															` (${action.cardType.toUpperCase()})`}
													</div>
												);
											})}
									</div>
								</div>
							</div>

							<button
								onClick={() => setShowGameState(false)}
								className="w-full mt-8 py-4 bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-gray-900 font-bold text-xl text-yellow-300 tracking-wider"
							>
								CLOSE
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Game;
