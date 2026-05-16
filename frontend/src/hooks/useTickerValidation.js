import { useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/constants';

export function useTickerValidation(onResult) {
  const timerRef = useRef(null);

  const validate = useCallback((ticker) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/validate/${ticker}`);
        onResult(ticker, data.valid ? 'valid' : 'invalid', data.name);
      } catch {
        onResult(ticker, 'invalid', null);
      }
    }, 400);
  }, [onResult]);

  return { validate };
}
