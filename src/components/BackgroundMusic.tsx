import { useEffect, useRef, useState } from "react";

export const BACKGROUND_MUSIC_SOURCE = "/assets/audio/kazucorp-evening-link.ogg";
export const BACKGROUND_MUSIC_START_EVENT = "squadra-presence:background-music-start";

interface BackgroundMusicProps {
  enabled: boolean;
  volume: number;
  mobileRuntime?: boolean;
}

function isAppActive(mobileRuntime: boolean): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible" && (mobileRuntime || document.hasFocus());
}

export function requestBackgroundMusicStart(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(BACKGROUND_MUSIC_START_EVENT));
}

export function BackgroundMusic({ enabled, volume, mobileRuntime = false }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [active, setActive] = useState(() => isAppActive(mobileRuntime));
  const safeVolume = Math.max(0, Math.min(1, volume));

  useEffect(() => {
    const refresh = () => setActive(isAppActive(mobileRuntime));
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("blur", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("blur", refresh);
    };
  }, [mobileRuntime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = safeVolume;
    if (enabled && active && safeVolume > 0) {
      void audio.play().catch(() => {
        // Mobile WebViews may wait for the next user gesture. The listener below
        // retries without surfacing an error or blocking the rest of the app.
      });
    } else {
      audio.pause();
    }
  }, [active, enabled, safeVolume]);

  useEffect(() => {
    const retry = (event: Event) => {
      const audio = audioRef.current;
      const explicitlyStarted = event.type === BACKGROUND_MUSIC_START_EVENT;
      if (audio && (enabled || explicitlyStarted) && isAppActive(mobileRuntime) && safeVolume > 0 && audio.paused) {
        audio.volume = safeVolume;
        void audio.play().catch(() => undefined);
      }
    };
    window.addEventListener(BACKGROUND_MUSIC_START_EVENT, retry);
    window.addEventListener("pointerdown", retry, { passive: true });
    return () => {
      window.removeEventListener(BACKGROUND_MUSIC_START_EVENT, retry);
      window.removeEventListener("pointerdown", retry);
    };
  }, [enabled, mobileRuntime, safeVolume]);

  useEffect(() => () => audioRef.current?.pause(), []);

  return (
    <audio
      ref={audioRef}
      src={BACKGROUND_MUSIC_SOURCE}
      preload={enabled ? "auto" : "metadata"}
      loop
      aria-hidden="true"
      data-background-music="evening-link"
    />
  );
}
