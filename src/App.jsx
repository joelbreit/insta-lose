import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import N64Layout from "./components/N64Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Credits from "./pages/Credits";
import CreateGame from "./pages/CreateGame";
import JoinGame from "./pages/JoinGame";
import WaitingRoom from "./pages/WaitingRoom";
import Game from "./pages/Game";
import GameRecap from "./pages/GameRecap";

function App() {
	return (
		<Router>
			<N64Layout>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/about" element={<About />} />
					<Route path="/credits" element={<Credits />} />
					<Route path="/create" element={<CreateGame />} />
					<Route path="/join" element={<JoinGame />} />
					<Route path="/waiting/:gameId" element={<WaitingRoom />} />
					<Route path="/game/:gameId" element={<Game />} />
					<Route path="/recap/:gameId" element={<GameRecap />} />
				</Routes>
			</N64Layout>
		</Router>
	);
}

export default App;
