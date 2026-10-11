/**
 * ============================================================================
 * ACC OFFICIAL 11 FRANCHISES PUBLIC DIRECTORY & ROSTERS
 * ============================================================================
 */

import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { formatAcademicCategory, isDiplomaPlayer } from '../utils/academicCategories';
import {
  Shield,
  Crown,
  ChevronDown,
  ChevronUp,
  Phone,
  Award,
  Activity,
  X,
  ExternalLink,
  Zap,
  AlertTriangle,
} from 'lucide-react';

export const FranchisesList: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { franchises } = useAuction();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedLeaderModal, setSelectedLeaderModal] = useState<any | null>(null);

  const openLeaderStats = (f: any, leaderType: 'CAPTAIN' | 'VICE_CAPTAIN') => {
    const isCap = leaderType === 'CAPTAIN';
    const stats = isCap ? (f.captain_stats || {}) : (f.vice_captain_stats || {});
    setSelectedLeaderModal({
      franchiseName: f.name,
      franchiseId: f.id,
      leaderType,
      name: isCap ? (f.captain_name || 'Designated Captain') : (f.vice_captain_name || 'Designated Vice-Captain'),
      roll: isCap ? f.captain_roll : f.vice_captain_roll,
      mobile: isCap ? f.captain_mobile : f.vice_captain_mobile,
      branch: isCap ? f.captain_branch : f.vice_captain_branch,
      year: isCap ? f.captain_year : f.vice_captain_year,
      skill: isCap ? f.captain_skill : f.vice_captain_skill,
      specialty: isCap ? (f.captain_specialty || stats?.specialty || f.captain_skill || 'Franchise Captain') : (f.vice_captain_specialty || stats?.specialty || f.vice_captain_skill || 'Vice-Captain'),
      battingStyle: isCap ? (f.captain_batting_style || stats?.battingStyle || 'Right Hand Bat') : (f.vice_captain_batting_style || stats?.battingStyle || 'Right Hand Bat'),
      bowlingStyle: isCap ? (f.captain_bowling_style || stats?.bowlingStyle || 'None') : (f.vice_captain_bowling_style || stats?.bowlingStyle || 'None'),
      cricheroesUrl: isCap ? f.captain_cricheroes_url : f.vice_captain_cricheroes_url,
      stats,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-heading text-3xl font-black text-white uppercase tracking-tight">
            Official 11 Franchises & Captains
          </h1>
          <p className="text-xs text-slate-400">
            Avanthi Cricket Carnival • Leadership, Captain Profiles & Stats (Visible to Everyone), War Chests & Rosters
          </p>
        </div>

        <button
          onClick={() => onNavigate('/live')}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
        >
          Go to Live Arena
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {franchises.map((f, idx) => {
          const isExpanded = expandedId === f.id;
          const capStats = f.captain_stats || {};
          const vcStats = f.vice_captain_stats || {};

          return (
            <div
              key={f.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xl hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center font-black text-amber-300 text-base shrink-0">
                      {f.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-black text-white leading-tight">
                        {f.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ID: <span className="text-cyan-300 font-bold">{f.id}</span> • {f.department || 'Avanthi'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                </div>

                {/* Faculty Coordinator Box */}
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-col gap-1 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold flex items-center gap-1 text-[11px]">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> Faculty Coordinator:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {f.faculty_branch || f.department || 'General'}
                    </span>
                  </div>
                  <div className="font-bold text-white pl-4 text-sm">
                    {f.faculty_coordinator || 'Assigned Coordinator'}
                  </div>
                  {f.faculty_mobile && (
                    <div className="pl-4 flex items-center gap-1 text-[11px] text-emerald-400 font-mono mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <a href={`tel:${f.faculty_mobile}`} className="hover:underline">{f.faculty_mobile}</a>
                    </div>
                  )}
                </div>

                {/* Captain Section */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/40 flex flex-col gap-2 text-xs mb-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold flex items-center gap-1 text-xs">
                      <Crown className="w-4 h-4 text-amber-400" /> Team Captain:
                    </span>
                    {f.captain_roll && (
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                        {f.captain_roll}
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-white text-sm pl-1">
                    {f.captain_name || 'Designated Captain'}
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Role: {f.captain_specialty || capStats.specialty || f.captain_skill || 'Captain & Core Athlete'}</span>
                  </div>

                  <button
                    onClick={() => openLeaderStats(f, 'CAPTAIN')}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Activity className="w-3 h-3" />
                    <span>View Captain Career Stats & Bio →</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono mb-3">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-sans">Available Purse</div>
                    <div className="text-base font-black text-amber-400 font-display">
                      {f.purse} Pts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-sans">Squad Size</div>
                    <div className="text-base font-black text-white">
                      {f.squadCount || 0} / 22
                    </div>
                  </div>
                </div>

                {isExpanded && f.squad && f.squad.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 text-xs max-h-56 overflow-y-auto">
                    {f.squad.map((p: any, i: number) => (
                      <div key={p.id || i} className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">{p.player_name}</span>
                          <span className="text-amber-400 font-mono font-bold">
                            {p.acquisition_type === 'DIRECT_ASSIGNMENT' ? '0 Pts (Direct Assignment)' : `${p.price} Pts (Purse)`}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span>{formatAcademicCategory(p.bucket)} • {p.player_type || 'Player'} {p.branch && `• ${p.branch}`}</span>
                            {isDiplomaPlayer(p) && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono inline-flex items-center gap-0.5 text-[9px] font-bold">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                                <span>Player detained by 1 year diploma</span>
                              </span>
                            )}
                          </span>
                          {p.roll_number && <span className="font-mono text-cyan-300">{p.roll_number}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setExpandedId(isExpanded ? null : f.id)}
                className="mt-3 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <span>{isExpanded ? 'Hide Squad' : `View Squad (${f.squadCount || 0})`}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {selectedLeaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative">
            <button
              onClick={() => setSelectedLeaderModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-xl shrink-0">
                {selectedLeaderModal.leaderType === 'CAPTAIN' ? <Crown className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  {selectedLeaderModal.franchiseName} • Captain Profile
                </span>
                <h3 className="text-2xl font-black text-white font-heading leading-tight">
                  {selectedLeaderModal.name}
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                Career Cricket Performance Statistics
              </span>

              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">MATCHES</div>
                  <div className="text-base font-black text-white">{selectedLeaderModal.stats?.matches || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">RUNS</div>
                  <div className="text-base font-black text-amber-400">{selectedLeaderModal.stats?.runs || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">WICKETS</div>
                  <div className="text-base font-black text-cyan-400">{selectedLeaderModal.stats?.wickets || 0}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedLeaderModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
