/**
 * ============================================================================
 * ACC PLAYERS PUBLIC DIRECTORY
 * ============================================================================
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Users,
  User,
  RefreshCw,
  LayoutGrid,
  List,
  ArrowUp,
  X,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { useVirtualGrid } from '../hooks/useVirtualGrid';
import { isDiplomaPlayer } from '../utils/academicCategories';

export const PlayersList: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { players, loadingPlayers, fetchPlayers } = useAuction();
  const [search, setSearch] = useState('');
  const [filterBucket, setFilterBucket] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchPlayers({ force: true });
    setRefreshing(false);
  };

  const normalizeRole = useCallback((p: any): string => {
    const pt = (p.player_type || p.skill || '').toUpperCase();
    if (pt.includes('WICKET') || pt.includes('KEEPER')) return 'WICKET_KEEPER';
    if (pt.includes('BOWL') && !pt.includes('ALL')) return 'BOWLER';
    if (pt.includes('BAT') && !pt.includes('ALL')) return 'BATTER';
    return 'ALL_ROUNDER';
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      const matchBucket = filterBucket === 'ALL' || p.bucket === filterBucket;
      const matchRole = filterRole === 'ALL' || normalizeRole(p) === filterRole;
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.roll_number?.toLowerCase().includes(q) ||
        p.branch?.toLowerCase().includes(q);
      return matchBucket && matchRole && matchSearch;
    });
  }, [players, filterBucket, filterRole, search, normalizeRole]);

  const isTableView = viewMode === 'TABLE';
  const rowHeight = isTableView ? 74 : 290;

  const {
    columns,
    totalHeight,
    virtualRows,
    renderedItemCount,
    firstVisibleIndex,
    lastVisibleIndex,
    scrollToTop,
  } = useVirtualGrid<any>({
    items: filtered,
    containerRef,
    rowHeight,
    overscan: 2,
    forcedColumns: isTableView ? 1 : undefined,
  });

  const loading = loadingPlayers && players.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            Registered Players Pool
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">
              {players.length} Total
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Athletes registered across B1 to PG buckets for Avanthi Cricket Carnival 2026
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'GRID'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Virtualized Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Virtualized Dense Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Refresh player list from database"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => onNavigate('/player/register')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-blue-500/20"
          >
            + Register
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player name, roll number, or department..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Roles' },
            { id: 'BATTER', label: 'Batters' },
            { id: 'BOWLER', label: 'Bowlers' },
            { id: 'ALL_ROUNDER', label: 'All-Rounders' },
            { id: 'WICKET_KEEPER', label: 'WK' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setFilterRole(r.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterRole === r.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'B1', 'B2', 'B3', 'B4', 'B5', 'PG'].map((b) => (
            <button
              key={b}
              onClick={() => setFilterBucket(b)}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer shrink-0 ${
                filterBucket === b
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span>
            Showing{' '}
            <strong className="text-white">
              {filtered.length === 0 ? 0 : `${firstVisibleIndex}–${lastVisibleIndex}`}
            </strong>{' '}
            of <strong className="text-white">{filtered.length}</strong> matching athletes
          </span>
          {filtered.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              <Zap className="w-3 h-3" />
              Windowed DOM: {renderedItemCount} rendered
            </span>
          )}
        </div>

        {filtered.length > 0 && firstVisibleIndex > 12 && (
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer transition"
          >
            <ArrowUp className="w-3.5 h-3.5" /> Back to top
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading players pool...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <Users className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-bold">No players found matching your filters.</p>
          {(search || filterBucket !== 'ALL' || filterRole !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterBucket('ALL');
                setFilterRole('ALL');
              }}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative h-[calc(100vh-270px)] min-h-[520px] overflow-y-auto pr-2 rounded-2xl focus:outline-none"
          style={{ willChange: 'transform' }}
        >
          <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
            {virtualRows.map((virtualRow) => {
              return (
                <div
                  key={virtualRow.rowIndex}
                  style={{
                    position: 'absolute',
                    top: `${virtualRow.offsetTop}px`,
                    left: 0,
                    right: 0,
                    height: `${rowHeight}px`,
                  }}
                >
                  {isTableView ? (
                    <div className="h-[64px]">
                      {virtualRow.items.map((p) => {
                        const role = normalizeRole(p);
                        const roleBadgeColor =
                          role === 'BATTER'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : role === 'BOWLER'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : role === 'WICKET_KEEPER'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

                        const roleDisplay =
                          role === 'BATTER'
                            ? 'Batter'
                            : role === 'BOWLER'
                            ? 'Bowler'
                            : role === 'WICKET_KEEPER'
                            ? 'WK'
                            : 'All-Rounder';

                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPlayer(p)}
                            className="h-full px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition flex items-center justify-between gap-3 cursor-pointer shadow"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shrink-0 flex items-center justify-center">
                                {p.photo_url ? (
                                  <img
                                    src={p.photo_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-slate-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white text-xs sm:text-sm truncate flex items-center gap-2">
                                  {p.name}
                                  <span className="text-[10px] text-slate-400 font-mono font-normal">
                                    {p.roll_number}
                                  </span>
                                </div>
                                <div className="text-[10px] text-cyan-400 truncate">
                                  {p.branch || 'Avanthi Engineering'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">
                                {p.bucket || 'PG'}
                              </span>
                              {isDiplomaPlayer(p) && (
                                <span className="px-2 py-0.5 rounded font-bold text-[9px] bg-rose-950 text-rose-300 border border-rose-600/70 inline-flex items-center gap-1 shadow">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                                  <span>Player detained by 1 year diploma</span>
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] border ${roleBadgeColor}`}
                              >
                                {roleDisplay}
                              </span>

                              <div className="hidden lg:flex flex-col text-[10px] text-slate-400 w-36 truncate font-mono">
                                <span className="truncate">
                                  Bat: {p.batting_style || 'RHB'}
                                </span>
                                <span className="truncate">
                                  Bowl: {p.bowling_style || 'None'}
                                </span>
                              </div>

                              <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                                <div>
                                  <span className="text-slate-500 text-[9px] block">M</span>
                                  {p.stats?.matches || 0}
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[9px] block">R</span>
                                  <span className="text-emerald-400 font-bold">
                                    {p.stats?.runs || 0}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[9px] block">W</span>
                                  <span className="text-cyan-400 font-bold">
                                    {p.stats?.wickets || 0}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right pl-2">
                                <div className="text-[9px] text-slate-500 uppercase font-mono">
                                  Base Price
                                </div>
                                <div className="text-xs font-bold font-mono text-amber-400">
                                  {p.base_price || 20} Pts
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className="grid gap-4 h-[270px]"
                      style={{
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      }}
                    >
                      {virtualRow.items.map((p) => {
                        const role = normalizeRole(p);
                        const roleBadgeColor =
                          role === 'BATTER'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : role === 'BOWLER'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : role === 'WICKET_KEEPER'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

                        const roleDisplay =
                          role === 'BATTER'
                            ? 'Batter'
                            : role === 'BOWLER'
                            ? 'Bowler'
                            : role === 'WICKET_KEEPER'
                            ? 'Wicket-Keeper'
                            : 'All-Rounder';

                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPlayer(p)}
                            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850/80 transition flex flex-col justify-between shadow-lg cursor-pointer h-full"
                          >
                            <div>
                              <div className="flex items-center gap-3 mb-2.5">
                                <div className="w-13 h-13 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 flex items-center justify-center">
                                  {p.photo_url ? (
                                    <img
                                      src={p.photo_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <User className="w-6 h-6 text-slate-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-white text-sm truncate">
                                    {p.name}
                                  </h4>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    {p.roll_number}
                                  </div>
                                  <div className="text-[10px] text-cyan-400 truncate">
                                    {p.branch}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">
                                  Bucket {p.bucket || 'PG'}
                                </span>
                                {isDiplomaPlayer(p) && (
                                  <span className="px-2 py-0.5 rounded font-bold text-[9px] bg-rose-950 text-rose-300 border border-rose-600/70 inline-flex items-center gap-1 shadow">
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                                    <span>Player detained by 1 year diploma</span>
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] border ${roleBadgeColor}`}
                                >
                                  {roleDisplay}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-300 space-y-0.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-2">
                                <div className="truncate">
                                  <span className="text-slate-500">Bat:</span>{' '}
                                  {p.batting_style || p.stats?.battingStyle || 'Right Hand Bat'}
                                </div>
                                <div className="truncate">
                                  <span className="text-slate-500">Bowl:</span>{' '}
                                  {p.bowling_style || p.stats?.bowlingStyle || 'Right Arm Medium'}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50">
                                <div>
                                  <div className="text-slate-500">MAT</div>
                                  <div className="font-bold text-white">
                                    {p.stats?.matches || 0}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-500">RUNS</div>
                                  <div className="font-bold text-emerald-400">
                                    {p.stats?.runs || 0}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-500">WKTS</div>
                                  <div className="font-bold text-cyan-400">
                                    {p.stats?.wickets || 0}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-400">Base Price:</span>
                              <span className="font-bold text-amber-400">
                                {p.base_price || 20} Pts (Purse)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950/40 border-b border-slate-800 flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                {selectedPlayer.photo_url ? (
                  <img
                    src={selectedPlayer.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 m-4 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white truncate">
                    {selectedPlayer.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                    Bucket {selectedPlayer.bucket || 'PG'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Roll: {selectedPlayer.roll_number}
                </div>
                <div className="text-xs text-cyan-400 mt-0.5">
                  {selectedPlayer.branch}
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 font-mono text-[10px] uppercase">
                    Primary Role
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {normalizeRole(selectedPlayer).replace('_', ' ')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 font-mono text-[10px] uppercase">
                    Auction Base Price
                  </div>
                  <div className="text-sm font-bold font-mono text-amber-400 mt-1">
                    {selectedPlayer.base_price || 20} Pts (Purse)
                  </div>
                </div>
              </div>

              {isDiplomaPlayer(selectedPlayer) && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border border-rose-500/80 text-rose-200 text-xs font-bold font-mono uppercase flex items-center justify-center gap-2 shadow">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Player detained by 1 year diploma</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Batting Style:</span>
                  <span className="font-bold text-white font-mono">
                    {selectedPlayer.batting_style ||
                      selectedPlayer.stats?.battingStyle ||
                      'Right Hand Bat'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Bowling Style:</span>
                  <span className="font-bold text-white font-mono">
                    {selectedPlayer.bowling_style ||
                      selectedPlayer.stats?.bowlingStyle ||
                      'Right Arm Medium'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider mb-2">
                  Match Records
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px] font-mono">MATCHES</div>
                    <div className="text-base font-bold text-white mt-0.5">
                      {selectedPlayer.stats?.matches || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px] font-mono">RUNS</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      {selectedPlayer.stats?.runs || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px] font-mono">WICKETS</div>
                    <div className="text-base font-bold text-cyan-400 mt-0.5">
                      {selectedPlayer.stats?.wickets || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
