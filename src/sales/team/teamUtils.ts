
export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

export function generateTeamCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const part1 = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const part2 = String(Math.floor(1000 + Math.random() * 9000));
  return `${part1}-${part2}`;
}

