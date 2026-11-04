// テスト用の D1 アダプタ。D1Database と同じ prepare().bind().run()/all()/first()/batch() の形を
// Node 組み込みの node:sqlite に載せる。SQL 実行エンジンのみ差し替え、リポジトリ層の実装はそのまま動く。

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../worker/migrations/0001_init.sql",
);

type Bindable = string | number | null;

class TestStatement {
  private values: Bindable[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: Bindable[]): TestStatement {
    this.values = values;
    return this;
  }

  async run(): Promise<{ success: boolean; meta: { changes: number } }> {
    const info = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(info.changes) } };
  }

  async all<T>(): Promise<{ results: T[]; success: boolean }> {
    const rows = this.db.prepare(this.sql).all(...this.values) as T[];
    return { results: rows, success: true };
  }

  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values) as T | undefined;
    return row ?? null;
  }
}

export interface TestD1 {
  readonly database: DatabaseSync;
  prepare(sql: string): TestStatement;
  batch(statements: TestStatement[]): Promise<{ success: boolean; meta: { changes: number } }[]>;
}

/** マイグレーション適用済みのインメモリ D1 を作る。外部キーは D1 と同じく有効にする。 */
export function createTestD1(): TestD1 {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(readFileSync(migrationPath, "utf-8"));

  return {
    database,
    prepare(sql: string) {
      return new TestStatement(database, sql);
    },
    async batch(statements: TestStatement[]) {
      // D1 の batch は 1 トランザクションで順に実行される。テストでは逐次実行で同じ結果になる。
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    },
  };
}
