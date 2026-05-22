import { useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/constants';

export function useTickerValidation(onResult) {
  const validate = useCallback(async (ticker) => {
    try {
      const { data } = await axios.get(`${API_URL}/validate/${ticker}`);
      onResult(ticker, data.valid ? 'valid' : 'invalid', data.name);
    } catch {
      onResult(ticker, 'invalid', null);
    }
  }, [onResult]);

  return { validate };
}
