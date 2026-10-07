/**
 * ============================================================================
 * ACC GUEST DRAW MODE MODAL (Requirement 5)
 * ============================================================================
 * When Guest Mode is active:
 * - Guests must NOT see player name, roll number, photo, referral, or identifying info.
 * - Every eligible player is represented ONLY by a masked random identifier:
 *   e.g. PLAYER ID: A4827, PLAYER ID: B1934, PLAYER ID: X7201
 * - The mapping (Random Identifier -> Actual Player) remains completely hidden from guest.
 * - When the guest selects/draws an identifier:
 *   1. The corresponding player becomes the drawn player.
 *   2. Enters auction/bidding immediately.
 *   3. Appropriate player info is revealed on the auction floor once bidding starts.
 */

import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { Sparkles, Search, Gavel, X, AlertTriangle, Shield, Shuffle } from 'lucide-react';
import { formatAcademicCategory } from '../utils/academicCategories';

interface GuestDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerSelected?: (lot: any) => void;
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
      loadMaskedCandidates();
    }
  }, [isOpen]);

  const loadMaskedCandidates = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // In Guest Mode, this server endpoint returns strictly masked random identifiers (e.g. A4827)
      // with zero personal identifying details (no name, no roll, no photo, no referral).
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

  const handleDrawMaskedIdentifier = async (candidate: any) => {
    setDrawing(true);
    setErrorMsg(null);
    try {
      // Send random identifier or draw candidate id to backend
      const res = await drawNextPlayer('GUEST', candidate.id || candidate.random_identifier);
      if (!res.success) {
        throw new Error(res.error || 'Failed to call player onto auction floor.');
      }
      if (onPlayerSelected) {
        onPlayerSelected(res.lot);
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
      c.random_identifier?.toLowerCase().includes(q) ||
      c.bucket?.toLowerCase().includes(q);

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Guest Draw Mode • Masked Identifiers
            </div>
            <h2 className="font-heading text-2xl font-black text-white uppercase tracking-tight">
              Guest Auction Draw
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Players are masked with unique random identifiers (e.g. <strong>PLAYER ID: A4827</strong>). Personal identities remain completely confidential until you complete the draw!
            </p>
          </div>

          <div className="text-right font-mono text-xs text-slate-400">
            Eligible Lots: <strong className="text-amber-400 text-sm">{candidates.length}</strong>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Random Identifier (e.g. A4827, B1934)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 font-mono"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
            >
              <option value="ALL">All Academic Buckets</option>
              <option value="B3">1. 3rd Year B.Tech</option>
              <option value="B4">2. 4th Year B.Tech</option>
              <option value="B2">3. 2nd Year B.Tech</option>
              <option value="B5">4. Diploma - D</option>
              <option value="PG">5. PG - P</option>
              <option value="B1">6. 1st Year B.Tech</option>
            </select>
          </div>
        </div>

        {/* Masked Candidates Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading masked random identifiers for auction session...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              No eligible candidates match the current filter or all players in this session have been auctioned.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredCandidates.map((c, index) => {
                const cardNumber = c.identified_number || index + 1;

                return (
                  <div
                    key={c.id || c.random_identifier || index}
                    onClick={() => !drawing && handleDrawMaskedIdentifier(c)}
                    className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/60 border-2 border-purple-500/50 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all flex flex-col justify-between items-center text-center gap-3 cursor-pointer group hover:scale-[1.03] active:scale-95 select-none relative overflow-hidden"
                  >
                    {/* Top Corner Badge */}
                    <div className="w-full flex items-center justify-between text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                        Mystery Card
                      </span>
                      <span className="text-slate-400">
                        {formatAcademicCategory(c.bucket)}
                      </span>
                    </div>

                    {/* Giant Identified Number (Starts from 1) */}
                    <div className="my-2 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors duration-200">
                        <span className="font-heading text-3xl font-black">
                          #{cardNumber}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider mt-2">
                        Card #{cardNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 italic mt-0.5">
                        Stats sealed until tapped
                      </span>
                    </div>

                    {/* Tap to Auction Action */}
                    <button
                      type="button"
                      disabled={drawing}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md group-hover:shadow-amber-500/30 transition pointer-events-none"
                    >
                      <Gavel className="w-3.5 h-3.5 fill-current" />
                      <span>{drawing ? 'Launching...' : 'Tap for Live Auction'}</span>
                    </button>
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
