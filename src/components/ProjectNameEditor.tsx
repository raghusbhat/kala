import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiEdit2 } from "react-icons/fi";

export default function ProjectNameEditor() {
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);

  const handleProjectNameEdit = () => {
    setIsEditingProjectName(true);
  };

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
  };

  const handleProjectNameSave = () => {
    setIsEditingProjectName(false);
  };

  return (
    <div className="flex items-center gap-2 ml-4">
      {isEditingProjectName ? (
        <div className="flex items-center">
          <Input
            type="text"
            value={projectName}
            onChange={handleProjectNameChange}
            onBlur={handleProjectNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleProjectNameSave();
            }}
            className="h-7 text-sm w-48"
            autoFocus
          />
        </div>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">{projectName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleProjectNameEdit}
          >
            <FiEdit2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
