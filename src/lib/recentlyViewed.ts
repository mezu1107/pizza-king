const KEY = "almf_recently_viewed";
const MAX = 8;

export interface RecentItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  viewedAt: number;
}

export const getRecentlyViewed = (): RecentItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
};

export const addRecentlyViewed = (item: Omit<RecentItem, "viewedAt">) => {
  try {
    const existing = getRecentlyViewed().filter((x) => x.id !== item.id);
    const next = [{ ...item, viewedAt: Date.now() }, ...existing].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("recently-viewed-updated"));
  } catch {
    /* noop */
  }
};

export const clearRecentlyViewed = () => {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("recently-viewed-updated"));
};
