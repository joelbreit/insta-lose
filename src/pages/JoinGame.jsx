import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerSetup from "../components/PlayerSetup";
import { generatePlayerId } from "../utils/gameUtils";
import { joinGame } from "../services/api";

function JoinGame() {
	const navigate = useNavigate();
	const [gameId, setGameId] = useState("");
	const [playerName, setPlayerName] = useState("");
	const [playerIcon, setPlayerIcon] = useState("🐶");
	const [playerColor, setPlayerColor] = useState("bg-pink-500");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleJoinGame = async () => {
		if (!playerName.trim() || !gameId.trim()) return;

		setIsLoading(true);
		setError(null);

		const playerId = generatePlayerId();
		const normalizedGameId = gameId.toUpperCase();

		try {
			await joinGame(normalizedGameId, {
				playerId,
				name: playerName,
				icon: playerIcon,
				color: playerColor,
			});

			// Store player info in localStorage
			localStorage.setItem(
				"player",
				JSON.stringify({
					playerId,
					name: playerName,
					icon: playerIcon,
					color: playerColor,
					isHost: false,
				})
			);

			navigate(`/waiting/${normalizedGameId}`);
		} catch (err) {
			console.error("Failed to join game:", err);
			setError(
				err.message ||
					"Failed to join game. Check the code and try again."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-md px-4 py-8">
				<h1 className="text-3xl font-bold text-center mb-8">
					Join a Game
				</h1>

				{error && (
					<div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-center">
						{error}
					</div>
				)}

				<div className="mb-6">
					<label className="block text-sm font-medium mb-2">
						Game Code
					</label>
					<input
						type="text"
						value={gameId}
						onChange={(e) =>
							setGameId(e.target.value.toUpperCase())
						}
						placeholder="XRAY42"
						maxLength={6}
						className="w-full px-4 py-3 text-2xl text-center tracking-widest font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none"
					/>
				</div>

				<PlayerSetup
					name={playerName}
					setName={setPlayerName}
					icon={playerIcon}
					setIcon={setPlayerIcon}
					color={playerColor}
					setColor={setPlayerColor}
				/>

				<button
					onClick={handleJoinGame}
					disabled={
						!playerName.trim() || gameId.length < 4 || isLoading
					}
					className="w-full mt-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xl font-semibold rounded-xl transition-colors"
				>
					{isLoading ? "Joining..." : "Join Game"}
				</button>
			</main>
		</div>
	);
}

export default JoinGame;
