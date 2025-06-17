export interface Position {
  x: number;
  y: number;
}

export interface Bomb {
  id: number;
  x: number;
  y: number;
  timer: number;
}

export interface Explosion {
  id: number;
  x: number;
  y: number;
  timer: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  direction: number; // 0: up, 1: right, 2: down, 3: left
  lastMoveTime: number;
}