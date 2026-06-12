"use client";

import useSWR from "swr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf, faDroplet, faMicrochip } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api";
import type { Translations } from "@/i18n";

interface Props {
  t: Translations;
}

export default function SensorMonitor({ t }: Props) {
  const { data, error } = useSWR("/esp32/sensor", () => api.getSensor(), {
    refreshInterval: 5000,
    shouldRetryOnError: false,
  });

  const updatedAt = data?.updated_at
    ? new Date(data.updated_at).toLocaleTimeString()
    : null;

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faMicrochip} className="text-green-600" />
        {t.sensor.heading}
      </h3>

      {error || !data ? (
        <p className="text-sm text-gray-400">{t.sensor.no_data}</p>
      ) : (
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faThermometerHalf} className="text-red-400 text-xl" />
            <div>
              <p className="text-xs text-gray-500">{t.sensor.temperature}</p>
              <p className="text-2xl font-bold text-gray-800">{data.temperature.toFixed(1)}<span className="text-sm font-normal ml-1">°C</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faDroplet} className="text-blue-400 text-xl" />
            <div>
              <p className="text-xs text-gray-500">{t.sensor.humidity}</p>
              <p className="text-2xl font-bold text-gray-800">{data.humidity.toFixed(1)}<span className="text-sm font-normal ml-1">%</span></p>
            </div>
          </div>
          {updatedAt && (
            <p className="text-xs text-gray-400 ml-auto">{t.sensor.updated}: {updatedAt}</p>
          )}
        </div>
      )}
    </div>
  );
}
