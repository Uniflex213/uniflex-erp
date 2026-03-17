import React from 'react';
import { Trophy } from 'lucide-react';
import { ContestParticipant } from './contestTypes';
import { T } from '../theme';

const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

interface Props {
  participants: ContestParticipant[];
  highlightUserId?: string;
  compact?: boolean;
}

export default function ContestLeaderboard({ participants, highlightUserId, compact }: Props) {
  const sorted = [...participants].sort((a, b) => b.total_points - a.total_points);

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: T.textLight, fontSize: 13 }}>
        Aucun participant inscrit
      </div>
    );
  }

  return (
    <div>
      {sorted.map((p, i) => {
        const name = p.profile?.full_name || 'Utilisateur';
        const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const isHighlighted = p.user_id === highlightUserId;

        return (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: compact ? '8px 0' : '10px 0',
              borderBottom: i < sorted.length - 1 ? `1px solid ${T.border}` : 'none',
              background: isHighlighted ? `${T.main}08` : 'transparent',
              borderRadius: isHighlighted ? 6 : 0,
              paddingLeft: isHighlighted ? 8 : 0,
              paddingRight: isHighlighted ? 8 : 0,
            }}
          >
            <div
              style={{
                width: compact ? 24 : 28,
                height: compact ? 24 : 28,
                borderRadius: '50%',
                background: i < 3 ? rankColors[i] : '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: compact ? 10 : 12,
                fontWeight: 800,
                color: i < 3 ? '#fff' : '#636366',
                flexShrink: 0,
              }}
            >
              {i < 3 ? <Trophy size={compact ? 10 : 12} /> : i + 1}
            </div>

            <div
              style={{
                width: compact ? 30 : 34,
                height: compact ? 30 : 34,
                borderRadius: '50%',
                background: `${T.main}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: compact ? 10 : 12,
                fontWeight: 700,
                color: T.main,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: compact ? 12 : 13, fontWeight: isHighlighted ? 700 : 500, color: T.text }}>
                {name}
                {isHighlighted && <span style={{ fontSize: 10, color: T.main, marginLeft: 4 }}>(vous)</span>}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: compact ? 13 : 15, fontWeight: 800, color: i === 0 ? '#ffd700' : T.main }}>
                {p.total_points.toLocaleString('fr-CA')} pts
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
