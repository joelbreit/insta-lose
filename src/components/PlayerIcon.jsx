import React from 'react';
import {
  Sparkles, Star, Flame, Zap, Heart, Crown, Gem,
  Coffee, Pizza, Cookie, IceCream, Cherry, Donut,
  Leaf, Flower2, Moon, Sun, Cloud, Snowflake,
  Music, Gamepad2, Dice5, Palette, Feather, Lightbulb,
  Bird, Fish, Turtle, Rabbit, Bug, Cat,
  Trees, Sprout, Droplet, Waves, Rocket, Wand
} from 'lucide-react';

// Icon configuration with all available icons
export const PLAYER_ICONS = {
  // Cosmic & Magic
  sparkles: { icon: Sparkles, label: 'Sparkles' },
  star: { icon: Star, label: 'Star' },
  flame: { icon: Flame, label: 'Flame' },
  zap: { icon: Zap, label: 'Zap' },
  heart: { icon: Heart, label: 'Heart' },
  crown: { icon: Crown, label: 'Crown' },
  gem: { icon: Gem, label: 'Gem' },
  rocket: { icon: Rocket, label: 'Rocket' },
  wand: { icon: Wand, label: 'Wand' },
  
  // Food & Drinks
  coffee: { icon: Coffee, label: 'Coffee' },
  pizza: { icon: Pizza, label: 'Pizza' },
  cookie: { icon: Cookie, label: 'Cookie' },
  icecream: { icon: IceCream, label: 'Ice Cream' },
  cherry: { icon: Cherry, label: 'Cherry' },
  donut: { icon: Donut, label: 'Donut' },
  
  // Nature & Elements
  leaf: { icon: Leaf, label: 'Leaf' },
  flower: { icon: Flower2, label: 'Flower' },
  moon: { icon: Moon, label: 'Moon' },
  sun: { icon: Sun, label: 'Sun' },
  cloud: { icon: Cloud, label: 'Cloud' },
  snowflake: { icon: Snowflake, label: 'Snowflake' },
  trees: { icon: Trees, label: 'Trees' },
  sprout: { icon: Sprout, label: 'Sprout' },
  droplet: { icon: Droplet, label: 'Droplet' },
  waves: { icon: Waves, label: 'Waves' },
  
  // Objects & Symbols
  music: { icon: Music, label: 'Music' },
  gamepad: { icon: Gamepad2, label: 'Gamepad' },
  dice: { icon: Dice5, label: 'Dice' },
  palette: { icon: Palette, label: 'Palette' },
  feather: { icon: Feather, label: 'Feather' },
  lightbulb: { icon: Lightbulb, label: 'Lightbulb' },
  
  // Animals & Creatures
  bird: { icon: Bird, label: 'Bird' },
  fish: { icon: Fish, label: 'Fish' },
  turtle: { icon: Turtle, label: 'Turtle' },
  rabbit: { icon: Rabbit, label: 'Rabbit' },
  bug: { icon: Bug, label: 'Bug' },
  cat: { icon: Cat, label: 'Cat' }
};

// Color configuration with background and icon colors
export const PLAYER_COLORS = {
  amber: {
    bg: 'bg-amber-100',
    icon: 'text-amber-600',
    ring: 'ring-amber-400',
    label: 'Amber'
  },
  orange: {
    bg: 'bg-orange-100',
    icon: 'text-orange-600',
    ring: 'ring-orange-400',
    label: 'Orange'
  },
  red: {
    bg: 'bg-red-100',
    icon: 'text-red-600',
    ring: 'ring-red-400',
    label: 'Red'
  },
  pink: {
    bg: 'bg-pink-100',
    icon: 'text-pink-600',
    ring: 'ring-pink-400',
    label: 'Pink'
  },
  rose: {
    bg: 'bg-rose-100',
    icon: 'text-rose-600',
    ring: 'ring-rose-400',
    label: 'Rose'
  },
  purple: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
    ring: 'ring-purple-400',
    label: 'Purple'
  },
  indigo: {
    bg: 'bg-indigo-100',
    icon: 'text-indigo-600',
    ring: 'ring-indigo-400',
    label: 'Indigo'
  },
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
    ring: 'ring-blue-400',
    label: 'Blue'
  },
  sky: {
    bg: 'bg-sky-100',
    icon: 'text-sky-600',
    ring: 'ring-sky-400',
    label: 'Sky'
  },
  cyan: {
    bg: 'bg-cyan-100',
    icon: 'text-cyan-600',
    ring: 'ring-cyan-400',
    label: 'Cyan'
  },
  teal: {
    bg: 'bg-teal-100',
    icon: 'text-teal-600',
    ring: 'ring-teal-400',
    label: 'Teal'
  },
  emerald: {
    bg: 'bg-emerald-100',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-400',
    label: 'Emerald'
  },
  green: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
    ring: 'ring-green-400',
    label: 'Green'
  },
  lime: {
    bg: 'bg-lime-100',
    icon: 'text-lime-600',
    ring: 'ring-lime-400',
    label: 'Lime'
  },
  yellow: {
    bg: 'bg-yellow-100',
    icon: 'text-yellow-600',
    ring: 'ring-yellow-400',
    label: 'Yellow'
  }
};

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
  size = 'md', 
  variant = 'default',
  className = '' 
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
    xs: { container: 'w-6 h-6', icon: 14 },
    sm: { container: 'w-8 h-8', icon: 18 },
    md: { container: 'w-12 h-12', icon: 24 },
    lg: { container: 'w-16 h-16', icon: 32 },
    xl: { container: 'w-20 h-20', icon: 40 }
  };
  
  const { container, icon: iconSize } = sizeConfig[size] || sizeConfig.md;
  
  // Variant styles
  const variantStyles = {
    default: '',
    active: `ring-4 ${colorConfig.ring} ring-offset-2 ring-offset-cream shadow-lg`,
    winner: `ring-4 ring-amber-400 ring-offset-2 ring-offset-cream shadow-xl animate-pulse`,
    eliminated: 'opacity-40 grayscale'
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
  size = 'lg',
  disabled = false 
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
          ${!disabled && 'cursor-pointer hover:scale-110 hover:shadow-lg'}
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
  size = 'md',
  variant = 'default',
  labelPosition = 'bottom',
  className = ''
}) => {
  const isHorizontal = labelPosition === 'right';
  
  return (
    <div className={`
      flex ${isHorizontal ? 'flex-row items-center gap-3' : 'flex-col items-center gap-2'}
      ${className}
    `}>
      <PlayerIcon 
        iconName={iconName} 
        colorName={colorName} 
        size={size}
        variant={variant}
      />
      <span className={`
        text-brown font-medium
        ${size === 'xs' ? 'text-xs' : ''}
        ${size === 'sm' ? 'text-sm' : ''}
        ${size === 'md' ? 'text-base' : ''}
        ${size === 'lg' ? 'text-lg' : ''}
        ${variant === 'eliminated' ? 'opacity-40' : ''}
      `}>
        {name}
      </span>
    </div>
  );
};

export default PlayerIcon;
