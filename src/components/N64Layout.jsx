import { useEffect, useState } from 'react';
import '../App.css';

function N64Layout({ children }) {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate random pixelated stars
    const newStars = [];
    for (let i = 0; i < 50; i++) {
      newStars.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
      });
    }
    setStars(newStars);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Grid background */}
      <div className="grid-bg" />

      {/* Pixelated stars */}
      <div className="stars">
        {stars.map((star, i) => (
          <div
            key={i}
            className="star"
            style={{ left: star.left, top: star.top }}
          />
        ))}
      </div>

      {/* Scanlines */}
      <div className="scanlines" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default N64Layout;
