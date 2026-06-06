"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  type IconDefinition,
  faSquare, faMinus, faArrowUp, faArrowDown,
  faBolt, faBorderAll,
} from "@fortawesome/free-solid-svg-icons";
import type { CellType, MapCellInput } from "@/lib/api";
import type { Translations } from "@/i18n";

const CELL_COLORS: Record<CellType, string> = {
  FLOOR: "bg-gray-100 hover:bg-gray-200",
  WALL: "bg-gray-800",
  NARROW_GAP: "bg-yellow-300 hover:bg-yellow-400",
  STAIR_UP: "bg-blue-300 hover:bg-blue-400",
  STAIR_DOWN: "bg-indigo-300 hover:bg-indigo-400",
  CHARGING_STATION: "bg-green-400 hover:bg-green-500",
};

const CELL_ORDER: CellType[] = [
  "FLOOR", "WALL", "NARROW_GAP", "STAIR_UP", "STAIR_DOWN", "CHARGING_STATION",
];

const CELL_ICONS: Record<CellType, IconDefinition> = {
  FLOOR: faSquare,
  WALL: faBorderAll,
  NARROW_GAP: faMinus,
  STAIR_UP: faArrowUp,
  STAIR_DOWN: faArrowDown,
  CHARGING_STATION: faBolt,
};

interface Props {
  width: number;
  height: number;
  cells: MapCellInput[];
  onChange: (cells: MapCellInput[]) => void;
  t: Translations;
}

export default function MapEditor({ width, height, cells, onChange, t }: Props) {
  const [activeTool, setActiveTool] = useState<CellType>("FLOOR");
  const [floorConnection, setFloorConnection] = useState<number>(2);

  const getCell = (x: number, y: number): MapCellInput => {
    return (
      cells.find((c) => c.x === x && c.y === y) ?? {
        x, y, cell_type: "WALL", floor_connection: null,
      }
    );
  };

  const handleCellClick = (x: number, y: number) => {
    const isStair = activeTool === "STAIR_UP" || activeTool === "STAIR_DOWN";
    const updated = cells.filter((c) => !(c.x === x && c.y === y));
    updated.push({
      x,
      y,
      cell_type: activeTool,
      floor_connection: isStair ? floorConnection : null,
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CELL_ORDER.map((ct) => (
          <button
            key={ct}
            type="button"
            onClick={() => setActiveTool(ct)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-sm ${
              activeTool === ct
                ? "border-blue-500 ring-2 ring-blue-300"
                : "border-gray-300"
            } ${CELL_COLORS[ct]}`}
          >
            <FontAwesomeIcon icon={CELL_ICONS[ct]} className="w-3 h-3" />
            {(t.cell_types as Record<string, string>)[ct]}
          </button>
        ))}
      </div>

      {(activeTool === "STAIR_UP" || activeTool === "STAIR_DOWN") && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-600">floor_connection:</label>
          <input
            type="number"
            min={1}
            value={floorConnection}
            onChange={(e) => setFloorConnection(Number(e.target.value))}
            className="w-16 border rounded px-2 py-0.5"
          />
        </div>
      )}

      <p className="text-xs text-gray-500">{t.map.grid_help}</p>

      <div
        className="border border-gray-300 inline-block"
        style={{ userSelect: "none" }}
      >
        {Array.from({ length: height }, (_, y) => (
          <div key={y} className="flex">
            {Array.from({ length: width }, (_, x) => {
              const cell = getCell(x, y);
              const ct = cell.cell_type as CellType;
              return (
                <button
                  key={x}
                  type="button"
                  onClick={() => handleCellClick(x, y)}
                  title={`(${x},${y}) ${ct}`}
                  className={`w-8 h-8 border border-gray-200 flex items-center justify-center ${CELL_COLORS[ct]}`}
                >
                  <FontAwesomeIcon
                    icon={CELL_ICONS[ct]}
                    className="w-3 h-3 opacity-60"
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
