import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { generatePlayerId } from "../utils/gameUtils";
import { createGame } from "../services/api";

function CreateGame() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleCreateGame = async () => {
		setIsLoading(true);
		setError(null);

		const hostPlayerId = generatePlayerId();

		try {
			const { gameId } = await createGame({
				hostPlayerId,
			});

			// Store host info in localStorage (not player info)
			localStorage.setItem(
				"host",
				JSON.stringify({
					hostPlayerId,
					gameId,
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

				<div className="mb-8 p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl">
					<p className="text-slate-600 dark:text-slate-400 text-center">
						Create a game room and share the code with your friends. You'll be able to watch the game as it happens.
					</p>
				</div>

				<button
					onClick={handleCreateGame}
					disabled={isLoading}
					className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xl font-semibold rounded-xl transition-colors"
				>
					{isLoading ? "Creating..." : "Create Game"}
				</button>
			</main>
		</div>
	);
}

export default CreateGame;
