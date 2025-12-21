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
			<div className="min-h-screen">
				<Header />
				<main className="mx-auto max-w-2xl px-4 py-16 text-center">
					<p className="text-red-400 text-2xl font-bold tracking-wide mb-8">{error.toUpperCase()}</p>
					<Link to="/" className="text-cyan-300 text-xl font-bold tracking-wide hover:text-cyan-400">
						RETURN HOME
					</Link>
				</main>
			</div>
		);
	}

	if (!gameState) {
		return (
			<div className="min-h-screen">
				<Header />
				<main className="mx-auto max-w-2xl px-4 py-16 text-center">
					<p className="text-yellow-300 text-2xl font-bold tracking-wide">LOADING RESULTS...</p>
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
		<div className="min-h-screen">
			<Header />

			<main className="mx-auto max-w-3xl px-4 py-12">
				{/* Winner announcement */}
				<div className="text-center mb-12">
					<div className="text-8xl mb-6">🏆</div>
					<h1 className="text-6xl font-bold mb-8 text-yellow-300">GAME OVER!</h1>
					{winner && (
						<div className="beveled-box inline-block">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-8">
								<div className="flex items-center gap-6">
									<div
										className={`w-20 h-20 ${winner.color} border-4 border-black flex items-center justify-center text-4xl`}
									>
										{winner.icon}
									</div>
									<div className="text-left">
										<div className="font-bold text-3xl text-cyan-300 tracking-wider mb-2">
											{isWinner
												? "YOU WON!"
												: `${winner.name.toUpperCase()} WINS!`}
										</div>
										<div className="text-xl text-green-300 font-bold tracking-wide">
											LAST PLAYER STANDING
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Player rankings */}
				<div className="beveled-box mb-10">
					<div className="bevel-outer" />
					<div className="bevel-inner" />
					<div className="bevel-content p-8">
						<h2 className="text-3xl font-bold mb-6 text-cyan-300 tracking-wider">
							FINAL STANDINGS
						</h2>
						<div className="space-y-4">
							{sortedPlayers.map((p, index) => {
								const isPlayerWinner =
									p.playerId === gameState.winnerId;
								const rank = index + 1;

								return (
									<div
										key={p.playerId}
										className={`flex items-center gap-4 p-4 border-4 ${
											isPlayerWinner
												? "bg-yellow-900 border-yellow-500"
												: p.isAlive
												? "bg-gray-800 border-gray-600"
												: "bg-gray-900 border-gray-700 opacity-50"
										}`}
									>
										{/* Rank */}
										<div className="w-12 h-12 flex items-center justify-center">
											{rank === 1 ? (
												<Trophy className="h-10 w-10 text-yellow-400" />
											) : rank === 2 ? (
												<Medal className="h-8 w-8 text-gray-400" />
											) : rank === 3 ? (
												<Medal className="h-8 w-8 text-amber-700" />
											) : (
												<span className="text-gray-400 font-bold text-2xl">
													{rank}
												</span>
											)}
										</div>

										{/* Player info */}
										<div
											className={`w-14 h-14 ${p.color} border-4 border-black flex items-center justify-center text-3xl`}
										>
											{p.icon}
										</div>
										<div className="flex-1">
											<div className="font-bold text-xl text-cyan-300 tracking-wide">
												{p.name.toUpperCase()}
												{p.playerId ===
													player?.playerId && (
													<span className="text-sm text-yellow-400 ml-3">
														(YOU)
													</span>
												)}
											</div>
											<div className="text-base text-green-300 font-bold tracking-wide">
												{p.cardCount} CARDS REMAINING
											</div>
										</div>

										{/* Status */}
										{!p.isAlive && (
											<Skull className="h-8 w-8 text-red-400" />
										)}
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Theme song link */}
				<div className="text-center mb-12">
					<a
						href="https://suno.com/s/QFee4suGpweV5GXn"
						target="_blank"
						rel="noopener noreferrer"
						className="text-cyan-300 text-xl font-bold tracking-wide hover:text-cyan-400"
					>
						🎵 LISTEN TO THE VICTORY THEME
					</a>
				</div>

				{/* Actions */}
				<div className="flex gap-6 justify-center">
					<Link to="/" className="n64-button">
						<div className="n64-button-shadow bg-gradient-to-b from-gray-600 to-gray-800" />
						<div className="n64-button-face bg-gradient-to-b from-gray-500 to-gray-700 border-gray-900 px-8 py-4 text-yellow-300 flex items-center gap-3">
							<Home className="h-6 w-6" />
							<span className="text-xl">HOME</span>
						</div>
					</Link>
					<Link to="/create" className="n64-button">
						<div className="n64-button-shadow bg-gradient-to-b from-purple-600 to-purple-800" />
						<div className="n64-button-face bg-gradient-to-b from-purple-500 to-purple-700 border-purple-900 px-8 py-4 text-cyan-300 flex items-center gap-3">
							<RotateCcw className="h-6 w-6" />
							<span className="text-xl">NEW GAME</span>
						</div>
					</Link>
				</div>
			</main>
		</div>
	);
}

export default GameRecap;
