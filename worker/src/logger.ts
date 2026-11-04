// 構造化ログ（1 行 1 JSON）。Workers の wrangler tail やダッシュボードでデバッグトレースできるようにする。

type LogFields = Record<string, unknown>;

export function logInfo(event: string, fields: LogFields = {}): void {
  console.info(JSON.stringify({ level: "info", event, ...fields }));
}

export function logError(event: string, fields: LogFields = {}): void {
  console.error(JSON.stringify({ level: "error", event, ...fields }));
}
