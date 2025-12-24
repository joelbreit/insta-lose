import { Link } from "react-router-dom";
import Header from "../components/Header";
import N64Button from "../components/N64Button";
import { Users, Plus, Layers } from "lucide-react";

function Home() {
	return (
		<div className="min-h-screen">
			<Header />

			<main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="text-center mb-20">
					<div className="flex items-center justify-center gap-4 mb-6">
						<Layers className="w-16 h-16 text-yellow-300" strokeWidth={2.5} />
						<h1 className="text-7xl font-bold text-yellow-300">INSTA-LOSE</h1>
					</div>
					<p className="text-3xl font-bold text-cyan-300 tracking-widest" style={{ textShadow: '2px 2px 0px #000' }}>
						DON'T DRAW THE LOSING CARD!
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-10 justify-center max-w-3xl mx-auto">
					<Link to="/create" className="flex-1 flex flex-col items-center gap-6">
						<N64Button color="red" className="w-full">
							<div className="flex flex-col items-center gap-3 py-4">
								<Plus className="h-16 w-16" />
								<span className="text-2xl font-bold">HOST GAME</span>
							</div>
						</N64Button>
					</Link>

					<Link to="/join" className="flex-1 flex flex-col items-center gap-6">
						<N64Button color="green" className="w-full">
							<div className="flex flex-col items-center gap-3 py-4">
								<Users className="h-16 w-16" />
								<span className="text-2xl font-bold">JOIN GAME</span>
							</div>
						</N64Button>
					</Link>
				</div>
			</main>
		</div>
	);
}

export default Home;
