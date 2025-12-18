import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings, Github, Menu, X } from "lucide-react";

function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const location = useLocation();

	const isActive = (path) => location.pathname === path;

	return (
		<nav className="bg-white shadow-sm dark:bg-slate-800">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 justify-between">
					<div className="flex items-center">
						<div className="shrink-0 text-xl font-bold">
							Insta-Lose
						</div>

						{/* Desktop navigation */}
						<div className="hidden md:ml-6 md:flex md:space-x-8">
							<Link
								to="/"
								className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
									isActive("/")
										? "border-indigo-500 text-slate-900 dark:text-white"
										: "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
								}`}
							>
								Home
							</Link>
							<Link
								to="/about"
								className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
									isActive("/about")
										? "border-indigo-500 text-slate-900 dark:text-white"
										: "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
								}`}
							>
								About
							</Link>
						</div>
					</div>{" "}
					<div className="flex items-center">
						<button className="rounded-full bg-slate-100 p-1 text-slate-500 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:text-white">
							<span className="sr-only">Settings</span>
							<Settings className="h-6 w-6" />
						</button>

						<a
							href="https://github.com"
							className="ml-3 rounded-full bg-slate-100 p-1 text-slate-500 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:text-white"
						>
							<span className="sr-only">GitHub</span>
							<Github className="h-6 w-6" />
						</a>

						{/* Mobile menu button */}
						<div className="flex items-center md:hidden">
							<button
								type="button"
								className="ml-3 inline-flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
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

			{/* Mobile menu, show/hide based on menu state */}
			{isMobileMenuOpen && (
				<div className="md:hidden">
					<div className="space-y-1 pb-3 pt-2">
						<Link
							to="/"
							className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium ${
								isActive("/")
									? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-slate-700 dark:text-white"
									: "border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
							}`}
						>
							Home
						</Link>
						<Link
							to="/about"
							className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium ${
								isActive("/about")
									? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-slate-700 dark:text-white"
									: "border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
							}`}
						>
							About
						</Link>
					</div>
				</div>
			)}
		</nav>
	);
}
export default Header;
