import { useEffect, useRef } from "react";
import { useApp } from "../AppContext";

export function useTabDirty(isDirty: boolean) {
  const { setTabDirty, getActiveTabId } = useApp();
  const tabIdRef = useRef<string>("");

  useEffect(() => {
    tabIdRef.current = getActiveTabId();
  }, [getActiveTabId]);

  useEffect(() => {
    const tabId = tabIdRef.current;
    if (tabId) {
      setTabDirty(tabId, isDirty);
    }
    return () => {
      if (tabId) {
        setTabDirty(tabId, false);
      }
    };
  }, [isDirty, setTabDirty]);
}
