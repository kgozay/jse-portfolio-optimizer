import { useState, useEffect } from 'react';

export function useCountUp(target, duration = 800, decimals = 2) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals]);
  return value;
}
