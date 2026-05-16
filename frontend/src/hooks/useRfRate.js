import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, DEFAULT_RF_PCT } from '../lib/constants';

export function useRfRate() {
  const [rfData, setRfData] = useState({
    rate: DEFAULT_RF_PCT / 100,
    rate_pct: DEFAULT_RF_PCT,
    date: null,
    source: 'loading',
    series_id: 'IRLTLT01ZAM156N',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/rf-rate`)
      .then(res => { setRfData(res.data); setLoading(false); })
      .catch(() => { setRfData(prev => ({ ...prev, source: 'fallback' })); setLoading(false); });
  }, []);

  return { rfData, loading };
}
