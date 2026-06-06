import type { Translations } from "@/i18n";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  PAUSED: "bg-orange-100 text-orange-800",
  IDLE: "bg-gray-100 text-gray-600",
  RUNNING: "bg-blue-100 text-blue-800",
  ERROR: "bg-red-100 text-red-800",
};

interface Props {
  status: string;
  t: Translations;
}

export default function StatusBadge({ status, t }: Props) {
  const label = (t.status as Record<string, string>)[status] ?? status;
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
