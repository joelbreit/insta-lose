# N64 Aesthetic Guide

## Color Palette
- **Backgrounds:** Deep navy/purple/black (`from-blue-900 via-purple-900 to-black`)
- **Text:** Bright yellows (`#FFFF00`), cyans (`#00FFFF`), greens (`#00FF00`)
- **High contrast** - no pastels or muted tones

## Typography
```css
font-family: 'Impact', fantasy;  /* Chunky, bold */
letter-spacing: 0.1-0.2em;       /* Wide spacing */
text-shadow: 3px 3px 0px #000;   /* Hard shadows */
text-transform: uppercase;        /* ALL CAPS */
```

## 3D Beveled Boxes
Layer multiple divs with gradients:
```jsx
{/* Outer light bevel */}
<div className="absolute -inset-2 bg-gradient-to-br from-gray-400 to-gray-600" />
{/* Inner dark bevel */}
<div className="absolute -inset-1 bg-gradient-to-br from-gray-700 to-gray-900" />
{/* Content */}
<div className="relative bg-gradient-to-b from-gray-800 to-black border-4 border-gray-600">
  Content here
</div>
```

## Buttons (3D Press Effect)
```jsx
<button className="relative group">
  {/* Shadow layer */}
  <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-red-800 transform translate-y-2" />
  {/* Button face - moves down on hover */}
  <div className="relative bg-gradient-to-b from-red-500 to-red-700 border-4 border-red-900 
                  transform group-hover:translate-y-2 transition-transform">
    Button Text
  </div>
</button>
```

## CRT Effects
```jsx
{/* Scanlines */}
<div className="absolute inset-0 opacity-10 pointer-events-none">
  <div style={{
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, 
                      rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
  }} />
</div>

{/* Grid background */}
<div className="absolute inset-0 opacity-5">
  <div style={{
    backgroundImage: 'linear-gradient(#00FFFF 1px, transparent 1px), 
                      linear-gradient(90deg, #00FFFF 1px, transparent 1px)',
    backgroundSize: '50px 50px'
  }} />
</div>
```

## Key Principles
- **Thick borders** (2-4px everywhere)
- **Hard shadows** (no blur, just offset)
- **Pixelated stars** for backgrounds
- **Chunky, geometric shapes** (squares/rectangles, minimal rounded corners)
- **Bright accent colors** on dark backgrounds