import Header from "../components/Header";

function Credits() {
	return (
		<div className="min-h-screen">
			<Header />

			<main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
				<h1 className="text-5xl font-bold mb-12 text-center text-yellow-300">CREDITS</h1>

				<div className="space-y-8">
					<section className="beveled-box p-6">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6">
							<h2 className="text-2xl font-bold text-cyan-300 mb-4">
								TECHNOLOGIES
							</h2>
							<p className="text-lg text-green-300 tracking-wide">
								BUILT WITH REACT, REACT ROUTER, TAILWIND CSS, AND VITE. ICONS PROVIDED BY LUCIDE REACT.
							</p>
						</div>
					</section>

					<section className="beveled-box p-6">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6">
							<h2 className="text-2xl font-bold text-cyan-300 mb-4">
								BACKEND
							</h2>
							<p className="text-lg text-green-300 tracking-wide">
								RUNS ON AWS SERVERLESS: LAMBDA FUNCTIONS, DYNAMODB FOR GAME STATE, API GATEWAY FOR REST AND WEBSOCKET, HOSTED ON S3/AMPLIFY.
							</p>
						</div>
					</section>

					<section className="beveled-box p-6">
						<div className="bevel-outer" />
						<div className="bevel-inner" />
						<div className="bevel-content p-6">
							<h2 className="text-2xl font-bold text-cyan-300 mb-4">
								ARCHITECTURE
							</h2>
							<p className="text-lg text-green-300 tracking-wide">
								HYBRID APPROACH: FRONTEND RUNS IN THE BROWSER, BACKEND USES SERVERLESS FUNCTIONS. REAL-TIME UPDATES VIA WEBSOCKETS, GAME STATE PERSISTED IN DYNAMODB.
							</p>
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}

export default Credits;

