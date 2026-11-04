/** 日時は UTC の ISO 8601（ミリ秒・Z 付き）で統一して保存・返却する。 */

export function toIso(date: Date): string {
  return date.toISOString();
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function parseIso(value: string): Date {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`Stored timestamp is not a valid ISO date: ${value}`);
  }
  return new Date(time);
}
