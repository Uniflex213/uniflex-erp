import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

const ROLE_LABELS: Record<string, string> = {
  god_admin: 'God Admin', admin: 'Admin', vendeur: 'Vendeur',
  manuf: 'Manuf', magasin: 'Magasin',
};

export default function SimulationBanner() {
  const { isSimulating, simulatedProfile, stopSimulation } = useSimulation();
  const { realProfile } = useAuth();
  const { t } = useLanguage();

  if (!isSimulating || !simulatedProfile) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: 'linear-gradient(90deg, #f59e0b, #d97706)',
      color: '#fff', padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
      boxShadow: '0 2px 12px rgba(245,158,11,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          background: 'rgba(0,0,0,0.2)', padding: '3px 10px',
          borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          {t("simulation.mode")}
        </span>
        <span>
          {t("simulation.simulating_account")}{' '}
          <strong>{simulatedProfile.full_name}</strong>
          {' '}({ROLE_LABELS[simulatedProfile.role] ?? simulatedProfile.role})
          {' '}&mdash; {t("simulation.logged_in_as")}{' '}
          <strong>{realProfile?.full_name}</strong>
        </span>
      </div>
      <button
        onClick={stopSimulation}
        style={{
          background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 8,
          color: '#fff', padding: '7px 18px', cursor: 'pointer',
          fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
        onMouseOut={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
      >
        {t("simulation.stop")}
      </button>
    </div>
  );
}
