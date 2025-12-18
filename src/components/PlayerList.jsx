function PlayerList({ players, currentTurnPlayerId, showCardCount = false }) {
	return (
		<div className="space-y-2">
			{players.map((player) => (
				<div
					key={player.playerId}
					className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
						currentTurnPlayerId === player.playerId
							? "bg-indigo-100 dark:bg-indigo-900/50"
							: ""
					} ${!player.isAlive ? "opacity-50" : ""}`}
				>
					<div
						className={`w-10 h-10 ${player.color} rounded-full flex items-center justify-center text-xl`}
					>
						{player.icon}
					</div>
					<div className="flex-1">
						<div className="font-medium">{player.name}</div>
						{!player.isAlive && (
							<div className="text-xs text-red-500">
								Eliminated
							</div>
						)}
					</div>
					{showCardCount && player.isAlive && (
						<div className="text-sm text-slate-500">
							{player.cardCount || player.hand?.length || 0} cards
						</div>
					)}
					{currentTurnPlayerId === player.playerId && (
						<div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
					)}
				</div>
			))}
		</div>
	);
}

export default PlayerList;
