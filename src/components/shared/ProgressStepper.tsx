import React from 'react';
import { T } from '../../theme';

type StepStatus = 'completed' | 'active' | 'pending';

type Step = {
  key: string;
  label: string;
  status: StepStatus;
};

type Props = {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: { circle: 20, icon: 10, font: 10, stepFont: 8, gap: 4, lineWidth: 1.5 },
  md: { circle: 28, icon: 14, font: 12, stepFont: 9, gap: 6, lineWidth: 2 },
  lg: { circle: 36, icon: 18, font: 14, stepFont: 10, gap: 8, lineWidth: 2.5 },
};

const STATUS_COLORS = {
  completed: { bg: T.stepCompleted, border: T.stepCompleted, text: '#fff', label: T.text, badge: T.stepCompleted, badgeText: '#fff' },
  active: { bg: T.stepActive, border: T.stepActive, text: '#fff', label: T.text, badge: T.stepActive, badgeText: '#fff' },
  pending: { bg: 'transparent', border: T.stepPending, text: T.stepPending, label: T.textMid, badge: 'transparent', badgeText: T.stepPending },
};

const STATUS_LABELS: Record<StepStatus, string> = {
  completed: 'Complété',
  active: 'En cours',
  pending: 'En attente',
};

// ── Check Icon SVG ──
function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Spinner Icon for active step ──
function SpinnerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

// ── Step Circle ──
function StepCircle({ status, index, s }: { status: StepStatus; index: number; s: typeof SIZES.md }) {
  const colors = STATUS_COLORS[status];
  return (
    <div style={{
      width: s.circle, height: s.circle, borderRadius: '50%',
      background: colors.bg,
      border: status === 'pending' ? `2px solid ${colors.border}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: colors.text, flexShrink: 0,
      boxShadow: status === 'active' ? `0 0 12px ${T.stepActive}66` : 'none',
      animation: status === 'active' ? 'stepPulse 2s ease-in-out infinite' : 'none',
      transition: 'all 0.3s ease',
    }}>
      {status === 'completed' ? (
        <CheckIcon size={s.icon} />
      ) : status === 'active' ? (
        <SpinnerIcon size={s.icon} />
      ) : (
        <span style={{ fontSize: s.icon - 2, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}>{index + 1}</span>
      )}
    </div>
  );
}

// ── Connecting Line ──
function ConnectingLine({ fromStatus, toStatus, orientation, s }: {
  fromStatus: StepStatus; toStatus: StepStatus; orientation: 'horizontal' | 'vertical'; s: typeof SIZES.md;
}) {
  const isSolid = fromStatus === 'completed';
  const color = isSolid ? T.stepCompleted : T.stepLine;

  if (orientation === 'horizontal') {
    return (
      <div style={{
        flex: 1, height: s.lineWidth, minWidth: 20,
        background: isSolid ? color : 'transparent',
        borderTop: isSolid ? 'none' : `${s.lineWidth}px dashed ${color}`,
        alignSelf: 'center',
        transition: 'all 0.3s ease',
      }} />
    );
  }

  return (
    <div style={{
      width: s.lineWidth, minHeight: 24, flex: 1,
      background: isSolid ? color : 'transparent',
      borderLeft: isSolid ? 'none' : `${s.lineWidth}px dashed ${color}`,
      marginLeft: s.circle / 2 - s.lineWidth / 2,
      transition: 'all 0.3s ease',
    }} />
  );
}

// ── Status Badge ──
function StatusBadge({ status, s }: { status: StepStatus; s: typeof SIZES.md }) {
  const colors = STATUS_COLORS[status];
  return (
    <span style={{
      fontSize: s.stepFont - 1, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
      padding: '2px 8px', borderRadius: 8,
      background: status === 'pending' ? 'transparent' : colors.badge,
      color: status === 'pending' ? colors.badgeText : colors.badgeText,
      border: status === 'pending' ? `1px solid ${colors.border}` : 'none',
      letterSpacing: 0.3,
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function ProgressStepper({ steps, orientation = 'horizontal', size = 'md' }: Props) {
  const s = SIZES[size];

  if (orientation === 'vertical') {
    return (
      <div>
        <style>{`@keyframes stepPulse { 0%,100% { box-shadow: 0 0 8px ${T.stepActive}44 } 50% { box-shadow: 0 0 20px ${T.stepActive}88 } }`}</style>
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: s.gap + 8 }}>
              <StepCircle status={step.status} index={i} s={s} />
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: s.stepFont, fontWeight: 600, color: T.textMid, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif', marginBottom: 2 }}>
                  ÉTAPE {i + 1}
                </div>
                <div style={{
                  fontSize: s.font, fontWeight: step.status === 'pending' ? 500 : 600,
                  color: STATUS_COLORS[step.status].label,
                  fontFamily: 'Outfit, sans-serif', marginBottom: 4,
                }}>
                  {step.label}
                </div>
                <StatusBadge status={step.status} s={s} />
              </div>
            </div>
            {i < steps.length - 1 && (
              <ConnectingLine fromStatus={step.status} toStatus={steps[i + 1].status} orientation="vertical" s={s} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // ── Horizontal layout ──
  return (
    <div>
      <style>{`@keyframes stepPulse { 0%,100% { box-shadow: 0 0 8px ${T.stepActive}44 } 50% { box-shadow: 0 0 20px ${T.stepActive}88 } }`}</style>
      {/* Circles + Lines row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <StepCircle status={step.status} index={i} s={s} />
            {i < steps.length - 1 && (
              <ConnectingLine fromStatus={step.status} toStatus={steps[i + 1].status} orientation="horizontal" s={s} />
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Labels row */}
      <div style={{ display: 'flex', marginTop: s.gap }}>
        {steps.map((step, i) => (
          <div key={step.key} style={{
            flex: i < steps.length - 1 ? 1 : 0,
            minWidth: s.circle,
          }}>
            <div style={{ fontSize: s.stepFont, fontWeight: 600, color: T.textMid, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif', marginBottom: 2 }}>
              ÉTAPE {i + 1}
            </div>
            <div style={{
              fontSize: s.font, fontWeight: step.status === 'pending' ? 500 : 600,
              color: STATUS_COLORS[step.status].label,
              fontFamily: 'Outfit, sans-serif', marginBottom: 4,
              whiteSpace: 'nowrap',
            }}>
              {step.label}
            </div>
            <StatusBadge status={step.status} s={s} />
          </div>
        ))}
      </div>
    </div>
  );
}
