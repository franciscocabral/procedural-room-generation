const seed = "gagonilson";
const mapHeight = 40;
const mapWidth = 80;
const maxRooms = 40;
const minRoomSize = 3;
const maxRoomSize = 10;
const maxPassagesPerRoom = 4;
const maxTrapsPerRoom = 5;
const maxTreasuresPerRoom = 3;
const maxMobsPerRoom = 5;
const overlap = true;

const START_POINT = 0;
const BUILDABLE = 1;
const PASSAGE = 20;
const PASSAGE_TRAPPED = 22;
const PASSAGE_HIDDEN = 23;
const FLOOR = 45;
const FLOOR_TRAPPED = 46;
const TREASURE = 47;
const MOB = 50;
const WALL = 55;

const DIRECTIONS = { 1: "top", 2: "bottom", 3: "left", 4: "right" };

const { astar, Graph } = require("./astar");
const seedrandom = require("seedrandom");

let rng;
const initRandom = (seed) => {
  if (!rng) rng = new seedrandom(seed);
};

const random = (min, max) => {
  initRandom(seed);
  return Math.floor(rng() * (max - min + 1) + min);
};

const clone = (map) => {
  let clone = [];
  for (let i = 0; i < map.length; i++) {
    clone[i] = [];
    for (let j = 0; j < map[i].length; j++) {
      clone[i][j] = map[i][j];
    }
  }
  return clone;
};

const print = (map) => {
  for (let i = 0; i < map.length; i++) {
    let row = "";
    for (let j = 0; j < map[i].length; j++) {
      if (map[i][j] === WALL) row += "██";
      if (map[i][j] === BUILDABLE) row += "▓▓";
      if (map[i][j] === PASSAGE) row += "▒▒";
      if (map[i][j] === PASSAGE_TRAPPED) row += "PT";
      if (map[i][j] === PASSAGE_HIDDEN) row += "PH";
      if (map[i][j] === FLOOR) row += "░░";
      if (map[i][j] === FLOOR_TRAPPED) row += "FT";
      if (map[i][j] === TREASURE) row += "TT";
      if (map[i][j] === MOB) row += "MM";
      if (map[i][j] === START_POINT) row += "SS";
    }
    console.log(row);
  }
};

const line = (map, { start, end }) => {
  for (let j = 0; j <= end.x - start.x; j++) {
    for (let k = 0; k <= end.y - start.y; k++) {
      map[start.y + k][start.x + j] = WALL;
    }
  }
};

const generateClearMap = (height, width) => {
  let map = [];
  for (let i = 0; i < height; i++) {
    map[i] = [];
    for (let j = 0; j < width; j++) {
      map[i][j] = BUILDABLE;
    }
  }
  return map;
};

const generateRooms = (
  height,
  width,
  minSize,
  maxSize,
  { maxRooms, maxPassagesPerRoom, maxTrapsPerRoom, maxTreasuresPerRoom, maxMobsPerRoom, canOverlap = false }
) => {
  const rooms = [];
  let count = 0;
  for (let i = 0; i < maxRooms; i++) {
    if (count >= 50) break;

    let room = {};
    room.startPoint = i === 0;
    room.x = random(2, width - maxSize - 2);
    room.y = random(2, height - maxSize - 2);
    room.width = random(minSize, maxSize);
    room.height = random(minSize, maxSize);
    room.center = { x: Math.floor(room.x + room.width / 2), y: Math.floor(room.y + room.height / 2) };
    room.isOverlapping = false;
    room.passages = [];
    room.traps = [];
    room.treasures = [];
    room.mobs = [];

    room.equals = (otherRoom) => {
      return otherRoom.x === room.x && otherRoom.y === room.y && otherRoom.width === room.width && otherRoom.height === room.height;
    };

    const p1 = { x: room.x - 1, y: room.y - 1 };
    const p2 = { x: room.x + room.width, y: room.y - 1 };
    const p3 = { x: room.x - 1, y: room.y + room.height };
    const p4 = { x: room.x + room.width, y: room.y + room.height };

    room.walls = {
      top: { start: p1, end: p2 },
      bottom: { start: p3, end: p4 },
      left: { start: p1, end: p3 },
      right: { start: p2, end: p4 },
    };

    for (let j = 0; j < rooms.length; j++) {
      if (
        !canOverlap &&
        rooms[j].x < room.x + room.width + 2 &&
        rooms[j].x + rooms[j].width > room.x - 2 &&
        rooms[j].y < room.y + room.height + 2 &&
        rooms[j].y + rooms[j].height > room.y - 2
      ) {
        room.isOverlapping = true;
        i--;
        count++;
        break;
      }
    }

    if (!room.isOverlapping || canOverlap) {
      rooms.push(room);
      count = 0;

      const newPassage = (p1, p2) => {
        const x = p1.x === p2.x ? p1.x : random(p1.x + 1, p2.x - 1);
        const y = p1.y === p2.y ? p1.y : random(p1.y + 1, p2.y - 1);
        const hidden = random(0, 1) === 1;
        const trapped = random(0, 1) === 1;
        return { x, y, hidden, trapped };
      };

      const passagesCount = random(1, maxPassagesPerRoom);
      for (let p = 0; p < passagesCount; p++) {
        const dir = random(1, 4);
        const wall = room.walls[DIRECTIONS[dir]];
        const passage = newPassage(wall.start, wall.end);
        room.passages.push(passage);
      }

      const newTrap = (rx, ry, height, width) => {
        const x = random(rx, rx + width);
        const y = random(ry, ry + height);
        const type = random(0, 10);
        return { x, y, type };
      };

      const trapsCount = room.startPoint ? 0 : random(0, maxTrapsPerRoom);
      for (let t = 0; t < trapsCount; t++) {
        const trap = newTrap(room.x, room.y, room.height, room.width);
        room.traps.push(trap);
      }
      const newTreasure = (rx, ry, height, width) => {
        const x = random(rx, rx + width);
        const y = random(ry, ry + height);
        const type = random(0, 10);
        const goods = random(0, 10);
        return { x, y, type, goods };
      };

      const treasuresCount = room.startPoint ? 0 : random(0, maxTreasuresPerRoom);
      for (let t = 0; t < treasuresCount; t++) {
        const treasure = newTreasure(room.x, room.y, room.height, room.width);
        room.treasures.push(treasure);
      }

      const newMob = (rx, ry, height, width) => {
        const x = random(rx, rx + width);
        const y = random(ry, ry + height);
        const type = random(0, 10);
        return { x, y, type };
      };
      const mobsCount = room.startPoint ? 0 : random(1, maxMobsPerRoom);
      for (let t = 0; t < mobsCount; t++) {
        const mob = newMob(room.x, room.y, room.height, room.width);
        room.mobs.push(mob);
      }
    }
  }
  return rooms;
};

const addRoomsToMap = (map, rooms) => {
  const roomMap = clone(map);
  for (let i = 0; i < rooms.length; i++) {
    for (let j = 0; j < rooms[i].height; j++) {
      for (let k = 0; k < rooms[i].width; k++) {
        roomMap[rooms[i].y + j][rooms[i].x + k] = FLOOR;

        // if (j === 0) roomMap[rooms[i].y - 1][rooms[i].x + k] = WALL;
        // if (j === rooms[i].height - 1) roomMap[rooms[i].y + j + 1][rooms[i].x + k] = WALL;
        // if (k === 0) roomMap[rooms[i].y + j][rooms[i].x] = WALL;
        // if (k === rooms[i].width - 1) roomMap[rooms[i].y + j][rooms[i].x + k] = WALL;
      }
    }

    line(roomMap, rooms[i].walls.top);
    line(roomMap, rooms[i].walls.bottom);
    line(roomMap, rooms[i].walls.left);
    line(roomMap, rooms[i].walls.right);

    for (let l = 0; l < rooms[i].passages.length; l++) {
      if (roomMap[rooms[i].passages[l].y][rooms[i].passages[l].x] === WALL) {
        roomMap[rooms[i].passages[l].y][rooms[i].passages[l].x] = PASSAGE;

        if (rooms[i].passages[l].hidden) {
          roomMap[rooms[i].passages[l].y][rooms[i].passages[l].x] = PASSAGE_HIDDEN;
        }
        if (rooms[i].passages[l].trapped) {
          roomMap[rooms[i].passages[l].y][rooms[i].passages[l].x] = PASSAGE_TRAPPED;
        }
      }
    }
    for (let l = 0; l < rooms[i].traps.length; l++) {
      if (roomMap[rooms[i].traps[l].y][rooms[i].traps[l].x] === FLOOR) {
        roomMap[rooms[i].traps[l].y][rooms[i].traps[l].x] = FLOOR_TRAPPED;
      }
    }

    for (let l = 0; l < rooms[i].treasures.length; l++) {
      if (roomMap[rooms[i].treasures[l].y][rooms[i].treasures[l].x] === FLOOR) {
        roomMap[rooms[i].treasures[l].y][rooms[i].treasures[l].x] = TREASURE;
      }
    }

    for (let l = 0; l < rooms[i].mobs.length; l++) {
      if (roomMap[rooms[i].mobs[l].y][rooms[i].mobs[l].x] === FLOOR) {
        roomMap[rooms[i].mobs[l].y][rooms[i].mobs[l].x] = MOB;
      }
    }

    if (rooms[i].startPoint) {
      roomMap[rooms[i].center.y][rooms[i].center.x] = START_POINT;
    }
  }
  return roomMap;
};

const findClosestRoomFromOtherRooms = (rooms, roomsWithPassages, point) => {
  let closestRoom = null;
  let closestDistance = Infinity;
  for (let i = 0; i < rooms.length; i++) {
    let igonreRoom = false;
    for (let j = 0; j < roomsWithPassages.length; j++) {
      const room = roomsWithPassages[j];
      if (room.equals(rooms[i])) {
        igonreRoom = true;
        break;
      }
    }
    if (igonreRoom) continue;

    let distance = Math.sqrt(Math.pow(rooms[i].center.x - point.x, 2) + Math.pow(rooms[i].center.y - point.y, 2));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestRoom = rooms[i];
    }
  }
  return closestRoom;
};

const createCorridorsBetweenRooms = (map, rooms) => {
  const roomMap = clone(map);
  const graph = new Graph(roomMap);

  for (let i = 0; i < rooms.length; i++) {
    const roomsWithPassages = [];
    roomsWithPassages.push(rooms[i]);
    for (let j = 0; j < rooms[i].passages.length; j++) {
      let closestRoom = findClosestRoomFromOtherRooms(rooms, roomsWithPassages, rooms[i].passages[j]);
      roomsWithPassages.push(closestRoom);
      const start = graph.grid[Math.floor(rooms[i].passages[j].y)][Math.floor(rooms[i].passages[j].x)];
      const end = graph.grid[Math.floor(closestRoom.center.y)][Math.floor(closestRoom.center.x)];
      const path = astar.search(graph, start, end);
      for (let k = 0; k < path.length; k++) {
        if (roomMap[path[k].x][path[k].y] !== FLOOR) {
          roomMap[path[k].x][path[k].y] = PASSAGE;
        }
      }
    }
  }
  return roomMap;
};

const clearMap = generateClearMap(mapHeight, mapWidth);
const rooms = generateRooms(mapHeight, mapWidth, minRoomSize, maxRoomSize, {
  maxRooms,
  maxPassagesPerRoom,
  maxTrapsPerRoom,
  maxTreasuresPerRoom,
  maxMobsPerRoom,
  overlap,
});
const mapWithRooms = addRoomsToMap(clearMap, rooms);
const mapWithCorridors = createCorridorsBetweenRooms(mapWithRooms, rooms);
print(mapWithCorridors);
// console.log(mapWithCorridors);
