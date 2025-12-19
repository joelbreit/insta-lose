import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerSetup from "../components/PlayerSetup";
import { generatePlayerId } from "../utils/gameUtils";
import { createGame } from "../services/api";

function CreateGame() {
	const navigate = useNavigate();
	const [playerName, setPlayerName] = useState("");
	const [playerIcon, setPlayerIcon] = useState("🐱");
	const [playerColor, setPlayerColor] = useState("bg-blue-500");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleCreateGame = async () => {
		if (!playerName.trim()) return;

		setIsLoading(true);
		setError(null);

		const playerId = generatePlayerId();

		try {
			const { gameId } = await createGame({
				hostPlayerId: playerId,
				hostName: playerName,
				hostIcon: playerIcon,
				hostColor: playerColor,
			});

			// Store player info in localStorage
			localStorage.setItem(
				"player",
				JSON.stringify({
					playerId,
					name: playerName,
					icon: playerIcon,
					color: playerColor,
					isHost: true,
				})
			);

			navigate(`/waiting/${gameId}`);
		} catch (err) {
			console.error("Failed to create game:", err);
			setError(err.message || "Failed to create game. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-md px-4 py-8">
				<h1 className="text-3xl font-bold text-center mb-8">
					Host a Game
				</h1>

				{error && (
					<div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-center">
						{error}
					</div>
				)}

				<PlayerSetup
					name={playerName}
					setName={setPlayerName}
					icon={playerIcon}
					setIcon={setPlayerIcon}
					color={playerColor}
					setColor={setPlayerColor}
				/>

				<button
					onClick={handleCreateGame}
					disabled={!playerName.trim() || isLoading}
					className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xl font-semibold rounded-xl transition-colors"
				>
					{isLoading ? "Creating..." : "Create Game"}
				</button>
			</main>
		</div>
	);
}

export default CreateGame;
