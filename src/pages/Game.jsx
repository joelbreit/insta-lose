import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PlayerList from "../components/PlayerList";
import CardHand from "../components/CardHand";
import { CARD_TYPES } from "../utils/cardTypes";

function Game() {
	const { gameId } = useParams();
	const [player, setPlayer] = useState(null);
	const [isMyTurn, setIsMyTurn] = useState(true);
	const [selectedCard, setSelectedCard] = useState(null);

	// Mock game state
	const [gameState, setGameState] = useState({
		currentTurnPlayerId: null,
		deckCount: 25,
		players: [],
	});

	// Mock hand
	const [hand, setHand] = useState([
		{ id: "1", type: "panic" },
		{ id: "2", type: "skip" },
		{ id: "3", type: "peak" },
		{ id: "4", type: "pairs", variant: "A" },
		{ id: "5", type: "pairs", variant: "A" },
		{ id: "6", type: "misdeal" },
	]);

	useEffect(() => {
		const storedPlayer = localStorage.getItem("player");
		if (storedPlayer) {
			const p = JSON.parse(storedPlayer);
			setPlayer(p);
			setGameState((prev) => ({
				...prev,
				currentTurnPlayerId: p.playerId,
				players: [{ ...p, cardCount: hand.length, isAlive: true }],
			}));
		}
	}, []);

	const handleDrawCard = () => {
		// TODO: Call TakeAction API with actionType: "draw"
		const newCard = { id: Date.now().toString(), type: "skip" };
		setHand([...hand, newCard]);
		setIsMyTurn(false);
	};

	const handlePlayCard = (cardId) => {
		// TODO: Call TakeAction API with actionType: "playCard"
		setHand(hand.filter((c) => c.id !== cardId));
		setSelectedCard(null);
	};

	return (
		<div
			className={`min-h-screen flex flex-col ${
				isMyTurn
					? "bg-indigo-50 dark:bg-slate-900"
					: "bg-slate-200 dark:bg-slate-950"
			}`}
		>
			{/* Top bar */}
			<div className="bg-white dark:bg-slate-800 shadow-sm px-4 py-3">
				<div className="flex justify-between items-center max-w-7xl mx-auto">
					<div className="font-mono text-sm text-slate-500">
						{gameId}
					</div>
					<div className="text-sm">
						<span className="text-slate-500">Deck: </span>
						<span className="font-semibold">
							{gameState.deckCount}
						</span>
					</div>
				</div>
			</div>

			{/* Main game area */}
			<div className="flex-1 flex flex-col p-4">
				{/* Turn indicator */}
				<div className="text-center mb-6">
					{isMyTurn ? (
						<div className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold animate-pulse">
							Your Turn!
						</div>
					) : (
						<div className="inline-block px-6 py-2 bg-slate-400 text-white rounded-full">
							Waiting...
						</div>
					)}
				</div>

				{/* Player list */}
				<div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6">
					<PlayerList
						players={gameState.players}
						currentTurnPlayerId={gameState.currentTurnPlayerId}
						showCardCount
					/>
				</div>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Draw button */}
				{isMyTurn && (
					<button
						onClick={handleDrawCard}
						className="mx-auto mb-6 px-12 py-4 bg-red-500 hover:bg-red-600 text-white text-xl font-bold rounded-2xl shadow-lg transition-transform hover:scale-105"
					>
						🎴 Draw Card
					</button>
				)}
			</div>

			{/* Card hand */}
			<CardHand
				cards={hand}
				selectedCard={selectedCard}
				onSelectCard={setSelectedCard}
				onPlayCard={handlePlayCard}
				canPlay={isMyTurn}
			/>
		</div>
	);
}

export default Game;
