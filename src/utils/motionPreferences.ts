// Detecta a preferência do sistema por animações reduzidas (acessibilidade).
// Usado para desligar partículas, tremores de tela e animações custosas quando
// o usuário ativou "reduzir movimento" no sistema operacional.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
