import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ThemeSwitcher = () => {
  const [theme, setTheme] = useState<string>("modern");

  useEffect(() => {
    const stored = localStorage.getItem("astramind_theme") || "modern";
    applyTheme(stored);
  }, []);

  const applyTheme = (themeName: string) => {
    document.body.classList.remove("theme-modern", "theme-playful", "theme-dark");
    document.body.classList.add(`theme-${themeName}`);
    localStorage.setItem("astramind_theme", themeName);
    setTheme(themeName);
  };

  const themes = [
    { name: "modern", label: "Modern", desc: "Professional indigo & cyan" },
    { name: "playful", label: "Playful", desc: "Warm orange & cyan" },
    { name: "dark", label: "Dark", desc: "Emerald & purple night" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.name}
            onClick={() => applyTheme(t.name)}
            className={theme === t.name ? "bg-muted" : ""}
          >
            <div className="flex flex-col">
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
