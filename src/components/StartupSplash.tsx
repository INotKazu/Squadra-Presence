import { useEffect, useRef, useState } from "react";

interface StartupSplashProps {
  soundEnabled: boolean;
  onComplete: () => void;
}

const STARTUP_FADE_AT_MS = 2_650;
const STARTUP_COMPLETE_AT_MS = 3_200;

function playKazuCorpChime(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, audio.currentTime);
    master.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + 0.035);
    master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.35);
    master.connect(audio.destination);

    [196, 293.66, 392, 587.33].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = index < 2 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime + index * 0.105);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, audio.currentTime + 0.65 + index * 0.105);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(index === 3 ? 0.24 : 0.12, audio.currentTime + 0.035 + index * 0.105);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.72 + index * 0.105);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(audio.currentTime + index * 0.105);
      oscillator.stop(audio.currentTime + 0.82 + index * 0.105);
    });
    window.setTimeout(() => void audio.close(), 1700);
  } catch {
    // Audio is presentation-only and must never block app startup.
  }
}

export function StartupSplash({ soundEnabled, onComplete }: StartupSplashProps) {
  const [closing, setClosing] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    if (soundEnabled && !played.current) {
      played.current = true;
      playKazuCorpChime();
    }
    const fadeTimer = window.setTimeout(() => setClosing(true), STARTUP_FADE_AT_MS);
    const doneTimer = window.setTimeout(onComplete, STARTUP_COMPLETE_AT_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete, soundEnabled]);

  return (
    <div className={`startup-splash ${closing ? "startup-splash--closing" : ""}`} role="status" aria-live="polite">
      <div className="startup-grid" />
      <div className="startup-scanline" />
      <div className="startup-brand">
        <div className="startup-emblem"><span>K</span><i /></div>
        <small>KazuCorp Systems</small>
        <h1>SQUADRA LINK</h1>
        <div className="startup-status"><b /><span>Initialized</span></div>
      </div>
      <p>Unofficial battle companion • KazuCorp production</p>
    </div>
  );
}
