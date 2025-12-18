import { Link } from "react-router-dom";
import Header from "../components/Header";
import { Users, Plus } from "lucide-react";

function Home() {
	return (
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<h1 className="text-5xl font-bold mb-4">🎴 Insta-Lose</h1>
					<p className="text-xl text-slate-500 dark:text-slate-400">
						Don't draw the losing card!
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-6 justify-center max-w-md mx-auto">
					<Link
						to="/create"
						className="flex-1 flex flex-col items-center gap-3 p-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-colors"
					>
						<Plus className="h-12 w-12" />
						<span className="text-xl font-semibold">Host Game</span>
					</Link>

					<Link
						to="/join"
						className="flex-1 flex flex-col items-center gap-3 p-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-colors"
					>
						<Users className="h-12 w-12" />
						<span className="text-xl font-semibold">Join Game</span>
					</Link>
				</div>
			</main>
		</div>
	);
}

export default Home;
