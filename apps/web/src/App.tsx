import React, { useState, useEffect } from 'react';
import { socket, SERVER_URL } from './lib/socket';
import type { DraftState, Player, Character, DraftPick } from './types';
import {
  Swords,
  Users,
  Clock,
  Sparkles,
  Trophy,
  Copy,
  Check,
  Play,
  RotateCcw,
  Search,
  Filter,
  ShieldAlert,
  ChevronRight,
  Flame,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function App() {
  // Session Identity
  const [currentUser, setCurrentUser] = useState<Player>(() => {
    const saved = localStorage.getItem('anime_arena_user');
    if (saved) return JSON.parse(saved);
    const guestId = 'usr_' + Math.random().toString(36).substring(2, 9);
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const initial: Player = {
      id: guestId,
      name: `Shinobi_${randomNum}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
      isHost: false,
      isReady: false,
      connected: true,
      joinedAt: Date.now()
    };
    localStorage.setItem('anime_arena_user', JSON.stringify(initial));
    return initial;
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<'HOME' | 'LOBBY' | 'DRAFT' | 'RESULTS' | 'CATALOGUE'>('HOME');
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filters for Draft and Catalogue
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState<string>('ALL');
  const [catalogueCharacters, setCatalogueCharacters] = useState<Character[]>([]);
  const [, setCatalogueLoading] = useState(false);
  const [pickSubmitting, setPickSubmitting] = useState(false);

  // Timer Countdown state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  // Fetch full catalogue
  useEffect(() => {
    fetchCatalogue();
  }, [searchQuery, selectedFranchiseFilter]);

  const fetchCatalogue = async () => {
    setCatalogueLoading(true);
    try {
      let url = `${SERVER_URL}/api/catalogue/characters?`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      if (selectedFranchiseFilter !== 'ALL') url += `franchise=${encodeURIComponent(selectedFranchiseFilter)}&`;
      const res = await fetch(url);
      const data = await res.json();
      setCatalogueCharacters(data.characters || []);
    } catch (err) {
      console.error('Error fetching catalogue:', err);
    } finally {
      setCatalogueLoading(false);
    }
  };

  // Socket Listener lifecycle
  useEffect(() => {
    socket.on('session:identity', ({ playerId, sessionToken }: { playerId: string; sessionToken: string }) => {
      localStorage.setItem('anime_arena_session_token', sessionToken);
      setCurrentUser((previous) => {
        const next = { ...previous, id: playerId, isHost: false, connected: true };
        localStorage.setItem('anime_arena_user', JSON.stringify(next));
        return next;
      });
    });

    socket.on('draft:state', (newState: DraftState) => {
      setDraftState(newState);

      if (newState.phase === 'LOBBY') {
        setActiveTab('LOBBY');
      } else if (newState.phase === 'ACTIVE_DRAFT') {
        setActiveTab('DRAFT');
      } else if (newState.phase === 'COMPLETED') {
        setActiveTab('RESULTS');
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    });

    socket.on('draft:pick:rejected', ({ reason }: { reason: string }) => {
      setErrorMessage(reason);
      setPickSubmitting(false);
    });

    return () => {
      socket.off('session:identity');
      socket.off('draft:state');
      socket.off('draft:pick:rejected');
    };
  }, []);

  // Timer tick effect based on authoritative turnDeadline
  useEffect(() => {
    if (!draftState?.turnDeadline || draftState.phase !== 'ACTIVE_DRAFT') return;

    const interval = setInterval(() => {
      const remainingMs = draftState.turnDeadline! - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(sec);
    }, 500);

    return () => clearInterval(interval);
  }, [draftState?.turnDeadline, draftState?.phase]);

  // Actions
  const handleCreateRoom = (isCrossVerse: boolean = true) => {
    setErrorMessage(null);
    const hostUser: Player = { ...currentUser, isHost: true };
    setCurrentUser(hostUser);

    socket.emit(
      'room:create',
      {
        player: hostUser,
        settings: {
          roomName: `${hostUser.name}'s Anime Arena`,
          draftMode: isCrossVerse ? 'CROSS_VERSE' : 'CLASSIC',
          turnOrder: 'SNAKE',
          identityPolicy: 'CANONICAL_ONLY',
          turnDuration: 30,
          rounds: 5
        }
      },
      (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setErrorMessage(null);

    const playerToJoin: Player = { ...currentUser, isHost: false };
    socket.emit(
      'room:join',
      { roomCode: joinCodeInput.trim().toUpperCase(), player: playerToJoin },
      (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to join room');
        }
      }
    );
  };

  const toggleReady = () => {
    if (!draftState) return;
    const myPlayer = draftState.players.find(p => p.id === currentUser.id);
    socket.emit('room:ready', { isReady: !myPlayer?.isReady });
  };

  const handleStartGame = () => {
    setErrorMessage(null);
    socket.emit('draft:start', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Could not start match');
      }
    });
  };

  const handleMakePick = (character: Character) => {
    if (!draftState || draftState.currentTurnPlayerId !== currentUser.id) return;
    setPickSubmitting(true);
    setErrorMessage(null);

    socket.emit('draft:pick', { character }, (res: any) => {
      setPickSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Selection rejected');
      }
    });
  };

  const handleRematch = () => {
    socket.emit('draft:rematch', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Could not rematch');
      }
    });
  };

  const copyRoomCode = () => {
    if (draftState?.roomCode) {
      navigator.clipboard.writeText(draftState.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const myTurn = draftState?.currentTurnPlayerId === currentUser.id;
  const currentTurnPlayer = draftState?.players.find(p => p.id === draftState.currentTurnPlayerId);

  // Group picks by player for team display
  const playerTeams: Record<string, DraftPick[]> = {};
  if (draftState) {
    for (const player of draftState.players) {
      playerTeams[player.id] = draftState.picks.filter(p => p.playerId === player.id);
    }
  }

  // Unique franchises for filter dropdown
  const allFranchises = Array.from(new Set(catalogueCharacters.map(c => c.franchise)));

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-[#0e1422]/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('HOME')}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Swords className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              ANIME ARENA
            </h1>
            <p className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest -mt-1">
              Cross-Verse Multiplayer Draft
            </p>
          </div>
        </div>

        <nav className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => setActiveTab('CATALOGUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'CATALOGUE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Catalogue
          </button>

          {draftState && (
            <button
              onClick={() => setActiveTab(draftState.phase === 'COMPLETED' ? 'RESULTS' : draftState.phase === 'ACTIVE_DRAFT' ? 'DRAFT' : 'LOBBY')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 hover:bg-cyan-500/20"
            >
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Room: {draftState.roomCode}
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-8 w-8 rounded-full border border-indigo-500/40 bg-slate-900"
            />
            <span className="text-xs font-medium text-slate-300 hidden sm:inline max-w-[100px] truncate">
              {currentUser.name}
            </span>
          </div>
        </nav>
      </header>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 text-rose-300 text-xs px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white text-base">âœ•</button>
        </div>
      )}

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'HOME' && (
          <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 max-w-5xl mx-auto w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6">
              <Sparkles className="h-4 w-4" />
              Next-Gen Real-Time Anime Draft Engine
            </div>

            <h2 className="text-4xl sm:text-6xl font-black text-center tracking-tight leading-tight max-w-3xl">
              DRAFT THE ULTIMATE <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                CROSS-VERSE ROSTER
              </span>
            </h2>

            <p className="mt-4 text-slate-400 text-center max-w-xl text-sm sm:text-base leading-relaxed">
              Create a private lobby, invite your friends with a room code, and take turns drafting iconic characters from Dragon Ball, Naruto, One Piece, Bleach, Jujutsu Kaisen, and more.
            </p>

            {/* Quick Play & Room Actions */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              <button
                onClick={() => handleCreateRoom(true)}
                className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Flame className="h-5 w-5 text-amber-300" />
                <span>Create Cross-Verse Room</span>
                <ChevronRight className="h-4 w-4 opacity-60 group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => {
                  const modal = document.getElementById('joinModal');
                  if (modal) (modal as any).showModal();
                }}
                className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-sm transition"
              >
                <Users className="h-5 w-5 text-cyan-400" />
                <span>Join with Code</span>
              </button>
            </div>

            {/* Featured Universes Strip */}
            <div className="mt-16 w-full border-t border-slate-900 pt-10 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-6">
                Featured Anime Universes In Roster
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {[
                  'Dragon Ball Z',
                  'Naruto Shippuden',
                  'One Piece',
                  'Jujutsu Kaisen',
                  'Bleach',
                  'Attack on Titan',
                  'Hunter x Hunter',
                  'Solo Leveling',
                  'Demon Slayer',
                  'Frieren'
                ].map((anime) => (
                  <span
                    key={anime}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
                  >
                    {anime}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: LOBBY */}
        {activeTab === 'LOBBY' && draftState && (
          <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Match Lobby</span>
                <h2 className="text-2xl font-black text-white mt-1">{draftState.settings.roomName}</h2>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {draftState.settings.draftMode}
                  </span>
                  <span>{draftState.settings.rounds} Rounds</span>
                  <span>â€¢</span>
                  <span>{draftState.settings.turnDuration}s per turn</span>
                  <span>â€¢</span>
                  <span>{draftState.settings.identityPolicy}</span>
                </div>
              </div>

              {/* Room Code Share Card */}
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Room Code</div>
                  <div className="text-2xl font-mono font-black text-cyan-400 tracking-wider">
                    {draftState.roomCode}
                  </div>
                </div>
                <button
                  onClick={copyRoomCode}
                  className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Copy room code"
                >
                  {copiedCode ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Players Roster In Lobby */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  Players Joined ({draftState.players.length}/{draftState.settings.maxPlayers})
                </h3>
                <span className="text-xs text-slate-500">Min 2 players required to draft</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {draftState.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="h-10 w-10 rounded-full border border-slate-700 bg-slate-950"
                      />
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {player.name}
                          {player.isHost && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              HOST
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {player.id === currentUser.id ? '(You)' : 'Player'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ready
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lobby Actions */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  onClick={toggleReady}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold border transition ${
                    draftState.players.find(p => p.id === currentUser.id)?.isReady
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                  }`}
                >
                  {draftState.players.find(p => p.id === currentUser.id)?.isReady ? 'Mark Not Ready' : 'Ready Up'}
                </button>

                {draftState.players.find(p => p.id === currentUser.id)?.isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={draftState.players.length < draftState.settings.minPlayers}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Start Draft</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ACTIVE DRAFT SCREEN (Primary High-Density UI) */}
        {activeTab === 'DRAFT' && draftState && (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left Side: Drafting Pool & Filters */}
            <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
              {/* Turn Banner */}
              <div className={`p-4 border-b border-slate-800 flex items-center justify-between ${
                myTurn ? 'bg-indigo-950/40 border-indigo-500/30' : 'bg-slate-900/60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${
                    myTurn ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {draftState.currentRound}
                  </div>
                  <div>
                    <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
                      Round {draftState.currentRound} â€¢ Pick #{draftState.currentPickIndex + 1}
                    </div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      {myTurn ? (
                        <span className="text-indigo-400 font-black animate-pulse">YOUR TURN TO PICK!</span>
                      ) : (
                        <span>Turn: <strong className="text-cyan-400">{currentTurnPlayer?.name}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Authoritative Timer Indicator */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800">
                  <Clock className={`h-5 w-5 ${secondsRemaining <= 10 ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
                  <span className={`text-xl font-mono font-black ${secondsRemaining <= 10 ? 'text-rose-400' : 'text-white'}`}>
                    {secondsRemaining}s
                  </span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="p-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search anime character by name or alias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={selectedFranchiseFilter}
                    onChange={(e) => setSelectedFranchiseFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Franchises</option>
                    {allFranchises.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Character Grid */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {catalogueCharacters.map((char) => {
                  const isPicked = draftState.picks.some(
                    p => draftState.settings.identityPolicy === 'CANONICAL_ONLY'
                      ? p.character.canonicalId === char.canonicalId
                      : p.character.id === char.id
                  );

                  return (
                    <div
                      key={char.id}
                      className={`group relative rounded-xl border overflow-hidden flex flex-col bg-slate-900/90 transition shadow-md ${
                        isPicked
                          ? 'border-slate-800 opacity-40 grayscale pointer-events-none'
                          : myTurn
                          ? 'border-slate-800 hover:border-indigo-500 hover:shadow-indigo-500/20 cursor-pointer'
                          : 'border-slate-800'
                      }`}
                    >
                      {/* Character Artwork */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-slate-950">
                        <img
                          src={char.imageUrl}
                          alt={char.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                        {/* Franchise Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                          {char.franchise}
                        </div>

                        {/* Form Badge */}
                        {char.form && char.form !== 'Base' && (
                          <div className="absolute bottom-2 left-2 right-2 px-1.5 py-0.5 rounded bg-indigo-950/80 backdrop-blur text-[10px] font-semibold text-indigo-300 border border-indigo-500/30 truncate">
                            {char.form}
                          </div>
                        )}
                      </div>

                      {/* Card Info & Pick Action */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white truncate">{char.name}</h4>
                          <p className="text-[10px] text-slate-400 truncate">{char.role || 'Combatant'}</p>
                        </div>

                        {isPicked ? (
                          <div className="mt-2 text-[10px] uppercase font-bold text-slate-500 text-center py-1 bg-slate-950 rounded">
                            Drafted
                          </div>
                        ) : myTurn ? (
                          <button
                            onClick={() => handleMakePick(char)}
                            disabled={pickSubmitting}
                            className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
                          >
                            Draft Pick
                          </button>
                        ) : (
                          <div className="mt-2 text-[10px] font-medium text-slate-500 text-center py-1">
                            Available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Player Rosters & Match History */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0e1422] flex flex-col overflow-y-auto">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Player Rosters ({draftState.picks.length} picks made)
                </h3>
              </div>

              <div className="p-4 flex flex-col gap-4">
                {draftState.players.map((player) => {
                  const picks = playerTeams[player.id] || [];
                  const isCurrentTurn = draftState.currentTurnPlayerId === player.id;

                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-xl border bg-slate-900/60 ${
                        isCurrentTurn ? 'border-cyan-500 shadow-md shadow-cyan-500/10' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <img src={player.avatar} alt={player.name} className="h-6 w-6 rounded-full" />
                          <span className="text-xs font-bold text-white truncate max-w-[120px]">
                            {player.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {picks.length}/{draftState.settings.rounds}
                        </span>
                      </div>

                      {/* Picked Cards Strip */}
                      <div className="flex flex-wrap gap-1.5">
                        {picks.length === 0 ? (
                          <div className="text-[10px] text-slate-600 italic py-1">No picks yet</div>
                        ) : (
                          picks.map((p) => (
                            <div
                              key={p.pickNumber}
                              className="group relative h-9 w-9 rounded-lg border border-slate-700 overflow-hidden bg-slate-950 cursor-pointer"
                              title={`${p.character.name} (${p.character.franchise})`}
                            >
                              <img src={p.character.imageUrl} alt={p.character.name} className="h-full w-full object-cover" />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chronological Draft Event Feed */}
              <div className="mt-auto p-4 border-t border-slate-800 bg-slate-950/40">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                  Latest Selections
                </div>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {draftState.picks.slice().reverse().map((pick) => (
                    <div key={pick.pickNumber} className="text-xs text-slate-300 flex items-center justify-between">
                      <span className="truncate text-slate-400">
                        <strong className="text-white">{pick.playerName}</strong> drafted {pick.character.name}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400">#{pick.pickNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: DRAFT RESULTS & REMATCH */}
        {activeTab === 'RESULTS' && draftState && (
          <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            <div className="text-center py-6">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-lg">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">DRAFT CONCLUDED</h2>
              <p className="text-slate-400 text-sm mt-1">Review the final rosters and initiate a rematch</p>
            </div>

            {/* Final Rosters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {draftState.players.map((player) => {
                const picks = playerTeams[player.id] || [];

                return (
                  <div key={player.id} className="bg-[#121824] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                      <img src={player.avatar} alt={player.name} className="h-10 w-10 rounded-full border border-indigo-500/40" />
                      <div>
                        <h4 className="text-base font-bold text-white">{player.name}'s Team</h4>
                        <span className="text-xs text-slate-400">{picks.length} Characters Drafted</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1">
                      {picks.map((pick) => (
                        <div key={pick.pickNumber} className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 flex flex-col items-center text-center">
                          <img
                            src={pick.character.imageUrl}
                            alt={pick.character.name}
                            className="h-16 w-16 rounded-lg object-cover mb-1.5"
                          />
                          <div className="text-xs font-bold text-white truncate w-full">{pick.character.name}</div>
                          <div className="text-[10px] text-cyan-400 truncate w-full">{pick.character.franchise}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rematch Actions */}
            <div className="flex justify-center gap-4 py-6">
              <button
                onClick={handleRematch}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Start Rematch</span>
              </button>

              <button
                onClick={() => setActiveTab('HOME')}
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm transition"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

        {/* VIEW 5: CATALOGUE ENCYCLOPEDIA */}
        {activeTab === 'CATALOGUE' && (
          <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Globe className="h-6 w-6 text-indigo-400" />
                Anime Character Encyclopedia
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Browse our multi-franchise anime catalogue with forms, canonical identities, and roles.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {catalogueCharacters.map((char) => (
                <div key={char.id} className="rounded-xl border border-slate-800 bg-[#121824] p-3 flex flex-col">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-950 mb-2">
                    <img src={char.imageUrl} alt={char.name} className="h-full w-full object-cover" />
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{char.name}</h4>
                  <p className="text-[10px] text-cyan-400">{char.franchise}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">Form: {char.form}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Join Room Modal */}
      <dialog id="joinModal" className="bg-[#121824] border border-slate-800 text-white p-6 rounded-2xl max-w-sm w-full backdrop:bg-black/80">
        <h3 className="text-lg font-bold">Join Game Room</h3>
        <p className="text-xs text-slate-400 mt-1">Enter the 6-character room code from your host.</p>

        <form onSubmit={handleJoinRoom} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="e.g. 8K2M9X"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs"
            >
              Join Room
            </button>
            <button
              type="button"
              onClick={() => {
                const modal = document.getElementById('joinModal');
                if (modal) (modal as any).close();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
export default App;
