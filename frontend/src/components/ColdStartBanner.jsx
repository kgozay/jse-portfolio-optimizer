import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../lib/constants';

export function ColdStartBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    // Show the banner if backend is not ready after 4 seconds
    const showTimer = setTimeout(() => {
      if (isMounted) setShow(true);
    }, 4000);

    const checkHealth = async () => {
      try {
        await axios.get(`${API_URL}/health`, { timeout: 3000 });
        if (isMounted) {
          setShow(false);
          clearTimeout(showTimer);
          if (intervalId) clearInterval(intervalId);
        }
      } catch {
        // Backend is still cold, continue polling
      }
    };

    // Run immediate check
    checkHealth();

    // Setup polling every 3 seconds
    intervalId = setInterval(checkHealth, 3000);

    return () => {
      isMounted = false;
      clearTimeout(showTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="border border-nb-amber font-mono text-[10px] text-amber-500 tracking-wide px-3 py-2.5 mt-3"
        >
          BACKEND WARMING UP — first optimization may take 30–60s
        </motion.div>
      )}
    </AnimatePresence>
  );
}
