import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export function useUserData<T>(module: string) {
  const { profile, realProfile } = useAuth();
  const ownerId = realProfile?.id ?? profile?.id;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const { data: row, error: err } = await supabase
        .from('user_data_store')
        .select('data')
        .eq('user_id', ownerId)
        .eq('module', module)
        .maybeSingle();
      if (err) throw err;
      setData(row ? (row.data as T) : null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ownerId, module]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (newData: T) => {
    if (!ownerId) return;
    const { error: err } = await supabase
      .from('user_data_store')
      .upsert({
        user_id: ownerId,
        module,
        data: newData as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,module' });
    if (err) throw err;
    setData(newData);
  };

  return { data, loading, error, save, refresh };
}
