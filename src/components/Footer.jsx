import { Github, Linkedin, Globe, Code } from "lucide-react";

function Footer() {
	return (
		<footer className="mt-auto bg-gradient-to-b from-black to-gray-900 border-t-2 border-cyan-700/50">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
					{/* Created by text */}
					<div className="text-sm text-gray-400 tracking-wide">
						Created by Joel Breit
					</div>

					{/* Links */}
					<div className="flex items-center gap-6 flex-wrap justify-center">
						<a
							href="https://joelbreit.com"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors tracking-wide"
						>
							<Globe className="w-4 h-4" />
							<span>Website</span>
						</a>
						<a
							href="https://github.com/joelbreit"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors tracking-wide"
						>
							<Github className="w-4 h-4" />
							<span>GitHub</span>
						</a>
						<a
							href="https://linkedin.com/in/joel-breit"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors tracking-wide"
						>
							<Linkedin className="w-4 h-4" />
							<span>LinkedIn</span>
						</a>
						<a
							href="https://github.com/joelbreit/insta-lose"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors tracking-wide"
						>
							<Code className="w-4 h-4" />
							<span>Source Code</span>
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
