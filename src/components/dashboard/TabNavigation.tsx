"use client";

import { TabId } from "@/types/inquiry";
import { TABS } from "@/lib/dashboardUtils";

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <nav className="w-48 shrink-0 border-r border-gray-200 bg-white">
      <ul className="py-2">
        {TABS.map((tab) => (
          <li key={tab.id}>
            <button
              onClick={() => onTabChange(tab.id)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-red-50 text-red-700 border-l-3 border-red-600 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-3 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
