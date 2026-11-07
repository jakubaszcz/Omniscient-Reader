import {useEffect, useState} from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(() =>
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    );

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem("reader-theme", theme); }
        catch { /* Theme switching still works when storage is unavailable. */ }
    }, [theme]);

    return (
        <button
            type="button"
            className="button button-secondary theme-toggle"
            aria-label="Dark mode"
            aria-pressed={theme === "dark"}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
    );
}
