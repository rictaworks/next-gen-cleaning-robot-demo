import { buildMultiRowInsert, chunk, ROWS_PER_INSERT } from "./sql";

export interface RobotRow {
  id: string;
  session_id: string;
  robot_name: string;
  model_type: string;
  status: string;
  created_at: string;
}

export interface RobotCapabilityRow {
  id: string;
  robot_id: string;
  capability: string;
}

const ROBOT_COLUMNS = [
  "id",
  "session_id",
  "robot_name",
  "model_type",
  "status",
  "created_at",
] as const;

const CAPABILITY_COLUMNS = ["id", "robot_id", "capability"] as const;

export async function insertRobotWithCapabilities(
  db: D1Database,
  robot: RobotRow,
  capabilities: readonly RobotCapabilityRow[],
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  const robotInsert = buildMultiRowInsert("INSERT", "robots", ROBOT_COLUMNS, [
    [
      robot.id,
      robot.session_id,
      robot.robot_name,
      robot.model_type,
      robot.status,
      robot.created_at,
    ],
  ]);
  statements.push(db.prepare(robotInsert.sql).bind(...robotInsert.params));

  for (const rows of chunk(capabilities, ROWS_PER_INSERT)) {
    const capInsert = buildMultiRowInsert(
      "INSERT",
      "robot_capabilities",
      CAPABILITY_COLUMNS,
      rows.map((cap) => [cap.id, cap.robot_id, cap.capability]),
    );
    statements.push(db.prepare(capInsert.sql).bind(...capInsert.params));
  }

  await db.batch(statements);
}

export async function findRobotForSession(
  db: D1Database,
  robotId: string,
  sessionId: string,
): Promise<RobotRow | null> {
  return db
    .prepare(
      "SELECT id, session_id, robot_name, model_type, status, created_at FROM robots WHERE id = ?1 AND session_id = ?2",
    )
    .bind(robotId, sessionId)
    .first<RobotRow>();
}

export async function listRobotCapabilities(
  db: D1Database,
  robotId: string,
): Promise<RobotCapabilityRow[]> {
  const result = await db
    .prepare("SELECT id, robot_id, capability FROM robot_capabilities WHERE robot_id = ?1 ORDER BY rowid")
    .bind(robotId)
    .all<RobotCapabilityRow>();
  return result.results;
}

export async function setRobotStatus(
  db: D1Database,
  robotId: string,
  status: string,
): Promise<void> {
  await db.prepare("UPDATE robots SET status = ?2 WHERE id = ?1").bind(robotId, status).run();
}
