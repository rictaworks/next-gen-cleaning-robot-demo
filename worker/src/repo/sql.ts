// D1 向けの小さな補助。D1 は 1 文あたりのバインド数に上限（100）があるため、多行 INSERT は分割する。

/** 1 文に入れる最大行数。列数 6 なら 60 バインドで上限内に収まる。 */
export const ROWS_PER_INSERT = 10;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** `INSERT ... VALUES (?1,...),(?n,...)` 形式の文と、その引数を組み立てる。列名は呼び出し側の定数のみ。 */
export function buildMultiRowInsert(
  verb: "INSERT" | "INSERT OR IGNORE",
  table: string,
  columns: readonly string[],
  rows: readonly (readonly unknown[])[],
): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const tuples = rows.map((row) => {
    const placeholders = row.map((value) => {
      params.push(value);
      return `?${params.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });
  const sql = `${verb} INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}`;
  return { sql, params };
}
