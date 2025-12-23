// WebSocket Service for Insta-Lose
// Manages WebSocket connection for real-time game state updates

// Get WebSocket URL from environment or config
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "";

/**
 * WebSocket connection manager for real-time game updates
 */
class GameWebSocket {
	constructor() {
		this.socket = null;
		this.gameId = null;
		this.playerId = null;
		this.isHost = false;
		this.messageHandlers = new Set();
		this.errorHandlers = new Set();
		this.closeHandlers = new Set();
		this.openHandlers = new Set();
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 3;
		this.reconnectDelay = 2000;
	}

	/**
	 * Check if WebSocket is available/configured
	 * @returns {boolean}
	 */
	isAvailable() {
		return Boolean(WS_BASE_URL);
	}

	/**
	 * Check if currently connected
	 * @returns {boolean}
	 */
	isConnected() {
		return this.socket?.readyState === WebSocket.OPEN;
	}

	/**
	 * Connect to WebSocket for a specific game
	 * @param {string} gameId - The game code
	 * @param {string|null} playerId - Player ID (null for host/spectator)
	 * @param {boolean} isHost - Whether this is a host connection
	 * @returns {Promise<void>}
	 */
	connect(gameId, playerId = null, isHost = false) {
		return new Promise((resolve, reject) => {
			if (!this.isAvailable()) {
				console.warn("WebSocket not configured, falling back to polling");
				reject(new Error("WebSocket not available"));
				return;
			}

			// Close existing connection if any
			if (this.socket) {
				this.disconnect();
			}

			this.gameId = gameId;
			this.playerId = playerId;
			this.isHost = isHost;

			// Build connection URL with query parameters
			const url = new URL(WS_BASE_URL);
			url.searchParams.set("gameId", gameId);
			if (playerId) {
				url.searchParams.set("playerId", playerId);
			}
			url.searchParams.set("isHost", isHost.toString());

			console.log(`Connecting to WebSocket: ${url.toString()}`);

			try {
				this.socket = new WebSocket(url.toString());

				this.socket.onopen = () => {
					console.log("WebSocket connected");
					this.reconnectAttempts = 0;
					this.openHandlers.forEach((handler) => handler());
					resolve();
				};

				this.socket.onmessage = (event) => {
					try {
						const message = JSON.parse(event.data);
						console.log("WebSocket message received:", message.type);
						this.messageHandlers.forEach((handler) => handler(message));
					} catch (err) {
						console.error("Failed to parse WebSocket message:", err);
					}
				};

				this.socket.onerror = (error) => {
					console.error("WebSocket error:", error);
					this.errorHandlers.forEach((handler) => handler(error));
				};

				this.socket.onclose = (event) => {
					console.log("WebSocket closed:", event.code, event.reason);
					this.closeHandlers.forEach((handler) => handler(event));

					// Attempt reconnection if not intentionally closed
					if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
						this.attemptReconnect();
					}
				};

				// Timeout for connection
				setTimeout(() => {
					if (this.socket?.readyState === WebSocket.CONNECTING) {
						this.socket.close();
						reject(new Error("WebSocket connection timeout"));
					}
				}, 10000);
			} catch (err) {
				reject(err);
			}
		});
	}

	/**
	 * Attempt to reconnect after a delay
	 */
	attemptReconnect() {
		this.reconnectAttempts++;
		console.log(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

		setTimeout(() => {
			if (this.gameId) {
				this.connect(this.gameId, this.playerId, this.isHost).catch((err) => {
					console.error("Reconnection failed:", err);
				});
			}
		}, this.reconnectDelay * this.reconnectAttempts);
	}

	/**
	 * Disconnect from WebSocket
	 */
	disconnect() {
		if (this.socket) {
			console.log("Disconnecting WebSocket");
			this.socket.close(1000, "Client disconnect");
			this.socket = null;
		}
		this.gameId = null;
		this.playerId = null;
		this.isHost = false;
		this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
	}

	/**
	 * Register a message handler
	 * @param {Function} handler - Function to call with parsed message
	 * @returns {Function} - Cleanup function to remove handler
	 */
	onMessage(handler) {
		this.messageHandlers.add(handler);
		return () => this.messageHandlers.delete(handler);
	}

	/**
	 * Register an error handler
	 * @param {Function} handler - Function to call on error
	 * @returns {Function} - Cleanup function to remove handler
	 */
	onError(handler) {
		this.errorHandlers.add(handler);
		return () => this.errorHandlers.delete(handler);
	}

	/**
	 * Register a close handler
	 * @param {Function} handler - Function to call on close
	 * @returns {Function} - Cleanup function to remove handler
	 */
	onClose(handler) {
		this.closeHandlers.add(handler);
		return () => this.closeHandlers.delete(handler);
	}

	/**
	 * Register an open handler
	 * @param {Function} handler - Function to call on open
	 * @returns {Function} - Cleanup function to remove handler
	 */
	onOpen(handler) {
		this.openHandlers.add(handler);
		return () => this.openHandlers.delete(handler);
	}
}

// Export singleton instance
export const gameWebSocket = new GameWebSocket();

// Export class for testing
export { GameWebSocket };

