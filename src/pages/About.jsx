import Header from "../components/Header";
import { CARD_TYPES } from "../utils/cardTypes";

function About() {
	return (
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
				<h1 className="text-3xl font-bold mb-6">How to Play</h1>

				<div className="space-y-6 text-slate-600 dark:text-slate-300">
					<section>
						<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
							Goal
						</h2>
						<p>
							Be the last player standing! Avoid drawing the
							Insta-Lose cards at all costs.
						</p>
					</section>

					<section>
						<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
							On Your Turn
						</h2>
						<ol className="list-decimal list-inside space-y-1">
							<li>Play any cards you want (optional)</li>
							<li>Draw a card to end your turn</li>
							<li>
								If you draw an Insta-Lose card, play a Panic
								card or you're out!
							</li>
						</ol>
					</section>

					<section>
						<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
							Card Types
						</h2>
						<div className="grid gap-3">
							{Object.entries(CARD_TYPES).map(([key, card]) => (
								<div
									key={key}
									className="flex items-start gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"
								>
									<div
										className={`w-12 h-16 ${card.bgColor} rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}
									>
										{card.icon}
									</div>
									<div>
										<div className="font-semibold">
											{card.name}
										</div>
										<div className="text-sm">
											{card.description}
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}

export default About;
