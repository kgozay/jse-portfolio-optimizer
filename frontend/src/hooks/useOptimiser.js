import { useState, useRef } from 'react';
import { API_URL } from '../lib/constants';

export function useOptimiser() {
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const abortRef = useRef(null);

  const optimise = async (payload) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('running');
    setLogs([]);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/optimise/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const event = JSON.parse(line.slice(6));
          if (event.type === 'done') {
            setResult(event);
            setStatus('done');
          } else if (event.type === 'error') {
            setLogs(prev => [...prev, { ...event, status: 'error' }]);
            setStatus('error');
          } else {
            setLogs(prev => [...prev, event]);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatus('error');
      setLogs(prev => [...prev, { type: 'log', msg: err.message, status: 'error' }]);
    }
  };

  const cancel = () => {
    if (abortRef.current) abortRef.current.abort();
    setStatus('idle');
  };

  return { optimise, cancel, logs, result, status };
}
