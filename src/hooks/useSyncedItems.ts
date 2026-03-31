import { useState, useEffect, useCallback } from "react";
import { getHistory } from "@/lib/storage";
import { SavedItem } from "@/lib/types";

export function useSyncedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getHistory();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}
