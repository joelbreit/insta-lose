import React, { useState } from "react";
import { X } from "lucide-react";
import { PLAYER_ICONS, PLAYER_COLORS } from "../utils/playerConfig";
import { PlayerIcon } from "./PlayerIcon";
import N64Button from "./N64Button";
import "../App.css";

/**
 * Modal for selecting player icon and color
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal closes
 * @param {string} currentIcon - Currently selected icon key
 * @param {string} currentColor - Currently selected color key
 * @param {function} onSelect - Callback with { iconName, colorName }
 */
export const IconColorSelectorModal = ({
	isOpen,
	onClose,
	currentIcon,
	currentColor,
	onSelect,
}) => {
	const [activeTab, setActiveTab] = useState("icon"); // 'icon' | 'color'
	const [selectedIcon, setSelectedIcon] = useState(currentIcon);
	const [selectedColor, setSelectedColor] = useState(currentColor);

	if (!isOpen) return null;

	const handleConfirm = () => {
		onSelect({ iconName: selectedIcon, colorName: selectedColor });
		onClose();
	};

	const handleIconSelect = (iconName) => {
		setSelectedIcon(iconName);
		// Auto-switch to color tab after selecting icon
		setActiveTab("color");
	};

	// Icons object - flat structure like colors
	const icons = PLAYER_ICONS;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/80 z-40 animate-fade-in"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-0 flex items-center justify-center z-50 p-4">
				<div className="beveled-box w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in overflow-hidden">
					{/* Outer bevel */}
					<div className="bevel-outer" />
					{/* Inner bevel */}
					<div className="bevel-inner" />
					{/* Content */}
					<div className="bevel-content flex flex-col overflow-hidden min-h-0">
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b-4 border-cyan-500">
							<div className="flex items-center gap-4">
								<PlayerIcon
									iconName={selectedIcon}
									colorName={selectedColor}
									size="lg"
								/>
								<h2
									className="text-2xl font-bold text-yellow-300 uppercase tracking-wider"
									style={{
										fontFamily: "Impact, fantasy",
										textShadow: "3px 3px 0px #000",
										letterSpacing: "0.1em",
									}}
								>
									Choose Style
								</h2>
							</div>
							<button
								onClick={onClose}
								className="w-10 h-10 border-4 border-cyan-500 bg-gradient-to-b from-purple-800 to-black hover:from-purple-700 hover:to-gray-900 flex items-center justify-center transition-colors"
							>
								<X size={20} className="text-cyan-300" />
							</button>
						</div>

						{/* Tabs */}
						<div className="flex border-b-4 border-cyan-500">
							<button
								onClick={() => setActiveTab("icon")}
								className={`
                  flex-1 px-6 py-4 font-bold uppercase tracking-wider transition-colors border-r-4 border-cyan-500
                  ${
						activeTab === "icon"
							? "text-yellow-300 bg-gradient-to-b from-purple-800 to-black"
							: "text-cyan-300/70 hover:text-cyan-300 bg-gradient-to-b from-gray-900 to-black"
					}
                `}
								style={{
									fontFamily: "Impact, fantasy",
									textShadow:
										activeTab === "icon"
											? "2px 2px 0px #000"
											: "none",
									letterSpacing: "0.1em",
								}}
							>
								Icon
							</button>
							<button
								onClick={() => setActiveTab("color")}
								className={`
                  flex-1 px-6 py-4 font-bold uppercase tracking-wider transition-colors
                  ${
						activeTab === "color"
							? "text-yellow-300 bg-gradient-to-b from-purple-800 to-black"
							: "text-cyan-300/70 hover:text-cyan-300 bg-gradient-to-b from-gray-900 to-black"
					}
                `}
								style={{
									fontFamily: "Impact, fantasy",
									textShadow:
										activeTab === "color"
											? "2px 2px 0px #000"
											: "none",
									letterSpacing: "0.1em",
								}}
							>
								Color
							</button>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-900 via-purple-900 to-black min-h-0">
							{activeTab === "icon" ? (
								<div>
									<h3
										className="text-sm font-bold text-cyan-300 uppercase tracking-wider mb-3"
										style={{
											fontFamily: "Impact, fantasy",
											textShadow: "2px 2px 0px #000",
											letterSpacing: "0.1em",
										}}
									>
										Choose an icon
									</h3>
									<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
										{Object.entries(icons).map(
											([iconName, config]) => {
												const isSelected =
													iconName === selectedIcon;
												return (
													<button
														key={iconName}
														onClick={() =>
															handleIconSelect(
																iconName
															)
														}
														className="flex flex-col items-center gap-2 group"
													>
														<div
															className={`
                          ${
								isSelected
									? "border-4 border-yellow-300 p-1 scale-110"
									: "border-4 border-transparent hover:border-cyan-500/50 p-1"
							}
                          transition-transform hover:scale-110
                        `}
														>
															<PlayerIcon
																iconName={
																	iconName
																}
																colorName={
																	selectedColor
																}
																size="lg"
															/>
														</div>
														<span
															className={`
                          text-xs font-bold uppercase transition-colors
                          ${
								isSelected
									? "text-yellow-300"
									: "text-cyan-300/70 group-hover:text-cyan-300"
							}
                        `}
															style={{
																fontFamily:
																	"Impact, fantasy",
																textShadow:
																	isSelected
																		? "1px 1px 0px #000"
																		: "none",
																letterSpacing:
																	"0.05em",
															}}
														>
															{config.label}
														</span>
													</button>
												);
											}
										)}
									</div>
								</div>
							) : (
								<div>
									<h3
										className="text-sm font-bold text-cyan-300 uppercase tracking-wider mb-3"
										style={{
											fontFamily: "Impact, fantasy",
											textShadow: "2px 2px 0px #000",
											letterSpacing: "0.1em",
										}}
									>
										Choose a color
									</h3>
									<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
										{Object.entries(PLAYER_COLORS).map(
											([colorName, config]) => {
												const isSelected =
													colorName === selectedColor;
												return (
													<button
														key={colorName}
														onClick={() =>
															setSelectedColor(
																colorName
															)
														}
														className="flex flex-col items-center gap-2 group"
													>
														<div
															className={`
                          ${
								isSelected
									? "border-4 border-yellow-300 p-1 scale-110"
									: "border-4 border-transparent hover:border-cyan-500/50 p-1"
							}
                          transition-transform hover:scale-110
                        `}
														>
															<PlayerIcon
																iconName={
																	selectedIcon
																}
																colorName={
																	colorName
																}
																size="lg"
															/>
														</div>
														<span
															className={`
                          text-xs font-bold uppercase transition-colors
                          ${
								isSelected
									? "text-yellow-300"
									: "text-cyan-300/70 group-hover:text-cyan-300"
							}
                        `}
															style={{
																fontFamily:
																	"Impact, fantasy",
																textShadow:
																	isSelected
																		? "1px 1px 0px #000"
																		: "none",
																letterSpacing:
																	"0.05em",
															}}
														>
															{config.label}
														</span>
													</button>
												);
											}
										)}
									</div>
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="flex items-center justify-between p-6">
							<N64Button onClick={onClose} color="blue">
								Cancel
							</N64Button>
							<N64Button onClick={handleConfirm} color="green">
								Confirm
							</N64Button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default IconColorSelectorModal;
