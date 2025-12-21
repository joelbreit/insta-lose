import '../App.css';

function N64Button({ children, onClick, color = "red", className = "", asLink = false, to, ...props }) {
  const colorClasses = {
    red: {
      shadow: "bg-gradient-to-b from-red-600 to-red-800",
      face: "bg-gradient-to-b from-red-500 to-red-700 border-red-900",
      text: "text-yellow-300"
    },
    green: {
      shadow: "bg-gradient-to-b from-green-600 to-green-800",
      face: "bg-gradient-to-b from-green-500 to-green-700 border-green-900",
      text: "text-yellow-300"
    },
    blue: {
      shadow: "bg-gradient-to-b from-blue-600 to-blue-800",
      face: "bg-gradient-to-b from-blue-500 to-blue-700 border-blue-900",
      text: "text-cyan-300"
    },
    yellow: {
      shadow: "bg-gradient-to-b from-yellow-600 to-yellow-800",
      face: "bg-gradient-to-b from-yellow-500 to-yellow-700 border-yellow-900",
      text: "text-black"
    },
    purple: {
      shadow: "bg-gradient-to-b from-purple-600 to-purple-800",
      face: "bg-gradient-to-b from-purple-500 to-purple-700 border-purple-900",
      text: "text-cyan-300"
    }
  };

  const colors = colorClasses[color] || colorClasses.red;

  const content = (
    <>
      <div className={`n64-button-shadow ${colors.shadow}`} />
      <div className={`n64-button-face ${colors.face} px-8 py-4 ${colors.text}`}>
        {children}
      </div>
    </>
  );

  if (asLink) {
    return (
      <a href={to} className={`n64-button ${className}`} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`n64-button ${className}`} {...props}>
      {content}
    </button>
  );
}

export default N64Button;
