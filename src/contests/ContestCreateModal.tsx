import React, { useState } from 'react';
import { X, Plus, Trash2, Trophy } from 'lucide-react';
import { SCORING_RULES } from './contestTypes';
import { T } from '../theme';

interface PrizeTier {
  rank_from: number;
  rank_to: number;
  prize_description: string;
  prize_value: number;
}

interface Props {
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    prize_description: string;
    prize_value: number;
    start_date: string;
    end_date: string;
    scoring_rule: string;
    min_participants: number;
    prizes: PrizeTier[];
  }) => Promise<void>;
}

export default function ContestCreateModal({ onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [prizeValue, setPrizeValue] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scoringRule, setScoringRule] = useState('custom_points');
  const [minParticipants, setMinParticipants] = useState(2);
  const [prizes, setPrizes] = useState<PrizeTier[]>([
    { rank_from: 1, rank_to: 1, prize_description: '', prize_value: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addPrize = () => {
    const lastTo = prizes.length > 0 ? prizes[prizes.length - 1].rank_to : 0;
    setPrizes([...prizes, { rank_from: lastTo + 1, rank_to: lastTo + 1, prize_description: '', prize_value: 0 }]);
  };

  const removePrize = (idx: number) => {
    setPrizes(prizes.filter((_, i) => i !== idx));
  };

  const updatePrize = (idx: number, field: keyof PrizeTier, value: string | number) => {
    setPrizes(prizes.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Le titre est requis'); return; }
    if (!startDate || !endDate) { setError('Les dates sont requises'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('La date de fin doit etre apres la date de debut'); return; }

    setSaving(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        prize_description: prizeDescription.trim(),
        prize_value: prizeValue,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        scoring_rule: scoringRule,
        min_participants: minParticipants,
        prizes: prizes.filter(p => p.prize_description.trim()),
      });
    } catch {
      setError('Erreur lors de la creation');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: T.textMid,
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(230,228,224,0.85)' }}>
      <div style={{ background: T.card, borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#ffd700', borderRadius: 8, padding: 8, display: 'flex' }}>
              <Trophy size={18} color="#000" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>Nouveau concours</div>
              <div style={{ fontSize: 12, color: T.textLight }}>Configurez les details du concours</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.textMid }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Titre *</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Concours Q1 2026 - Top Seller" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Regles et details du concours..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Date de debut *</label>
              <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Date de fin *</label>
              <input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Regle de pointage</label>
              <select style={inputStyle} value={scoringRule} onChange={e => setScoringRule(e.target.value)}>
                {SCORING_RULES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Participants minimum</label>
              <input type="number" style={inputStyle} value={minParticipants} onChange={e => setMinParticipants(Number(e.target.value))} min={0} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Prix principal (description)</label>
              <input style={inputStyle} value={prizeDescription} onChange={e => setPrizeDescription(e.target.value)} placeholder="ex: 5 000 $ bonus" />
            </div>
            <div>
              <label style={labelStyle}>Valeur du prix ($)</label>
              <input type="number" style={inputStyle} value={prizeValue} onChange={e => setPrizeValue(Number(e.target.value))} min={0} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Niveaux de prix</label>
              <button onClick={addPrize} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${T.main}`, color: T.main, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={12} /> Ajouter
              </button>
            </div>

            {prizes.map((prize, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 60px 1fr 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input type="number" style={{ ...inputStyle, padding: '8px 10px' }} value={prize.rank_from} onChange={e => updatePrize(idx, 'rank_from', Number(e.target.value))} min={1} placeholder="De" />
                <input type="number" style={{ ...inputStyle, padding: '8px 10px' }} value={prize.rank_to} onChange={e => updatePrize(idx, 'rank_to', Number(e.target.value))} min={1} placeholder="A" />
                <input style={{ ...inputStyle, padding: '8px 10px' }} value={prize.prize_description} onChange={e => updatePrize(idx, 'prize_description', e.target.value)} placeholder="Description du prix" />
                <input type="number" style={{ ...inputStyle, padding: '8px 10px' }} value={prize.prize_value} onChange={e => updatePrize(idx, 'prize_value', Number(e.target.value))} min={0} placeholder="$" />
                <button onClick={() => removePrize(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {error && <div style={{ color: T.red, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 12, padding: '16px 24px', borderTop: `1px solid ${T.border}`, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: T.main, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creation...' : 'Creer le concours'}
          </button>
        </div>
      </div>
    </div>
  );
}
