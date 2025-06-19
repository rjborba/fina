import { useState } from "react";

function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      // Ignore JSON parse errors or localStorage access issues
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore localStorage set errors
    }
  };

  return [state, setValue];
}

export default useLocalStorageState;
