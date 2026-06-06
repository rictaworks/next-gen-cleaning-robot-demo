"use client";

import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap } from "@fortawesome/free-solid-svg-icons";
import { api, type MapCellInput, type CellType } from "@/lib/api";
import type { Translations } from "@/i18n";
import MapEditor from "./MapEditor";

function buildDefaultGrid(width: number, height: number): MapCellInput[] {
  const cells: MapCellInput[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      cells.push({
        x,
        y,
        cell_type: isEdge ? "WALL" : "FLOOR",
        floor_connection: null,
      });
    }
  }
  cells[1 + 1 * width] = { x: 1, y: 1, cell_type: "CHARGING_STATION", floor_connection: null };
  return cells;
}

interface Props {
  t: Translations;
  onSuccess: (mapId: string) => void;
}

export default function MapForm({ t, onSuccess }: Props) {
  const [mapName, setMapName] = useState("");
  const [floor, setFloor] = useState(1);
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(8);
  const [cells, setCells] = useState<MapCellInput[]>(() => buildDefaultGrid(8, 8));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDimensionChange = useCallback(
    (newWidth: number, newHeight: number) => {
      setCells(buildDefaultGrid(newWidth, newHeight));
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      const result = await api.createMap({
        map_name: mapName,
        floor_number: floor,
        width,
        height,
        grid_data: cells,
        website: "",
      });
      setSuccess(true);
      onSuccess(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FontAwesomeIcon icon={faMap} className="text-blue-500" />
        {t.map.heading}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm text-gray-700 mb-1">{t.map.name}</label>
          <input
            type="text"
            required
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            className="w-full border rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t.map.floor}</label>
          <input
            type="number"
            min={1}
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
            className="w-full border rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-sm text-gray-700 mb-1">{t.map.width}</label>
            <input
              type="number"
              min={2}
              max={20}
              value={width}
              onChange={(e) => {
                const v = Number(e.target.value);
                setWidth(v);
                handleDimensionChange(v, height);
              }}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{t.map.height}</label>
            <input
              type="number"
              min={2}
              max={20}
              value={height}
              onChange={(e) => {
                const v = Number(e.target.value);
                setHeight(v);
                handleDimensionChange(width, v);
              }}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <MapEditor
        width={width}
        height={height}
        cells={cells}
        onChange={setCells}
        t={t}
      />

      {/* honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} readOnly value="" />

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{t.map.success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
      >
        {loading ? "..." : t.map.submit}
      </button>
    </form>
  );
}
