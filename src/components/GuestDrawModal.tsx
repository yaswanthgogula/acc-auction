/**
 * ============================================================================
 * ACC GUEST DRAW MODE MODAL
 * ============================================================================
 * Allows the Guest / Auction Official to draw an eligible candidate for auction:
 * - Displays all eligible candidates
 * - Strictly excludes: referred players, already sold players, players in active bidding, and ineligible players
 * - Selected player becomes the official Draw Player in the auction engine and enters bidding workflow immediately
 */

import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { formatAcademicCategory } from '../utils/academicCategories';
import { Sparkles, Search, User, Gavel, X, AlertTriangle } from 'lucide-react';

interface GuestDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerSelected?: (playerId: string) => void;
}

export const GuestDrawModal: React.FC<GuestDrawModalProps> = ({
  isOpen,
  onClose,
  onPlayerSelected,
}) => {
  const { drawNextPlayer } = useAuction();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState('ALL');
  const [drawing, setDrawing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCandidates();
    }
  }, [isOpen]);

  const loadCandidates = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auction/guest-draw-candidates');
      const data = await res.json();
      if (data.success && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
      } else {
        throw new Error(data.error || 'Failed to load eligible candidates');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleDrawPlayer = async (player: any) => {
    setDrawing(true);
    setErrorMsg(null);
    try {
      const res = await drawNextPlayer('GUEST', player.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to call player onto auction floor.');
      }
      if (onPlayerSelected) {
        onPlayerSelected(player.id);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to select player.');
    } finally {
      setDrawing(false);
    }
  };

  if (!isOpen) return null;

  const filteredCandidates = candidates.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.roll_number?.toLowerCase().includes(q) ||
      c.branch?.toLowerCase().includes(q);

    const matchBucket = bucketFilter === 'ALL' || c.bucket === bucketFilter;
    return matchSearch && matchBucket;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Special Auction Protocol
            </div>
            <h2 className="font-heading text-2xl font-black text-white uppercase tracking-tight">
              Guest Draw Mode
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any eligible auction athlete to become the official Draw Player and immediately enter the bidding workflow.
            </p>
          </div>

          <div className="text-right font-mono text-xs text-slate-400">
            Eligible Candidates: <strong className="text-amber-400 text-sm">{candidates.length}</strong>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by name, roll number, or department..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
            >
              <option value="ALL">All Categories</option>
              <option value="B1">1st Year B.Tech</option>
              <option value="B2">2nd Year B.Tech</option>
              <option value="B3">3rd Year B.Tech</option>
              <option value="B4">4th Year B.Tech</option>
              <option value="B5">Diploma - D</option>
              <option value="PG">PG - P</option>
            </select>
          </div>
        </div>

        {/* Candidates Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading eligible auction candidates...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              No eligible candidates match the current search or all players have been called/sold.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCandidates.map((c) => {
                let pStats: any = {};
                try {
                  pStats = typeof c.stats_json === 'string' ? JSON.parse(c.stats_json) : (c.stats_json || {});
                } catch {}

                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                          {c.photo_url ? (
                            <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 m-3 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{c.name}</h4>
                          <div className="text-[11px] text-slate-400 font-mono">{c.roll_number}</div>
                          <div className="text-[10px] text-cyan-400 truncate">{c.branch}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2.5">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30 truncate">
                          {formatAcademicCategory(c.bucket)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30 truncate">
                          {c.player_type || c.skill || 'All-Rounder'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 mt-2 text-center text-[10px] font-mono">
                        <div>
                          <span className="text-slate-500">M: </span>
                          <strong className="text-white">{pStats.matches || 0}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">R: </span>
                          <strong className="text-amber-400">{pStats.runs || 0}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">W: </span>
                          <strong className="text-cyan-400">{pStats.wickets || 0}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {c.base_price || 20} Pts (₹)
                      </span>
                      <button
                        onClick={() => handleDrawPlayer(c)}
                        disabled={drawing}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow transition cursor-pointer disabled:opacity-50"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Draw Player</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
