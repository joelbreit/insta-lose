const ICONS = ["🐱", "🐶", "🦊", "🐻", "🐼", "🐨", "🦁", "🐸", "🐵", "🦄", "🐲", "👻"];
const COLORS = [
	"bg-blue-500",
	"bg-pink-500",
	"bg-emerald-500",
	"bg-amber-500",
	"bg-purple-500",
	"bg-red-500",
	"bg-cyan-500",
	"bg-lime-500",
];

function PlayerSetup({ name, setName, icon, setIcon, color, setColor }) {
	return (
		<div className="space-y-8">
			{/* Name input */}
			<div className="beveled-box">
				<div className="bevel-outer" />
				<div className="bevel-inner" />
				<div className="bevel-content p-6">
					<label className="block text-lg font-bold mb-4 text-cyan-300 tracking-wide">
						YOUR NAME
					</label>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="ENTER NAME"
						maxLength={12}
						className="w-full px-6 py-4 text-xl bg-black border-4 border-cyan-500 text-yellow-300 tracking-wide outline-none focus:border-yellow-300 placeholder:text-gray-600"
					/>
				</div>
			</div>

			{/* Icon selector */}
			<div className="beveled-box">
				<div className="bevel-outer" />
				<div className="bevel-inner" />
				<div className="bevel-content p-6">
					<label className="block text-lg font-bold mb-4 text-cyan-300 tracking-wide">
						CHOOSE ICON
					</label>
					<div className="grid grid-cols-6 gap-3">
						{ICONS.map((i) => (
							<button
								key={i}
								onClick={() => setIcon(i)}
								className={`p-4 text-3xl transition-all border-4 ${
									icon === i
										? "bg-yellow-500 border-yellow-300 ring-4 ring-cyan-500"
										: "bg-gray-800 border-gray-600 hover:border-cyan-600"
								}`}
							>
								{i}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Color selector */}
			<div className="beveled-box">
				<div className="bevel-outer" />
				<div className="bevel-inner" />
				<div className="bevel-content p-6">
					<label className="block text-lg font-bold mb-4 text-cyan-300 tracking-wide">
						CHOOSE COLOR
					</label>
					<div className="grid grid-cols-4 gap-3">
						{COLORS.map((c) => (
							<button
								key={c}
								onClick={() => setColor(c)}
								className={`h-16 transition-all border-4 border-black ${c} ${
									color === c
										? "ring-4 ring-cyan-500"
										: "hover:opacity-80"
								}`}
							/>
						))}
					</div>
				</div>
			</div>

			{/* Preview */}
			<div className="beveled-box">
				<div className="bevel-outer" />
				<div className="bevel-inner" />
				<div className="bevel-content p-6">
					<div className="flex items-center justify-center gap-4 p-6 bg-black border-4 border-gray-600">
						<div
							className={`w-16 h-16 ${color} border-4 border-black flex items-center justify-center text-3xl`}
						>
							{icon}
						</div>
						<span className="font-bold text-2xl text-yellow-300 tracking-wide">
							{name || "YOUR NAME"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PlayerSetup;
