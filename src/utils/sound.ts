/**
 * צלילים קצרים באמצעות WebAudio — ללא קובצי אודיו חיצוניים,
 * כדי שהאפליקציה תעבוד לגמרי ללא רשת וללא נכסים כבדים.
 */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundsEnabled(value: boolean): void {
  enabled = value;
}

function beep(frequency: number, durationMs: number, delayMs = 0, type: OscillatorType = 'sine'): void {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    const start = ctx.currentTime + delayMs / 1000;
    osc.start(start);
    gain.gain.setValueAtTime(0.06, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
    osc.stop(start + durationMs / 1000);
  } catch {
    // אין התקן שמע — מתעלמים בשקט.
  }
}

export const sounds = {
  place: () => beep(520, 60),
  submit: () => beep(400, 90),
  win: () => {
    beep(523, 120);
    beep(659, 120, 130);
    beep(784, 220, 260);
  },
  lose: () => {
    beep(330, 180);
    beep(262, 300, 190);
  },
  error: () => beep(180, 150, 0, 'square'),
};
