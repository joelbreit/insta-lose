import Header from "../components/Header";

function About() {
	return (
		<div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
			<Header />

			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold">About</h1>
					<p className="mt-2 text-slate-500 dark:text-slate-400">
						About Insta-Lose
					</p>
				</div>
			</main>
		</div>
	);
}

export default About;
