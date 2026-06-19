// ── Wave 3 Animation Utilities ──

/** Fire confetti burst for deal Won celebrations */
export async function celebrateWin() {
  try {
    const confetti = (await import('canvas-confetti')).default;
    // Center burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#7c3aed', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899'],
    });
    // Side cannons
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
    }, 200);
  } catch {
    // canvas-confetti not available — graceful fallback
  }
}

/** Subtle red flash for deal Lost */
export function flashLoss() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(239,68,68,0.08);pointer-events:none;transition:opacity 0.5s;';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 600);
  });
}
