import { useState } from "react";
import { CARD_TYPES } from "../utils/cardTypes";
import { Info, Play, X } from "lucide-react";

function CardHand({
	cards,
	selectedCard,
	onSelectCard,
	onPlayCard,
	canPlay,
	isCardPlayable,
}) {
	const [showInfo, setShowInfo] = useState(null);

	return (
		<div className="bg-gradient-to-b from-gray-800 to-black border-t-4 border-cyan-500">
			{/* Card action bar */}
			{selectedCard && (
				<div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-b from-black to-gray-900 border-b-4 border-gray-700">
					<button
						onClick={() => setShowInfo(selectedCard)}
						className="flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-blue-600 to-blue-800 border-4 border-blue-900 text-yellow-300 font-bold tracking-wide"
					>
						<Info className="h-5 w-5" />
						INFO
					</button>
					{canPlay &&
						isCardPlayable &&
						isCardPlayable(selectedCard) && (
							<button
								onClick={() => onPlayCard(selectedCard.id)}
								className="flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-green-600 to-green-800 border-4 border-green-900 text-yellow-300 font-bold tracking-wide"
							>
								<Play className="h-5 w-5" />
								PLAY
							</button>
						)}
					{canPlay &&
						isCardPlayable &&
						!isCardPlayable(selectedCard) && (
							<div className="text-sm text-yellow-300 px-4 py-2 font-bold tracking-wide">
								{selectedCard.type === "panic"
									? "PANIC CARDS AUTO-PLAY WHEN YOU DRAW INSTA-LOSE!"
									: "YOU NEED A MATCHING PAIR TO PLAY THIS CARD!"}
							</div>
						)}
					<button
						onClick={() => onSelectCard(null)}
						className="p-2 text-cyan-300 hover:text-cyan-400 border-2 border-cyan-500"
					>
						<X className="h-6 w-6" />
					</button>
				</div>
			)}

			{/* Cards */}
			<div className="flex gap-3 p-6 overflow-x-auto">
				{cards.map((card) => {
					// Normalize card type (e.g., "pairs-A" -> "pairs")
					const normalizedType = card.type?.startsWith("pairs-")
						? "pairs"
						: card.type;
					const cardType = CARD_TYPES[normalizedType];
					const isSelected = selectedCard?.id === card.id;
					const cardPlayable = isCardPlayable
						? isCardPlayable(card)
						: true;
					const isNotPlayable = canPlay && !cardPlayable;

					return (
						<button
							key={card.id}
							onClick={() =>
								onSelectCard(isSelected ? null : card)
							}
							className={`flex-shrink-0 w-24 h-32 flex flex-col items-center justify-center gap-1 transition-all relative border-4 border-black ${
								cardType?.bgColor || "bg-slate-500"
							} ${cardType?.textColor || "text-white"} ${
								isSelected
									? "ring-4 ring-cyan-500 scale-110 -translate-y-4"
									: "hover:scale-105"
							} ${isNotPlayable ? "opacity-60" : ""}`}
							style={{
								boxShadow: isSelected
									? '0 8px 0 #000'
									: '0 4px 0 #000'
							}}
							title={
								isNotPlayable
									? card.type === "panic"
										? "Panic cards can only be played automatically when you draw an Insta-Lose card"
										: "You need a matching pair card to play this card"
									: undefined
							}
						>
							<span className="text-3xl">
								{cardType?.icon || "?"}
							</span>
							{/* If pairs, show the pair type */}
							{card.type.startsWith("pairs-") ? (
								<span className="text-sm font-bold text-center px-1 tracking-wide">
									{card.type.split("-")[1]}
								</span>
							) : (
								<span className="text-xs font-bold text-center px-1 tracking-wide">
									{cardType?.name.toUpperCase()}
								</span>
							)}
							{/* Visual indicator for unplayable cards */}
							{isNotPlayable && (
								<div className="absolute inset-0 border-4 border-red-500 border-dashed opacity-80" />
							)}
						</button>
					);
				})}
			</div>

			{/* Info modal */}
			{showInfo &&
				(() => {
					const normalizedType = showInfo.type?.startsWith("pairs-")
						? "pairs"
						: showInfo.type;
					const cardType = CARD_TYPES[normalizedType];
					return (
						<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
							<div className="beveled-box max-w-md w-full">
								<div className="bevel-outer" />
								<div className="bevel-inner" />
								<div className="bevel-content p-8">
									<div className="flex items-center gap-4 mb-6">
										<span className="text-5xl">
											{cardType?.icon || "?"}
										</span>
										<h3 className="text-2xl font-bold text-yellow-300 tracking-wide">
											{(cardType?.name || showInfo.type).toUpperCase()}
										</h3>
									</div>
									<p className="text-cyan-300 text-lg tracking-wide leading-relaxed mb-8">
										{(cardType?.description || "NO DESCRIPTION AVAILABLE.").toUpperCase()}
									</p>
									<button
										onClick={() => setShowInfo(null)}
										className="w-full py-4 bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-gray-900 font-bold text-yellow-300 text-xl tracking-wider"
									>
										CLOSE
									</button>
								</div>
							</div>
						</div>
					);
				})()}
		</div>
	);
}

export default CardHand;
