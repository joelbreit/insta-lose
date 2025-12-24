import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerSetup from "../components/PlayerSetup";
import N64Button from "../components/N64Button";
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

			// Clear old data
			localStorage.removeItem("player");
			localStorage.removeItem("host");

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
		<div className="min-h-screen">
			<Header />

			<main className="mx-auto max-w-2xl px-4 py-12">
				<h1 className="text-5xl font-bold text-center mb-12 text-yellow-300">
					JOIN A GAME
				</h1>

				{error && (
					<div className="mb-8 p-6 bg-red-900 border-4 border-red-500 text-yellow-300 text-center text-xl font-bold tracking-wide">
						{error.toUpperCase()}
					</div>
				)}

				<div className="mb-8 beveled-box">
					<div className="bevel-outer" />
					<div className="bevel-inner" />
					<div className="bevel-content p-6">
						<label className="block text-lg font-bold mb-4 text-cyan-300 tracking-wide">
							GAME CODE
						</label>
						<input
							type="text"
							value={gameId}
							onChange={(e) =>
								setGameId(e.target.value.toUpperCase())
							}
							placeholder="XRAY42"
							maxLength={6}
							className="w-full px-6 py-4 text-3xl text-center tracking-widest font-mono bg-black border-4 border-cyan-500 text-yellow-300 outline-none focus:border-yellow-300"
						/>
					</div>
				</div>

				<PlayerSetup
					name={playerName}
					setName={setPlayerName}
					icon={playerIcon}
					setIcon={setPlayerIcon}
					color={playerColor}
					setColor={setPlayerColor}
				/>

				<div className="flex justify-center mt-10">
					<N64Button
						onClick={handleJoinGame}
						disabled={
							!playerName.trim() || gameId.length < 4 || isLoading
						}
						color="green"
						className="w-full max-w-md"
					>
						<span className="text-2xl py-2">
							{isLoading ? "JOINING..." : "JOIN GAME"}
						</span>
					</N64Button>
				</div>
			</main>
		</div>
	);
}

export default JoinGame;
