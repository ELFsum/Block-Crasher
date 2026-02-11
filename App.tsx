import React, { useState } from 'react';
import { GameState } from './types';
import { GameCanvas } from './components/GameCanvas';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(1600); // Initial area ~40x40
  const [time, setTime] = useState<string>("00:00");

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(1600);
    setTime("00:00");
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 select-none touch-none">
      
      {/* The Game Canvas */}
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState} 
        setScore={setScore} 
        setTime={setTime}
      />

      {/* UI Overlay */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-6 left-6 pointer-events-none flex gap-4">
          <div className="bg-slate-800/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-xl border border-slate-700">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Mass</h2>
            <p className="text-3xl font-black text-blue-400 tabular-nums">{score}</p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-xl border border-slate-700">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Time</h2>
            <p className="text-3xl font-black text-green-400 tabular-nums">{time}</p>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10">
          <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-700 transform transition-all">
            <div className="mb-8">
              <div className="inline-block p-4 bg-blue-500/20 rounded-2xl mb-4 shadow-inner">
                {/* Flat 2D Square Logo */}
                <div className="w-16 h-16 bg-blue-500 border-4 border-blue-700 rounded-sm"></div>
              </div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Block Devourer</h1>
              <p className="text-slate-400 font-medium">Top-down 2D survival arena.</p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-5 mb-8 text-left space-y-3 border border-slate-700/50">
              <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-blue-500 mr-3 inline-block shadow-sm min-w-[16px]"></span> You control the Blue block (WASD, Arrows, or Touch).</p>
              <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-green-500 mr-3 inline-block shadow-sm min-w-[16px]"></span> <span><strong className="text-white mr-1">Green:</strong> Smaller than you. Eat them to grow!</span></p>
              <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-yellow-500 mr-3 inline-block shadow-sm min-w-[16px]"></span> <span><strong className="text-white mr-1">Yellow:</strong> Similar size. The smaller block drops pieces when colliding.</span></p>
              <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-red-500 mr-3 inline-block shadow-sm min-w-[16px]"></span> <span><strong className="text-white mr-1">Red:</strong> Danger! They will instantly absorb you.</span></p>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-lg shadow-[0_6px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-[6px] transition-all"
            >
              PLAY NOW
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-md z-10">
          <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-700 animate-bounce-in">
            <h1 className="text-4xl font-black text-red-500 mb-2">DEVOURED!</h1>
            <p className="text-slate-400 mb-8 font-medium">A larger block absorbed you.</p>
            
            <div className="flex justify-center gap-6 mb-8">
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Final Mass</h2>
                <p className="text-4xl font-black text-white tabular-nums">{score}</p>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Time</h2>
                <p className="text-4xl font-black text-green-400 tabular-nums">{time}</p>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl text-lg shadow-[0_6px_0_#cbd5e1] hover:bg-slate-100 active:shadow-[0_0px_0_#cbd5e1] active:translate-y-[6px] transition-all"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
