export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function getDeepestPageTitle<T>(
  pathname: string,
  titles: Record<string, T>,
  fallbackKey: string
): T {
  return (
    Object.entries(titles)
      .filter(([key]) => pathname.startsWith(key))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? titles[fallbackKey]
  );
}

export function getScoreColor(value: number): string {
  if (value >= 85) return "#34d399";
  if (value >= 70) return "#fbbf24";
  return "#f87171";
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
