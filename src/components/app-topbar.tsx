import { Bell, Search, Calendar, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const THEME_KEY = "theme";

export function AppTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(THEME_KEY);
    const dark = stored ? stored === "dark" : document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/70 px-6 backdrop-blur-xl">
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="hidden md:block text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 ring-1 ring-border w-72">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          placeholder="Search verifications, doctors…"
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <kbd className="hidden xl:inline-flex font-mono text-[10px] text-muted-foreground rounded bg-muted px-1.5 py-0.5">⌘K</kbd>
      </div>

      <button className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 ring-1 ring-border text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Calendar className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Last 7 days</span>
      </button>

      <button
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="grid place-items-center h-9 w-9 rounded-md bg-surface ring-1 ring-border hover:bg-surface-elevated transition-colors"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <button className="relative grid place-items-center h-9 w-9 rounded-md bg-surface ring-1 ring-border hover:bg-surface-elevated transition-colors">
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-warning animate-pulse-dot" />
      </button>
    </header>
  );
}
