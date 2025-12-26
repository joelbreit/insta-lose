import { Skull, AlertCircle, Users, Eye, SkipForward, Shuffle } from "lucide-react";

export const CARD_TYPES = {
	"insta-lose": {
		name: "Insta-Lose",
		icon: Skull,
		bgColor: "bg-red-600", // Red
		textColor: "text-white",
		description:
			"If you draw this card, you must play a Panic card immediately or you are eliminated from the game!",
	},
	panic: {
		name: "Panic",
		icon: AlertCircle,
		bgColor: "bg-amber-500", // Amber
		textColor: "text-white",
		description:
			"Can only be played when you draw an Insta-Lose card. Saves you from elimination and shuffles the Insta-Lose card back into the deck. Your turn ends.",
	},
	pairs: {
		name: "Pairs",
		icon: Users,
		bgColor: "bg-purple-500", // Purple
		textColor: "text-white",
		description:
			"Collect two matching Pairs cards and play them together to steal a random card from another player of your choice.",
	},
	peek: {
		name: "Peek",
		icon: Eye,
		bgColor: "bg-cyan-500", // Cyan
		textColor: "text-white",
		description:
			"Look at the top 3 cards of the deck without drawing. Knowledge is power!",
	},
	skip: {
		name: "Skip",
		icon: SkipForward,
		bgColor: "bg-emerald-500", // Emerald
		textColor: "text-white",
		description:
			"End your turn without drawing a card. Play it safe!",
	},
	misdeal: {
		name: "Misdeal",
		icon: Shuffle,
		bgColor: "bg-blue-500", // Blue
		textColor: "text-white",
		description:
			"Shuffle the entire deck. Use this to mess with everyone's plans or save yourself from a bad situation!",
	},
};
