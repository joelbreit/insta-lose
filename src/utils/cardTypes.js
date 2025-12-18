export const CARD_TYPES = {
	"insta-lose": {
		name: "Insta-Lose",
		icon: "💀",
		bgColor: "bg-red-600",
		textColor: "text-white",
		description:
			"If you draw this card, you must play a Panic card immediately or you are eliminated from the game!",
	},
	panic: {
		name: "Panic",
		icon: "😱",
		bgColor: "bg-amber-500",
		textColor: "text-white",
		description:
			"Can only be played when you draw an Insta-Lose card. Saves you from elimination and shuffles the Insta-Lose card back into the deck. Your turn ends.",
	},
	pairs: {
		name: "Pairs",
		icon: "👯",
		bgColor: "bg-purple-500",
		textColor: "text-white",
		description:
			"Collect two matching Pairs cards and play them together to steal a random card from another player of your choice.",
	},
	peak: {
		name: "Peak",
		icon: "👁️",
		bgColor: "bg-cyan-500",
		textColor: "text-white",
		description:
			"Look at the top 3 cards of the deck without drawing. Knowledge is power!",
	},
	skip: {
		name: "Skip",
		icon: "⏭️",
		bgColor: "bg-emerald-500",
		textColor: "text-white",
		description:
			"End your turn without drawing a card. Play it safe!",
	},
	misdeal: {
		name: "Misdeal",
		icon: "🔀",
		bgColor: "bg-blue-500",
		textColor: "text-white",
		description:
			"Shuffle the entire deck. Use this to mess with everyone's plans or save yourself from a bad situation!",
	},
};
