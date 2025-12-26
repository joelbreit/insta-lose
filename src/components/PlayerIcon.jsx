import React from "react";
import { PLAYER_ICONS, PLAYER_COLORS } from "../utils/playerConfig";

/**
 * Main PlayerIcon component - displays a player's icon with various states
 *
 * @param {string} iconName - Key from PLAYER_ICONS
 * @param {string} colorName - Key from PLAYER_COLORS
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} variant - 'default' | 'active' | 'winner' | 'eliminated'
 * @param {string} className - Additional CSS classes
 */
export const PlayerIcon = ({
	iconName,
	colorName,
	size = "md",
	variant = "default",
	className = "",
}) => {
	const iconConfig = PLAYER_ICONS[iconName];
	const colorConfig = PLAYER_COLORS[colorName];

	if (!iconConfig || !colorConfig) {
		console.warn(`Invalid icon (${iconName}) or color (${colorName})`);
		return null;
	}

	const Icon = iconConfig.icon;

	// Size configurations
	const sizeConfig = {
		xs: { container: "w-6 h-6", icon: 14 },
		sm: { container: "w-8 h-8", icon: 18 },
		md: { container: "w-12 h-12", icon: 24 },
		lg: { container: "w-16 h-16", icon: 32 },
		xl: { container: "w-20 h-20", icon: 40 },
	};

	const { container, icon: iconSize } = sizeConfig[size] || sizeConfig.md;

	// Variant styles
	const variantStyles = {
		default: "",
		active: `ring-4 ${colorConfig.ring} ring-offset-2 ring-offset-cream shadow-lg`,
		winner: `ring-4 ring-amber-400 ring-offset-2 ring-offset-cream shadow-xl animate-pulse`,
		eliminated: "opacity-40 grayscale",
	};

	return (
		<div
			className={`
        ${container}
        ${colorConfig.bg}
        ${variantStyles[variant]}
        rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${className}
      `}
		>
			<Icon
				size={iconSize}
				className={colorConfig.icon}
				strokeWidth={2.5}
			/>
		</div>
	);
};

/**
 * Clickable icon selector button - shows current selection and opens modal
 */
export const PlayerIconSelector = ({
	iconName,
	colorName,
	onClick,
	size = "lg",
	disabled = false,
}) => {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className="relative group"
			type="button"
		>
			<PlayerIcon
				iconName={iconName}
				colorName={colorName}
				size={size}
				className={`
          ${!disabled && "cursor-pointer hover:scale-110 hover:shadow-lg"}
          transition-transform duration-200
        `}
			/>
			{!disabled && (
				<div className="absolute inset-0 rounded-full bg-brown/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
					<span className="text-xs text-brown font-medium">Edit</span>
				</div>
			)}
		</button>
	);
};

/**
 * Player icon with name label - common pattern in UI
 */
export const PlayerIconWithLabel = ({
	iconName,
	colorName,
	name,
	size = "md",
	variant = "default",
	labelPosition = "bottom",
	className = "",
}) => {
	const isHorizontal = labelPosition === "right";

	return (
		<div
			className={`
      flex ${
			isHorizontal
				? "flex-row items-center gap-3"
				: "flex-col items-center gap-2"
		}
      ${className}
    `}
		>
			<PlayerIcon
				iconName={iconName}
				colorName={colorName}
				size={size}
				variant={variant}
			/>
			<span
				className={`
        text-brown font-medium
        ${size === "xs" ? "text-xs" : ""}
        ${size === "sm" ? "text-sm" : ""}
        ${size === "md" ? "text-base" : ""}
        ${size === "lg" ? "text-lg" : ""}
        ${variant === "eliminated" ? "opacity-40" : ""}
      `}
			>
				{name}
			</span>
		</div>
	);
};

export default PlayerIcon;
