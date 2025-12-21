function PlayerList({ players, currentTurnPlayerId, showCardCount = false }) {
	return (
		<div className="space-y-3">
			{players.map((player) => (
				<div
					key={player.playerId}
					className={`flex items-center gap-4 p-4 border-4 transition-colors ${
						currentTurnPlayerId === player.playerId
							? "bg-yellow-900 border-yellow-500"
							: "bg-gray-900 border-gray-600"
					} ${!player.isAlive ? "opacity-40" : ""}`}
				>
					<div
						className={`w-12 h-12 ${player.color} border-4 border-black flex items-center justify-center text-2xl`}
					>
						{player.icon}
					</div>
					<div className="flex-1">
						<div className="font-bold text-lg text-cyan-300 tracking-wide">{player.name.toUpperCase()}</div>
						{!player.isAlive && (
							<div className="text-sm text-red-400 font-bold tracking-wide">
								ELIMINATED
							</div>
						)}
					</div>
					{showCardCount && player.isAlive && (
						<div className="text-base text-yellow-300 font-bold tracking-wide">
							{player.cardCount || player.hand?.length || 0} CARDS
						</div>
					)}
					{currentTurnPlayerId === player.playerId && (
						<div className="w-4 h-4 bg-cyan-500 border-2 border-cyan-300 animate-pulse" />
					)}
				</div>
			))}
		</div>
	);
}

export default PlayerList;
