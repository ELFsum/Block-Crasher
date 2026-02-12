
import React, { useEffect, useRef } from 'react';
import { GameState, InputState } from '../types';
import { GameCore } from '../engine/GameCore';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onGameOverOverride: (score: number, reason: 'DEVOURED' | 'TIMEUP') => void;
  setScore: (score: number) => void;
  setTime: (time: string) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onGameOverOverride, setScore, setTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameCore | null>(null);
  // Fix: Initializing useRef with an initial value to satisfy TypeScript's requirement for 1 argument.
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!canvasRef.current) return;

    const handleGameOver = (finalScore: number, reason: 'DEVOURED' | 'TIMEUP') => {
      onGameOverOverride(finalScore, reason);
    };

    const handleScoreUpdate = (newScore: number) => {
      setScore(newScore);
    };

    const handleTimeUpdate = (newTimeStr: string) => {
      setTime(newTimeStr);
    };

    engineRef.current = new GameCore(canvasRef.current, handleGameOver, handleScoreUpdate, handleTimeUpdate);

    const resize = () => {
      engineRef.current?.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);
    resize();

    const input: InputState = { up: false, down: false, left: false, right: false };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
      engineRef.current?.handleInput(input);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
      engineRef.current?.handleInput(input);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (engineRef.current) engineRef.current.startJoystick(touch.clientX, touch.clientY, touch.identifier);
        }
    };
    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (engineRef.current) engineRef.current.moveJoystick(touch.clientX, touch.clientY, touch.identifier);
        }
    };
    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (engineRef.current) engineRef.current.endJoystick(touch.identifier);
        }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const loop = () => {
      if (gameState === GameState.PLAYING && engineRef.current) {
        engineRef.current.update();
      }
      if (engineRef.current) {
         engineRef.current.draw();
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && engineRef.current && (engineRef.current.player.isDead || engineRef.current.lastTimeStr === '00:00')) {
      engineRef.current.initWorld();
    }
  }, [gameState]);

  return (
    <canvas ref={canvasRef} className="block w-full h-full" />
  );
};
