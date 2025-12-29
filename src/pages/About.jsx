import Header from "../components/Header";
import { CARD_TYPES } from "../utils/cardTypes";

function About() {
	return (
		<div className="min-h-screen">
			<Header />

			<main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
				<h1 className="text-5xl font-bold mb-12 text-center text-yellow-300">
					HOW TO PLAY
				</h1>

				<div className="space-y-8">
					<section className="beveled-box p-6">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6">
							<h2 className="text-2xl font-bold text-cyan-300 mb-4">
								GOAL
							</h2>
							<p className="text-lg text-green-300 tracking-wide">
								BE THE LAST PLAYER STANDING! AVOID DRAWING THE
								INSTA-LOSE CARDS AT ALL COSTS.
							</p>
						</div>
					</section>

					<section className="beveled-box p-6">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6">
							<h2 className="text-2xl font-bold text-cyan-300 mb-4">
								ON YOUR TURN
							</h2>
							<ol className="list-decimal list-inside space-y-3 text-lg text-green-300 tracking-wide">
								<li>PLAY ANY CARDS YOU WANT (OPTIONAL)</li>
								<li>DRAW A CARD TO END YOUR TURN</li>
								<li>
									IF YOU DRAW AN INSTA-LOSE CARD, PLAY A SAVE
									CARD OR YOU'RE OUT!
								</li>
							</ol>
						</div>
					</section>

					<section className="beveled-box p-6">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6">
							<h2 className="text-2xl font-bold text-cyan-300 mb-6">
								CARD TYPES
							</h2>
							<div className="grid gap-4">
								{Object.entries(CARD_TYPES).map(
									([key, card]) => (
										<div
											key={key}
											className="flex items-start gap-4 p-4 bg-gray-900 border-4 border-gray-600"
										>
											<div
												className={`w-16 h-20 ${card.bgColor} border-4 border-black flex items-center justify-center flex-shrink-0`}
											>
												{card.icon ? (
													<card.icon
														className="w-10 h-10 text-white"
														strokeWidth={2.5}
													/>
												) : (
													<span className="text-3xl">
														?
													</span>
												)}
											</div>
											<div>
												<div className="font-bold text-xl text-yellow-300 tracking-wide mb-1">
													{card.name.toUpperCase()}
												</div>
												<div className="text-base text-cyan-200 tracking-wide">
													{card.description.toUpperCase()}
												</div>
											</div>
										</div>
									)
								)}
							</div>
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}

export default About;
