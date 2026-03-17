import React, { useState, useEffect } from 'react';
import { X, Plus, ArrowLeft, Trophy, Clock, Users, Target, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Contest, ContestParticipant, ContestPointEvent, ContestPrize, CONTEST_STATUSES, SCORING_RULES } from './contestTypes';
import ContestLeaderboard from './ContestLeaderboard';
import { T } from '../theme';

interface Props {
  contest: Contest;
  onBack: () => void;
  onUpdate: () => void;
}

export default function ContestDetailPanel({ contest, onBack, onUpdate }: Props) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ContestParticipant[]>([]);
  const [events, setEvents] = useState<ContestPointEvent[]>([]);
  const [prizes, setPrizes] = useState<ContestPrize[]>([]);
  const [tab, setTab] = useState<'leaderboard' | 'activity' | 'prizes' | 'participants'>('leaderboard');
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [pointsForm, setPointsForm] = useState({ user_id: '', points: 0, description: '' });
  const [participantForm, setParticipantForm] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [pRes, eRes, prRes] = await Promise.all([
      supabase.from('contest_participants').select('*, profile:profiles(full_name, avatar_url, role)').eq('contest_id', contest.id).order('total_points', { ascending: false }),
      supabase.from('contest_point_events').select('*').eq('contest_id', contest.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('contest_prizes').select('*').eq('contest_id', contest.id).order('rank_from', { ascending: true }),
    ]);
    if (pRes.data) setParticipants(pRes.data as ContestParticipant[]);
    if (eRes.data) setEvents(eRes.data as ContestPointEvent[]);
    if (prRes.data) setPrizes(prRes.data as ContestPrize[]);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name');
    if (data) setProfiles(data);
  };

  useEffect(() => {
    loadData();
    loadProfiles();
  }, [contest.id]);

  const statusInfo = CONTEST_STATUSES.find(s => s.key === contest.status) || CONTEST_STATUSES[0];
  const scoringLabel = SCORING_RULES.find(r => r.key === contest.scoring_rule)?.label || contest.scoring_rule;
  const daysLeft = Math.max(0, Math.ceil((new Date(contest.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isActive = contest.status === 'active';

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from('contests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', contest.id);
    onUpdate();
  };

  const handleAddPoints = async () => {
    if (!pointsForm.user_id || !pointsForm.points) return;
    setSaving(true);
    await supabase.from('contest_point_events').insert({
      contest_id: contest.id,
      user_id: pointsForm.user_id,
      event_type: 'manual_adjustment',
      points: pointsForm.points,
      description: pointsForm.description || 'Ajustement manuel',
      created_by: user?.id,
      owner_id: user?.id,
    });
    const participant = participants.find(p => p.user_id === pointsForm.user_id);
    if (participant) {
      await supabase.from('contest_participants').update({
        total_points: participant.total_points + pointsForm.points,
        updated_at: new Date().toISOString(),
      }).eq('id', participant.id);
    }
    setPointsForm({ user_id: '', points: 0, description: '' });
    setShowAddPoints(false);
    setSaving(false);
    loadData();
  };

  const handleAddParticipant = async () => {
    if (!participantForm) return;
    setSaving(true);
    await supabase.from('contest_participants').insert({
      contest_id: contest.id,
      user_id: participantForm,
      total_points: 0,
      current_rank: participants.length + 1,
      owner_id: user?.id,
    });
    setParticipantForm('');
    setShowAddParticipant(false);
    setSaving(false);
    loadData();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.border}`,
    borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
    background: active ? T.main : 'transparent', color: active ? '#fff' : T.textMid,
  });

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: T.main, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> Retour aux concours
      </button>

      <div style={{ background: 'linear-gradient(135deg, #111, #222)', borderRadius: 14, padding: 24, color: '#fff', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Trophy size={22} color="#ffd700" />
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{contest.title}</h2>
              <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{statusInfo.label}</span>
            </div>
            {contest.description && <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{contest.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {contest.status === 'draft' && (
              <button onClick={() => handleStatusChange('active')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Activer
              </button>
            )}
            {contest.status === 'active' && (
              <>
                <button onClick={() => handleStatusChange('completed')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#007aff', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Terminer
                </button>
                <button onClick={() => handleStatusChange('cancelled')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <Clock size={14} />
            {isActive ? `${daysLeft} jours restants` : `${new Date(contest.start_date).toLocaleDateString('fr-CA')} - ${new Date(contest.end_date).toLocaleDateString('fr-CA')}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <Users size={14} />
            {participants.length} participants
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <Target size={14} />
            {scoringLabel}
          </div>
          {contest.prize_description && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#ffd700', fontWeight: 600 }}>
              <Trophy size={14} />
              {contest.prize_description}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
          {(['leaderboard', 'activity', 'prizes', 'participants'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabBtnStyle(tab === t)}>
              {t === 'leaderboard' ? 'Classement' : t === 'activity' ? 'Activite' : t === 'prizes' ? 'Prix' : 'Participants'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {(tab === 'leaderboard' || tab === 'participants') && (
          <>
            <button onClick={() => setShowAddPoints(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: `1px solid ${T.main}`, background: 'transparent', color: T.main, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={14} /> Points
            </button>
            <button onClick={() => setShowAddParticipant(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: 'none', background: T.main, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={14} /> Participant
            </button>
          </>
        )}
      </div>

      {tab === 'leaderboard' && (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
          <ContestLeaderboard participants={participants} />
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>
              <AlertCircle size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>Aucune activite enregistree</div>
            </div>
          ) : (
            <div>
              {events.map(ev => {
                const pName = participants.find(p => p.user_id === ev.user_id)?.profile?.full_name || 'Inconnu';
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.points > 0 ? T.green : T.red, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{pName} - {ev.description}</div>
                      <div style={{ fontSize: 11, color: T.textLight }}>{new Date(ev.created_at).toLocaleString('fr-CA')}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: ev.points > 0 ? T.green : T.red }}>
                      {ev.points > 0 ? '+' : ''}{ev.points} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'prizes' && (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
          {prizes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>Aucun prix configure</div>
          ) : (
            prizes.map((pr, i) => (
              <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < prizes.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={16} color={i < 3 ? '#fff' : T.textMid} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {pr.rank_from === pr.rank_to ? `Rang ${pr.rank_from}` : `Rang ${pr.rank_from} - ${pr.rank_to}`}
                  </div>
                  <div style={{ fontSize: 12, color: T.textLight }}>{pr.prize_description}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.main }}>
                  {pr.prize_value.toLocaleString('fr-CA')} $
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'participants' && (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
          {participants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>Aucun participant</div>
          ) : (
            participants.map((p, i) => {
              const name = p.profile?.full_name || 'Utilisateur';
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < participants.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${T.main}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.main }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{name}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>Inscrit le {new Date(p.opted_in_at).toLocaleDateString('fr-CA')}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.main }}>{p.total_points.toLocaleString('fr-CA')} pts</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showAddPoints && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: T.card, borderRadius: 14, padding: 24, width: 400, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Ajouter des points</div>
              <button onClick={() => setShowAddPoints(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMid }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: 'block', marginBottom: 6 }}>Participant *</label>
              <select style={inputStyle} value={pointsForm.user_id} onChange={e => setPointsForm({ ...pointsForm, user_id: e.target.value })}>
                <option value="">Choisir...</option>
                {participants.map(p => <option key={p.id} value={p.user_id}>{p.profile?.full_name || p.user_id}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: 'block', marginBottom: 6 }}>Points *</label>
              <input type="number" style={inputStyle} value={pointsForm.points} onChange={e => setPointsForm({ ...pointsForm, points: Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: 'block', marginBottom: 6 }}>Raison</label>
              <input style={inputStyle} value={pointsForm.description} onChange={e => setPointsForm({ ...pointsForm, description: e.target.value })} placeholder="ex: Bonus de performance" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddPoints(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
              <button onClick={handleAddPoints} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: T.main, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {showAddParticipant && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: T.card, borderRadius: 14, padding: 24, width: 400, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Ajouter un participant</div>
              <button onClick={() => setShowAddParticipant(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMid }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: 'block', marginBottom: 6 }}>Utilisateur *</label>
              <select style={inputStyle} value={participantForm} onChange={e => setParticipantForm(e.target.value)}>
                <option value="">Choisir...</option>
                {profiles.filter(pr => !participants.some(p => p.user_id === pr.id)).map(pr => (
                  <option key={pr.id} value={pr.id}>{pr.full_name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddParticipant(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
              <button onClick={handleAddParticipant} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: T.main, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Inscrire</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
