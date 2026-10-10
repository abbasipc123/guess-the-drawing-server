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

// ---- Round time ----
const DEFAULT_ROUND_TIME = 60;
const MIN_ROUND_TIME = 15;
const MAX_ROUND_TIME = 180;

// ---- Word choice ----
const DEFAULT_WORD_CHOICES = 3;
const MIN_WORD_CHOICES = 2;
const MAX_WORD_CHOICES = 5;
const CHOICE_SECONDS = 10;

// ---- Reconnect ----
const RECONNECT_GRACE_MS = 30000;
const DRAWER_GRACE_MS = 8000;

// ---- Progressive letter hints ----
const HINT_THRESHOLDS = [0.5, 0.25];
const MIN_HIDDEN_LETTERS = 3;

// ---- Scoring (skribbl style, max 400 for one guess) ----
const TIME_MAX = 250;    // points for guessing fast
const ORDER_MAX = 150;   // points for guessing early in the order
const MIN_GUESS_POINTS = 20;
// Drawer gets this share of the guessers' average (1.0 = same as guessers).
const DRAWER_SHARE = 0.6;

// How much of ORDER_MAX each guesser gets (1st, 2nd, 3rd, ...).
// Big drop from 1st to 2nd, then only small drops.
const ORDER_FACTORS = [1.0, 0.5, 0.35, 0.28, 0.22, 0.18, 0.15];

// ---- Tomatoes ----
const EGGS_PER_ROUND = 2;

// ---- Taunts ----
const TAUNTS_PER_ROUND = 2;
const TAUNT_COUNT = 12;

// ---- Anti-spam ----
const MIN_GUESS_INTERVAL_MS = 500;
const MAX_POINTS_PER_STROKE = 3000;
const MAX_STROKES_PER_ROUND = 3000;

// ========================================
// WORDS
// ========================================

const BASE_WORDS = [
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

const MORE_WORDS = [
    // ---- Animals ----
    "Dinosaur", "Zebra", "Owl", "Bat", "Frog", "Squirrel", "Hedgehog",
    "Dolphin", "Jellyfish", "Scorpion", "Parrot", "Eagle", "Bear", "Panda",
    "Fox", "Wolf", "Deer", "Donkey", "Sheep", "Chicken", "Camel",
    "Peacock", "Kangaroo", "Mermaid", "Vampire",

    // ---- Food ----
    "Cheese", "Egg", "Pineapple", "Cherry", "Lemon", "Orange", "Pear",
    "Tomato", "Corn", "Mushroom", "Broccoli", "Donut", "Lollipop", "Candy",
    "Sandwich", "Popcorn", "Mango", "Samosa",

    // ---- Things ----
    "Lighthouse", "Backpack", "Scarecrow", "Wheelchair", "Skateboard",
    "Telescope", "Cactus", "Submarine", "Tractor", "Parachute", "Igloo",
    "Compass", "Hammock", "Trampoline", "Chandelier", "Rickshaw", "Kite",
    "Minaret", "Football", "Swing", "Anchor", "Fireworks", "Headphones",
    "Microphone", "Laptop", "Pyramid", "Tent", "Soap", "Bucket", "Broom",
    "Mirror", "Spoon", "Fork", "Knife", "Cup", "Plate", "Bottle", "Pillow",
    "Blanket", "Sofa", "Fan", "Fridge", "Television", "Battery", "Magnet",
    "Wallet", "Envelope", "Pencil", "Ruler", "Eraser", "Paintbrush",
    "Drum", "Piano", "Violin", "Trumpet", "Flute", "Bell", "Flag", "Map",
    "Coin", "Diamond", "Trophy", "Medal", "Arrow", "Shield", "Cannon",
    "Tank", "Ambulance", "Motorcycle", "Scooter", "Taxi", "Tornado",

    // ---- People ----
    "Doctor", "Astronaut", "Chef", "Farmer", "Cowboy", "Ninja", "Clown",

    // ---- 2-word phrases ----
    "Cricket Bat", "Truck Art", "Tea Cup", "Pizza Slice", "Ice Cream Truck",
    "Hot Chocolate", "Fried Egg", "Apple Pie", "French Fries",
    "Pancake Stack", "Roller Coaster", "Ferris Wheel", "Bumper Cars",
    "Basketball Hoop", "Soccer Ball", "Boxing Gloves", "Life Jacket",
    "Scuba Diver", "Sleeping Bag", "Camp Fire", "Bird Cage", "Spider Web",
    "Honey Bee", "Polar Bear", "Black Hole", "Solar System",
    "Shooting Star", "Lightning Bolt", "Rain Cloud", "Snow Globe",
    "Ice Cube", "Garden Hose", "Lawn Mower", "Mail Box", "Street Lamp",
    "Park Bench", "Wind Mill", "Treasure Map", "Magic Carpet",
    "Cowboy Hat", "Top Hat", "Party Hat", "Wrist Watch", "Hand Fan",
    "Ceiling Fan", "Washing Machine", "Vacuum Cleaner", "Remote Control",
    "Selfie Stick", "Power Bank",

    // ---- 3-word phrases ----
    "Cat Chasing Mouse", "Boy Flying Kite", "Man Riding Camel",
    "Rain On Umbrella", "Bird On Branch", "Girl Playing Piano",
    "Kid On Swing", "Chef Cooking Soup", "Sun Behind Cloud",
    "Car In Garage", "Boat On Lake", "Dog Chasing Ball",
    "Frog On Lilypad", "Astronaut In Space", "Man Fishing In Lake"
];

// Combine both lists, dropping duplicates (case-insensitive).
// The rest of the server keeps using WORDS, so nothing else changes.
const WORDS: string[] = Array.from(
    new Map(
        [...BASE_WORDS, ...MORE_WORDS].map(
            w => [w.toLowerCase(), w] as [string, string]
        )
    ).values()
);

// ========================================
// GAME SETTINGS
// ========================================

const MIN_ROUNDS = 1;
const MAX_ROUNDS = 5;

const MAX_CUSTOM_WORDS = 300;
const MAX_CUSTOM_WORD_LENGTH = 30;

// ========================================
// LOBBY CHAT
// ========================================

const MAX_LOBBY_MESSAGES = 150;
const MAX_LOBBY_MESSAGE_LENGTH = 200;
const MIN_LOBBY_CHAT_INTERVAL_MS = 400;

// ========================================
// TYPES
// ========================================

type Phase =
    | "lobby"
    | "choosing"
    | "drawing"
    | "between";

type Vote =
    | "like"
    | "dislike";

interface Player {
    id: string;
     name: string;
    avatar: string;
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

interface PlayerStats {
    likes: number;       // likes my drawings got
    correct: number;     // my correct guesses
    guessSecs: number;   // total seconds I needed for those guesses
    eggsTaken: number;   // eggs thrown at my drawings
}

interface GameRoom {
    code: string;
    isPublic: boolean;
    players: Player[];
    hostId: string;

    phase: Phase;

    currentDrawerId: string | null;
    currentWord: string | null;
    wordChoices: string[];

    drawerOrder: string[];
    turnRound: number[];   // which round each turn belongs to    
    currentTurn: number;
    totalTurns: number;
    rounds: number;
    perRound: number;

    roundDuration: number;
    wordChoiceCount: number;

    wordPool: string[];
    lobbyChat: LobbyMessage[];

    correctGuessers: string[];
    usedWords: string[];
    wrongGuesses: Set<string>;

    revealedIdx: number[];
    hintsGiven: number;

    skipUsed: boolean;
    kicked: Set<string>;

    eggsLeft: Record<string, number>;
    votes: Map<string, Vote>;
    eggThrown: Set<string>;
    tauntsLeft: Record<string, number>;
    tauntSent: Set<string>;
    eggs: EggPosition[];

    strokes: Stroke[];

    scores: Record<string, number>;
    stats: Record<string, PlayerStats>;
    roundPoints: Record<string, number>;

    timeLeft: number;

    roundTimer: ReturnType<typeof setInterval> | null;
    nextRoundTimer: ReturnType<typeof setTimeout> | null;
    choiceTimer: ReturnType<typeof setTimeout> | null;
}

// ========================================
// ROOM STORAGE
// ========================================

const rooms = new Map<string, GameRoom>();

const playerRooms = new Map<string, string>();

const AVATARS = [
    "🙂","😎","🤠","🥳","🤓","😺","🐶","🐼","🦊","🐸","🐵","🦁",
    "🐯","🐧","🦄","🐙","🦖","🤖","👻","👽","🎨","🚀","⚽","🍕"
];

const DEFAULT_AVATAR = "🙂";

function readAvatar(raw: unknown): string {
    return typeof raw === "string" && AVATARS.includes(raw)
        ? raw
        : DEFAULT_AVATAR;
}

const EGG_SKINS = ["egg", "tomato", "pie", "slime"];

function readSkin(raw: unknown): string {
    return typeof raw === "string" && EGG_SKINS.includes(raw)
        ? raw
        : "egg";
}

// ========================================
// HELPERS
// ========================================

function generateRoomCode(): string {
    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    do {
        code = "";

        for (let i = 0; i < 6; i++) {
            const index = Math.floor(
                Math.random() * characters.length
            );

            code += characters[index] ?? "A";
        }

    } while (rooms.has(code));

    return code;
}

// FIXED: safe array access for strict TypeScript.
function shuffle<T>(items: T[]): T[] {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        const itemI = copy[i];
        const itemJ = copy[j];

        if (itemI !== undefined && itemJ !== undefined) {
            copy[i] = itemJ;
            copy[j] = itemI;
        }
    }

    return copy;
}

function publicPlayers(room: GameRoom) {
    return room.players.map(player => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isHost: player.isHost,
        connected: player.connected
    }));
}

function emitTo(
    player: Player,
    event: string,
    payload?: unknown
) {
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
        hostId: room.hostId,
        isPublic: room.isPublic
    });
}

function sendScores(room: GameRoom) {
    io.to(room.code).emit("score_update", {
        scores: room.scores
    });
}

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

    return {
        likes,
        dislikes
    };
}

function sendReactions(room: GameRoom) {
    io.to(room.code).emit(
        "reaction_update",
        reactionCounts(room)
    );
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
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

// ========================================
// HINTS
// ========================================

function buildHint(
    word: string,
    revealed: number[] = []
): string {
    const shown = new Set(revealed);

    return Array.from(
        word.trim().replace(/\s+/g, " ")
    )
        .map((ch, i) => {
            if (ch === " ") {
                return " ";
            }

            return shown.has(i) ? ch : "_";
        })
        .join("");
}

function maybeRevealHint(room: GameRoom) {
    if (
        room.phase !== "drawing" ||
        !room.currentWord
    ) {
        return;
    }

    if (
        room.hintsGiven >=
        HINT_THRESHOLDS.length
    ) {
        return;
    }

    const threshold =
        HINT_THRESHOLDS[room.hintsGiven];

    if (threshold === undefined) {
        return;
    }

    const limit = Math.floor(
        room.roundDuration * threshold
    );

    if (room.timeLeft > limit) {
        return;
    }

    room.hintsGiven++;

    const chars = Array.from(
        room.currentWord
            .trim()
            .replace(/\s+/g, " ")
    );

    const hidden: number[] = [];

    chars.forEach((ch, i) => {
        if (
            ch !== " " &&
            !room.revealedIdx.includes(i)
        ) {
            hidden.push(i);
        }
    });

    if (
        hidden.length <
        MIN_HIDDEN_LETTERS
    ) {
        return;
    }

    const randomIndex = Math.floor(
        Math.random() * hidden.length
    );

    const selected = hidden[randomIndex];

    if (selected === undefined) {
        return;
    }

    room.revealedIdx.push(selected);

    io.to(room.code).emit(
        "hint_update",
        {
            hint: buildHint(
                room.currentWord,
                room.revealedIdx
            )
        }
    );
}

// ========================================
// EDIT DISTANCE
// ========================================

function editDistance(
    a: string,
    b: string
): number {
    const dp: number[] = Array.from(
        {
            length: b.length + 1
        },
        (_, j) => j
    );

    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0] ?? 0;

        dp[0] = i;

        for (let j = 1; j <= b.length; j++) {
            const tmp = dp[j] ?? 0;

            const charA = a[i - 1] ?? "";
            const charB = b[j - 1] ?? "";

            dp[j] = Math.min(
                (dp[j] ?? 0) + 1,
                (dp[j - 1] ?? 0) + 1,
                prev +
                    (charA === charB
                        ? 0
                        : 1)
            );

            prev = tmp;
        }
    }

    return dp[b.length] ?? 0;
}

// ========================================
// ROUND NUMBER
// ========================================

function displayRound(
    room: GameRoom
): number {
    const known = room.turnRound[room.currentTurn - 1];

    if (known !== undefined) {
        return known;
    }

    return Math.min(
        room.rounds,
        Math.max(
            1,
            Math.ceil(
                room.currentTurn /
                Math.max(1, room.perRound)
            )
        )
    );
}

// A player joins while the game is already running.
// They draw once at the end of the current round and of every later round.
function addLatePlayer(
    room: GameRoom,
    playerId: string
) {
    const currentRound = displayRound(room);

    // Eggs for the rounds that are still left (including this one).
    const roundsLeft =
        Math.max(1, room.rounds - currentRound + 1);

    room.eggsLeft[playerId] =
        roundsLeft * EGGS_PER_ROUND;

    room.tauntsLeft[playerId] =
        roundsLeft * TAUNTS_PER_ROUND;

    // If this player left earlier, remove their old future turns first.
    for (
        let i = room.drawerOrder.length - 1;
        i >= room.currentTurn;
        i--
    ) {
        if (room.drawerOrder[i] === playerId) {
            room.drawerOrder.splice(i, 1);
            room.turnRound.splice(i, 1);
        }
    }

    // Going from the last round down keeps the positions correct.
    for (let r = room.rounds; r >= currentRound; r--) {

        let lastIdx = -1;

        for (let i = 0; i < room.turnRound.length; i++) {
            if (room.turnRound[i] === r) {
                lastIdx = i;
            }
        }

        if (lastIdx === -1) {
            continue;
        }

        room.drawerOrder.splice(lastIdx + 1, 0, playerId);
        room.turnRound.splice(lastIdx + 1, 0, r);
    }

    room.totalTurns = room.drawerOrder.length;
}

// ========================================
// SETTINGS
// ========================================

function readIntSetting(
    raw: unknown,
    min: number,
    max: number,
    fallback: number
): number {
    const value = Number(raw);

    return Number.isInteger(value) &&
        value >= min &&
        value <= max
        ? value
        : fallback;
}

function parseCustomWords(
    raw: unknown
): string[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of raw) {
        if (typeof item !== "string") {
            continue;
        }

        const word =
            item
                .trim()
                .replace(/\s+/g, " ");

        if (
            word.length < 1 ||
            word.length >
                MAX_CUSTOM_WORD_LENGTH ||
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

        if (
            result.length >=
            MAX_CUSTOM_WORDS
        ) {
            break;
        }
    }

    return result;
}

// ========================================
// WORD CHOICES
// ========================================

function pickWordChoices(
    room: GameRoom
): string[] {
    const count = room.wordChoiceCount;

    let available =
        room.wordPool.filter(
            word =>
                !room.usedWords.includes(word)
        );

    if (available.length < count) {
        room.usedWords = [];
        available = [...room.wordPool];
    }

    return shuffle(available).slice(
        0,
        count
    );
}

// ========================================
// DRAWING VALIDATION
// ========================================

function clamp01(value: number): number {
    return Math.min(
        1,
        Math.max(0, value)
    );
}

function sanitizeStroke(
    data: unknown
): Stroke | null {
    if (
        !data ||
        typeof data !== "object"
    ) {
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
        raw.points.length >
            MAX_POINTS_PER_STROKE
    ) {
        return null;
    }

    const points: StrokePoint[] = [];

    for (const item of raw.points) {
        if (
            !item ||
            typeof item !== "object"
        ) {
            return null;
        }

        const {
            x,
            y
        } = item as {
            x?: unknown;
            y?: unknown;
        };

        if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            !isFinite(x) ||
            !isFinite(y)
        ) {
            return null;
        }

        points.push({
            x: clamp01(x),
            y: clamp01(y)
        });
    }

    const color =
        typeof raw.color === "string" &&
        /^#[0-9A-Fa-f]{6}$/.test(
            raw.color
        )
            ? raw.color
            : "#000000";

    const rawWidth =
        typeof raw.width === "number" &&
        isFinite(raw.width)
            ? raw.width
            : 8;

    const isFill =
        rawWidth <= 0 &&
        points.length === 1;

    const width = isFill
        ? 0
        : Math.min(
            64,
            Math.max(1, rawWidth)
        );

    return {
        points,
        color,
        width
    };
}

// ========================================
// GUESSERS
// ========================================

function allGuessersDone(
    room: GameRoom
): boolean {
    if (
        room.phase !== "drawing" ||
        !room.currentDrawerId
    ) {
        return false;
    }

    const guessers =
        room.players.filter(
            player =>
                player.id !==
                    room.currentDrawerId &&
                player.connected
        );

    return (
        guessers.length > 0 &&
        guessers.every(
            player =>
                room.correctGuessers.includes(
                    player.id
                )
        )
    );
}

// ========================================
// SCORING
// ========================================

function guessPoints(
    timeLeft: number,
    roundTime: number,
    order: number
): number {
    // order: 0 = first correct guesser, 1 = second, ...
    const ratio = Math.max(0, Math.min(1, timeLeft / roundTime));

    const timePart = TIME_MAX * ratio;

    const factor =
        ORDER_FACTORS[Math.min(order, ORDER_FACTORS.length - 1)] ?? 0.15;

    const orderPart = ORDER_MAX * factor;

    return Math.max(MIN_GUESS_POINTS, Math.round(timePart + orderPart));
}

function addPoints(
    room: GameRoom,
    playerId: string,
    points: number
) {
    room.scores[playerId] =
        (room.scores[playerId] ?? 0) +
        points;

    room.roundPoints[playerId] =
        (room.roundPoints[playerId] ?? 0) +
        points;
}

// ========================================
// SNAPSHOT
// ========================================

function buildSnapshot(
    room: GameRoom,
    player: Player
) {
    const isDrawer =
        room.currentDrawerId ===
        player.id;

    const drawer =
        room.players.find(
            p =>
                p.id ===
                room.currentDrawerId
        );

    return {
        roomCode: room.code,

        players:
            publicPlayers(room),

        scores:
            room.scores,

        currentRound:
            displayRound(room),

        totalRounds:
            room.rounds,

        lobbyChat:
            room.lobbyChat,

        hint:
            room.phase === "drawing" &&
            room.currentWord
                ? buildHint(
                    room.currentWord,
                    room.revealedIdx
                )
                : "",

        iGuessedCorrectly:
            room.correctGuessers.includes(
                player.id
            ),

        strokes:
            room.strokes,

        gameActive:
            room.phase !== "lobby",

        drawerId:
            room.currentDrawerId,

        drawerName:
            drawer
                ? drawer.name
                : "",

        word:
            isDrawer &&
            room.phase === "drawing"
                ? room.currentWord
                : null,

        timeLeft:
            room.timeLeft,

        choosing:
            room.phase === "choosing",

        words:
            isDrawer &&
            room.phase === "choosing"
                ? room.wordChoices
                : [],

        betweenRounds:
            room.phase === "between",

        ...reactionCounts(room),

        myVote:
            room.votes.get(
                player.id
            ) ?? "",

        eggsLeft:
            room.eggsLeft[
                player.id
            ] ?? 0,

        eggThrown:
            room.eggThrown.has(
                player.id
            ),

         eggs:
            room.eggs,

        isPublic:
            room.isPublic,

        tauntsLeft:
            room.tauntsLeft[player.id] ?? 0,

        tauntSent:
            room.tauntSent.has(player.id),

        canSkip:
            isDrawer &&
            !room.skipUsed
    };
}

// ========================================
// FINISH GAME
// ========================================

function statsOf(room: GameRoom, playerId: string): PlayerStats {
    let s = room.stats[playerId];

    if (!s) {
        s = { likes: 0, correct: 0, guessSecs: 0, eggsTaken: 0 };
        room.stats[playerId] = s;
    }

    return s;
}

function buildAwards(room: GameRoom) {
    const awards: {
        icon: string;
        title: string;
        playerId: string;
        playerName: string;
        detail: string;
    }[] = [];

    let artistId = "", artistVal = 0;
    let fastId = "", fastVal = Infinity;
    let smartId = "", smartVal = 0;
    let eggedId = "", eggedVal = 0;

    room.players.forEach(p => {
        const s = room.stats[p.id];

        if (!s) {
            return;
        }

        if (s.likes > artistVal) {
            artistVal = s.likes;
            artistId = p.id;
        }

        if (s.correct > 0) {
            const avg = s.guessSecs / s.correct;

            if (avg < fastVal) {
                fastVal = avg;
                fastId = p.id;
            }
        }

        if (s.correct > smartVal) {
            smartVal = s.correct;
            smartId = p.id;
        }

        if (s.eggsTaken > eggedVal) {
            eggedVal = s.eggsTaken;
            eggedId = p.id;
        }
    });

    const nameOf = (id: string) =>
        room.players.find(p => p.id === id)?.name ?? "Player";

    if (artistId) {
        awards.push({
            icon: "🎨", title: "Best artist",
            playerId: artistId, playerName: nameOf(artistId),
            detail: `${artistVal} 👍`
        });
    }

    if (fastId) {
        awards.push({
            icon: "⚡", title: "Fastest guesser",
            playerId: fastId, playerName: nameOf(fastId),
            detail: `${fastVal.toFixed(1)}s avg`
        });
    }

    if (smartId) {
        awards.push({
            icon: "🧠", title: "Most correct guesses",
            playerId: smartId, playerName: nameOf(smartId),
            detail: `${smartVal} guesses`
        });
    }

    if (eggedId) {
        awards.push({
            icon: "🥚", title: "Most egged",
            playerId: eggedId, playerName: nameOf(eggedId),
            detail: `${eggedVal} eggs`
        });
    }

    return awards;
}

function finishGame(
    room: GameRoom
) {
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

    io.to(room.code).emit(
        "game_finished",
        {
            scores:
                room.scores,
            awards:
                buildAwards(room)
        }
    );

    console.log(
        `Game finished in room ${room.code}`
    );
}

// ========================================
// ADVANCE ROUND
// ========================================

function advanceRound(
    room: GameRoom
) {
    while (true) {
        if (room.players.length < 2) {
            finishGame(room);
            return;
        }

        room.currentTurn++;

        if (
            room.currentTurn >
            room.drawerOrder.length
        ) {
            finishGame(room);
            return;
        }

        const drawerId =
            room.drawerOrder[
                room.currentTurn - 1
            ];

        if (!drawerId) {
            continue;
        }

        const drawer =
            room.players.find(
                player =>
                    player.id === drawerId &&
                    player.connected
            );

        if (drawer) {
            room.skipUsed = false;

            startRound(
                room,
                drawer
            );

            return;
        }

        // Player offline; skip.
    }
}

// ========================================
// START ROUND
// ========================================

function startRound(
    room: GameRoom,
    drawer: Player
) {
    clearRoomTimers(room);

    room.phase = "choosing";

    room.currentDrawerId =
        drawer.id;

    room.currentWord = null;

    room.wordChoices =
        pickWordChoices(room);

    room.correctGuessers = [];

    room.wrongGuesses.clear();

    room.revealedIdx = [];

    room.hintsGiven = 0;

    room.strokes = [];

    room.roundPoints = {};

    room.tauntSent.clear();

    room.votes.clear();

    room.eggThrown.clear();

    room.eggs = [];

    room.timeLeft = 0;

    io.to(room.code).emit(
        "round_started",
        {
            drawerId:
                drawer.id,

            drawerName:
                drawer.name,

            currentRound:
                displayRound(room),

            totalRounds:
                room.rounds
        }
    );

    room.players.forEach(
        player => {
            emitTo(
                player,
                "word_choice_started",
                {
                    drawerId:
                        drawer.id,

                    drawerName:
                        drawer.name,

                    words:
                        player.id ===
                        drawer.id
                            ? room.wordChoices
                            : [],

                    choiceSeconds:
                        CHOICE_SECONDS,

                    canSkip:
                        player.id ===
                            drawer.id &&
                        !room.skipUsed,

                    eggsLeft:
                        room.eggsLeft[
                            player.id
                        ] ?? 0
                }
            );
        }
    );

    sendScores(room);

    room.choiceTimer =
        setTimeout(() => {
            room.choiceTimer =
                null;

            if (
                room.phase !==
                "choosing"
            ) {
                return;
            }

            const index =
                Math.floor(
                    Math.random() *
                    room.wordChoices.length
                );

            const pick =
                room.wordChoices[index];

            if (!pick) {
                endRound(room);
                return;
            }

            beginDrawing(
                room,
                pick
            );
        }, CHOICE_SECONDS * 1000);

    console.log(
        `Round ${displayRound(room)}/${room.rounds} ` +
        `(turn ${room.currentTurn}/${room.totalTurns}) ` +
        `in room ${room.code}: ${drawer.name} is choosing a word`
    );
}

// ========================================
// BEGIN DRAWING
// ========================================

function beginDrawing(
    room: GameRoom,
    word: string
) {
    stopChoiceTimer(room);

    room.currentWord =
        word;

    room.usedWords.push(
        word
    );

    room.wordChoices = [];

    room.phase = "drawing";

    room.revealedIdx = [];

    room.hintsGiven = 0;

    room.timeLeft =
        room.roundDuration;

    const drawer =
        room.players.find(
            player =>
                player.id ===
                room.currentDrawerId
        );

    if (!drawer) {
        endRound(room);
        return;
    }

    room.players.forEach(
        player => {
            emitTo(
                player,
                "game_started",
                {
                    drawerId:
                        drawer.id,

                    drawerName:
                        drawer.name,

                    word:
                        player.id ===
                        drawer.id
                            ? word
                            : null,

                    hint:
                        buildHint(word),

                    timeLeft:
                        room.roundDuration
                }
            );
        }
    );

    startRoundTimer(room);

    console.log(
        `Room ${room.code}: ${drawer.name} is drawing "${word}" (${room.roundDuration}s)`
    );
}

// ========================================
// ROUND TIMER
// ========================================

function startRoundTimer(
    room: GameRoom
) {
    stopRoundTimer(room);

    room.timeLeft =
        room.roundDuration;

    io.to(room.code).emit(
        "timer_update",
        {
            timeLeft:
                room.timeLeft
        }
    );

    room.roundTimer =
        setInterval(() => {
            room.timeLeft =
                Math.max(
                    0,
                    room.timeLeft - 1
                );

            io.to(room.code).emit(
                "timer_update",
                {
                    timeLeft:
                        room.timeLeft
                }
            );

            if (
                room.timeLeft <= 0
            ) {
                endRound(room);
                return;
            }

            maybeRevealHint(
                room
            );
        }, 1000);
}

// ========================================
// NEXT ROUND
// ========================================

function scheduleNextRound(
    room: GameRoom
) {
    stopNextRoundTimer(room);

    room.nextRoundTimer =
        setTimeout(() => {
            room.nextRoundTimer =
                null;

            if (
                rooms.get(
                    room.code
                ) !== room
            ) {
                return;
            }

            if (
                room.phase !==
                "between"
            ) {
                return;
            }

            advanceRound(room);

        }, NEXT_ROUND_DELAY);
}

// ========================================
// END ROUND
// ========================================

function endRound(
    room: GameRoom
) {
    if (
        room.phase !== "drawing" &&
        room.phase !== "choosing"
    ) {
        return;
    }

    clearRoomTimers(room);

    const word =
        room.currentWord;

    room.phase = "between";

    room.wordChoices = [];

    room.timeLeft = 0;

    io.to(room.code).emit(
        "round_ended",
        {
            word,
            scores:
                room.scores,
            roundPoints:
                room.roundPoints
        }
    );

    console.log(
        `Round ended in room ${room.code}. Word: ${word}`
    );

    scheduleNextRound(room);
}

// ========================================
// REMOVE PLAYER
// ========================================

function removePlayer(
    room: GameRoom,
    playerId: string
) {
    const player =
        room.players.find(
            p => p.id === playerId
        );

    if (!player) {
        return;
    }

    if (player.graceTimer) {
        clearTimeout(
            player.graceTimer
        );

        player.graceTimer =
            null;
    }

    const wasDrawer =
        room.currentDrawerId ===
        playerId;

    room.players =
        room.players.filter(
            p => p.id !== playerId
        );

    room.correctGuessers =
        room.correctGuessers.filter(
            id => id !== playerId
        );

    delete room.scores[
        playerId
    ];

    room.votes.delete(
        playerId
    );

    room.eggThrown.delete(
        playerId
    );

    delete room.eggsLeft[
        playerId
    ];

    delete room.tauntsLeft[
        playerId
    ];

    room.tauntSent.delete(
        playerId
    );

    playerRooms.delete(
        playerId
    );

    if (room.players.length === 0) {
        clearRoomTimers(room);

        rooms.delete(
            room.code
        );

        console.log(
            `Room ${room.code} deleted`
        );

        return;
    }

    if (
        room.hostId ===
        playerId
    ) {
        const next =
            room.players.find(
                p => p.connected
            ) ??
            room.players[0];

        if (next) {
            room.hostId =
                next.id;

            room.players.forEach(
                p => {
                    p.isHost =
                        p.id ===
                        room.hostId;
                }
            );
        }
    }

    sendRoomUpdate(room);
    sendScores(room);
    sendReactions(room);

    if (
        room.phase ===
        "lobby"
    ) {
        return;
    }

    if (
        room.players.length < 2
    ) {
        finishGame(room);
        return;
    }

    if (
        wasDrawer &&
        (
            room.phase ===
                "drawing" ||
            room.phase ===
                "choosing"
        )
    ) {
        endRound(room);
        return;
    }

    if (
        room.phase ===
            "drawing" &&
        allGuessersDone(room)
    ) {
        endRound(room);
    }
}

// ========================================
// SOCKET CONTEXT
// ========================================

interface RoomContext {
    room: GameRoom;
    player: Player;
}

function getContext(
    socket: Socket
): RoomContext | null {
    const playerId:
        string | undefined =
        socket.data.playerId;

    if (!playerId) {
        return null;
    }

    const code =
        playerRooms.get(
            playerId
        );

    if (!code) {
        return null;
    }

    const room =
        rooms.get(code);

    if (!room) {
        playerRooms.delete(
            playerId
        );

        return null;
    }

    const player =
        room.players.find(
            p => p.id === playerId
        );

    if (!player) {
        return null;
    }

    return {
        room,
        player
    };
}

function leaveCurrentRoom(
    socket: Socket
) {
    const ctx =
        getContext(socket);

    if (!ctx) {
        return;
    }

    socket.leave(
        ctx.room.code
    );

    removePlayer(
        ctx.room,
        ctx.player.id
    );
}

function makeRoom(
    code: string,
    host: Player,
    isPublic: boolean
): GameRoom {
    return {
        code,
        isPublic,
        players: [host],
        hostId: host.id,
        phase: "lobby",
        currentDrawerId: null,
        currentWord: null,
        wordChoices: [],
        drawerOrder: [],
        turnRound: [],
        currentTurn: 0,
        totalTurns: 0,
        rounds: 1,
        perRound: 0,
        roundDuration: DEFAULT_ROUND_TIME,
        wordChoiceCount: DEFAULT_WORD_CHOICES,
        wordPool: [...WORDS],
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
        tauntsLeft: {},
        tauntSent: new Set<string>(),
        eggs: [],
        strokes: [],
        scores: { [host.id]: 0 },
        stats: {},
        roundPoints: {},
        timeLeft: 0,
        roundTimer: null,
        nextRoundTimer: null,
        choiceTimer: null
    };
}

// ========================================
// HTTP
// ========================================

app.get(
    "/",
    (_req, res) => {
        res.send(
            "Guess The Drawing server is running!"
        );
    }
);

// ========================================
// SOCKET CONNECTION
// ========================================

io.on(
    "connection",
    socket => {

        const rawId =
            socket.handshake
                .query.playerId;

        const playerId =
            typeof rawId === "string" &&
            /^[A-Za-z0-9-]{8,64}$/.test(
                rawId
            )
                ? rawId
                : null;

        if (!playerId) {
            socket.disconnect(
                true
            );

            return;
        }

        socket.data.playerId =
            playerId;

        console.log(
            `Player connected: ${playerId} (${socket.id})`
        );

        // ========================================
        // RECONNECT
        // ========================================

        const existingCode =
            playerRooms.get(
                playerId
            );

        const existingRoom =
            existingCode
                ? rooms.get(
                    existingCode
                )
                : undefined;

        const existingPlayer =
            existingRoom
                ? existingRoom.players.find(
                    p =>
                        p.id ===
                        playerId
                )
                : undefined;

        if (
            existingRoom &&
            existingPlayer
        ) {
            if (
                existingPlayer.graceTimer
            ) {
                clearTimeout(
                    existingPlayer.graceTimer
                );

                existingPlayer.graceTimer =
                    null;
            }

            const oldSocketId =
                existingPlayer.socketId;

            existingPlayer.connected =
                true;

            existingPlayer.socketId =
                socket.id;

            if (
                oldSocketId &&
                oldSocketId !==
                    socket.id
            ) {
                io.sockets.sockets
                    .get(oldSocketId)
                    ?.disconnect(true);
            }

            socket.join(
                existingRoom.code
            );

            sendRoomUpdate(
                existingRoom
            );

            socket.emit(
                "resync",
                buildSnapshot(
                    existingRoom,
                    existingPlayer
                )
            );

            console.log(
                `${existingPlayer.name} reconnected`
            );

        } else {

            playerRooms.delete(
                playerId
            );

            socket.emit(
                "resync_none"
            );
        }

        // ========================================
        // CREATE ROOM
        // ========================================

        socket.on(
            "create_room",
            (
                data: {
                    playerName?: string;
                },
                callback?: (
                    response: object
                ) => void
            ) => {

                if (
                    typeof callback !==
                    "function"
                ) {
                    return;
                }

                const playerName =
                    data?.playerName
                        ?.trim();

                if (
                    !playerName ||
                    playerName.length >
                        20
                ) {
                    callback({
                        success: false,
                        message:
                            "Enter a name between 1 and 20 characters."
                    });

                    return;
                }

                leaveCurrentRoom(
                    socket
                );

                const roomCode =
                    generateRoomCode();

                const player: Player = {
                    id: playerId,
                    name: playerName,
                    avatar: readAvatar((data as { avatar?: unknown } | undefined)?.avatar),
                    isHost: true,
                    connected: true,
                    socketId:
                        socket.id,
                    graceTimer:
                        null
                };

                const room: GameRoom = {
                    code: roomCode,
                    isPublic: false,

                    players: [
                        player
                    ],

                    hostId:
                        playerId,

                    phase:
                        "lobby",

                    currentDrawerId:
                        null,

                    currentWord:
                        null,

                    wordChoices: [],

                    drawerOrder: [],
                    
                    turnRound: [],

                    currentTurn: 0,

                    totalTurns: 0,

                    rounds: 1,

                    perRound: 0,

                    roundDuration:
                        DEFAULT_ROUND_TIME,

                    wordChoiceCount:
                        DEFAULT_WORD_CHOICES,

                    wordPool: [
                        ...WORDS
                    ],

                    lobbyChat: [],

                    correctGuessers: [],

                    usedWords: [],

                    wrongGuesses:
                        new Set<string>(),

                    revealedIdx: [],

                    hintsGiven: 0,

                    skipUsed: false,

                    kicked:
                        new Set<string>(),

                    eggsLeft: {},

                    votes:
                        new Map<
                            string,
                            Vote
                        >(),

                     eggThrown:
                        new Set<string>(),

                    tauntsLeft: {},

                    tauntSent:
                        new Set<string>(),

                    eggs: [],

                    strokes: [],

                    scores: {
                        [playerId]: 0
                    },

                    roundPoints: {},
                    
                    stats: {},

                    timeLeft: 0,

                    roundTimer:
                        null,

                    nextRoundTimer:
                        null,

                    choiceTimer:
                        null
                };

                rooms.set(
                    roomCode,
                    room
                );

                playerRooms.set(
                    playerId,
                    roomCode
                );

                socket.join(
                    roomCode
                );

                callback({
                    success: true,
                    roomCode,
                    players:
                        publicPlayers(
                            room
                        ),
                    playerCount:
                        room.players
                            .length,
                    maxPlayers:
                        MAX_PLAYERS,
                    hostId:
                        room.hostId
                });

                sendRoomUpdate(
                    room
                );

                sendScores(
                    room
                );

                console.log(
                    `${playerName} created room ${roomCode}`
                );
            }
        );

        // ========================================
        // JOIN ROOM
        // ========================================

        socket.on(
            "join_room",
            (
                data: {
                    playerName?: string;
                    roomCode?: string;
                },
                callback?: (
                    response: object
                ) => void
            ) => {

                if (
                    typeof callback !==
                    "function"
                ) {
                    return;
                }

                const playerName =
                    data?.playerName
                        ?.trim();

                const roomCode =
                    data?.roomCode
                        ?.trim()
                        .toUpperCase();

                if (
                    !playerName ||
                    playerName.length >
                        20
                ) {
                    callback({
                        success: false,
                        message:
                            "Enter a name between 1 and 20 characters."
                    });

                    return;
                }

                if (
                    !roomCode ||
                    roomCode.length !==
                        6
                ) {
                    callback({
                        success: false,
                        message:
                            "Enter a valid 6-character room code."
                    });

                    return;
                }

                const room =
                    rooms.get(
                        roomCode
                    );

                if (!room) {
                    callback({
                        success: false,
                        message:
                            "Room not found."
                    });

                    return;
                }

                if (
                    room.players.some(
                        p =>
                            p.id ===
                            playerId
                    )
                ) {
                    callback({
                        success: true,
                        roomCode:
                            room.code,
                        players:
                            publicPlayers(
                                room
                            ),
                        playerCount:
                            room.players
                                .length,
                        maxPlayers:
                            MAX_PLAYERS,
                        hostId:
                            room.hostId
                    });

                    return;
                }

                if (
                    room.kicked.has(
                        playerId
                    )
                ) {
                    callback({
                        success: false,
                        message:
                            "You were removed from this room by the host."
                    });

                    return;
                }

                if (
                    room.players.some(
                        p =>
                            p.name
                                .toLowerCase() ===
                            playerName
                                .toLowerCase()
                    )
                ) {
                    callback({
                        success: false,
                        message:
                            "That name is already taken in this room."
                    });

                    return;
                }

                if (
                    room.players.length >=
                    MAX_PLAYERS
                ) {
                    callback({
                        success: false,
                        message:
                            "This room is full."
                    });

                    return;
                }

                leaveCurrentRoom(
                    socket
                );

                const player: Player = {
                    id: playerId,
                    name: playerName,
                    avatar: readAvatar((data as { avatar?: unknown } | undefined)?.avatar),isHost: false,
                    connected: true,
                    socketId:
                        socket.id,
                    graceTimer:
                        null
                };

                room.players.push(
                    player
                );

                room.scores[
                    playerId
                ] = 0;

                // NEW (addition 1): joining a game that is already running
                if (room.phase !== "lobby") {
                    addLatePlayer(room, playerId);
                }

                playerRooms.set(
                    playerId,
                    roomCode
                );

                socket.join(
                    roomCode
                );

                callback({
                    success: true,
                    roomCode:
                        roomCode,
                    players:
                        publicPlayers(
                            room
                        ),
                    playerCount:
                        room.players
                            .length,
                    maxPlayers:
                        MAX_PLAYERS,
                    hostId:
                        room.hostId
                });

                sendRoomUpdate(
                    room
                );

                sendScores(
                    room
                );

                // NEW (addition 2): send the late joiner the current game state
                if (room.phase !== "lobby") {
                    socket.emit(
                        "resync",
                        buildSnapshot(room, player)
                    );
                }

                console.log(
                    `${playerName} joined room ${roomCode}`
                );
            }
        );

        // ========================================
        // PLAY (random public room)
        // ========================================

        socket.on(
            "play_public",
            (
                data: {
                    playerName?: string;
                },
                callback?: (
                    response: object
                ) => void
            ) => {

                if (typeof callback !== "function") {
                    return;
                }

                const playerName =
                    data?.playerName?.trim();

                if (
                    !playerName ||
                    playerName.length > 20
                ) {
                    callback({
                        success: false,
                        message:
                            "Enter a name between 1 and 20 characters."
                    });

                    return;
                }

                leaveCurrentRoom(socket);

                // Best open public room: lobbies first, then the fullest.
                let target: GameRoom | null = null;

                for (const r of Array.from(rooms.values())) {

                    if (!r.isPublic) continue;
                    if (r.players.length >= MAX_PLAYERS) continue;
                    if (!r.players.some(p => p.connected)) continue;
                    if (r.kicked.has(playerId)) continue;

                    if (
                        r.players.some(
                            p =>
                                p.name.toLowerCase() ===
                                playerName.toLowerCase()
                        )
                    ) {
                        continue;
                    }

                    if (target === null) {
                        target = r;
                        continue;
                    }

                    const rLobby = r.phase === "lobby";
                    const tLobby = target.phase === "lobby";

                    if (
                        (rLobby && !tLobby) ||
                        (
                            rLobby === tLobby &&
                            r.players.length > target.players.length
                        )
                    ) {
                        target = r;
                    }
                }

                const player: Player = {
                    id: playerId,
                    name: playerName,
                    avatar: readAvatar((data as { avatar?: unknown } | undefined)?.avatar),
                    isHost: false,
                    connected: true,
                    socketId: socket.id,
                    graceTimer: null
                };

                let room: GameRoom;

                if (target !== null) {

                    room = target;

                    room.players.push(player);

                    room.scores[playerId] = 0;

                    // Joining a game that is already running.
                    if (room.phase !== "lobby") {
                        addLatePlayer(room, playerId);
                    }

                } else {

                    player.isHost = true;

                    room = makeRoom(
                        generateRoomCode(),
                        player,
                        true
                    );

                    rooms.set(room.code, room);
                }

                playerRooms.set(playerId, room.code);

                socket.join(room.code);

                callback({
                    success: true,
                    roomCode: room.code,
                    players: publicPlayers(room),
                    playerCount: room.players.length,
                    maxPlayers: MAX_PLAYERS,
                    hostId: room.hostId,
                    isPublic: true
                });

                sendRoomUpdate(room);

                sendScores(room);

                if (room.phase !== "lobby") {
                    socket.emit(
                        "resync",
                        buildSnapshot(room, player)
                    );
                }

                console.log(
                    `${playerName} joined public room ${room.code}`
                );
            }
        );
        
        // ========================================
        // START GAME
        // ========================================

        socket.on(
            "start_game",
            (
                data:
                    | {
                        rounds?: unknown;
                        roundTime?: unknown;
                        choiceCount?: unknown;
                        customWords?: unknown;
                        customOnly?: unknown;
                    }
                    | undefined,
                callback?: (
                    response: object
                ) => void
            ) => {

                if (
                    typeof callback !==
                    "function"
                ) {
                    return;
                }

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    callback({
                        success: false,
                        message:
                            "You are not in a room."
                    });

                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.hostId !==
                    player.id
                ) {
                    callback({
                        success: false,
                        message:
                            "Only the host can start the game."
                    });

                    return;
                }

                if (
                    room.phase !==
                    "lobby"
                ) {
                    callback({
                        success: false,
                        message:
                            "Game already in progress."
                    });

                    return;
                }

                const ready =
                    room.players.filter(
                        p =>
                            p.connected
                    );

                if (
                    ready.length < 2
                ) {
                    callback({
                        success: false,
                        message:
                            "Need at least 2 players."
                    });

                    return;
                }

                const rounds =
                    readIntSetting(
                        data?.rounds,
                        MIN_ROUNDS,
                        MAX_ROUNDS,
                        1
                    );

                const roundTime =
                    readIntSetting(
                        data?.roundTime,
                        MIN_ROUND_TIME,
                        MAX_ROUND_TIME,
                        DEFAULT_ROUND_TIME
                    );

                const choiceCount =
                    readIntSetting(
                        data?.choiceCount,
                        MIN_WORD_CHOICES,
                        MAX_WORD_CHOICES,
                        DEFAULT_WORD_CHOICES
                    );

                const custom =
                    parseCustomWords(
                        data?.customWords
                    );

                const customOnly =
                    data?.customOnly ===
                    true;

                if (
                    customOnly &&
                    custom.length <
                        choiceCount
                ) {
                    callback({
                        success: false,
                        message:
                            `Add at least ${choiceCount} custom words (that's how many words the drawer picks from), or turn off "Use only my words".`
                    });

                    return;
                }

                if (customOnly) {

                    room.wordPool =
                        custom;

                } else {

                    const known =
                        new Set(
                            WORDS.map(
                                w =>
                                    w.toLowerCase()
                            )
                        );

                    room.wordPool = [
                        ...WORDS,
                        ...custom.filter(
                            w =>
                                !known.has(
                                    w.toLowerCase()
                                )
                        )
                    ];
                }

                room.roundDuration =
                    roundTime;

                room.wordChoiceCount =
                    choiceCount;

                clearRoomTimers(
                    room
                );

                const offline =
                    room.players.filter(
                        p =>
                            !p.connected
                    );

                offline.forEach(
                    p =>
                        removePlayer(
                            room,
                            p.id
                        )
                );

                room.scores = {};
              
                room.stats = {};
                
                room.players.forEach(
                    p => {
                        room.scores[
                            p.id
                        ] = 0;
                    }
                );

                              room.eggsLeft = {};

                room.tauntsLeft = {};

                room.players.forEach(
                    p => {
                        room.tauntsLeft[p.id] =
                            rounds * TAUNTS_PER_ROUND;

                        emitTo(
                            p,
                            "taunts_update",
                            {
                                tauntsLeft:
                                    room.tauntsLeft[p.id] ?? 0
                            }
                        );
                    }
                );

                room.players.forEach(
                    p => {
                        room.eggsLeft[
                            p.id
                        ] =
                            rounds *
                            EGGS_PER_ROUND;
                    }
                );

                room.votes.clear();

                room.eggThrown.clear();

                room.eggs = [];

                room.usedWords = [];

                room.wrongGuesses.clear();

                room.revealedIdx = [];

                room.hintsGiven = 0;

                room.strokes = [];

                const order =
                    shuffle(
                        room.players.map(
                            p =>
                                p.id
                        )
                    );

                room.perRound =
                    order.length;

                room.rounds =
                    rounds;

                room.drawerOrder = [];
                room.turnRound = [];

                for (
                    let r = 0;
                    r < rounds;
                    r++
                ) {
                    room.drawerOrder.push(
                        ...order
                    );

                    order.forEach(() =>
                        room.turnRound.push(r + 1)
                    );
                }

                room.totalTurns =
                    room.drawerOrder.length;

                room.currentTurn =
                    0;

                callback({
                    success: true
                });

                console.log(
                    `Game started in room ${room.code}: ${rounds} round(s), ${roundTime}s, ${choiceCount} word choices`
                );

                advanceRound(
                    room
                );
            }
        );

        // ========================================
        // CHOOSE WORD
        // ========================================

        socket.on(
            "choose_word",
            (
                data: {
                    word?: string;
                }
            ) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "choosing" ||
                    room.currentDrawerId !==
                        player.id
                ) {
                    return;
                }

                const word =
                    data?.word;

                if (
                    typeof word !==
                        "string" ||
                    !room.wordChoices.includes(
                        word
                    )
                ) {
                    return;
                }

                beginDrawing(
                    room,
                    word
                );
            }
        );

        // ========================================
        // DRAW STROKE
        // ========================================

        socket.on(
            "draw_stroke",
            (data: unknown) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId !==
                        player.id
                ) {
                    return;
                }

                if (
                    room.strokes.length >=
                    MAX_STROKES_PER_ROUND
                ) {
                    return;
                }

                const stroke =
                    sanitizeStroke(
                        data
                    );

                if (!stroke) {
                    return;
                }

                room.strokes.push(
                    stroke
                );

                socket
                    .to(room.code)
                    .emit(
                        "draw_stroke",
                        stroke
                    );
            }
        );

        // ========================================
        // CLEAR
        // ========================================

        socket.on(
            "draw_clear",
            () => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId !==
                        player.id
                ) {
                    return;
                }

                room.strokes = [];

                socket
                    .to(room.code)
                    .emit(
                        "draw_clear"
                    );
            }
        );

        // ========================================
        // UNDO
        // ========================================

        socket.on(
            "draw_undo",
            () => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId !==
                        player.id
                ) {
                    return;
                }

                if (
                    room.strokes.length ===
                    0
                ) {
                    return;
                }

                room.strokes.pop();

                socket
                    .to(room.code)
                    .emit(
                        "draw_undo"
                    );
            }
        );

        // ========================================
        // LIVE DRAWING
        // ========================================

        socket.on(
            "draw_live",
            (data: unknown) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId !==
                        player.id
                ) {
                    return;
                }

                const stroke =
                    sanitizeStroke(
                        data
                    );

                if (!stroke) {
                    return;
                }

                const start =
                    typeof data ===
                        "object" &&
                    data !== null &&
                    (
                        data as {
                            start?: unknown;
                        }
                    ).start === true;

                socket
                    .to(room.code)
                    .emit(
                        "draw_live",
                        {
                            ...stroke,
                            start
                        }
                    );
            }
        );

        socket.on(
            "draw_live_end",
            () => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId !==
                        player.id
                ) {
                    return;
                }

                socket
                    .to(room.code)
                    .emit(
                        "draw_live_end"
                    );
            }
        );

        // ========================================
        // LOBBY CHAT
        // ========================================

        socket.on(
            "lobby_chat",
            (
                data: {
                    message?: unknown;
                }
            ) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                    "lobby"
                ) {
                    return;
                }

                const message =
                    typeof data?.message ===
                        "string"
                        ? data.message
                            .trim()
                            .replace(
                                /\s+/g,
                                " "
                            )
                        : "";

                if (
                    !message ||
                    message.length >
                        MAX_LOBBY_MESSAGE_LENGTH
                ) {
                    return;
                }

                const now =
                    Date.now();

                const last: number =
                    socket.data
                        .lastLobbyChatAt ??
                    0;

                if (
                    now - last <
                    MIN_LOBBY_CHAT_INTERVAL_MS
                ) {
                    return;
                }

                socket.data.lastLobbyChatAt =
                    now;

                const entry:
                    LobbyMessage = {
                    playerId:
                        player.id,

                    playerName:
                        player.name,

                    message
                };

                room.lobbyChat.push(
                    entry
                );

                if (
                    room.lobbyChat
                        .length >
                    MAX_LOBBY_MESSAGES
                ) {
                    room.lobbyChat.shift();
                }

                io.to(room.code).emit(
                    "lobby_message",
                    entry
                );
            }
        );

        // ========================================
        // PLAYER GUESS
        // ========================================

        socket.on(
            "player_guess",
            (
                data: {
                    guess?: string;
                }
            ) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    !room.currentWord ||
                    !room.currentDrawerId ||
                    room.timeLeft <= 0
                ) {
                    return;
                }

                const guess =
                    typeof data?.guess ===
                        "string"
                        ? data.guess.trim()
                        : "";

                if (
                    !guess ||
                    guess.length > 100
                ) {
                    return;
                }

                const now =
                    Date.now();

                const lastGuessAt:
                    number =
                    socket.data
                        .lastGuessAt ??
                    0;

                if (
                    now - lastGuessAt <
                    MIN_GUESS_INTERVAL_MS
                ) {
                    return;
                }

                socket.data.lastGuessAt =
                    now;

                // ========================================
                // ALREADY CORRECT
                // ========================================

                if (
                    room.correctGuessers.includes(
                        player.id
                    ) ||
                    room.currentDrawerId ===
                        player.id
                ) {
                    room.players.forEach(
                        p => {

                            if (
                                p.id ===
                                    room.currentDrawerId ||
                                room.correctGuessers.includes(
                                    p.id
                                )
                            ) {
                                emitTo(
                                    p,
                                    "chat_message",
                                    {
                                        playerId:
                                            player.id,

                                        playerName:
                                            `${player.name} 🔒`,

                                        message:
                                            guess,

                                        correct:
                                            false
                                    }
                                );
                            }
                        }
                    );

                    return;
                }

                const normalized =
                    normalizeGuess(
                        guess
                    );

                const correct =
                    normalized ===
                    normalizeGuess(
                        room.currentWord
                    );

                // ========================================
                // CORRECT GUESS
                // ========================================

                if (correct) {

                    room.correctGuessers.push(
                        player.id
                    );

// 0 = first correct guesser, 1 = second, ...
// (this player was just added to correctGuessers above)
const order = room.correctGuessers.length - 1;

const guesserPoints =
    guessPoints(room.timeLeft, room.roundDuration, order);

addPoints(room, player.id, guesserPoints);

  const gs = statsOf(room, player.id);
  gs.correct++;
  gs.guessSecs += room.roundDuration - room.timeLeft;

// Drawer gets the average of what the guessers earn:
// each correct guess adds (its points / number of guessers).
const drawerId = room.currentDrawerId;

if (drawerId) {

    const guesserCount = Math.max(1, room.players.length - 1);

addPoints(
    room,
    drawerId,
    Math.round((guesserPoints * DRAWER_SHARE) / guesserCount)
);
}

                    io.to(room.code).emit(
                        "correct_guess",
                        {
                            playerId:
                                player.id,

                            playerName:
                                player.name,

                            points:
                                guesserPoints
                        }
                    );

                    sendScores(room);

                    console.log(
                        `${player.name} guessed correctly in room ${room.code} (+${guesserPoints})`
                    );

                    if (
                        allGuessersDone(
                            room
                        )
                    ) {
                        endRound(room);
                    }

                } else {

                    const key =
                        `${player.id}:${normalized}`;

                    if (
                        room.wrongGuesses.has(
                            key
                        )
                    ) {
                        return;
                    }

                    room.wrongGuesses.add(
                        key
                    );

                    const target =
                        normalizeGuess(
                            room.currentWord
                        );

                    const maxDist =
                        target.length >= 6
                            ? 2
                            : target.length >= 3
                                ? 1
                                : 0;

                    if (
                        maxDist > 0 &&
                        editDistance(
                            normalized,
                            target
                        ) <= maxDist
                    ) {
                        emitTo(
                            player,
                            "close_guess",
                            {
                                guess
                            }
                        );
                    }

                    io.to(room.code).emit(
                        "chat_message",
                        {
                            playerId:
                                player.id,

                            playerName:
                                player.name,

                            message:
                                guess,

                            correct:
                                false
                        }
                    );
                }
            }
        );

        // ========================================
        // LIKE / DISLIKE
        // ========================================

        socket.on(
            "react",
            (
                data: {
                    type?: unknown;
                }
            ) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId ===
                        player.id
                ) {
                    return;
                }

                const type =
                    data?.type;

                if (
                    type !== "like" &&
                    type !== "dislike"
                ) {
                    return;
                }

                if (
                    room.votes.has(
                        player.id
                    )
                ) {
                    return;
                }

                room.votes.set(
                    player.id,
                    type
                );

                  if (type === "like" && room.currentDrawerId) {
                      statsOf(room, room.currentDrawerId).likes++;
                  }
                
                sendReactions(
                    room
                );

                io.to(room.code).emit(
                    "reaction_made",
                    {
                        playerId:
                            player.id,

                        playerName:
                            player.name,

                        type
                    }
                );
            }
        );

        // ========================================
        // TOMATO
        // ========================================

        socket.on(
            "throw_egg",
            (data?: { skin?: unknown }) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId ===
                        player.id
                ) {
                    return;
                }

                if (
                    room.eggThrown.has(
                        player.id
                    )
                ) {
                    return;
                }

                const eggs =
                    room.eggsLeft[
                        player.id
                    ] ?? 0;

                if (
                    eggs <= 0
                ) {
                    return;
                }

                room.eggThrown.add(
                    player.id
                );

                room.eggsLeft[
                    player.id
                ] =
                    eggs - 1;

                const egg:
                    EggPosition = {
                    x:
                        0.1 +
                        Math.random() *
                            0.8,

                    y:
                        0.1 +
                        Math.random() *
                            0.8
                };

                room.eggs.push(
                    egg
                );

                  if (room.currentDrawerId) {
                      statsOf(room, room.currentDrawerId).eggsTaken++;
                  }
                
                io.to(room.code).emit(
                    "egg_thrown",
                    {
                        playerId:
                            player.id,

                        playerName:
                            player.name,

                        x:
                            egg.x,

                        y:
                            egg.y,

                        skin:
                            readSkin(data?.skin)
                    }
                );

                emitTo(
                    player,
                    "eggs_update",
                    {
                        eggsLeft:
                            room.eggsLeft[
                                player.id
                            ] ?? 0
                    }
                );

                console.log(
                                   `${player.name} threw ${readSkin(data?.skin)} in room ${room.code}`
                );
            }
        );

        // ========================================
        // TAUNT
        // ========================================

        socket.on(
            "send_taunt",
            (data?: { id?: unknown }) => {

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

                const id = Number(data?.id);

                if (
                    !Number.isInteger(id) ||
                    id < 1 ||
                    id > TAUNT_COUNT
                ) {
                    return;
                }

                if (room.tauntSent.has(player.id)) {
                    return;
                }

                const left = room.tauntsLeft[player.id] ?? 0;

                if (left <= 0) {
                    return;
                }

                room.tauntSent.add(player.id);

                room.tauntsLeft[player.id] = left - 1;

                io.to(room.code).emit(
                    "taunt_played",
                    {
                        playerId: player.id,
                        playerName: player.name,
                        id
                    }
                );

                emitTo(
                    player,
                    "taunts_update",
                    {
                        tauntsLeft:
                            room.tauntsLeft[player.id] ?? 0
                    }
                );
            }
        );
        
        // ========================================
        // KICK PLAYER
        // ========================================

        socket.on(
            "kick_player",
            (
                data: {
                    playerId?: unknown;
                }
            ) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.hostId !==
                    player.id
                ) {
                    return;
                }

                const targetId =
                    typeof data?.playerId ===
                        "string"
                        ? data.playerId
                        : "";

                if (
                    !targetId ||
                    targetId ===
                        player.id
                ) {
                    return;
                }

                const target =
                    room.players.find(
                        p =>
                            p.id ===
                            targetId
                    );

                if (!target) {
                    return;
                }

                room.kicked.add(
                    targetId
                );

                if (
                    target.socketId
                ) {
                    emitTo(
                        target,
                        "kicked"
                    );

                    io.sockets.sockets
                        .get(
                            target.socketId
                        )
                        ?.leave(
                            room.code
                        );
                }

                removePlayer(
                    room,
                    targetId
                );

                console.log(
                    `${target.name} was kicked from room ${room.code}`
                );
            }
        );

        // ========================================
        // TRANSFER HOST
        // ========================================

        socket.on(
            "transfer_host",
            (
                data: {
                    playerId?: unknown;
                }
            ) => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.hostId !==
                    player.id
                ) {
                    return;
                }

                // Public rooms: the host role only moves automatically.
                if (room.isPublic) {
                    return;
                }

                const targetId =
                    typeof data?.playerId ===
                        "string"
                        ? data.playerId
                        : "";

                const target =
                    room.players.find(
                        p =>
                            p.id ===
                            targetId
                    );

                if (
                    !target ||
                    !target.connected ||
                    target.id ===
                        player.id
                ) {
                    return;
                }

                room.hostId =
                    target.id;

                room.players.forEach(
                    p => {
                        p.isHost =
                            p.id ===
                            room.hostId;
                    }
                );

                sendRoomUpdate(
                    room
                );

                console.log(
                    `${target.name} is now host of room ${room.code}`
                );
            }
        );

        // ========================================
        // SKIP WORD
        // ========================================

        socket.on(
            "skip_word",
            () => {

                const ctx =
                    getContext(socket);

                if (!ctx) {
                    return;
                }

                const {
                    room,
                    player
                } = ctx;

                if (
                    room.phase !==
                        "drawing" ||
                    room.currentDrawerId !==
                        player.id ||
                    room.skipUsed ||
                    room.correctGuessers
                        .length > 0
                ) {
                    return;
                }

                room.skipUsed =
                    true;

                startRound(
                    room,
                    player
                );
            }
        );

        // ========================================
        // LEAVE ROOM
        // ========================================

        socket.on(
            "leave_room",
            () => {
                leaveCurrentRoom(
                    socket
                );
            }
        );

        // ========================================
        // DISCONNECT
        // ========================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    `Player disconnected: ${playerId} (${socket.id})`
                );

                const code =
                    playerRooms.get(
                        playerId
                    );

                if (!code) {
                    return;
                }

                const room =
                    rooms.get(code);

                if (!room) {
                    playerRooms.delete(
                        playerId
                    );

                    return;
                }

                const player =
                    room.players.find(
                        p =>
                            p.id ===
                            playerId
                    );

                // Newer connection replaced old one.
                if (
                    !player ||
                    player.socketId !==
                        socket.id
                ) {
                    return;
                }

                player.connected =
                    false;

                player.socketId =
                    null;

                sendRoomUpdate(
                    room
                );

                if (
                    player.graceTimer
                ) {
                    clearTimeout(
                        player.graceTimer
                    );
                }

                player.graceTimer =
                    setTimeout(() => {

                        player.graceTimer =
                            null;

                        if (
                            !player.connected
                        ) {
                            console.log(
                                `${player.name} did not return, removing`
                            );

                            removePlayer(
                                room,
                                playerId
                            );
                        }

                    }, RECONNECT_GRACE_MS);

                // Drawer disconnect.
                if (
                    room.currentDrawerId ===
                        playerId &&
                    (
                        room.phase ===
                            "drawing" ||
                        room.phase ===
                            "choosing"
                    )
                ) {

                    const turn =
                        room.currentTurn;

                    setTimeout(
                        () => {

                            if (
                                rooms.get(
                                    room.code
                                ) === room &&
                                room.currentTurn ===
                                    turn &&
                                room.currentDrawerId ===
                                    playerId &&
                                !player.connected &&
                                (
                                    room.phase ===
                                        "drawing" ||
                                    room.phase ===
                                        "choosing"
                                )
                            ) {

                                io.to(
                                    room.code
                                ).emit(
                                    "drawer_left",
                                    {
                                        playerName:
                                            player.name
                                    }
                                );

                                endRound(
                                    room
                                );
                            }

                        },
                        DRAWER_GRACE_MS
                    );
                }

                // Everyone already guessed.
                if (
                    room.phase ===
                        "drawing" &&
                    allGuessersDone(room)
                ) {
                    endRound(room);
                }
            }
        );
    }
);

// ========================================
// START SERVER
// ========================================

httpServer.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Server running on port ${PORT}`
        );
    }
);
