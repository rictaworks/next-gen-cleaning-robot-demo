"use client";

import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api";
import type { Translations } from "@/i18n";
import StatusBadge from "./StatusBadge";

interface Props {
  t: Translations;
}

export default function JobHistory({ t }: Props) {
  const { data, error } = useSWR("history", () => api.getHistory(), {
    refreshInterval: 5000,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FontAwesomeIcon icon={faClockRotateLeft} className="text-gray-600" />
        {t.history.heading}
      </h2>

      {error && <p className="text-red-500 text-sm">{t.error.generic}</p>}

      {(!data || data.history.length === 0) && !error && (
        <p className="text-gray-400 text-sm">{t.history.no_data}</p>
      )}

      {data && data.history.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-2 py-1 border text-left">{t.history.job_type}</th>
                <th className="px-2 py-1 border text-left">{t.history.status}</th>
                <th className="px-2 py-1 border text-right">{t.history.coverage}</th>
                <th className="px-2 py-1 border text-left">{t.history.started}</th>
                <th className="px-2 py-1 border text-left">{t.history.completed}</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1 border">
                    {(t.job_types as Record<string, string>)[item.job_type] ?? item.job_type}
                  </td>
                  <td className="px-2 py-1 border">
                    <StatusBadge status={item.status} t={t} />
                  </td>
                  <td className="px-2 py-1 border text-right font-mono">
                    {item.coverage_pct}%
                  </td>
                  <td className="px-2 py-1 border text-gray-500">
                    {item.started_at
                      ? new Date(item.started_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-2 py-1 border text-gray-500">
                    {item.completed_at
                      ? new Date(item.completed_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
