export function formatMonth(month: string): string {
  const d = new Date(month + "-01");
  return d.toLocaleDateString("en-SG", { month: "short", year: "2-digit" });
}

export function formatCurrency(n: number): string {
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "k";
  return "$" + n;
}
