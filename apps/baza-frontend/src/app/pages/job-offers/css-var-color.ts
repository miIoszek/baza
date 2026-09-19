export function resolveCssColor(
  host: HTMLElement,
  varName: string,
  fallback: string
): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${varName})`;
  host.appendChild(probe);
  const color = getComputedStyle(probe).color;
  host.removeChild(probe);
  if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
    return fallback;
  }
  return color;
}
