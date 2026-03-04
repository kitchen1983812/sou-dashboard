"use client";

import { FilterState } from "@/types/inquiry";

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  companies: string[];
  nurseries: string[];
  areas: string[];
  contactMethods: string[];
  statuses: string[];
  duplicateChecks: string[];
  showContactMethod?: boolean;
  showStatus?: boolean;
  dateLabel?: string;
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white text-gray-700 min-w-[120px]"
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export default function Filters({
  filters,
  onFilterChange,
  companies,
  nurseries,
  areas,
  contactMethods,
  statuses,
  duplicateChecks,
  showContactMethod = false,
  showStatus = false,
  dateLabel,
}: FiltersProps) {
  const update = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectFilter
        label="企業"
        value={filters.company}
        options={companies}
        onChange={(v) => update("company", v)}
      />
      <SelectFilter
        label="園"
        value={filters.nursery}
        options={nurseries}
        onChange={(v) => update("nursery", v)}
      />
      <SelectFilter
        label="エリア"
        value={filters.area}
        options={areas}
        onChange={(v) => update("area", v)}
      />
      {showContactMethod && (
        <SelectFilter
          label="連絡手段"
          value={filters.contactMethod}
          options={contactMethods}
          onChange={(v) => update("contactMethod", v)}
        />
      )}
      {showStatus && (
        <SelectFilter
          label="ステータス"
          value={filters.status}
          options={statuses}
          onChange={(v) => update("status", v)}
        />
      )}
      <SelectFilter
        label="重複チェック"
        value={filters.duplicateCheck}
        options={duplicateChecks}
        onChange={(v) => update("duplicateCheck", v)}
      />
      {dateLabel && (
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">
          {dateLabel}
        </span>
      )}
    </div>
  );
}
