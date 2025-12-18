import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerSetup from "../components/PlayerSetup";
import { generatePlayerId, generateGameId } from "../utils/gameUtils";

function CreateGame() {
	const navigate = useNavigate();
	const [playerName, setPlayerName] = useState("");
	const [playerIcon, setPlayerIcon] = useState("🐱");
	const [playerColor, setPlayerColor] = useState("bg-blue-500");

	const handleCreateGame = () => {
		if (!playerName.trim()) return;

		const playerId = generatePlayerId();
		const gameId = generateGameId();

		// Store player info in localStorage for now
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

		// TODO: Call CreateGame API
		// For now, just navigate to waiting room
		navigate(`/waiting/${gameId}`);
	};

	return (
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-md px-4 py-8">
				<h1 className="text-3xl font-bold text-center mb-8">
					Host a Game
				</h1>

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
					disabled={!playerName.trim()}
					className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xl font-semibold rounded-xl transition-colors"
				>
					Create Game
				</button>
			</main>
		</div>
	);
}

export default CreateGame;
