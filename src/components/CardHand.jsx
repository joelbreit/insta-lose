import { useState } from "react";
import { CARD_TYPES } from "../utils/cardTypes";
import { Info, Play, X } from "lucide-react";

function CardHand({ cards, selectedCard, onSelectCard, onPlayCard, canPlay }) {
	const [showInfo, setShowInfo] = useState(null);

	return (
		<div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
			{/* Card action bar */}
			{selectedCard && (
				<div className="flex items-center justify-center gap-4 p-3 bg-slate-100 dark:bg-slate-700">
					<button
						onClick={() => setShowInfo(selectedCard)}
						className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-lg"
					>
						<Info className="h-4 w-4" />
						Info
					</button>
					{canPlay && (
						<button
							onClick={() => onPlayCard(selectedCard.id)}
							className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"
						>
							<Play className="h-4 w-4" />
							Play
						</button>
					)}
					<button
						onClick={() => onSelectCard(null)}
						className="p-2 text-slate-500 hover:text-slate-700"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Cards */}
			<div className="flex gap-2 p-4 overflow-x-auto">
				{cards.map((card) => {
					// Normalize card type (e.g., "pairs-A" -> "pairs")
					const normalizedType = card.type?.startsWith("pairs-")
						? "pairs"
						: card.type;
					const cardType = CARD_TYPES[normalizedType];
					const isSelected = selectedCard?.id === card.id;

					return (
						<button
							key={card.id}
							onClick={() =>
								onSelectCard(isSelected ? null : card)
							}
							className={`flex-shrink-0 w-20 h-28 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
								cardType?.bgColor || "bg-slate-500"
							} ${cardType?.textColor || "text-white"} ${
								isSelected
									? "ring-4 ring-indigo-500 scale-110 -translate-y-2"
									: "hover:scale-105"
							}`}
						>
							<span className="text-2xl">
								{cardType?.icon || "?"}
							</span>
							{/* If pairs, show the pair type */}
							{card.type.startsWith("pairs-") ? (
								<span className="text-xs font-medium text-center px-1">
									{card.type.split("-")[1]}
								</span>
							) : (
								<span className="text-xs font-medium text-center px-1">
									{cardType?.name}
								</span>
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
						<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
							<div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
								<div className="flex items-center gap-3 mb-4">
									<span className="text-4xl">
										{cardType?.icon || "?"}
									</span>
									<h3 className="text-xl font-bold">
										{cardType?.name || showInfo.type}
									</h3>
								</div>
								<p className="text-slate-600 dark:text-slate-300 mb-6">
									{cardType?.description ||
										"No description available."}
								</p>
								<button
									onClick={() => setShowInfo(null)}
									className="w-full py-3 bg-slate-200 dark:bg-slate-700 rounded-xl font-medium"
								>
									Close
								</button>
							</div>
						</div>
					);
				})()}
		</div>
	);
}

export default CardHand;
