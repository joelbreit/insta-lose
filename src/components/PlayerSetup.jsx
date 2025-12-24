import { useEffect, useState } from "react";
import { PLAYER_ICONS, PLAYER_COLORS, PlayerIcon, PlayerIconSelector } from "./PlayerIcon";
import { IconColorSelectorModal } from "./IconColorSelectorModal";

function PlayerSetup({ name, setName, icon, setIcon, color, setColor }) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Initialize with random icon and color on mount
	useEffect(() => {
		const iconKeys = Object.keys(PLAYER_ICONS);
		const colorKeys = Object.keys(PLAYER_COLORS);
		const randomIcon = iconKeys[Math.floor(Math.random() * iconKeys.length)];
		const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
		setIcon(randomIcon);
		setColor(randomColor);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run on mount - setIcon and setColor are stable useState setters

	const handleIconColorSelect = ({ iconName, colorName }) => {
		setIcon(iconName);
		setColor(colorName);
	};

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

			{/* Icon and Color selector */}
			<div className="beveled-box">
				<div className="bevel-outer" />
				<div className="bevel-inner" />
				<div className="bevel-content p-6">
					<label className="block text-lg font-bold mb-4 text-cyan-300 tracking-wide">
						CHOOSE ICON & COLOR
					</label>
					<div className="flex justify-center">
						<PlayerIconSelector
							iconName={icon}
							colorName={color}
							onClick={() => setIsModalOpen(true)}
							size="xl"
						/>
					</div>
				</div>
			</div>

			{/* Preview */}
			<div className="beveled-box">
				<div className="bevel-outer" />
				<div className="bevel-inner" />
				<div className="bevel-content p-6">
					<div className="flex items-center justify-center gap-4 p-6 bg-black border-4 border-gray-600">
						<PlayerIcon
							iconName={icon}
							colorName={color}
							size="lg"
						/>
						<span className="font-bold text-2xl text-yellow-300 tracking-wide">
							{name || "YOUR NAME"}
						</span>
					</div>
				</div>
			</div>

			{/* Icon/Color Selection Modal */}
			<IconColorSelectorModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				currentIcon={icon}
				currentColor={color}
				onSelect={handleIconColorSelect}
			/>
		</div>
	);
}

export default PlayerSetup;
