import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import { getGameState } from "../services/api";
import { Trophy, Medal, Skull, Home, RotateCcw } from "lucide-react";
// import { useGameEndMusic } from "../hooks/useMusic";

function GameRecap() {
	const { gameId } = useParams();
	const [player, setPlayer] = useState(null);
	const [host, setHost] = useState(null);
	const [isHost, setIsHost] = useState(false);
	const [gameState, setGameState] = useState(null);
	const [error, setError] = useState(null);

	// useGameEndMusic();

	useEffect(() => {
		const storedPlayer = localStorage.getItem("player");
		const storedHost = localStorage.getItem("host");

		if (storedHost) {
			const hostData = JSON.parse(storedHost);
			if (hostData.gameId === gameId) {
				setHost(hostData);
				setIsHost(true);
			}
		} else if (storedPlayer) {
			setPlayer(JSON.parse(storedPlayer));
			setIsHost(false);
		}
	}, [gameId]);

	useEffect(() => {
		async function fetchFinalState() {
			if (!player && !host) return;

			try {
				// For host mode, don't send playerId (spectator mode)
				const playerId = isHost ? null : player?.playerId;
				const state = await getGameState(gameId, playerId);
				setGameState(state);
			} catch (err) {
				console.error("Failed to fetch game state:", err);
				setError(err.message || "Failed to load game results");
			}
		}

		fetchFinalState();
	}, [gameId, player, host, isHost]);

	if (error) {
		return (
			<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
				<Header />
				<main className="mx-auto max-w-md px-4 py-8 text-center">
					<p className="text-red-500 mb-4">{error}</p>
					<Link to="/" className="text-indigo-600 hover:underline">
						Return Home
					</Link>
				</main>
			</div>
		);
	}

	if (!gameState) {
		return (
			<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
				<Header />
				<main className="mx-auto max-w-md px-4 py-8 text-center">
					<p className="text-slate-500">Loading results...</p>
				</main>
			</div>
		);
	}

	// Sort players: winner first, then alive players, then eliminated (in reverse order of elimination)
	const sortedPlayers = [...gameState.players].sort((a, b) => {
		// Winner always first
		if (a.playerId === gameState.winnerId) return -1;
		if (b.playerId === gameState.winnerId) return 1;

		// Alive before eliminated
		if (a.isAlive && !b.isAlive) return -1;
		if (!a.isAlive && b.isAlive) return 1;

		return 0;
	});

	const winner = gameState.players.find(
		(p) => p.playerId === gameState.winnerId
	);
	const isWinner = !isHost && player?.playerId === gameState.winnerId;

	return (
		<div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-md px-4 py-8">
				{/* Winner announcement */}
				<div className="text-center mb-8">
					<div className="text-6xl mb-4">🏆</div>
					<h1 className="text-3xl font-bold mb-2">Game Over!</h1>
					{winner && (
						<div className="flex items-center justify-center gap-3 mt-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
							<div
								className={`w-12 h-12 ${winner.color} rounded-full flex items-center justify-center text-xl`}
							>
								{winner.icon}
							</div>
							<div>
								<div className="font-bold text-lg">
									{isWinner
										? "You won!"
										: `${winner.name} wins!`}
								</div>
								<div className="text-sm text-amber-600 dark:text-amber-400">
									Last player standing
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Player rankings */}
				<div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6">
					<h2 className="text-lg font-semibold mb-4">
						Final Standings
					</h2>
					<div className="space-y-3">
						{sortedPlayers.map((p, index) => {
							const isPlayerWinner =
								p.playerId === gameState.winnerId;
							const rank = index + 1;

							return (
								<div
									key={p.playerId}
									className={`flex items-center gap-3 p-3 rounded-xl ${
										isPlayerWinner
											? "bg-amber-50 dark:bg-amber-900/20"
											: p.isAlive
											? "bg-slate-50 dark:bg-slate-700/50"
											: "bg-slate-100 dark:bg-slate-800 opacity-60"
									}`}
								>
									{/* Rank */}
									<div className="w-8 h-8 flex items-center justify-center">
										{rank === 1 ? (
											<Trophy className="h-6 w-6 text-amber-500" />
										) : rank === 2 ? (
											<Medal className="h-5 w-5 text-slate-400" />
										) : rank === 3 ? (
											<Medal className="h-5 w-5 text-amber-700" />
										) : (
											<span className="text-slate-400 font-bold">
												{rank}
											</span>
										)}
									</div>

									{/* Player info */}
									<div
										className={`w-10 h-10 ${p.color} rounded-full flex items-center justify-center text-xl`}
									>
										{p.icon}
									</div>
									<div className="flex-1">
										<div className="font-medium">
											{p.name}
											{p.playerId ===
												player?.playerId && (
												<span className="text-xs text-slate-500 ml-2">
													(you)
												</span>
											)}
										</div>
										<div className="text-xs text-slate-500">
											{p.cardCount} cards remaining
										</div>
									</div>

									{/* Status */}
									{!p.isAlive && (
										<Skull className="h-5 w-5 text-red-400" />
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Theme song link (from plan) */}
				<div className="text-center mb-8">
					<a
						href="https://suno.com/s/QFee4suGpweV5GXn"
						target="_blank"
						rel="noopener noreferrer"
						className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
					>
						🎵 Listen to the victory theme
					</a>
				</div>

				{/* Actions */}
				<div className="flex gap-4">
					<Link
						to="/"
						className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl font-semibold transition-colors"
					>
						<Home className="h-5 w-5" />
						Home
					</Link>
					<Link
						to="/create"
						className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
					>
						<RotateCcw className="h-5 w-5" />
						New Game
					</Link>
				</div>
			</main>
		</div>
	);
}

export default GameRecap;
