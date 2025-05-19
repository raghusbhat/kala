import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FiShare2 } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProjectNameEditor from "./ProjectNameEditor";

interface HeaderProps {
  activeMode: "design" | "dev";
  setActiveMode: (mode: "design" | "dev") => void;
}

export default function Header({ activeMode, setActiveMode }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-primary">Chitrapata</h1>
        <ProjectNameEditor />
      </div>

      <div className="flex items-center gap-4">
        <Tabs
          value={activeMode}
          onValueChange={(v) => setActiveMode(v as "design" | "dev")}
          className="bg-muted rounded-md"
        >
          <TabsList>
            <TabsTrigger value="design" className="text-xs">
              Design
            </TabsTrigger>
            <TabsTrigger value="dev" className="text-xs">
              Dev
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <FiShare2 className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-8 w-8 p-0">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>KU</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
