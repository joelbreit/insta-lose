// Auto-generated API configuration
// Generated on: Fri Dec 19 16:01:34 EST 2025

export const API_BASE_URL = "https://z8uudhciil.execute-api.us-east-1.amazonaws.com/prod";

export const API_ENDPOINTS = {
    createGame: `${API_BASE_URL}/games`,
    joinGame: (gameId) => `${API_BASE_URL}/games/${gameId}/join`,
    getGameState: (gameId) => `${API_BASE_URL}/games/${gameId}`,
    startGame: (gameId) => `${API_BASE_URL}/games/${gameId}/start`,
    takeAction: (gameId) => `${API_BASE_URL}/games/${gameId}/action`,
};
