"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBroom, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import { api, type JobType } from "@/lib/api";
import type { Translations } from "@/i18n";
import StatusBadge from "./StatusBadge";

const JOB_TYPES: JobType[] = [
  "FULL_CLEAN", "SPOT_CLEAN", "EDGE_CLEAN", "STAIR_CLEAN", "NARROW_ONLY",
];

interface Props {
  t: Translations;
  robotId: string | null;
  mapId: string | null;
}

export default function JobPanel({ t, robotId, mapId }: Props) {
  const [jobType, setJobType] = useState<JobType>("FULL_CLEAN");
  const [priority, setPriority] = useState(5);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!robotId || !mapId) {
      setError("Robot and map must be registered first");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const job = await api.createJob({
        robot_id: robotId,
        map_id: mapId,
        job_type: jobType,
        priority,
        website: "",
      });
      setJobId(job.id);
      setJobStatus(job.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!jobId) return;
    setError(null);
    setLoading(true);

    try {
      await api.startJob(jobId);
      setJobStatus("IN_PROGRESS");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    setError(null);
    setLoading(true);

    try {
      await api.cancelJob(jobId);
      setJobStatus("CANCELLED");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FontAwesomeIcon icon={faBroom} className="text-green-600" />
        {t.job.heading}
      </h2>

      {!jobId ? (
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">{t.job.type}</label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as JobType)}
              className="w-full border rounded px-3 py-1.5 text-sm"
            >
              {JOB_TYPES.map((jt) => (
                <option key={jt} value={jt}>
                  {(t.job_types as Record<string, string>)[jt]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              {t.job.priority}: {priority}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* honeypot */}
          <input type="text" name="website" className="hidden" tabIndex={-1} readOnly value="" />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !robotId || !mapId}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-green-700"
          >
            {loading ? "..." : t.job.submit}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Job ID: <code className="text-xs">{jobId}</code></p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t.job.type}:</span>
            <StatusBadge status={jobStatus ?? "PENDING"} t={t} />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2">
            {jobStatus === "PENDING" && (
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
                {t.job.start}
              </button>
            )}
            {(jobStatus === "PENDING" || jobStatus === "IN_PROGRESS") && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50 hover:bg-red-700"
              >
                <FontAwesomeIcon icon={faStop} className="w-3 h-3" />
                {t.job.cancel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
