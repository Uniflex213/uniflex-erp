import React, { createContext, useContext, useState, useCallback } from 'react';
import { Profile } from './AuthContext';

interface SimulationContextValue {
  isSimulating: boolean;
  simulatedProfile: Profile | null;
  simulatedPermissions: string[];
  startSimulation: (profile: Profile, permissions: string[]) => void;
  stopSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulatedProfile, setSimulatedProfile] = useState<Profile | null>(null);
  const [simulatedPermissions, setSimulatedPermissions] = useState<string[]>([]);

  const startSimulation = useCallback((profile: Profile, permissions: string[]) => {
    setSimulatedProfile(profile);
    setSimulatedPermissions(permissions);
  }, []);

  const stopSimulation = useCallback(() => {
    setSimulatedProfile(null);
    setSimulatedPermissions([]);
  }, []);

  return (
    <SimulationContext.Provider value={{
      isSimulating: simulatedProfile !== null,
      simulatedProfile,
      simulatedPermissions,
      startSimulation,
      stopSimulation,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside SimulationProvider');
  return ctx;
}
