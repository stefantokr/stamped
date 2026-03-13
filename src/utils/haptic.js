export function haptic(pattern = 10) {
  try { navigator.vibrate?.(pattern) } catch {}
}
