import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerList from "../components/PlayerList";
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
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-md px-4 py-8">
				<div className="text-center mb-8">
					<p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
						Game Code
					</p>
					<div className="flex items-center justify-center gap-3">
						<span className="text-4xl font-mono font-bold tracking-widest">
							{gameId}
						</span>
						<button
							onClick={copyGameCode}
							className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
							title="Copy game code"
						>
							{copied ? (
								<Check className="h-5 w-5 text-green-500" />
							) : (
								<Copy className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>

				{error && (
					<div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-center">
						{error}
						<button
							onClick={handleRefresh}
							className="ml-2 underline hover:no-underline"
						>
							Retry
						</button>
					</div>
				)}

				<div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">
							Players ({players.length})
						</h2>
						<button
							onClick={handleRefresh}
							className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
							title="Refresh player list"
						>
							<RefreshCw className="h-4 w-4" />
						</button>
					</div>
					{players.length === 0 ? (
						<p className="text-slate-500 dark:text-slate-400 text-center py-4">
							Waiting for players to join...
						</p>
					) : (
						<PlayerList players={players} />
					)}
				</div>

				<div className="text-center text-slate-500 dark:text-slate-400 mb-6">
					{isHost ? (
						players.length === 0 ? (
							<p>Waiting for players to join...</p>
						) : players.length < 2 ? (
							<p>
								{players.length} player joined. Need at least 2
								players to start.
							</p>
						) : (
							<p>
								Waiting for {players[0]?.name} to start the
								game...
							</p>
						)
					) : players.length < 2 ? (
						<p>Need at least 2 players to start</p>
					) : isMVP ? (
						<p>You're the MVP! Start when everyone's ready.</p>
					) : (
						<p>
							Waiting for {players[0]?.name} to start the game...
						</p>
					)}
				</div>

				{isMVP && (
					<button
						onClick={handleStartGame}
						disabled={!canStart || isStarting}
						className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xl font-semibold rounded-xl transition-colors"
					>
						{isStarting ? "Starting..." : "Start Game"}
					</button>
				)}

				{!isMVP && players.length >= 2 && (
					<div className="text-center text-sm text-slate-400">
						<div className="flex items-center justify-center gap-2">
							<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
							Game will start soon...
						</div>
					</div>
				)}
			</main>
		</div>
	);
}

export default WaitingRoom;
