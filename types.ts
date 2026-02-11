export enum GameState {
  MENU,
  PLAYING,
  GAMEOVER,
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}
