import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Layers } from "lucide-react";

function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const location = useLocation();

	const isActive = (path) => location.pathname === path;

	return (
		<nav className="bg-gradient-to-b from-gray-800 to-black border-b-4 border-cyan-500">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-20 justify-between">
					<div className="flex items-center">
						<Link to="/" className="shrink-0 flex items-center gap-2 text-2xl font-bold text-yellow-300 tracking-widest" style={{ textShadow: '3px 3px 0px #000' }}>
							<Layers className="w-6 h-6" strokeWidth={2.5} />
							<span>INSTA-LOSE</span>
						</Link>

						{/* Desktop navigation */}
						<div className="hidden md:ml-10 md:flex md:space-x-6">
							<Link
								to="/"
								className={`inline-flex items-center border-b-4 px-3 pt-1 text-lg font-bold tracking-wide ${
									isActive("/")
										? "border-cyan-500 text-cyan-300"
										: "border-transparent text-gray-400 hover:border-cyan-700 hover:text-cyan-400"
								}`}
								style={{ textShadow: isActive("/") ? '2px 2px 0px #000' : 'none' }}
							>
								HOME
							</Link>
							<Link
								to="/about"
								className={`inline-flex items-center border-b-4 px-3 pt-1 text-lg font-bold tracking-wide ${
									isActive("/about")
										? "border-cyan-500 text-cyan-300"
										: "border-transparent text-gray-400 hover:border-cyan-700 hover:text-cyan-400"
								}`}
								style={{ textShadow: isActive("/about") ? '2px 2px 0px #000' : 'none' }}
							>
								ABOUT
							</Link>
							<Link
								to="/credits"
								className={`inline-flex items-center border-b-4 px-3 pt-1 text-lg font-bold tracking-wide ${
									isActive("/credits")
										? "border-cyan-500 text-cyan-300"
										: "border-transparent text-gray-400 hover:border-cyan-700 hover:text-cyan-400"
								}`}
								style={{ textShadow: isActive("/credits") ? '2px 2px 0px #000' : 'none' }}
							>
								CREDITS
							</Link>
						</div>
					</div>
					<div className="flex items-center">
						{/* Mobile menu button */}
						<div className="flex items-center md:hidden">
							<button
								type="button"
								className="inline-flex items-center justify-center p-2 text-cyan-300 hover:text-cyan-400 border-2 border-cyan-500"
								onClick={() =>
									setIsMobileMenuOpen(!isMobileMenuOpen)
								}
							>
								<span className="sr-only">Open main menu</span>
								{isMobileMenuOpen ? (
									<X
										className="block h-6 w-6"
										aria-hidden="true"
									/>
								) : (
									<Menu
										className="block h-6 w-6"
										aria-hidden="true"
									/>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile menu */}
			{isMobileMenuOpen && (
				<div className="md:hidden bg-gradient-to-b from-black to-gray-900 border-t-2 border-cyan-700">
					<div className="space-y-1 pb-3 pt-2">
						<Link
							to="/"
							className={`block border-l-4 py-3 pl-4 pr-4 text-base font-bold tracking-wide ${
								isActive("/")
									? "border-cyan-500 bg-gray-800 text-cyan-300"
									: "border-transparent text-gray-400 hover:border-cyan-700 hover:bg-gray-800 hover:text-cyan-400"
							}`}
						>
							HOME
						</Link>
						<Link
							to="/about"
							className={`block border-l-4 py-3 pl-4 pr-4 text-base font-bold tracking-wide ${
								isActive("/about")
									? "border-cyan-500 bg-gray-800 text-cyan-300"
									: "border-transparent text-gray-400 hover:border-cyan-700 hover:bg-gray-800 hover:text-cyan-400"
							}`}
						>
							ABOUT
						</Link>
						<Link
							to="/credits"
							className={`block border-l-4 py-3 pl-4 pr-4 text-base font-bold tracking-wide ${
								isActive("/credits")
									? "border-cyan-500 bg-gray-800 text-cyan-300"
									: "border-transparent text-gray-400 hover:border-cyan-700 hover:bg-gray-800 hover:text-cyan-400"
							}`}
						>
							CREDITS
						</Link>
					</div>
				</div>
			)}
		</nav>
	);
}
export default Header;
