import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerList from "../components/PlayerList";
import N64Button from "../components/N64Button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { getGameState, startGame } from "../services/api";

const POLL_INTERVAL = 2000; // 2 seconds

function WaitingRoom() {
	const { gameId } = useParams();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);
	const [player, setPlayer] = useState(null);
	const [host, setHost] = useState(null);
	const [isHost, setIsHost] = useState(false);
	const [players, setPlayers] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState(null);
	const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

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

	// Poll for game state
	const fetchGameState = useCallback(async () => {
		if (!player && !host) return;

		try {
			// For host mode, don't send playerId (spectator mode)
			const playerId = isHost ? null : player?.playerId;
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
			setLastUpdatedAt(state.updatedAt);
			setError(null);
		} catch (err) {
			console.error("Failed to fetch game state:", err);
			// Only show error if it's not a network issue during polling
			if (!lastUpdatedAt) {
				setError(err.message || "Failed to load game");
			}
		}
	}, [gameId, player, host, isHost, lastUpdatedAt, navigate]);

	// Initial load and polling
	useEffect(() => {
		if (!player && !host) return;

		// Initial fetch
		fetchGameState();

		// Set up polling
		const interval = setInterval(fetchGameState, POLL_INTERVAL);

		return () => clearInterval(interval);
	}, [player, host, fetchGameState]);

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
			navigate(`/game/${gameId}`);
		} catch (err) {
			console.error("Failed to start game:", err);
			setError(err.message || "Failed to start game");
		} finally {
			setIsStarting(false);
		}
	};

	const handleRefresh = () => {
		setLastUpdatedAt(null);
		fetchGameState();
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

			<main className="mx-auto max-w-2xl px-4 py-12">
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
								WAITING FOR {players[0]?.name.toUpperCase()} TO START THE
								GAME...
							</p>
						)
					) : players.length < 2 ? (
						<p>NEED AT LEAST 2 PLAYERS TO START</p>
					) : isMVP ? (
						<p>YOU'RE THE MVP! START WHEN EVERYONE'S READY.</p>
					) : (
						<p>
							WAITING FOR {players[0]?.name.toUpperCase()} TO START THE GAME...
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
