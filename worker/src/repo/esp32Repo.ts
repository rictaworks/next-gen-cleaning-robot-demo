export interface SensorReadingRow {
  temperature: number;
  humidity: number;
  updated_at: string;
}

/** ESP32 の最新センサー値は 1 行（id = 1）のみ保持する。 */
const SENSOR_ROW_ID = 1;

export async function upsertSensorReading(
  db: D1Database,
  reading: SensorReadingRow,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO esp32_sensor_readings (id, temperature, humidity, updated_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (id) DO UPDATE SET
         temperature = excluded.temperature,
         humidity = excluded.humidity,
         updated_at = excluded.updated_at`,
    )
    .bind(SENSOR_ROW_ID, reading.temperature, reading.humidity, reading.updated_at)
    .run();
}

export async function findLatestSensorReading(db: D1Database): Promise<SensorReadingRow | null> {
  return db
    .prepare("SELECT temperature, humidity, updated_at FROM esp32_sensor_readings WHERE id = ?1")
    .bind(SENSOR_ROW_ID)
    .first<SensorReadingRow>();
}
