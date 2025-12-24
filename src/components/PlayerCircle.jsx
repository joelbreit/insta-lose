import { PlayerIcon } from "./PlayerIcon";
import { Skull } from "lucide-react";

/**
 * Displays players arranged in a diamond/circular pattern
 * Highlights current turn, current player ("me"), and eliminated players
 */
function PlayerCircle({
	players,
	currentTurnPlayerId,
	currentPlayerId = null,
	showCardCount = false,
	compact = false,
}) {
	const playerCount = players.length;

	// Calculate position for each player in a circle/diamond
	const getPlayerPosition = (index, total) => {
		// Start from top (-90deg) and go clockwise
		const angleOffset = -90;
		const angle = angleOffset + (index * 360) / total;
		const radians = (angle * Math.PI) / 180;

		// Use different radius based on compact mode
		const radius = compact ? 38 : 42;

		const x = 50 + radius * Math.cos(radians);
		const y = 50 + radius * Math.sin(radians);

		return { x, y, angle };
	};

	// Determine player state for styling
	const getPlayerState = (player) => {
		if (!player.isAlive) return "eliminated";
		if (player.playerId === currentTurnPlayerId) return "active";
		if (player.playerId === currentPlayerId) return "self";
		return "default";
	};

	// Get border/glow styles based on state
	const getStateStyles = (state) => {
		switch (state) {
			case "active":
				return {
					border: "border-yellow-400",
					bg: "bg-gradient-to-b from-yellow-900/80 to-yellow-950/90",
					glow: "shadow-[0_0_20px_rgba(250,204,21,0.6)]",
					text: "text-yellow-300",
					pulse: "animate-pulse",
				};
			case "self":
				return {
					border: "border-cyan-400",
					bg: "bg-gradient-to-b from-cyan-900/80 to-cyan-950/90",
					glow: "shadow-[0_0_15px_rgba(34,211,238,0.5)]",
					text: "text-cyan-300",
					pulse: "",
				};
			case "eliminated":
				return {
					border: "border-red-800",
					bg: "bg-gradient-to-b from-gray-900/60 to-black/70",
					glow: "",
					text: "text-gray-500",
					pulse: "",
				};
			default:
				return {
					border: "border-gray-600",
					bg: "bg-gradient-to-b from-gray-800/80 to-gray-900/90",
					glow: "",
					text: "text-cyan-300",
					pulse: "",
				};
		}
	};

	return (
		<div
			className={`relative w-full ${
				compact ? "aspect-square max-w-xs" : "aspect-square max-w-md"
			} mx-auto`}
		>
			{/* Center decoration */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
				<div
					className={`${
						compact ? "w-16 h-16" : "w-24 h-24"
					} border-4 border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 rotate-45`}
				>
					<div className="absolute inset-1 border-2 border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800" />
				</div>
			</div>

			{/* Connecting lines (decorative) */}
			<svg
				className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
				viewBox="0 0 100 100"
			>
				{players.map((_, index) => {
					const pos = getPlayerPosition(index, playerCount);
					return (
						<line
							key={`line-${index}`}
							x1="50"
							y1="50"
							x2={pos.x}
							y2={pos.y}
							stroke="currentColor"
							strokeWidth="0.5"
							className="text-cyan-500"
						/>
					);
				})}
				{/* Connect adjacent players */}
				{players.map((_, index) => {
					const pos1 = getPlayerPosition(index, playerCount);
					const pos2 = getPlayerPosition(
						(index + 1) % playerCount,
						playerCount
					);
					return (
						<line
							key={`connect-${index}`}
							x1={pos1.x}
							y1={pos1.y}
							x2={pos2.x}
							y2={pos2.y}
							stroke="currentColor"
							strokeWidth="0.3"
							className="text-purple-500"
						/>
					);
				})}
			</svg>

			{/* Players */}
			{players.map((player, index) => {
				const { x, y } = getPlayerPosition(index, playerCount);
				const state = getPlayerState(player);
				const styles = getStateStyles(state);

				return (
					<div
						key={player.playerId}
						className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
						style={{
							left: `${x}%`,
							top: `${y}%`,
						}}
					>
						<div
							className={`
                flex flex-col items-center
                ${compact ? "p-1.5" : "p-2"}
                border-4 ${styles.border}
                ${styles.bg}
                ${styles.glow}
                ${styles.pulse}
                transition-all duration-300
              `}
						>
							{/* Icon */}
							<div className="relative">
								<PlayerIcon
									iconName={player.icon}
									colorName={player.color}
									size={compact ? "sm" : "md"}
									variant={
										state === "eliminated"
											? "eliminated"
											: state === "active"
											? "active"
											: "default"
									}
								/>
								{/* Eliminated overlay */}
								{state === "eliminated" && (
									<div className="absolute inset-0 flex items-center justify-center">
										<Skull
											className={`${
												compact
													? "w-4 h-4"
													: "w-5 h-5"
											} text-red-500`}
											strokeWidth={3}
										/>
									</div>
								)}
							</div>

							{/* Name */}
							<div
								className={`
                  ${compact ? "text-xs" : "text-sm"}
                  font-bold tracking-wide
                  ${styles.text}
                  ${state === "eliminated" ? "line-through" : ""}
                  mt-1 max-w-16 truncate text-center
                `}
							>
								{player.name.toUpperCase()}
							</div>

							{/* Card count */}
							{showCardCount && player.isAlive && (
								<div
									className={`
                    ${compact ? "text-xs" : "text-sm"}
                    font-bold text-yellow-300 tracking-wide
                  `}
								>
									{player.cardCount || player.hand?.length || 0}
								</div>
							)}

							{/* Turn indicator */}
							{state === "active" && (
								<div
									className={`
                    absolute -top-1 -right-1
                    ${compact ? "w-2 h-2" : "w-3 h-3"}
                    bg-yellow-400 border-2 border-yellow-200
                    animate-ping
                  `}
								/>
							)}

							{/* "YOU" indicator for self */}
							{state === "self" && (
								<div
									className={`
                    absolute -bottom-2 left-1/2 -translate-x-1/2
                    ${compact ? "text-[8px] px-1" : "text-[10px] px-1.5"}
                    bg-cyan-500 text-black font-bold tracking-wider
                  `}
								>
									YOU
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default PlayerCircle;

