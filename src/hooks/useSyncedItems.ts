import { useState, useEffect, useCallback } from "react";
import { getHistory } from "@/lib/storage";
import { SavedItem } from "@/lib/types";

export function useSyncedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getHistory();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener("items-updated", handleUpdate);
    return () => window.removeEventListener("items-updated", handleUpdate);
  }, [refresh]);

  return { items, loading, refresh };
}
