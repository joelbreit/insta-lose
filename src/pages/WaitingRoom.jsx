import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerList from "../components/PlayerList";
import N64Button from "../components/N64Button";
import {
	Copy,
	Check,
	RefreshCw,
	Volume2,
	VolumeX,
	SkipForward,
	Wifi,
	WifiOff,
} from "lucide-react";
import { getGameState, startGame } from "../services/api";
import { gameWebSocket } from "../services/websocket";
import { useMusic } from "../hooks/useMusic";

const POLL_INTERVAL = 3000; // Fallback polling interval (3 seconds)

function WaitingRoom() {
	const { gameId } = useParams();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);
	const [player, setPlayer] = useState(null);
	const [host, setHost] = useState(null);
	const [isHost, setIsHost] = useState(false);
	const [players, setPlayers] = useState([]);
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState(null);
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

	// Store music functions in refs to avoid dependency issues
	const playGameMusicRef = useRef(playGameMusic);
	const stopRef = useRef(stop);

	// Update refs when functions change
	useEffect(() => {
		playGameMusicRef.current = playGameMusic;
		stopRef.current = stop;
	}, [playGameMusic, stop]);

	// Auto-start music when game loads
	useEffect(() => {
		if (isHost) {
			// Try to start music (may fail due to autoplay policy)
			playGameMusicRef.current();
		}

		// Clean up music when leaving game
		return () => {
			stopRef.current();
		};
	}, [isHost]);

	// Load player or host from localStorage
	useEffect(() => {
		const storedPlayer = localStorage.getItem("player");
		const storedHost = localStorage.getItem("host");

		if (storedHost) {
			const hostData = JSON.parse(storedHost);
			// Verify this host belongs to this game
			if (hostData.gameId === gameId) {
				setHost(hostData);
				setIsHost(true);
			} else {
				// Wrong game, redirect
				navigate(`/waiting/${hostData.gameId}`);
			}
		} else if (storedPlayer) {
			setPlayer(JSON.parse(storedPlayer));
			setIsHost(false);
		} else {
			// No player or host info, redirect to join
			navigate(`/join?gameId=${gameId}`);
		}
	}, [gameId, navigate]);

	// Fetch game state (for initial load and fallback polling)
	const fetchGameState = useCallback(
		async (forceRefresh = false) => {
			if (!player && !host) return;

			try {
				// For host mode, don't send playerId (spectator mode)
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

				// Check if game has started
				if (state.status === "in-progress") {
					navigate(`/game/${gameId}`);
					return;
				}

				setPlayers(state.players);
				lastUpdatedAtRef.current = state.updatedAt;
				setError(null);
			} catch (err) {
				console.error("Failed to fetch game state:", err);
				// Only show error if it's not a network issue during polling
				if (!lastUpdatedAtRef.current) {
					setError(err.message || "Failed to load game");
				}
			}
		},
		[gameId, player, host, isHost, navigate]
	);

	// Handle WebSocket messages
	const handleWebSocketMessage = useCallback(
		(message) => {
			if (message.type === "gameStateUpdate" && message.data) {
				const state = message.data;

				// Check if game has started
				if (state.status === "in-progress") {
					navigate(`/game/${gameId}`);
					return;
				}

				setPlayers(state.players);
				lastUpdatedAtRef.current = state.updatedAt;
				setError(null);
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
		if (!player && !host) return;

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
		host,
		isHost,
		gameId,
		fetchGameState,
		handleWebSocketMessage,
		startPolling,
		stopPolling,
	]);

	const copyGameCode = () => {
		navigator.clipboard.writeText(gameId);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleStartGame = async () => {
		if (!player) return;

		setIsStarting(true);
		setError(null);

		try {
			await startGame(gameId, player.playerId);
			// WebSocket will notify us when game starts, but navigate anyway
			navigate(`/game/${gameId}`);
		} catch (err) {
			console.error("Failed to start game:", err);
			setError(err.message || "Failed to start game");
		} finally {
			setIsStarting(false);
		}
	};

	const handleRefresh = () => {
		fetchGameState(true);
	};

	// First player is the MVP (can start the game)
	// Host cannot be MVP - only actual players can
	const isMVP =
		!isHost &&
		players.length > 0 &&
		players[0].playerId === player?.playerId;
	const canStart = players.length >= 2;

	return (
		<div className="min-h-screen">
			<Header />
			{isHost && (
				// Top bar
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
							{/* Unmute/Mute Music */}
							<button
								onClick={() => (isPlaying ? pause() : resume())}
								className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-purple-600 to-purple-800 border-4 border-purple-900 hover:from-purple-500 hover:to-purple-700"
							>
								{isPlaying ? (
									<Volume2 className="h-8 w-8 text-yellow-300" />
								) : (
									<VolumeX className="h-8 w-8 text-gray-400" />
								)}
							</button>
							{/* Next Track */}
							<button
								onClick={playNextTrack}
								className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-purple-600 to-purple-800 border-4 border-purple-900 hover:from-purple-500 hover:to-purple-700"
							>
								<SkipForward className="h-8 w-8 text-cyan-300" />
							</button>
							{/* Track Number */}
							<div className="px-4 py-2 bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-600">
								<span className="font-bold text-green-300 tracking-wide text-sm">
									TRACK {status.currentTrackIndex + 1}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			<main className="mx-auto max-w-2xl px-4 py-12">
				{/* Go to insta-lose.joelbreit.com to play */}
				<div className="text-center mb-12">
					<h2 className="text-2xl font-bold text-cyan-300 tracking-wider">
						TO JOIN THIS GAME, GO TO{" "}
						<a
							href="https://insta-lose.joelbreit.com"
							target="_blank"
							rel="noopener noreferrer"
							className="text-yellow-300 hover:text-yellow-400"
						>
							insta-lose.joelbreit.com
						</a>
					</h2>
				</div>
				{/* <div className="text-center mb-12">
					<p className="text-xl text-cyan-300 mb-4 font-bold tracking-wider">
						TO JOIN THIS GAME, GO TO{" "}
						<a
							href="https://insta-lose.joelbreit.com"
							target="_blank"
							rel="noopener noreferrer"
							className="text-yellow-300 hover:text-yellow-400"
						>
							insta-lose.joelbreit.com
						</a>
					</p>
				</div> */}

				{/* Game code */}
				<div className="text-center mb-12">
					<p className="text-lg text-cyan-300 mb-4 font-bold tracking-wider">
						GAME CODE
					</p>
					<div className="beveled-box inline-block">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6 flex items-center gap-4">
							<span className="text-5xl font-mono font-bold tracking-widest text-yellow-300">
								{gameId}
							</span>
							<button
								onClick={copyGameCode}
								className="p-3 bg-gradient-to-b from-blue-600 to-blue-800 border-4 border-blue-900 hover:from-blue-500 hover:to-blue-700 text-cyan-300"
								title="Copy game code"
							>
								{copied ? (
									<Check className="h-6 w-6 text-green-300" />
								) : (
									<Copy className="h-6 w-6" />
								)}
							</button>
						</div>
					</div>
					{/* Connection status for non-hosts */}
					{!isHost && (
						<div className="mt-4 flex items-center justify-center gap-2 text-sm">
							{wsConnected ? (
								<>
									<Wifi className="h-4 w-4 text-green-400" />
									<span className="text-green-400">
										Real-time connected
									</span>
								</>
							) : (
								<>
									<WifiOff className="h-4 w-4 text-yellow-500" />
									<span className="text-yellow-500">
										Using polling
									</span>
								</>
							)}
						</div>
					)}
				</div>

				{error && (
					<div className="mb-8 p-6 bg-red-900 border-4 border-red-500 text-yellow-300 text-center text-xl font-bold tracking-wide">
						{error.toUpperCase()}
						<button
							onClick={handleRefresh}
							className="ml-4 px-4 py-2 bg-gradient-to-b from-gray-600 to-gray-800 border-2 border-gray-900 hover:from-gray-500 hover:to-gray-700"
						>
							RETRY
						</button>
					</div>
				)}

				<div className="beveled-box mb-10">
					<div className="bevel-outer" />
					<div className="bevel-inner" />
					<div className="bevel-content p-8">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-2xl font-bold text-cyan-300 tracking-wider">
								PLAYERS ({players.length})
							</h2>
							<button
								onClick={handleRefresh}
								className="p-3 bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-gray-900 hover:from-gray-500 hover:to-gray-700 text-cyan-300"
								title="Refresh player list"
							>
								<RefreshCw className="h-5 w-5" />
							</button>
						</div>
						{players.length === 0 ? (
							<p className="text-green-300 text-center py-8 text-xl tracking-wide">
								WAITING FOR PLAYERS TO JOIN...
							</p>
						) : (
							<PlayerList players={players} />
						)}
					</div>
				</div>

				<div className="text-center text-yellow-300 mb-8 text-xl font-bold tracking-wide">
					{isHost ? (
						players.length === 0 ? (
							<p>WAITING FOR PLAYERS TO JOIN...</p>
						) : players.length < 2 ? (
							<p>
								{players.length} PLAYER JOINED. NEED AT LEAST 2
								PLAYERS TO START.
							</p>
						) : (
							<p>
								WAITING FOR {players[0]?.name.toUpperCase()} TO
								START THE GAME...
							</p>
						)
					) : players.length < 2 ? (
						<p>NEED AT LEAST 2 PLAYERS TO START</p>
					) : isMVP ? (
						<p>YOU'RE THE MVP! START WHEN EVERYONE'S READY.</p>
					) : (
						<p>
							WAITING FOR {players[0]?.name.toUpperCase()} TO
							START THE GAME...
						</p>
					)}
				</div>

				{isMVP && (
					<div className="flex justify-center">
						<N64Button
							onClick={handleStartGame}
							disabled={!canStart || isStarting}
							color="purple"
							className="w-full max-w-md"
						>
							<span className="text-2xl py-2">
								{isStarting ? "STARTING..." : "START GAME"}
							</span>
						</N64Button>
					</div>
				)}

				{!isMVP && players.length >= 2 && (
					<div className="text-center">
						<div className="flex items-center justify-center gap-3 text-green-300 text-xl font-bold tracking-wide">
							<div className="w-4 h-4 bg-green-500 border-2 border-green-300 animate-pulse" />
							GAME WILL START SOON...
						</div>
					</div>
				)}
			</main>
		</div>
	);
}

export default WaitingRoom;
