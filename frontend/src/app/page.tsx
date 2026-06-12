"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faInfo } from "@fortawesome/free-solid-svg-icons";
import { getTranslations, detectLocale, type Locale, type Translations } from "@/i18n";
import { api } from "@/lib/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MapForm from "@/components/MapForm";
import RobotForm from "@/components/RobotForm";
import JobPanel from "@/components/JobPanel";
import PositionMonitor from "@/components/PositionMonitor";
import JobHistory from "@/components/JobHistory";
import SensorMonitor from "@/components/SensorMonitor";

type Tab = "map" | "robot" | "job" | "history";

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("ja");
  const [t, setT] = useState<Translations>(() => getTranslations("ja"));
  const [tab, setTab] = useState<Tab>("map");
  const [mapId, setMapId] = useState<string | null>(null);
  const [robotId, setRobotId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    const detected = detectLocale();
    setLocale(detected);
    setT(getTranslations(detected));
  }, []);

  useEffect(() => {
    api.init().catch(() => setSessionError(true));
  }, []);

  const handleLocaleChange = (l: Locale) => {
    setLocale(l);
    setT(getTranslations(l));
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "map", label: t.nav.map },
    { key: "robot", label: t.nav.robot },
    { key: "job", label: t.nav.job },
    { key: "history", label: t.nav.history },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faRobot} className="text-blue-600" />
            {t.title}
          </h1>
          <nav className="flex items-center gap-4">
            <LanguageSwitcher locale={locale} onChange={handleLocaleChange} />
            <span className="border-l border-gray-300 pl-4">
              <a
                href="https://rictaworks.jp/#demos"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors duration-150"
              >
                ← デモ一覧へ
              </a>
            </span>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 py-2">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
          <FontAwesomeIcon icon={faInfo} className="w-3 h-3" />
          {t.reset_notice}
        </p>
      </div>

      {sessionError && (
        <div className="max-w-5xl mx-auto w-full px-4">
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
            {t.error.session}
          </p>
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full px-4">
        <nav className="flex border-b mt-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <main className="max-w-5xl mx-auto w-full px-4 py-6 flex-1">
        <div className="bg-white rounded-lg border shadow-sm p-6">
          {tab === "map" && (
            <MapForm
              t={t}
              onSuccess={(id) => {
                setMapId(id);
                setTab("robot");
              }}
            />
          )}
          {tab === "robot" && (
            <RobotForm
              t={t}
              onSuccess={(id) => {
                setRobotId(id);
                setTab("job");
              }}
            />
          )}
          {tab === "job" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <JobPanel t={t} robotId={robotId} mapId={mapId} />
                <PositionMonitor t={t} robotId={robotId} />
              </div>
              <SensorMonitor t={t} />
            </div>
          )}
          {tab === "history" && <JobHistory t={t} />}
        </div>

        {(mapId || robotId) && (
          <div className="mt-4 text-xs text-gray-400 space-y-0.5">
            {mapId && <p>Map ID: {mapId}</p>}
            {robotId && <p>Robot ID: {robotId}</p>}
          </div>
        )}
      </main>

      <footer className="border-t text-center text-xs text-gray-400 py-3">
        Next-Gen Cleaning Robot Demo &mdash; {t.title}
      </footer>
    </div>
  );
}
