import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, Search, Calendar, Users, Clock, Target } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Contest, CONTEST_STATUSES } from './contestTypes';
import ContestCreateModal from './ContestCreateModal';
import ContestDetailPanel from './ContestDetailPanel';
import { T } from '../theme';
import { useLanguage } from '../i18n/LanguageContext';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function ContestAdminPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);

  const loadContests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('contests')
      .select('*, contest_participants(count), contest_prizes(*)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    if (data) {
      setContests(data.map((c: any) => ({
        ...c,
        participants: [],
        prizes: c.contest_prizes || [],
        _participantCount: c.contest_participants?.[0]?.count || 0,
      })));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadContests();
  }, [loadContests]);

  const handleCreate = async (data: any) => {
    const { prizes: prizeTiers, ...contestData } = data;
    const { data: newContest, error } = await supabase
      .from('contests')
      .insert({
        ...contestData,
        status: 'draft',
        created_by: user?.id,
        owner_id: user?.id,
      })
      .select()
      .maybeSingle();

    if (error || !newContest) throw new Error('Failed to create contest');

    if (prizeTiers && prizeTiers.length > 0) {
      await supabase.from('contest_prizes').insert(
        prizeTiers.map((p: any) => ({
          contest_id: newContest.id,
          rank_from: p.rank_from,
          rank_to: p.rank_to,
          prize_description: p.prize_description,
          prize_value: p.prize_value,
        }))
      );
    }

    setShowCreate(false);
    loadContests();
  };

  const filtered = contests.filter(c =>
    !search.trim() || c.title.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedContest) {
    return (
      <ContestDetailPanel
        contest={selectedContest}
        onBack={() => { setSelectedContest(null); loadContests(); }}
        onUpdate={() => loadContests().then(() => {
          const updated = contests.find(c => c.id === selectedContest.id);
          if (updated) setSelectedContest(updated);
        })}
      />
    );
  }

  const activeCount = contests.filter(c => c.status === 'active').length;
  const totalParticipants = contests.reduce((sum, c: any) => sum + (c._participantCount || 0), 0);
  const totalPrizeValue = contests.filter(c => c.status === 'active').reduce((sum, c) => sum + c.prize_value, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: T.text }}>{t("contest_admin.title", "Gestion des concours")}</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>{t("contest_admin.subtitle", "Créez et gérez les concours pour votre équipe de vente")}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: T.main, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Plus size={16} /> {t("contest_admin.new_contest", "Nouveau concours")}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: '#ffd70020', borderRadius: 8, padding: 6, display: 'flex' }}><Trophy size={16} color="#ffd700" /></div>
            <span style={{ fontSize: 12, color: T.textLight }}>{t("contest_admin.active_contests", "Concours actifs")}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{activeCount}</div>
        </div>
        <div style={{ flex: '1 1 180px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.main}12`, borderRadius: 8, padding: 6, display: 'flex' }}><Users size={16} color={T.main} /></div>
            <span style={{ fontSize: 12, color: T.textLight }}>{t("contest_admin.total_participants", "Total participants")}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{totalParticipants}</div>
        </div>
        <div style={{ flex: '1 1 180px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.green}18`, borderRadius: 8, padding: 6, display: 'flex' }}><Target size={16} color={T.green} /></div>
            <span style={{ fontSize: 12, color: T.textLight }}>{t("contest_admin.prizes_at_stake", "Prix en jeu")}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{fmt(totalPrizeValue)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
          {[{ key: 'all', label: t("common.all", "Tous") }, ...CONTEST_STATUSES].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: filter === s.key ? T.main : 'transparent',
                color: filter === s.key ? '#fff' : T.textMid,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f4f5f9', borderRadius: 8, padding: '8px 14px', minWidth: 200 }}>
          <Search size={14} color={T.textLight} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("common.search", "Rechercher...")}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.textLight }}>{t("common.loading", "Chargement...")}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.textLight }}>
          <Trophy size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t("contest_admin.no_contests", "Aucun concours")}</div>
          <div style={{ fontSize: 13 }}>{t("contest_admin.create_first", "Créez votre premier concours pour motiver votre équipe")}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(c => {
            const statusInfo = CONTEST_STATUSES.find(s => s.key === c.status) || CONTEST_STATUSES[0];
            const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            const isActive = c.status === 'active';
            const pCount = (c as any)._participantCount || 0;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedContest(c)}
                style={{
                  background: T.card,
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderLeft: isActive ? `4px solid ${T.green}` : `4px solid transparent`,
                }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={18} color="#ffd700" />
                    <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{c.title}</div>
                  </div>
                  <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {statusInfo.label}
                  </span>
                </div>

                {c.description && (
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: T.textMid, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {c.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.textLight }}>
                    <Calendar size={12} />
                    {new Date(c.start_date).toLocaleDateString('fr-CA')} - {new Date(c.end_date).toLocaleDateString('fr-CA')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.textLight }}>
                    <Users size={12} />
                    {pCount} {t("contest_admin.participants", "participants")}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  {c.prize_description ? (
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{c.prize_description}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.textLight }}>{t("contest_admin.no_prize_defined", "Aucun prix défini")}</div>
                  )}
                  {isActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#d97706' }}>
                      <Clock size={12} />
                      {daysLeft}{t("contest_admin.days_left", "j restants")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <ContestCreateModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
