import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import { getGameState } from "../services/api";
import {
	Trophy,
	Medal,
	Skull,
	Home,
	RotateCcw,
	Users,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useGameEndMusic } from "../hooks/useMusic";
import { useMusic } from "../hooks/useMusic";
import { PlayerIcon } from "../components/PlayerIcon";
import N64Button from "../components/N64Button";

function GameRecap() {
	const { gameId } = useParams();
	const [player, setPlayer] = useState(null);
	const [host, setHost] = useState(null);
	const [isHost, setIsHost] = useState(false);
	const [gameState, setGameState] = useState(null);
	const [error, setError] = useState(null);

	useGameEndMusic();
	const { isPlaying, pause, playTheme, stop } = useMusic();

	// Store music functions in refs to avoid dependency issues
	const playThemeRef = useRef(playTheme);
	const stopRef = useRef(stop);

	// Update refs when functions change
	useEffect(() => {
		playThemeRef.current = playTheme;
		stopRef.current = stop;
	}, [playTheme, stop]);

	// Auto-start theme song game recap loads
	useEffect(() => {
		if (isHost) {
			playThemeRef.current();
		}

		return () => {
			stopRef.current();
		};
	}, [isHost]);

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
					<p className="text-red-400 text-2xl font-bold tracking-wide mb-8">
						{error.toUpperCase()}
					</p>
					<Link
						to="/"
						className="text-cyan-300 text-xl font-bold tracking-wide hover:text-cyan-400"
					>
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
					<p className="text-yellow-300 text-2xl font-bold tracking-wide">
						LOADING RESULTS...
					</p>
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
				{isHost && (
					// Music Control - Top Right
					<div className="fixed top-24 right-8 z-40">
						<button
							onClick={() => (isPlaying ? pause() : playTheme())}
							className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-purple-600 to-purple-800 border-4 border-purple-900 hover:from-purple-500 hover:to-purple-700"
							title={
								isPlaying
									? "Mute Victory Theme"
									: "Unmute Victory Theme"
							}
						>
							{isPlaying ? (
								<>
									<Volume2 className="h-8 w-8 text-yellow-300" />
									<span className="font-bold text-yellow-300 text-lg tracking-wide">
										VICTORY THEME
									</span>
								</>
							) : (
								<>
									<VolumeX className="h-8 w-8 text-gray-400" />
									<span className="font-bold text-gray-400 text-lg tracking-wide">
										MUTED
									</span>
								</>
							)}
						</button>
					</div>
				)}

				{/* Winner announcement */}
				<div className="text-center mb-12">
					<h1 className="text-6xl font-bold mb-8 text-yellow-300 animate-pulse">
						GAME OVER!
					</h1>
					{winner && (
						<div className="beveled-box inline-block">
							<div className="bevel-outer" />
							<div className="bevel-inner" />
							<div className="bevel-content p-8">
								<div className="flex items-center gap-6">
									<PlayerIcon
										iconName={winner.icon}
										colorName={winner.color}
										size="xl"
										variant="winner"
									/>
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
										<PlayerIcon
											iconName={p.icon}
											colorName={p.color}
											size="lg"
											variant={
												!p.isAlive
													? "eliminated"
													: isPlayerWinner
													? "winner"
													: "default"
											}
										/>
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

				{/* Actions */}
				<div className="flex gap-6 justify-center">
					{/* New Game Button */}
					{/* {isHost && ( */}
					<N64Button
						color="purple"
						asLink
						to={isHost ? "/create" : "/join"}
					>
						<div className="flex items-center gap-3">
							<RotateCcw className="h-6 w-6" />
							<span className="text-xl">
								{isHost ? "CREATE NEW GAME" : "JOIN NEW GAME"}
							</span>
						</div>
					</N64Button>
					{/* )} */}
					{/* Join Game Button (Player Only) */}
					{/* {!isHost && (
						<N64Button color="purple" asLink to="/join">
							<div className="flex items-center gap-3">
								<RotateCcw className="h-6 w-6" />
								<span className="text-xl">JOIN NEW GAME</span>
							</div>
						</N64Button>
					)} */}
				</div>
			</main>
		</div>
	);
}

export default GameRecap;
