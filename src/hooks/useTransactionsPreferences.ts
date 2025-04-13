import { useEffect, useState } from "react";
import dayjs from "dayjs";

interface TransactionsPreferences {
  pageSize: number;
  useCustomDates: boolean;
  selectedMonths: number[];
  selectedYear: number;
  startDate: string;
  endDate: string;
}

const DEFAULT_PREFERENCES: TransactionsPreferences = {
  pageSize: 100,
  useCustomDates: false,
  selectedMonths: [dayjs().month()],
  selectedYear: dayjs().year(),
  startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
  endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
};

export function useTransactionsPreferences(groupId?: string) {
  const [preferences, setPreferences] =
    useState<TransactionsPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    if (!groupId) return;

    const storedPreferences = localStorage.getItem(
      `transactions_preferences_${groupId}`
    );
    if (storedPreferences) {
      try {
        const parsed = JSON.parse(storedPreferences);
        setPreferences(parsed);
      } catch (e) {
        // If parsing fails, use defaults
        setPreferences(DEFAULT_PREFERENCES);
      }
    }
  }, [groupId]);

  const updatePreferences = (
    newPreferences: Partial<TransactionsPreferences>
  ) => {
    if (!groupId) return;

    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem(
      `transactions_preferences_${groupId}`,
      JSON.stringify(updated)
    );
  };

  return {
    preferences,
    updatePreferences,
  };
}
