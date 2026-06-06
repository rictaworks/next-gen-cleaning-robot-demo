"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { api, type Capability, type ModelType } from "@/lib/api";
import type { Translations } from "@/i18n";

const MODEL_TYPES: ModelType[] = ["STANDARD", "SLIM", "STAIR_CAPABLE"];
const CAPABILITIES: Capability[] = [
  "BASIC_CLEAN", "EDGE_CLEAN", "NARROW_GAP_TRAVERSE", "STAIR_TRAVERSE", "SPOT_CLEAN",
];

interface Props {
  t: Translations;
  onSuccess: (robotId: string) => void;
}

export default function RobotForm({ t, onSuccess }: Props) {
  const [robotName, setRobotName] = useState("");
  const [modelType, setModelType] = useState<ModelType>("STANDARD");
  const [selectedCaps, setSelectedCaps] = useState<Capability[]>(["BASIC_CLEAN"]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleCap = (cap: Capability) => {
    setSelectedCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      const result = await api.createRobot({
        robot_name: robotName,
        model_type: modelType,
        capabilities: selectedCaps,
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
        <FontAwesomeIcon icon={faRobot} className="text-purple-500" />
        {t.robot.heading}
      </h2>

      <div>
        <label className="block text-sm text-gray-700 mb-1">{t.robot.name}</label>
        <input
          type="text"
          required
          value={robotName}
          onChange={(e) => setRobotName(e.target.value)}
          className="w-full border rounded px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">{t.robot.model}</label>
        <select
          value={modelType}
          onChange={(e) => setModelType(e.target.value as ModelType)}
          className="w-full border rounded px-3 py-1.5 text-sm"
        >
          {MODEL_TYPES.map((m) => (
            <option key={m} value={m}>
              {(t.model_types as Record<string, string>)[m]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">{t.robot.capabilities}</label>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((cap) => (
            <label key={cap} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCaps.includes(cap)}
                onChange={() => toggleCap(cap)}
              />
              {cap}
            </label>
          ))}
        </div>
      </div>

      {/* honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} readOnly value="" />

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{t.robot.success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-purple-700"
      >
        {loading ? "..." : t.robot.submit}
      </button>
    </form>
  );
}
