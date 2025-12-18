import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlayerList from "../components/PlayerList";
import { Copy, Check } from "lucide-react";

function WaitingRoom() {
	const { gameId } = useParams();
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);
	const [player, setPlayer] = useState(null);

	// Mock players for now
	const [players, setPlayers] = useState([]);

	useEffect(() => {
		const storedPlayer = localStorage.getItem("player");
		if (storedPlayer) {
			const p = JSON.parse(storedPlayer);
			setPlayer(p);
			setPlayers([{ ...p, isAlive: true }]);
		}
	}, []);

	const copyGameCode = () => {
		navigator.clipboard.writeText(gameId);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleStartGame = () => {
		// TODO: Call StartGame API
		navigate(`/game/${gameId}`);
	};

	const isHost = player?.isHost;
	const isMVP = players.length > 0 && players[0].playerId === player?.playerId;
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
						>
							{copied ? (
								<Check className="h-5 w-5 text-green-500" />
							) : (
								<Copy className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>

				<div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 mb-6">
					<h2 className="text-lg font-semibold mb-4">
						Players ({players.length})
					</h2>
					{players.length === 0 ? (
						<p className="text-slate-500 dark:text-slate-400 text-center py-4">
							Waiting for players to join...
						</p>
					) : (
						<PlayerList players={players} />
					)}
				</div>

				<div className="text-center text-slate-500 dark:text-slate-400 mb-6">
					{players.length < 2 ? (
						<p>Need at least 2 players to start</p>
					) : isMVP ? (
						<p>You're the MVP! Start when everyone's ready.</p>
					) : (
						<p>Waiting for {players[0]?.name} to start the game...</p>
					)}
				</div>

				{isMVP && (
					<button
						onClick={handleStartGame}
						disabled={!canStart}
						className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xl font-semibold rounded-xl transition-colors"
					>
						Start Game
					</button>
				)}
			</main>
		</div>
	);
}

export default WaitingRoom;
