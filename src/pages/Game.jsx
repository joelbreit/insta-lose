import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PlayerList from "../components/PlayerList";
import CardHand from "../components/CardHand";
import { getGameState, takeAction } from "../services/api";
import { CARD_TYPES } from "../utils/cardTypes";
import { Users, Layers } from "lucide-react";

const POLL_INTERVAL = 2000; // 2 seconds

function Game() {
	const { gameId } = useParams();
	const navigate = useNavigate();
	const [player, setPlayer] = useState(null);
	const [selectedCard, setSelectedCard] = useState(null);
	const [isActing, setIsActing] = useState(false);
	const [error, setError] = useState(null);
	const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
	const [showGameState, setShowGameState] = useState(false);
	const [peekedCards, setPeekedCards] = useState(null);
	const [actionResult, setActionResult] = useState(null);

	// Game state from server
	const [gameState, setGameState] = useState({
		status: "in-progress",
		currentTurnPlayerId: null,
		deckCount: 0,
		discardPileCount: 0,
		players: [],
		myHand: [],
		actions: [],
	});

	// Load player from localStorage
	useEffect(() => {
		const storedPlayer = localStorage.getItem("player");
		if (storedPlayer) {
			setPlayer(JSON.parse(storedPlayer));
		} else {
			navigate("/");
		}
	}, [navigate]);

	// Poll for game state
	const fetchGameState = useCallback(async () => {
		if (!player) return;

		try {
			const state = await getGameState(
				gameId,
				player.playerId,
				lastUpdatedAt
			);

			if (state === null) {
				// Not modified (304)
				return;
			}

			// Check if game has finished
			if (state.status === "finished") {
				navigate(`/recap/${gameId}`);
				return;
			}

			setGameState(state);
			setLastUpdatedAt(state.updatedAt);
			setError(null);
		} catch (err) {
			console.error("Failed to fetch game state:", err);
		}
	}, [gameId, player, lastUpdatedAt, navigate]);

	// Initial load and polling
	useEffect(() => {
		if (!player) return;

		// Initial fetch (force refresh)
		setLastUpdatedAt(null);
		fetchGameState();

		// Set up polling
		const interval = setInterval(fetchGameState, POLL_INTERVAL);

		return () => clearInterval(interval);
	}, [player]); // Only depend on player, not fetchGameState

	const isMyTurn = gameState.currentTurnPlayerId === player?.playerId;

	console.log("isMyTurn", isMyTurn);
	console.log("gameState.currentTurnPlayerId", gameState.currentTurnPlayerId);
	console.log("player?.playerId", player?.playerId);

	const handleDrawCard = async () => {
		if (!player || !isMyTurn || isActing) return;

		setIsActing(true);
		setError(null);
		setActionResult(null);

		try {
			const result = await takeAction(gameId, {
				playerId: player.playerId,
				actionType: "draw",
			});

			// Handle special results
			if (result.action?.result === "eliminated") {
				setActionResult({
					type: "eliminated",
					message:
						"💀 You drew an Insta-Lose card and had no Panic card! You're out!",
				});
			} else if (result.action?.result === "saved-by-panic") {
				setActionResult({
					type: "saved",
					message:
						"😱 You drew an Insta-Lose card but your Panic card saved you!",
				});
			}

			// Force refresh game state
			setLastUpdatedAt(null);
			await fetchGameState();
		} catch (err) {
			console.error("Failed to draw card:", err);
			setError(err.message || "Failed to draw card");
		} finally {
			setIsActing(false);
		}
	};

	const handlePlayCard = async (cardId, targetPlayerId = null) => {
		if (!player || !isMyTurn || isActing) return;

		const card = gameState.myHand.find((c) => c.id === cardId);
		if (!card) return;

		// Check if pairs card needs a target
		if (card.type.startsWith("pairs-") && !targetPlayerId) {
			// Check if player has a matching pair
			const matchingPairs = gameState.myHand.filter(
				(c) => c.type === card.type
			);
			if (matchingPairs.length >= 2) {
				// Need to select a target - show target selection UI
				setSelectedCard({ ...card, needsTarget: true });
				return;
			}
		}

		setIsActing(true);
		setError(null);
		setActionResult(null);
		setPeekedCards(null);

		try {
			const result = await takeAction(gameId, {
				playerId: player.playerId,
				actionType: "playCard",
				cardId,
				targetPlayerId,
			});

			// Handle peek result
			if (result.action?.peekedCards) {
				setPeekedCards(result.action.peekedCards);
			}

			// Handle steal result
			if (result.action?.result === "stole-card") {
				const targetPlayer = gameState.players.find(
					(p) => p.playerId === result.action.targetPlayerId
				);
				setActionResult({
					type: "steal",
					message: `👯 You stole a card from ${
						targetPlayer?.name || "another player"
					}!`,
				});
			}

			setSelectedCard(null);

			// Force refresh game state
			setLastUpdatedAt(null);
			await fetchGameState();
		} catch (err) {
			console.error("Failed to play card:", err);
			setError(err.message || "Failed to play card");
		} finally {
			setIsActing(false);
		}
	};

	// Find current player info
	const myPlayerInfo = gameState.players.find(
		(p) => p.playerId === player?.playerId
	);
	const isAlive = myPlayerInfo?.isAlive ?? true;

	// Get target selection for pairs
	const otherAlivePlayers = gameState.players.filter(
		(p) => p.playerId !== player?.playerId && p.isAlive
	);

	return (
		<div
			className={`min-h-screen flex flex-col ${
				isMyTurn && isAlive
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
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-1">
							<Layers className="h-4 w-4 text-slate-400" />
							<span className="font-semibold">
								{gameState.deckCount}
							</span>
						</div>
						<button
							onClick={() => setShowGameState(true)}
							className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg"
						>
							<Users className="h-4 w-4" />
							<span>
								{
									gameState.players.filter((p) => p.isAlive)
										.length
								}
							</span>
						</button>
					</div>
				</div>
			</div>

			{/* Main game area */}
			<div className="flex-1 flex flex-col p-4">
				{/* Error display */}
				{error && (
					<div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-center text-sm">
						{error}
					</div>
				)}

				{/* Action result display */}
				{actionResult && (
					<div
						className={`mb-4 p-4 rounded-xl text-center font-medium ${
							actionResult.type === "eliminated"
								? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
								: actionResult.type === "saved"
								? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
								: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
						}`}
					>
						{actionResult.message}
						<button
							onClick={() => setActionResult(null)}
							className="ml-2 underline text-sm"
						>
							Dismiss
						</button>
					</div>
				)}

				{/* Peeked cards display */}
				{peekedCards && (
					<div className="mb-4 p-4 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
						<div className="text-center text-cyan-700 dark:text-cyan-300 font-medium mb-3">
							👁️ Top 3 cards of the deck:
						</div>
						<div className="flex justify-center gap-2">
							{peekedCards.map((card, index) => {
								const cardType = CARD_TYPES[card.type];
								return (
									<div
										key={index}
										className={`w-16 h-24 rounded-lg flex flex-col items-center justify-center ${
											cardType?.bgColor || "bg-slate-500"
										} ${
											cardType?.textColor || "text-white"
										}`}
									>
										<span className="text-xl">
											{cardType?.icon || "?"}
										</span>
										<span className="text-xs mt-1">
											{cardType?.name || card.type}
										</span>
									</div>
								);
							})}
						</div>
						<button
							onClick={() => setPeekedCards(null)}
							className="block mx-auto mt-3 text-sm text-cyan-600 dark:text-cyan-400 underline"
						>
							Close
						</button>
					</div>
				)}

				{/* Turn indicator */}
				<div className="text-center mb-6">
					{!isAlive ? (
						<div className="inline-block px-6 py-2 bg-red-500 text-white rounded-full font-semibold">
							💀 Eliminated
						</div>
					) : isMyTurn ? (
						<div className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold animate-pulse">
							Your Turn!
						</div>
					) : (
						<div className="inline-block px-6 py-2 bg-slate-400 text-white rounded-full">
							{gameState.players.find(
								(p) =>
									p.playerId === gameState.currentTurnPlayerId
							)?.name || "..."}
							's turn
						</div>
					)}
				</div>

				{/* Player list (compact) */}
				<div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6">
					<PlayerList
						players={gameState.players}
						currentTurnPlayerId={gameState.currentTurnPlayerId}
						showCardCount
					/>
				</div>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Target selection for pairs */}
				{selectedCard?.needsTarget && (
					<div className="mb-6 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
						<div className="text-center text-purple-700 dark:text-purple-300 font-medium mb-3">
							👯 Choose a player to steal from:
						</div>
						<div className="flex flex-wrap justify-center gap-2">
							{otherAlivePlayers.map((p) => (
								<button
									key={p.playerId}
									onClick={() =>
										handlePlayCard(
											selectedCard.id,
											p.playerId
										)
									}
									className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
								>
									<span>{p.icon}</span>
									<span>{p.name}</span>
									<span className="text-xs text-slate-500">
										({p.cardCount})
									</span>
								</button>
							))}
						</div>
						<button
							onClick={() => setSelectedCard(null)}
							className="block mx-auto mt-3 text-sm text-purple-600 dark:text-purple-400 underline"
						>
							Cancel
						</button>
					</div>
				)}

				{/* Draw button */}
				{isMyTurn && isAlive && (
					<button
						onClick={handleDrawCard}
						disabled={isActing}
						className="mx-auto mb-6 px-12 py-4 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xl font-bold rounded-2xl shadow-lg transition-transform hover:scale-105 disabled:hover:scale-100"
					>
						{isActing ? "..." : "🎴 Draw Card"}
					</button>
				)}
			</div>

			{/* Card hand */}
			{isAlive && (
				<CardHand
					cards={gameState.myHand}
					selectedCard={
						selectedCard?.needsTarget ? null : selectedCard
					}
					onSelectCard={setSelectedCard}
					onPlayCard={handlePlayCard}
					canPlay={isMyTurn && !isActing}
				/>
			)}

			{/* Game state modal */}
			{showGameState && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
						<h3 className="text-xl font-bold mb-4">Game State</h3>

						<div className="space-y-4">
							<div>
								<div className="text-sm text-slate-500 mb-1">
									Deck
								</div>
								<div className="font-semibold">
									{gameState.deckCount} cards remaining
								</div>
							</div>

							<div>
								<div className="text-sm text-slate-500 mb-1">
									Discard Pile
								</div>
								<div className="font-semibold">
									{gameState.discardPileCount} cards
								</div>
							</div>

							<div>
								<div className="text-sm text-slate-500 mb-2">
									Players
								</div>
								<PlayerList
									players={gameState.players}
									currentTurnPlayerId={
										gameState.currentTurnPlayerId
									}
									showCardCount
								/>
							</div>

							<div>
								<div className="text-sm text-slate-500 mb-2">
									Recent Actions
								</div>
								<div className="space-y-1 text-sm">
									{gameState.actions
										.slice(-5)
										.reverse()
										.map((action, i) => {
											const actionPlayer =
												gameState.players.find(
													(p) =>
														p.playerId ===
														action.playerId
												);
											return (
												<div
													key={i}
													className="text-slate-600 dark:text-slate-400"
												>
													{actionPlayer?.name || "?"}:{" "}
													{action.type}
													{action.cardType &&
														` (${action.cardType})`}
												</div>
											);
										})}
								</div>
							</div>
						</div>

						<button
							onClick={() => setShowGameState(false)}
							className="w-full mt-6 py-3 bg-slate-200 dark:bg-slate-700 rounded-xl font-medium"
						>
							Close
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default Game;
