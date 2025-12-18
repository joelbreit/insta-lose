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
		<div className="space-y-6">
			{/* Name input */}
			<div>
				<label className="block text-sm font-medium mb-2">
					Your Name
				</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Enter your name"
					maxLength={12}
					className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none"
				/>
			</div>

			{/* Icon selector */}
			<div>
				<label className="block text-sm font-medium mb-2">
					Choose Icon
				</label>
				<div className="grid grid-cols-6 gap-2">
					{ICONS.map((i) => (
						<button
							key={i}
							onClick={() => setIcon(i)}
							className={`p-3 text-2xl rounded-xl transition-all ${
								icon === i
									? "bg-indigo-100 dark:bg-indigo-900 ring-2 ring-indigo-500"
									: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							{i}
						</button>
					))}
				</div>
			</div>

			{/* Color selector */}
			<div>
				<label className="block text-sm font-medium mb-2">
					Choose Color
				</label>
				<div className="grid grid-cols-4 gap-2">
					{COLORS.map((c) => (
						<button
							key={c}
							onClick={() => setColor(c)}
							className={`h-12 rounded-xl transition-all ${c} ${
								color === c
									? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white"
									: "hover:opacity-80"
							}`}
						/>
					))}
				</div>
			</div>

			{/* Preview */}
			<div className="flex items-center justify-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
				<div
					className={`w-12 h-12 ${color} rounded-full flex items-center justify-center text-2xl`}
				>
					{icon}
				</div>
				<span className="font-semibold text-lg">
					{name || "Your Name"}
				</span>
			</div>
		</div>
	);
}

export default PlayerSetup;
