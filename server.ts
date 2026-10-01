import express from "express";
import http from "http";
import cors from "cors";
import { Server, Socket } from "socket.io";

const app = express();

app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = 8;

const NEXT_ROUND_DELAY = 3000;

// ---- Round time (host can change it in the lobby) ----
const DEFAULT_ROUND_TIME = 60;
const MIN_ROUND_TIME = 15;
const MAX_ROUND_TIME = 180;

// ---- Word choice (host can change how many words the drawer sees) ----
const DEFAULT_WORD_CHOICES = 3;
const MIN_WORD_CHOICES = 2;
const MAX_WORD_CHOICES = 5;
const CHOICE_SECONDS = 10;

// How long a disconnected player can come back before being removed.
const RECONNECT_GRACE_MS = 30000;

// If the drawer drops, they get this long to come back before the turn is skipped.
const DRAWER_GRACE_MS = 8000;

// ---- Progressive letter hints ----
// Reveal one letter when this fraction of the round time is left.
const HINT_THRESHOLDS = [0.5, 0.25];
// Never reveal a letter if fewer than this many letters are still hidden.
const MIN_HIDDEN_LETTERS = 3;

// ---- Scoring ----
const GUESSER_BASE_POINTS = 50;
const GUESSER_MAX_TIME_BONUS = 100;
const DRAWER_POINTS_PER_GUESS = 40;

// ---- Tomatoes (called "eggs" in the code) ----
// Tomatoes per player for the whole game = EGGS_PER_ROUND * number of rounds.
const EGGS_PER_ROUND = 2;

// ---- Anti-spam / limits ----
const MIN_GUESS_INTERVAL_MS = 500;
const MAX_POINTS_PER_STROKE = 3000;
const MAX_STROKES_PER_ROUND = 3000;

const WORDS = [
    "Cat", "Dog", "House", "Car", "Tree", "Apple", "Sun", "Fish",
    "Airplane", "Pizza", "Bicycle", "Elephant", "Guitar", "Flower",
    "Rocket", "Banana", "Umbrella", "Moon", "Star", "Cloud",
    "Rainbow", "Butterfly", "Spider", "Snake", "Rabbit", "Horse",
    "Cow", "Pig", "Duck", "Bird", "Turtle", "Penguin", "Giraffe",
    "Lion", "Monkey", "Shark", "Whale", "Octopus", "Crab", "Bee",
    "Book", "Chair", "Table", "Bed", "Door", "Window", "Clock",
    "Key", "Lamp", "Phone", "Computer", "Camera", "Glasses", "Hat",
    "Shoe", "Shirt", "Cake", "Ice Cream", "Burger", "Cookie",
    "Carrot", "Strawberry", "Watermelon", "Grapes", "Bus", "Train",
    "Boat", "Helicopter", "Bridge", "Castle", "Mountain", "Volcano",
    "Island", "Snowman", "Robot", "Crown", "Sword", "Balloon",
    "Ladder", "Scissors", "Toothbrush", "Candle", "Ghost", "Dragon",

    // ---- 2-word phrases ----
    "Hot Dog", "Police Car", "Fire Truck", "Traffic Light", "Sun Glasses",
    "Bubble Gum", "Teddy Bear", "Birthday Cake", "Christmas Tree",
    "Swimming Pool", "Tennis Racket", "Space Ship", "Light Bulb",
    "Rain Coat", "Music Note", "Video Game", "Pop Corn", "Ping Pong",
    "Fire Fighter", "Snow Flake", "Sand Castle", "Water Fall",
    "Magic Wand", "Flying Saucer", "Alarm Clock", "Paper Plane",
    "Chess Board", "Piggy Bank", "Sea Horse", "Gold Fish",
    "Football Goal", "Ice Skates", "Guitar Player", "Pirate Ship",
    "Wedding Ring", "Cactus Plant", "Palm Tree", "Full Moon",

    // ---- 3-word phrases ----
    "Hot Air Balloon", "Ice Cream Cone", "Cup Of Tea", "Bowl Of Soup",
    "Pirate Treasure Chest", "Cat In Hat", "Fish In Bowl", "Bird In Nest",
    "Bee On Flower", "Boy On Bicycle", "Sun Over Mountain", "Ship In Storm",
    "Dog Eating Bone", "Monkey Eating Banana", "Girl Reading Book",
    "Snowman In Winter", "Cow In Field", "Man Playing Guitar",
    "Astronaut On Moon"
];

// ---- Game settings ----
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 5;
const MAX_CUSTOM_WORDS = 50;
const MAX_CUSTOM_WORD_LENGTH = 30;

// ---- Lobby chat ----
const MAX_LOBBY_MESSAGES = 50;
const MAX_LOBBY_MESSAGE_LENGTH = 200;
const MIN_LOBBY_CHAT_INTERVAL_MS = 400;

type Phase = "lobby" | "choosing" | "drawing" | "between";

type Vote = "like" | "dislike";

interface Player {
    id: string; // persistent id sent by the client
    name: string;
    isHost: boolean;
    connected: boolean;
    socketId: string | null;
    graceTimer: ReturnType<typeof setTimeout> | null;
}

interface StrokePoint {
    x: number;
    y: number;
}

interface Stroke {
    points: StrokePoint[];
    color: string;
    width: number;
}

interface EggPosition {
    x: number;
    y: number;
}

interface LobbyMessage {
    playerId: string;
    playerName: string;
    message: string;
}

interface GameRoom {
    code: string;
    players: Player[];
    hostId: string;

    phase: Phase;

    currentDrawerId: string | null;
    currentWord: string | null;
    wordChoices: string[];

    // One entry per turn. Every player draws once per round.
    drawerOrder: string[];
    currentTurn: number;
    totalTurns: number;
    rounds: number;
    perRound: number;

    // Host settings for this game
    roundDuration: number;
    wordChoiceCount: number;

    wordPool: string[];
    lobbyChat: LobbyMessage[];

    correctGuessers: string[];
    usedWords: string[];
    wrongGuesses: Set<string>;

    // Progressive hints: character positions already revealed,
    // and how many hint thresholds have been passed this round.
    revealedIdx: number[];
    hintsGiven: number;

    // Host tools: the drawer may skip their word once per turn,
    // and kicked players can't rejoin this room.
    skipUsed: boolean;
    kicked: Set<string>;

    // Like / dislike and tomatoes ("eggs" in the code).
    // eggsLeft: tomatoes each player still has for the whole game.
    // votes: each guesser's ONE like / dislike for the current drawing.
    // eggThrown: players who already threw their tomato this turn.
    // eggs: where the tomatoes landed on the current drawing.
    // Tomatoes and votes are independent of each other.
    eggsLeft: Record<string, number>;
    votes: Map<string, Vote>;
    eggThrown: Set<string>;
    eggs: EggPosition[];

    strokes: Stroke[];

    scores: Record<string, number>;
    roundPoints: Record<string, number>;

    timeLeft: number;

    roundTimer: ReturnType<typeof setInterval> | null;
    nextRoundTimer: ReturnType<typeof setTimeout> | null;
    choiceTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, GameRoom>();

// playerId -> roomCode
const playerRooms = new Map<string, string>();

// ========================================
// HELPERS
// ========================================

function generateRoomCode(): string {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    do {
        code = "";

        for (let i = 0; i < 6; i++) {
            code += characters[
                Math.floor(Math.random() * characters.length)
            ];
        }
    } while (rooms.has(code));

    return code;
}

function shuffle<T>(items: T[]): T[] {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function publicPlayers(room: GameRoom) {
    return room.players.map(player => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        connected: player.connected
    }));
}

function emitTo(player: Player, event: string, payload?: unknown) {
    if (player.socketId) {
        io.to(player.socketId).emit(event, payload);
    }
}

function sendRoomUpdate(room: GameRoom) {
    io.to(room.code).emit("room_updated", {
        roomCode: room.code,
        players: publicPlayers(room),
        playerCount: room.players.length,
        maxPlayers: MAX_PLAYERS,
        hostId: room.hostId
    });
}

function sendScores(room: GameRoom) {
    io.to(room.code).emit("score_update", {
        scores: room.scores
    });
}

// Counts the likes and dislikes for the current drawing.
function reactionCounts(room: GameRoom) {
    let likes = 0;
    let dislikes = 0;

    room.votes.forEach(vote => {
        if (vote === "like") {
            likes++;
        } else {
            dislikes++;
        }
    });

    return { likes, dislikes };
}

function sendReactions(room: GameRoom) {
    io.to(room.code).emit("reaction_update", reactionCounts(room));
}

function stopRoundTimer(room: GameRoom) {
    if (room.roundTimer !== null) {
        clearInterval(room.roundTimer);
        room.roundTimer = null;
    }
}

function stopNextRoundTimer(room: GameRoom) {
    if (room.nextRoundTimer !== null) {
        clearTimeout(room.nextRoundTimer);
        room.nextRoundTimer = null;
    }
}

function stopChoiceTimer(room: GameRoom) {
    if (room.choiceTimer !== null) {
        clearTimeout(room.choiceTimer);
        room.choiceTimer = null;
    }
}

function clearRoomTimers(room: GameRoom) {
    stopRoundTimer(room);
    stopNextRoundTimer(room);
    stopChoiceTimer(room);
}

function normalizeGuess(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// "Ice Cream" -> "___ _____" (one underscore per letter).
// Positions in [revealed] are shown as the real letter.
function buildHint(word: string, revealed: number[] = []): string {
    const shown = new Set(revealed);

    return Array.from(word.trim().replace(/\s+/g, " "))
        .map((ch, i) => (ch === " " ? " " : shown.has(i) ? ch : "_"))
        .join("");
}

// Reveals one more letter when the time left drops below the next threshold.
function maybeRevealHint(room: GameRoom) {
    if (room.phase !== "drawing" || !room.currentWord) {
        return;
    }

    if (room.hintsGiven >= HINT_THRESHOLDS.length) {
        return;
    }

    const limit = Math.floor(
        room.roundDuration * HINT_THRESHOLDS[room.hintsGiven]
    );

    if (room.timeLeft > limit) {
        return;
    }

    room.hintsGiven++;

    const chars = Array.from(
        room.currentWord.trim().replace(/\s+/g, " ")
    );

    const hidden: number[] = [];

    chars.forEach((ch, i) => {
        if (ch !== " " && !room.revealedIdx.includes(i)) {
            hidden.push(i);
        }
    });

    // Don't make the word too easy.
    if (hidden.length < MIN_HIDDEN_LETTERS) {
        return;
    }

    room.revealedIdx.push(
        hidden[Math.floor(Math.random() * hidden.length)]
    );

    io.to(room.code).emit("hint_update", {
        hint: buildHint(room.currentWord, room.revealedIdx)
    });
}

// Number of single-letter edits between two strings.
function editDistance(a: string, b: string): number {
    const dp: number[] = Array.from(
        { length: b.length + 1 },
        (_, j) => j
    );

    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0];
        dp[0] = i;

        for (let j = 1; j <= b.length; j++) {
            const tmp = dp[j];

            dp[j] = Math.min(
                dp[j] + 1,
                dp[j - 1] + 1,
                prev + (a[i - 1] === b[j - 1] ? 0 : 1)
            );

            prev = tmp;
        }
    }

    return dp[b.length];
}

// The round number shown to players (1..rounds).
function displayRound(room: GameRoom): number {
    return Math.min(
        room.rounds,
        Math.max(1, Math.ceil(room.currentTurn / Math.max(1, room.perRound)))
    );
}

// Reads a whole number from the host's settings, or uses the default.
function readIntSetting(
    raw: unknown,
    min: number,
    max: number,
    fallback: number
): number {
    const value = Number(raw);

    return Number.isInteger(value) && value >= min && value <= max
        ? value
        : fallback;
}

// Cleans the host's custom word list.
function parseCustomWords(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of raw) {
        if (typeof item !== "string") {
            continue;
        }

        const word = item.trim().replace(/\s+/g, " ");

        if (
            word.length < 1 ||
            word.length > MAX_CUSTOM_WORD_LENGTH ||
            !/^[\p{L}\p{N}' -]+$/u.test(word)
        ) {
            continue;
        }

        const key = word.toLowerCase();

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(word);

        if (result.length >= MAX_CUSTOM_WORDS) {
            break;
        }
    }

    return result;
}

function pickWordChoices(room: GameRoom): string[] {
    const count = room.wordChoiceCount;

    let available = room.wordPool.filter(
        word => !room.usedWords.includes(word)
    );

    if (available.length < count) {
        room.usedWords = [];
        available = [...room.wordPool];
    }

    return shuffle(available).slice(0, count);
}

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

// Validates and cleans a stroke sent by a client.
function sanitizeStroke(data: unknown): Stroke | null {
    if (!data || typeof data !== "object") {
        return null;
    }

    const raw = data as {
        points?: unknown;
        color?: unknown;
        width?: unknown;
    };

    if (
        !Array.isArray(raw.points) ||
        raw.points.length < 1 ||
        raw.points.length > MAX_POINTS_PER_STROKE
    ) {
        return null;
    }

    const points: StrokePoint[] = [];

    for (const item of raw.points) {
        if (!item || typeof item !== "object") {
            return null;
        }

        const { x, y } = item as { x?: unknown; y?: unknown };

        if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            !isFinite(x) ||
            !isFinite(y)
        ) {
            return null;
        }

        points.push({ x: clamp01(x), y: clamp01(y) });
    }

    const color =
        typeof raw.color === "string" &&
        /^#[0-9A-Fa-f]{6}$/.test(raw.color)
            ? raw.color
            : "#000000";

    const rawWidth =
        typeof raw.width === "number" && isFinite(raw.width)
            ? raw.width
            : 8;

    // A "fill" is a one-point stroke with width 0 (paint bucket).
    const isFill = rawWidth <= 0 && points.length === 1;

    const width = isFill
        ? 0
        : Math.min(64, Math.max(1, rawWidth));

    return { points, color, width };
}

// Guessers = every connected player except the drawer.
function allGuessersDone(room: GameRoom): boolean {
    if (room.phase !== "drawing" || !room.currentDrawerId) {
        return false;
    }

    const guessers = room.players.filter(
        player =>
            player.id !== room.currentDrawerId && player.connected
    );

    return (
        guessers.length > 0 &&
        guessers.every(player =>
            room.correctGuessers.includes(player.id)
        )
    );
}

function addPoints(
    room: GameRoom,
    playerId: string,
    points: number
) {
    room.scores[playerId] = (room.scores[playerId] || 0) + points;
    room.roundPoints[playerId] =
        (room.roundPoints[playerId] || 0) + points;
}

// State sent to a player who (re)connects to a room.
function buildSnapshot(room: GameRoom, player: Player) {
    const isDrawer = room.currentDrawerId === player.id;

    const drawer = room.players.find(
        p => p.id === room.currentDrawerId
    );

    return {
        roomCode: room.code,
        players: publicPlayers(room),
        scores: room.scores,

        currentRound: displayRound(room),
        totalRounds: room.rounds,

        lobbyChat: room.lobbyChat,

        hint:
            room.phase === "drawing" && room.currentWord
                ? buildHint(room.currentWord, room.revealedIdx)
                : "",

        iGuessedCorrectly: room.correctGuessers.includes(player.id),

        strokes: room.strokes,

        gameActive: room.phase !== "lobby",

        drawerId: room.currentDrawerId,
        drawerName: drawer ? drawer.name : "",

        word:
            isDrawer && room.phase === "drawing"
                ? room.currentWord
                : null,

        timeLeft: room.timeLeft,

        choosing: room.phase === "choosing",

        words:
            isDrawer && room.phase === "choosing"
                ? room.wordChoices
                : [],

        betweenRounds: room.phase === "between",

        // Like / dislike / tomatoes
        ...reactionCounts(room),
        myVote: room.votes.get(player.id) ?? "",
        eggsLeft: room.eggsLeft[player.id] ?? 0,
        eggThrown: room.eggThrown.has(player.id),
        eggs: room.eggs,

        canSkip: isDrawer && !room.skipUsed
    };
}

// ========================================
// GAME FLOW
// ========================================

function finishGame(room: GameRoom) {
    clearRoomTimers(room);

    room.phase = "lobby";
    room.currentDrawerId = null;
    room.currentWord = null;
    room.wordChoices = [];
    room.correctGuessers = [];
    room.wrongGuesses.clear();
    room.revealedIdx = [];
    room.hintsGiven = 0;
    room.strokes = [];
    room.votes.clear();
    room.eggThrown.clear();
    room.eggs = [];
    room.timeLeft = 0;

    io.to(room.code).emit("game_finished", {
        scores: room.scores
    });

    console.log(`Game finished in room ${room.code}`);
}

// Moves to the next player in the drawing order.
function advanceRound(room: GameRoom) {
    while (true) {
        if (room.players.length < 2) {
            finishGame(room);
            return;
        }

        room.currentTurn++;

        if (room.currentTurn > room.drawerOrder.length) {
            finishGame(room);
            return;
        }

        const drawerId = room.drawerOrder[room.currentTurn - 1];

        const drawer = room.players.find(
            player => player.id === drawerId && player.connected
        );

        if (drawer) {
            room.skipUsed = false;
            startRound(room, drawer);
            return;
        }

        // That player left or is offline: skip their turn.
    }
}

function startRound(room: GameRoom, drawer: Player) {
    clearRoomTimers(room);

    room.phase = "choosing";
    room.currentDrawerId = drawer.id;
    room.currentWord = null;
    room.wordChoices = pickWordChoices(room);

    room.correctGuessers = [];
    room.wrongGuesses.clear();
    room.revealedIdx = [];
    room.hintsGiven = 0;
    room.strokes = [];
    room.roundPoints = {};

    // New drawing: votes and thrown tomatoes start fresh.
    // (eggsLeft is NOT reset: tomatoes last the whole game.)
    room.votes.clear();
    room.eggThrown.clear();
    room.eggs = [];

    room.timeLeft = 0;

    io.to(room.code).emit("round_started", {
        drawerId: drawer.id,
        drawerName: drawer.name,
        currentRound: displayRound(room),
        totalRounds: room.rounds
    });

    room.players.forEach(player => {
        emitTo(player, "word_choice_started", {
            drawerId: drawer.id,
            drawerName: drawer.name,
            words: player.id === drawer.id ? room.wordChoices : [],
            choiceSeconds: CHOICE_SECONDS,
            canSkip: player.id === drawer.id && !room.skipUsed,
            eggsLeft: room.eggsLeft[player.id] ?? 0
        });
    });

    sendScores(room);

    // Auto-pick if the drawer takes too long.
    room.choiceTimer = setTimeout(() => {
        room.choiceTimer = null;

        if (room.phase !== "choosing") {
            return;
        }

        const pick =
            room.wordChoices[
                Math.floor(Math.random() * room.wordChoices.length)
            ];

        beginDrawing(room, pick);
    }, CHOICE_SECONDS * 1000);

    console.log(
        `Round ${displayRound(room)}/${room.rounds} (turn ${room.currentTurn}/${room.totalTurns}) in room ${room.code}: ${drawer.name} is choosing a word`
    );
}

function beginDrawing(room: GameRoom, word: string) {
    stopChoiceTimer(room);

    room.currentWord = word;
    room.usedWords.push(word);
    room.wordChoices = [];
    room.phase = "drawing";
    room.revealedIdx = [];
    room.hintsGiven = 0;
    room.timeLeft = room.roundDuration;

    const drawer = room.players.find(
        player => player.id === room.currentDrawerId
    );

    if (!drawer) {
        endRound(room);
        return;
    }

    room.players.forEach(player => {
        emitTo(player, "game_started", {
            drawerId: drawer.id,
            drawerName: drawer.name,
            word: player.id === drawer.id ? word : null,
            hint: buildHint(word),
            timeLeft: room.roundDuration
        });
    });

    startRoundTimer(room);

    console.log(
        `Room ${room.code}: ${drawer.name} is drawing "${word}" (${room.roundDuration}s)`
    );
}

function startRoundTimer(room: GameRoom) {
    stopRoundTimer(room);

    room.timeLeft = room.roundDuration;

    io.to(room.code).emit("timer_update", {
        timeLeft: room.timeLeft
    });

    room.roundTimer = setInterval(() => {
        room.timeLeft = Math.max(0, room.timeLeft - 1);

        io.to(room.code).emit("timer_update", {
            timeLeft: room.timeLeft
        });

        if (room.timeLeft <= 0) {
            endRound(room);
            return;
        }

        maybeRevealHint(room);
    }, 1000);
}

function scheduleNextRound(room: GameRoom) {
    stopNextRoundTimer(room);

    room.nextRoundTimer = setTimeout(() => {
        room.nextRoundTimer = null;

        if (rooms.get(room.code) !== room) {
            return;
        }

        if (room.phase !== "between") {
            return;
        }

        advanceRound(room);
    }, NEXT_ROUND_DELAY);
}

function endRound(room: GameRoom) {
    // Guard: never end the same round twice.
    if (room.phase !== "drawing" && room.phase !== "choosing") {
        return;
    }

    clearRoomTimers(room);

    const word = room.currentWord;

    room.phase = "between";
    room.wordChoices = [];
    room.timeLeft = 0;

    io.to(room.code).emit("round_ended", {
        word: word,
        scores: room.scores,
        roundPoints: room.roundPoints
    });

    console.log(`Round ended in room ${room.code}. Word: ${word}`);

    scheduleNextRound(room);
}

// ========================================
// PLAYERS
// ========================================

function removePlayer(room: GameRoom, playerId: string) {
    const player = room.players.find(p => p.id === playerId);

    if (!player) {
        return;
    }

    if (player.graceTimer) {
        clearTimeout(player.graceTimer);
        player.graceTimer = null;
    }

    const wasDrawer = room.currentDrawerId === playerId;

    room.players = room.players.filter(p => p.id !== playerId);
    room.correctGuessers = room.correctGuessers.filter(
        id => id !== playerId
    );

    delete room.scores[playerId];
    room.votes.delete(playerId);
    room.eggThrown.delete(playerId);
    delete room.eggsLeft[playerId];
    playerRooms.delete(playerId);

    if (room.players.length === 0) {
        clearRoomTimers(room);
        rooms.delete(room.code);

        console.log(`Room ${room.code} deleted`);

        return;
    }

    if (room.hostId === playerId) {
        const next =
            room.players.find(p => p.connected) || room.players[0];

        room.hostId = next.id;

        room.players.forEach(p => {
            p.isHost = p.id === room.hostId;
        });
    }

    sendRoomUpdate(room);
    sendScores(room);
    sendReactions(room);

    if (room.phase === "lobby") {
        return;
    }

    if (room.players.length < 2) {
        finishGame(room);
        return;
    }

    if (
        wasDrawer &&
        (room.phase === "drawing" || room.phase === "choosing")
    ) {
        endRound(room);
        return;
    }

    if (room.phase === "drawing" && allGuessersDone(room)) {
        endRound(room);
    }
}

interface RoomContext {
    room: GameRoom;
    player: Player;
}

function getContext(socket: Socket): RoomContext | null {
    const playerId: string | undefined = socket.data.playerId;

    if (!playerId) {
        return null;
    }

    const code = playerRooms.get(playerId);

    if (!code) {
        return null;
    }

    const room = rooms.get(code);

    if (!room) {
        playerRooms.delete(playerId);
        return null;
    }

    const player = room.players.find(p => p.id === playerId);

    if (!player) {
        return null;
    }

    return { room, player };
}

function leaveCurrentRoom(socket: Socket) {
    const ctx = getContext(socket);

    if (!ctx) {
        return;
    }

    socket.leave(ctx.room.code);

    removePlayer(ctx.room, ctx.player.id);
}

app.get("/", (_req, res) => {
    res.send("Guess The Drawing server is running!");
});

// ========================================
// SOCKET EVENTS
// ========================================

io.on("connection", socket => {

    const rawId = socket.handshake.query.playerId;

    const playerId =
        typeof rawId === "string" &&
        /^[A-Za-z0-9-]{8,64}$/.test(rawId)
            ? rawId
            : null;

    if (!playerId) {
        socket.disconnect(true);
        return;
    }

    socket.data.playerId = playerId;

    console.log(`Player connected: ${playerId} (${socket.id})`);

    // ---- Reconnect: put the player back in their room ----
    const existingCode = playerRooms.get(playerId);
    const existingRoom = existingCode
        ? rooms.get(existingCode)
        : undefined;
    const existingPlayer = existingRoom
        ? existingRoom.players.find(p => p.id === playerId)
        : undefined;

    if (existingRoom && existingPlayer) {
        if (existingPlayer.graceTimer) {
            clearTimeout(existingPlayer.graceTimer);
            existingPlayer.graceTimer = null;
        }

        const oldSocketId = existingPlayer.socketId;

        existingPlayer.connected = true;
        existingPlayer.socketId = socket.id;

        // Drop a stale connection from the same player.
        if (oldSocketId && oldSocketId !== socket.id) {
            io.sockets.sockets.get(oldSocketId)?.disconnect(true);
        }

        socket.join(existingRoom.code);

        sendRoomUpdate(existingRoom);

        socket.emit(
            "resync",
            buildSnapshot(existingRoom, existingPlayer)
        );

        console.log(`${existingPlayer.name} reconnected`);
    } else {
        playerRooms.delete(playerId);
        socket.emit("resync_none");
    }

    // ========================================
    // CREATE ROOM
    // ========================================

    socket.on(
        "create_room",
        (
            data: { playerName?: string },
            callback?: (response: object) => void
        ) => {

            if (typeof callback !== "function") {
                return;
            }

            const playerName = data?.playerName?.trim();

            if (!playerName || playerName.length > 20) {
                callback({
                    success: false,
                    message: "Enter a name between 1 and 20 characters."
                });

                return;
            }

            leaveCurrentRoom(socket);

            const roomCode = generateRoomCode();

            const player: Player = {
                id: playerId,
                name: playerName,
                isHost: true,
                connected: true,
                socketId: socket.id,
                graceTimer: null
            };

            const room: GameRoom = {
                code: roomCode,
                players: [player],
                hostId: playerId,

                phase: "lobby",

                currentDrawerId: null,
                currentWord: null,
                wordChoices: [],

                drawerOrder: [],
                currentTurn: 0,
                totalTurns: 0,
                rounds: 1,
                perRound: 0,

                roundDuration: DEFAULT_ROUND_TIME,
                wordChoiceCount: DEFAULT_WORD_CHOICES,

                wordPool: [...WORDS],
                // A brand-new room always starts with an empty chat.
                lobbyChat: [],

                correctGuessers: [],
                usedWords: [],
                wrongGuesses: new Set<string>(),

                revealedIdx: [],
                hintsGiven: 0,

                skipUsed: false,
                kicked: new Set<string>(),

                eggsLeft: {},
                votes: new Map<string, Vote>(),
                eggThrown: new Set<string>(),
                eggs: [],

                strokes: [],

                scores: { [playerId]: 0 },
                roundPoints: {},

                timeLeft: 0,

                roundTimer: null,
                nextRoundTimer: null,
                choiceTimer: null
            };

            rooms.set(roomCode, room);
            playerRooms.set(playerId, roomCode);

            socket.join(roomCode);

            callback({
                success: true,
                roomCode: roomCode,
                players: publicPlayers(room),
                playerCount: room.players.length,
                maxPlayers: MAX_PLAYERS,
                hostId: room.hostId
            });

            sendRoomUpdate(room);
            sendScores(room);

            console.log(`${playerName} created room ${roomCode}`);
        }
    );

    // ========================================
    // JOIN ROOM
    // ========================================

    socket.on(
        "join_room",
        (
            data: { playerName?: string; roomCode?: string },
            callback?: (response: object) => void
        ) => {

            if (typeof callback !== "function") {
                return;
            }

            const playerName = data?.playerName?.trim();

            const roomCode = data?.roomCode?.trim().toUpperCase();

            if (!playerName || playerName.length > 20) {
                callback({
                    success: false,
                    message: "Enter a name between 1 and 20 characters."
                });

                return;
            }

            if (!roomCode || roomCode.length !== 6) {
                callback({
                    success: false,
                    message: "Enter a valid 6-character room code."
                });

                return;
            }

            const room = rooms.get(roomCode);

            if (!room) {
                callback({
                    success: false,
                    message: "Room not found."
                });

                return;
            }

            // Already in this room (stale state): just confirm.
            if (room.players.some(p => p.id === playerId)) {
                callback({
                    success: true,
                    roomCode: room.code,
                    players: publicPlayers(room),
                    playerCount: room.players.length,
                    maxPlayers: MAX_PLAYERS,
                    hostId: room.hostId
                });

                return;
            }

            if (room.kicked.has(playerId)) {
                callback({
                    success: false,
                    message: "You were removed from this room by the host."
                });

                return;
            }

            // Names must be unique inside a room (stats and colors rely on it).
            if (
                room.players.some(
                    p => p.name.toLowerCase() === playerName.toLowerCase()
                )
            ) {
                callback({
                    success: false,
                    message: "That name is already taken in this room."
                });

                return;
            }

            if (room.phase !== "lobby") {
                callback({
                    success: false,
                    message: "Game already in progress. Wait for it to finish."
                });

                return;
            }

            if (room.players.length >= MAX_PLAYERS) {
                callback({
                    success: false,
                    message: "This room is full."
                });

                return;
            }

            leaveCurrentRoom(socket);

            const player: Player = {
                id: playerId,
                name: playerName,
                isHost: false,
                connected: true,
                socketId: socket.id,
                graceTimer: null
            };

            room.players.push(player);
            room.scores[playerId] = 0;

            playerRooms.set(playerId, roomCode);

            socket.join(roomCode);

            callback({
                success: true,
                roomCode: roomCode,
                players: publicPlayers(room),
                playerCount: room.players.length,
                maxPlayers: MAX_PLAYERS,
                hostId: room.hostId
            });

            sendRoomUpdate(room);
            sendScores(room);

            console.log(`${playerName} joined room ${roomCode}`);
        }
    );

    // ========================================
    // START GAME
    // ========================================

    socket.on(
        "start_game",
        (
            data: {
                rounds?: unknown;
                roundTime?: unknown;
                choiceCount?: unknown;
                customWords?: unknown;
                customOnly?: unknown;
            } | undefined,
            callback?: (response: object) => void
        ) => {

            if (typeof callback !== "function") {
                return;
            }

            const ctx = getContext(socket);

            if (!ctx) {
                callback({
                    success: false,
                    message: "You are not in a room."
                });

                return;
            }

            const { room, player } = ctx;

            if (room.hostId !== player.id) {
                callback({
                    success: false,
                    message: "Only the host can start the game."
                });

                return;
            }

            if (room.phase !== "lobby") {
                callback({
                    success: false,
                    message: "Game already in progress."
                });

                return;
            }

            const ready = room.players.filter(p => p.connected);

            if (ready.length < 2) {
                callback({
                    success: false,
                    message: "Need at least 2 players."
                });

                return;
            }

            // ---- Host settings ----
            const rounds = readIntSetting(
                data?.rounds,
                MIN_ROUNDS,
                MAX_ROUNDS,
                1
            );

            const roundTime = readIntSetting(
                data?.roundTime,
                MIN_ROUND_TIME,
                MAX_ROUND_TIME,
                DEFAULT_ROUND_TIME
            );

            const choiceCount = readIntSetting(
                data?.choiceCount,
                MIN_WORD_CHOICES,
                MAX_WORD_CHOICES,
                DEFAULT_WORD_CHOICES
            );

            const custom = parseCustomWords(data?.customWords);

            const customOnly = data?.customOnly === true;

            if (customOnly && custom.length < choiceCount) {
                callback({
                    success: false,
                    message: `Add at least ${choiceCount} custom words (that's how many words the drawer picks from), or turn off "Use only my words".`
                });

                return;
            }

            if (customOnly) {
                room.wordPool = custom;
            } else {
                const known = new Set(WORDS.map(w => w.toLowerCase()));

                room.wordPool = [
                    ...WORDS,
                    ...custom.filter(w => !known.has(w.toLowerCase()))
                ];
            }

            room.roundDuration = roundTime;
            room.wordChoiceCount = choiceCount;

            clearRoomTimers(room);

            // Offline players can't play this game.
            room.players
                .filter(p => !p.connected)
                .forEach(p => removePlayer(room, p.id));

            room.scores = {};
            room.players.forEach(p => {
                room.scores[p.id] = 0;
            });

            // Every player gets 2 tomatoes per round for the whole game.
            room.eggsLeft = {};
            room.players.forEach(p => {
                room.eggsLeft[p.id] = rounds * EGGS_PER_ROUND;
            });

            room.votes.clear();
            room.eggThrown.clear();
            room.eggs = [];

            room.usedWords = [];
            room.wrongGuesses.clear();
            room.revealedIdx = [];
            room.hintsGiven = 0;
            room.strokes = [];

            // Every player draws once per round, in the same random order.
            const order = shuffle(room.players.map(p => p.id));

            room.perRound = order.length;
            room.rounds = rounds;
            room.drawerOrder = [];

            for (let r = 0; r < rounds; r++) {
                room.drawerOrder.push(...order);
            }

            room.totalTurns = room.drawerOrder.length;
            room.currentTurn = 0;

            callback({ success: true });

            console.log(
                `Game started in room ${room.code}: ${rounds} round(s), ${roundTime}s, ${choiceCount} word choices`
            );

            advanceRound(room);
        }
    );

    // ========================================
    // CHOOSE WORD
    // ========================================

    socket.on("choose_word", (data: { word?: string }) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "choosing" ||
            room.currentDrawerId !== player.id
        ) {
            return;
        }

        const word = data?.word;

        if (typeof word !== "string" || !room.wordChoices.includes(word)) {
            return;
        }

        beginDrawing(room, word);
    });

    // ========================================
    // DRAWING
    // ========================================

    socket.on("draw_stroke", (data: unknown) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId !== player.id
        ) {
            return;
        }

        if (room.strokes.length >= MAX_STROKES_PER_ROUND) {
            return;
        }

        const stroke = sanitizeStroke(data);

        if (!stroke) {
            return;
        }

        room.strokes.push(stroke);

        socket.to(room.code).emit("draw_stroke", stroke);
    });

    socket.on("draw_clear", () => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId !== player.id
        ) {
            return;
        }

        room.strokes = [];

        socket.to(room.code).emit("draw_clear");
    });

    socket.on("draw_undo", () => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId !== player.id
        ) {
            return;
        }

        room.strokes.pop();

        socket.to(room.code).emit("draw_undo");
    });

    // Live drawing preview: relayed to others but NOT saved.
    socket.on("draw_live", (data: unknown) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId !== player.id
        ) {
            return;
        }

        const stroke = sanitizeStroke(data);

        if (!stroke) {
            return;
        }

        const start =
            typeof data === "object" &&
            data !== null &&
            (data as { start?: unknown }).start === true;

        socket.to(room.code).emit("draw_live", { ...stroke, start });
    });

    // Drawer cancelled the stroke: remove the preview.
    socket.on("draw_live_end", () => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId !== player.id
        ) {
            return;
        }

        socket.to(room.code).emit("draw_live_end");
    });

    // ========================================
    // LOBBY CHAT
    // ========================================

    socket.on("lobby_chat", (data: { message?: unknown }) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (room.phase !== "lobby") {
            return;
        }

        const message =
            typeof data?.message === "string"
                ? data.message.trim().replace(/\s+/g, " ")
                : "";

        if (!message || message.length > MAX_LOBBY_MESSAGE_LENGTH) {
            return;
        }

        const now = Date.now();
        const last: number = socket.data.lastLobbyChatAt ?? 0;

        if (now - last < MIN_LOBBY_CHAT_INTERVAL_MS) {
            return;
        }

        socket.data.lastLobbyChatAt = now;

        const entry: LobbyMessage = {
            playerId: player.id,
            playerName: player.name,
            message
        };

        room.lobbyChat.push(entry);

        if (room.lobbyChat.length > MAX_LOBBY_MESSAGES) {
            room.lobbyChat.shift();
        }

        io.to(room.code).emit("lobby_message", entry);
    });

    // ========================================
    // PLAYER GUESS
    // ========================================

    socket.on("player_guess", (data: { guess?: string }) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            !room.currentWord ||
            !room.currentDrawerId ||
            room.timeLeft <= 0
        ) {
            return;
        }

        const guess =
            typeof data?.guess === "string" ? data.guess.trim() : "";

        if (!guess || guess.length > 100) {
            return;
        }

        if (room.currentDrawerId === player.id) {
            return;
        }

        // Spam protection
        const now = Date.now();
        const lastGuessAt: number = socket.data.lastGuessAt ?? 0;

        if (now - lastGuessAt < MIN_GUESS_INTERVAL_MS) {
            return;
        }

        socket.data.lastGuessAt = now;

        // Already guessed: this is private chat, visible only to the
        // drawer and the other players who have guessed the word.
        if (room.correctGuessers.includes(player.id)) {
            room.players.forEach(p => {
                if (
                    p.id === room.currentDrawerId ||
                    room.correctGuessers.includes(p.id)
                ) {
                    emitTo(p, "chat_message", {
                        playerId: player.id,
                        playerName: `${player.name} 🔒`,
                        message: guess,
                        correct: false
                    });
                }
            });

            return;
        }

        const normalized = normalizeGuess(guess);

        const correct =
            normalized === normalizeGuess(room.currentWord);

        if (correct) {

            room.correctGuessers.push(player.id);

            // Faster guess = more points (scaled to this game's round time).
            const timeBonus = Math.floor(
                GUESSER_MAX_TIME_BONUS *
                (room.timeLeft / room.roundDuration)
            );

            const guesserPoints = GUESSER_BASE_POINTS + timeBonus;

            addPoints(room, player.id, guesserPoints);

            addPoints(
                room,
                room.currentDrawerId,
                DRAWER_POINTS_PER_GUESS
            );

            io.to(room.code).emit("correct_guess", {
                playerId: player.id,
                playerName: player.name,
                points: guesserPoints
            });

            sendScores(room);

            console.log(
                `${player.name} guessed correctly in room ${room.code} (+${guesserPoints})`
            );

            if (allGuessersDone(room)) {
                endRound(room);
            }

        } else {

            const key = `${player.id}:${normalized}`;

            if (room.wrongGuesses.has(key)) {
                return;
            }

            room.wrongGuesses.add(key);

            // "So close!": only the guesser is told, privately.
            const target = normalizeGuess(room.currentWord);

            const maxDist =
                target.length >= 6 ? 2 : target.length >= 3 ? 1 : 0;

            if (
                maxDist > 0 &&
                editDistance(normalized, target) <= maxDist
            ) {
                emitTo(player, "close_guess", { guess });
            }

            io.to(room.code).emit("chat_message", {
                playerId: player.id,
                playerName: player.name,
                message: guess,
                correct: false
            });
        }
    });

    // ========================================
    // LIKE / DISLIKE / TOMATO (guessers only)
    // ========================================

    socket.on("react", (data: { type?: unknown }) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId === player.id
        ) {
            return;
        }

        const type = data?.type;

        if (type !== "like" && type !== "dislike") {
            return;
        }

        // One vote per turn, and it can't be changed.
        if (room.votes.has(player.id)) {
            return;
        }

        room.votes.set(player.id, type);

        sendReactions(room);

        // Everyone sees "xyz liked / disliked the drawing".
        io.to(room.code).emit("reaction_made", {
            playerId: player.id,
            playerName: player.name,
            type
        });
    });

    socket.on("throw_egg", () => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId === player.id
        ) {
            return;
        }

        // Only 1 tomato per turn.
        if (room.eggThrown.has(player.id)) {
            return;
        }

        // And only if the player still has tomatoes left.
        if ((room.eggsLeft[player.id] ?? 0) <= 0) {
            return;
        }

        room.eggThrown.add(player.id);
        room.eggsLeft[player.id]--;

        // The server picks the spot, so everyone sees the same splat.
        // (A tomato is separate from like / dislike: it doesn't change votes.)
        const egg: EggPosition = {
            x: 0.1 + Math.random() * 0.8,
            y: 0.1 + Math.random() * 0.8
        };

        room.eggs.push(egg);

        io.to(room.code).emit("egg_thrown", {
            playerId: player.id,
            playerName: player.name,
            x: egg.x,
            y: egg.y
        });

        // Tell the thrower how many tomatoes they have left.
        emitTo(player, "eggs_update", {
            eggsLeft: room.eggsLeft[player.id]
        });

        console.log(`${player.name} threw a tomato in room ${room.code}`);
    });

    // ========================================
    // HOST TOOLS
    // ========================================

    // Host removes a player (works in the lobby and during a game).
    socket.on("kick_player", (data: { playerId?: unknown }) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (room.hostId !== player.id) {
            return;
        }

        const targetId =
            typeof data?.playerId === "string" ? data.playerId : "";

        if (!targetId || targetId === player.id) {
            return;
        }

        const target = room.players.find(p => p.id === targetId);

        if (!target) {
            return;
        }

        room.kicked.add(targetId);

        if (target.socketId) {
            emitTo(target, "kicked");

            io.sockets.sockets.get(target.socketId)?.leave(room.code);
        }

        removePlayer(room, targetId);

        console.log(`${target.name} was kicked from room ${room.code}`);
    });

    // Host hands the host role to another connected player.
    socket.on("transfer_host", (data: { playerId?: unknown }) => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (room.hostId !== player.id) {
            return;
        }

        const targetId =
            typeof data?.playerId === "string" ? data.playerId : "";

        const target = room.players.find(p => p.id === targetId);

        if (!target || !target.connected || target.id === player.id) {
            return;
        }

        room.hostId = target.id;

        room.players.forEach(p => {
            p.isHost = p.id === room.hostId;
        });

        sendRoomUpdate(room);

        console.log(`${target.name} is now host of room ${room.code}`);
    });

    // Drawer asks for new words (once per turn, before anyone guessed).
    socket.on("skip_word", () => {

        const ctx = getContext(socket);

        if (!ctx) {
            return;
        }

        const { room, player } = ctx;

        if (
            room.phase !== "drawing" ||
            room.currentDrawerId !== player.id ||
            room.skipUsed ||
            room.correctGuessers.length > 0
        ) {
            return;
        }

        room.skipUsed = true;

        // Same turn, same drawer: back to word choice with new words.
        startRound(room, player);
    });

    // ========================================
    // LEAVE ROOM (explicit)
    // ========================================

    socket.on("leave_room", () => {
        leaveCurrentRoom(socket);
    });

    // ========================================
    // DISCONNECT (grace period for reconnecting)
    // ========================================

    socket.on("disconnect", () => {

        console.log(`Player disconnected: ${playerId} (${socket.id})`);

        const code = playerRooms.get(playerId);

        if (!code) {
            return;
        }

        const room = rooms.get(code);

        if (!room) {
            playerRooms.delete(playerId);
            return;
        }

        const player = room.players.find(p => p.id === playerId);

        // A newer connection already replaced this one.
        if (!player || player.socketId !== socket.id) {
            return;
        }

        player.connected = false;
        player.socketId = null;

        sendRoomUpdate(room);

        if (player.graceTimer) {
            clearTimeout(player.graceTimer);
        }

        player.graceTimer = setTimeout(() => {
            player.graceTimer = null;

            if (!player.connected) {
                console.log(`${player.name} did not return, removing`);
                removePlayer(room, playerId);
            }
        }, RECONNECT_GRACE_MS);

        // If the drawer drops, don't make everyone wait: skip the turn
        // after a short grace period (they can still come back before it).
        if (
            room.currentDrawerId === playerId &&
            (room.phase === "drawing" || room.phase === "choosing")
        ) {
            const turn = room.currentTurn;

            setTimeout(() => {
                if (
                    rooms.get(room.code) === room &&
                    room.currentTurn === turn &&
                    room.currentDrawerId === playerId &&
                    !player.connected &&
                    (room.phase === "drawing" || room.phase === "choosing")
                ) {
                    io.to(room.code).emit("drawer_left", {
                        playerName: player.name
                    });

                    endRound(room);
                }
            }, DRAWER_GRACE_MS);
        }

        // If everyone else has already guessed, don't wait.
        if (room.phase === "drawing" && allGuessersDone(room)) {
            endRound(room);
        }
    });
});

// ========================================
// START SERVER
// ========================================

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});