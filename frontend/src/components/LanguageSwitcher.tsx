"use client";

import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n";

interface Props {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export default function LanguageSwitcher({ locale, onChange }: Props) {
  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value as Locale)}
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
