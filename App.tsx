import React, { useState, useEffect } from 'react';
import { GameState } from './types';
import { GameCanvas } from './components/GameCanvas';

interface HighScore {
  score: number;
  date: string;
}

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(1600); 
  const [time, setTime] = useState<string>("03:00");
  const [endReason, setEndReason] = useState<'DEVOURED' | 'TIMEUP'>('DEVOURED');
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  // Load high scores on mount
  useEffect(() => {
    const saved = localStorage.getItem('block_devourer_scores');
    if (saved) {
      setHighScores(JSON.parse(saved));
    }
  }, []);

  const saveHighScore = (newScore: number) => {
    const newEntry: HighScore = {
      score: newScore,
      date: new Date().toLocaleDateString()
    };
    const updated = [...highScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    setHighScores(updated);
    localStorage.setItem('block_devourer_scores', JSON.stringify(updated));
  };

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(1600);
    setTime("03:00");
  };

  const handleGameOver = (finalScore: number, reason: 'DEVOURED' | 'TIMEUP') => {
    setScore(finalScore);
    setEndReason(reason);
    setGameState(GameState.GAMEOVER);
    saveHighScore(finalScore);
  };

  const goToMenu = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 select-none touch-none">
      
      {/* The Game Canvas */}
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState} 
        onGameOverOverride={handleGameOver}
        setScore={setScore} 
        setTime={setTime}
      />

      {/* UI Overlay */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-6 left-6 pointer-events-none flex gap-4 animate-fade-in">
          <div className="bg-slate-800/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-xl border border-slate-700">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Mass</h2>
            <p className="text-3xl font-black text-blue-400 tabular-nums">{score}</p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-xl border border-slate-700">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Time Left</h2>
            <p className={`text-3xl font-black tabular-nums ${time.startsWith('00:') ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
              {time}
            </p>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10 p-6">
          <div className="flex flex-col md:flex-row gap-8 items-stretch w-full max-w-5xl justify-center">
            
            {/* Left: Leaderboard */}
            <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-3xl border border-slate-700 w-full md:w-80 flex flex-col">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <span className="text-yellow-500">🏆</span> HALL OF FAME
              </h2>
              <div className="space-y-3 flex-1">
                {highScores.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No records yet. Be the first!</p>
                ) : (
                  highScores.map((hs, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">{hs.date}</p>
                        <p className="text-lg font-black text-blue-400">{hs.score}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                        #{idx + 1}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Main Entry */}
            <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-700 transform transition-all flex flex-col justify-between">
              <div>
                <div className="inline-block p-4 bg-blue-500/20 rounded-2xl mb-4 shadow-inner">
                  <div className="w-16 h-16 bg-blue-500 border-4 border-blue-700 rounded-sm"></div>
                </div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Block Devourer</h1>
                <p className="text-slate-400 font-medium mb-6">3-Minute Arena Survival</p>
                
                <div className="bg-slate-900/50 rounded-xl p-5 mb-8 text-left space-y-3 border border-slate-700/50">
                  <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-blue-500 mr-3 inline-block min-w-[16px]"></span>WASD / Touch to Move</p>
                  <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-green-500 mr-3 inline-block min-w-[16px]"></span>Eat smaller blocks to grow</p>
                  <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-yellow-500 mr-3 inline-block min-w-[16px]"></span>Bump similar blocks to knock off shards</p>
                  <p className="text-sm text-slate-300 flex items-center"><span className="w-4 h-4 rounded bg-red-500 mr-3 inline-block min-w-[16px]"></span>Avoid larger blocks, or be devoured!</p>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-lg shadow-[0_6px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-[6px] transition-all"
              >
                START CHALLENGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === GameState.GAMEOVER && (
        <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-md z-10 ${endReason === 'TIMEUP' ? 'bg-blue-900/40' : 'bg-red-900/40'}`}>
          <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-700 animate-bounce-in">
            <h1 className={`text-4xl font-black mb-2 ${endReason === 'TIMEUP' ? 'text-blue-400' : 'text-red-500'}`}>
              {endReason === 'TIMEUP' ? "TIME'S UP!" : "DEVOURED!"}
            </h1>
            <p className="text-slate-400 mb-8 font-medium">
              {endReason === 'TIMEUP' ? "Arena closed. Challenge over." : "A larger block absorbed you."}
            </p>
            
            <div className="bg-slate-900/50 p-6 rounded-2xl mb-8 border border-slate-700">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Final Mass</h2>
              <p className="text-5xl font-black text-white tabular-nums">{score}</p>
              {highScores[0]?.score === score && score > 0 && (
                <div className="mt-2 text-yellow-500 font-bold text-sm animate-pulse">✨ NEW RECORD! ✨</div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={startGame}
                className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl text-lg shadow-[0_6px_0_#cbd5e1] hover:bg-slate-100 active:shadow-[0_0px_0_#cbd5e1] active:translate-y-[6px] transition-all"
              >
                PLAY AGAIN
              </button>
              
              <button 
                onClick={goToMenu}
                className="w-full py-4 bg-slate-700 text-white font-bold rounded-xl text-lg shadow-[0_6px_0_#334155] hover:bg-slate-600 active:shadow-[0_0px_0_#334155] active:translate-y-[6px] transition-all"
              >
                EXIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
