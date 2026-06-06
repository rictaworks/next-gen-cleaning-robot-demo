"use client";

import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api";
import type { Translations } from "@/i18n";

interface Props {
  t: Translations;
  robotId: string | null;
}

export default function PositionMonitor({ t, robotId }: Props) {
  const { data, error } = useSWR(
    robotId ? ["position", robotId] : null,
    () => api.getRobotPosition(robotId!),
    { refreshInterval: 1000 },
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FontAwesomeIcon icon={faLocationDot} className="text-orange-500" />
        {t.position.heading}
      </h2>

      {!robotId && (
        <p className="text-gray-500 text-sm">{t.position.no_data}</p>
      )}

      {robotId && error && (
        <p className="text-gray-400 text-sm">{t.position.no_data}</p>
      )}

      {data && (
        <dl className="grid grid-cols-2 gap-1 text-sm">
          <dt className="text-gray-500">{t.position.x}</dt>
          <dd className="font-mono">{data.x}</dd>
          <dt className="text-gray-500">{t.position.y}</dt>
          <dd className="font-mono">{data.y}</dd>
          <dt className="text-gray-500">{t.position.cell_type}</dt>
          <dd>{(t.cell_types as Record<string, string>)[data.cell_type] ?? data.cell_type}</dd>
          <dt className="text-gray-500">{t.position.updated}</dt>
          <dd className="text-xs">{new Date(data.updated_at).toLocaleTimeString()}</dd>
        </dl>
      )}
    </div>
  );
}
