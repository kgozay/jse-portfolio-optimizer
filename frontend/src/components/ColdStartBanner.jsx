import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../lib/constants';

export function ColdStartBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 4000);
    axios.get(`${API_URL}/health`, { timeout: 4000 })
      .then(() => { clearTimeout(timer); setShow(false); })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="border border-nb-amber font-mono text-[9px] text-amber-500 tracking-wide px-3 py-2 mt-3"
        >
          BACKEND WARMING UP — first optimization may take 30–60s
        </motion.div>
      )}
    </AnimatePresence>
  );
}
