import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import CreateGame from "./pages/CreateGame";
import JoinGame from "./pages/JoinGame";
import WaitingRoom from "./pages/WaitingRoom";
import Game from "./pages/Game";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/about" element={<About />} />
				<Route path="/create" element={<CreateGame />} />
				<Route path="/join" element={<JoinGame />} />
				<Route path="/waiting/:gameId" element={<WaitingRoom />} />
				<Route path="/game/:gameId" element={<Game />} />
			</Routes>
		</Router>
	);
}

export default App;
