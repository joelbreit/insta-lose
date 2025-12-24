import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import N64Button from "../components/N64Button";
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

			// Clear old data
			localStorage.removeItem("player");
			localStorage.removeItem("host");

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
		<div className="min-h-screen">
			<Header />

			<main className="mx-auto max-w-2xl px-4 py-16">
				<h1 className="text-5xl font-bold text-center mb-12 text-yellow-300">
					HOST A GAME
				</h1>

				{error && (
					<div className="mb-8 p-6 bg-red-900 border-4 border-red-500 text-yellow-300 text-center text-xl font-bold tracking-wide">
						{error.toUpperCase()}
					</div>
				)}

				<div className="mb-12 beveled-box">
					<div className="bevel-outer" />
					<div className="bevel-inner" />
					<div className="bevel-content p-8">
						<p className="text-cyan-300 text-center text-xl tracking-wide leading-relaxed">
							CREATE A GAME ROOM AND SHARE THE CODE WITH YOUR
							FRIENDS. YOU'LL BE ABLE TO WATCH THE GAME AS IT
							HAPPENS.
						</p>
					</div>
				</div>

				<div className="flex justify-center">
					<N64Button
						onClick={handleCreateGame}
						disabled={isLoading}
						color="purple"
						className="w-full max-w-md"
					>
						<span className="text-2xl py-2">
							{isLoading ? "CREATING..." : "CREATE GAME"}
						</span>
					</N64Button>
				</div>
			</main>
		</div>
	);
}

export default CreateGame;
