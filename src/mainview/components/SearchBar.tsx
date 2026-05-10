import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/** 搜索栏 - 圆角胶囊设计 */
export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
      <input
        placeholder="搜索密码..."
        className="focus:shadow-soft h-9 w-full rounded-xl border-0 bg-muted/60 pl-9 pr-8 text-sm outline-none ring-1 ring-transparent transition-all placeholder:text-muted-foreground/50 focus:bg-background focus:ring-primary/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => onChange("")}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
