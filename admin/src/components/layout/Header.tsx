import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="h-16 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
      <div className="font-semibold text-lg dark:text-white">
        Management Suite
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white">
          SA
        </div>
      </div>
    </header>
  );
}