/**
 * Small, explicit decoders around `cvToJSON` output. We don't use a fully
 * generic Clarity-value-to-JS deep-unwrapper here on purpose: each read-only
 * function's return shape is known and small, and writing it out field by
 * field means a typo in a contract's tuple shape surfaces as a compile-time
 * type error in the corresponding decoder below, not a silent `undefined`
 * at runtime.
 */

export interface CVJson {
  type: string;
  value: unknown;
  success?: boolean;
}

export function unwrapOptional(node: CVJson): CVJson | null {
  if (node.value === null || node.value === undefined) return null;
  return node.value as CVJson;
}

export function tupleFields(node: CVJson): Record<string, CVJson> {
  return node.value as Record<string, CVJson>;
}

export function fUint(fields: Record<string, CVJson>, key: string): number {
  return Number(fields[key]!.value);
}

export function fBigUint(fields: Record<string, CVJson>, key: string): bigint {
  return BigInt(fields[key]!.value as string);
}

export function fString(fields: Record<string, CVJson>, key: string): string {
  return String(fields[key]!.value);
}

export function fPrincipal(fields: Record<string, CVJson>, key: string): string {
  return String(fields[key]!.value);
}
