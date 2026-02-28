import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2 } from "lucide-react";
import ProjectNameEditor from "./ProjectNameEditor";

interface HeaderProps {
  activeMode: "design" | "dev";
  setActiveMode: (mode: "design" | "dev") => void;
}

export default function Header({ activeMode, setActiveMode }: HeaderProps) {
  return (
    <header className="h-11 border-b border-border flex items-center justify-between px-3 bg-card shrink-0">
      {/* Left: logo + project name */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo mark */}
        <div className="flex items-center gap-2 shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect width="18" height="18" rx="4" fill="hsl(234 53% 60%)" />
            <path d="M4 14L9 4L14 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-foreground">Kala</span>
        </div>
        <div className="w-px h-4 bg-border shrink-0" />
        <ProjectNameEditor />
      </div>

      {/* Center: mode toggle */}
      <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
        <button
          onClick={() => setActiveMode("design")}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            activeMode === "design"
              ? "bg-popover text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveMode("dev")}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            activeMode === "dev"
              ? "bg-popover text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Dev
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-7 w-7 p-0 ml-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">K</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs">Profile</DropdownMenuItem>
            <DropdownMenuItem className="text-xs">Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-destructive focus:text-destructive">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
