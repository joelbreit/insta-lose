import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PlayerList from "../components/PlayerList";
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
} from "lucide-react";
import { useMusic } from "../hooks/useMusic";
import Header from "../components/Header";
import { PlayerIcon } from "../components/PlayerIcon";

const POLL_INTERVAL = 3000; // Fallback polling interval (3 seconds)

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
						"💀 You drew an Insta-Lose card and had no Panic card! You're out!",
				});
			} else if (result.action?.result === "saved-by-panic") {
				setActionResult({
					type: "saved",
					message:
						"😱 You drew an Insta-Lose card but your Panic card saved you!",
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
					message: `👯 You stole a card from ${
						targetPlayer?.name || "another player"
					}!`,
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
			<div className="bg-gradient-to-b from-gray-800 to-black border-b-4 border-cyan-500 px-4 py-4">
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
										TRACK {status.currentTrackIndex + 1}/7
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
				{/* SPECTATOR BILLBOARD VIEW - Only for Host */}
				{isHost ? (
					<div className="max-w-7xl mx-auto w-full space-y-6">
						{/* Current Turn - HUGE */}
						<div className="text-center mb-8">
							<div className="inline-block px-16 py-8 bg-gradient-to-b from-yellow-600 to-yellow-800 border-8 border-yellow-900 animate-pulse">
								<div className="text-5xl font-bold text-black tracking-wider mb-2">
									CURRENT TURN
								</div>
								<div className="text-7xl font-bold text-black tracking-widest">
									{(
										gameState.players.find(
											(p) =>
												p.playerId ===
												gameState.currentTurnPlayerId
										)?.name || "..."
									).toUpperCase()}
								</div>
							</div>
						</div>

						{/* Game Stats - Two Column */}
						<div className="grid grid-cols-2 gap-6">
							{/* Draw Pile */}
							<div className="beveled-box">
								<div className="bevel-outer" />
								<div className="bevel-inner" />
								<div className="bevel-content p-8 text-center">
									<div className="text-3xl font-bold text-cyan-300 tracking-wider mb-4">
										DRAW PILE
									</div>
									<div className="text-8xl font-bold text-yellow-300 mb-4">
										{gameState.deckCount}
									</div>
									<div className="text-4xl">🎴</div>
								</div>
							</div>

							{/* Discard Pile */}
							<div className="beveled-box">
								<div className="bevel-outer" />
								<div className="bevel-inner" />
								<div className="bevel-content p-8 text-center">
									<div className="text-3xl font-bold text-cyan-300 tracking-wider mb-4">
										DISCARD PILE
									</div>
									<div className="text-8xl font-bold text-yellow-300 mb-4">
										{gameState.discardPileCount}
									</div>
									<div className="text-4xl">🗑️</div>
								</div>
							</div>
						</div>

						{/* Players */}
						<div className="beveled-box">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-8">
								<div className="text-4xl font-bold text-cyan-300 tracking-wider mb-6 text-center">
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
						</div>

						{/* Recent Actions - Activity Feed */}
						<div className="beveled-box">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-8">
								<div className="text-4xl font-bold text-cyan-300 tracking-wider mb-6 text-center">
									RECENT ACTIONS
								</div>
								<div className="space-y-3">
									{gameState.actions
										.slice(-8)
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
													className="flex items-center gap-4 p-4 bg-gray-900 border-4 border-gray-600"
												>
													{actionPlayer && (
														<PlayerIcon
															iconName={actionPlayer.icon}
															colorName={actionPlayer.color}
															size="md"
														/>
													)}
													<div className="flex-1">
														<div className="text-2xl font-bold text-green-300 tracking-wide">
															{(
																actionPlayer?.name ||
																"?"
															).toUpperCase()}
															:{" "}
															{action.type.toUpperCase()}
														</div>
														{action.cardType && (
															<div className="text-xl text-yellow-300 font-bold tracking-wide">
																{action.cardType.toUpperCase()}
															</div>
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
								<p className="text-xl font-bold text-yellow-300 tracking-wide mb-3">
									{actionResult.message.toUpperCase()}
								</p>
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
									<div className="text-center text-cyan-300 font-bold text-xl tracking-wide mb-6">
										👁️ TOP 3 CARDS OF THE DECK:
									</div>
									<div className="flex justify-center gap-4">
										{peekedCards.map((card) => {
											const normalizedType =
												card.type?.startsWith("pairs-")
													? "pairs"
													: card.type;
											const cardType =
												CARD_TYPES[normalizedType];
											return (
												<div
													key={card.id}
													className={`w-24 h-32 border-4 border-black flex flex-col items-center justify-center ${
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
													<span className="text-3xl">
														{cardType?.icon || "?"}
													</span>
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
								<div className="inline-block px-10 py-4 bg-gradient-to-b from-red-600 to-red-800 border-4 border-red-900">
									<span className="text-2xl font-bold text-yellow-300 tracking-wider">
										💀 ELIMINATED
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

						{/* Player list (compact) */}
						<div className="beveled-box mb-8">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-6">
								<PlayerList
									players={gameState.players}
									currentTurnPlayerId={
										gameState.currentTurnPlayerId
									}
									showCardCount
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
							<div className="text-center text-yellow-300 font-bold text-2xl tracking-wide mb-6">
								👯 CHOOSE A PLAYER TO STEAL FROM:
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
						<div className="n64-button-shadow bg-gradient-to-b from-red-600 to-red-800" />
						<div className="n64-button-face bg-gradient-to-b from-red-500 to-red-700 border-red-900 px-16 py-6 text-yellow-300">
							<span className="text-3xl font-bold">
								{isActing ? "..." : "🎴 DRAW CARD"}
							</span>
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
															"?"
														).toUpperCase()}
														:{" "}
														{action.type.toUpperCase()}
														{action.cardType &&
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
