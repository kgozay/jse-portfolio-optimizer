import { useState, useEffect } from 'react';

const CHARS = '!@#$%^&*()_+~`|}{[]:;?><,./-=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function useTextScramble(text, duration = 600) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (text === undefined || text === null) {
      setDisplayText('');
      return;
    }
    
    const targetStr = String(text);
    let frame = 0;
    const totalFrames = 15; // Resolves in 15 animation intervals
    const intervalMs = duration / totalFrames;
    
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      
      const scrambled = targetStr.split('').map((char, index) => {
        // Keep spaces, symbols, and decimal points clean to prevent layout shifts
        if (char === ' ' || char === '%' || char === '+' || char === '-' || char === '.' || char === '✓' || char === '⚠') {
          return char;
        }
        
        const resolveThreshold = index / targetStr.length;
        if (progress > resolveThreshold) {
          return char;
        }
        
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      
      setDisplayText(scrambled);
      
      if (frame >= totalFrames) {
        clearInterval(interval);
        setDisplayText(targetStr);
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [text, duration]);

  return displayText;
}
