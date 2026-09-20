/** Formats a raw base-unit token amount (bigint-as-string) using its decimals. */
export function formatTokenAmount(rawAmount: string | bigint, decimals: number): string {
  const raw = typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount || "0");
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;

  const wholeStr = whole.toLocaleString("en-US");
  if (decimals === 0 || fraction === 0n) return `${negative ? "-" : ""}${wholeStr}`;

  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 6);
  return fractionStr ? `${negative ? "-" : ""}${wholeStr}.${fractionStr}` : `${negative ? "-" : ""}${wholeStr}`;
}

/** Converts a human-entered decimal amount into base units for a contract call. */
export function toBaseUnits(amount: string, decimals: number): bigint {
  const [wholePart, fractionPart = ""] = amount.trim().split(".");
  const paddedFraction = fractionPart.padEnd(decimals, "0").slice(0, decimals);
  const combined = `${wholePart || "0"}${paddedFraction}`;
  return BigInt(combined || "0");
}

export function formatBlockHeight(height: number | null): string {
  return height != null ? `#${height.toLocaleString("en-US")}` : "—";
}
