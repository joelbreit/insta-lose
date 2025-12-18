import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import Header from "../components/Header";

function Home() {
	return (
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			{/* Main content */}
			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold">Home</h1>
					<p className="mt-2 text-slate-500 dark:text-slate-400">
						Welcome to Insta-Lose.
					</p>
				</div>
			</main>
		</div>
	);
}

export default Home;
