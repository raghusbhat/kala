import { useState, useRef, useEffect } from "react";

export default function ProjectNameEditor() {
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = draft.trim() || "Untitled Project";
    setProjectName(trimmed);
    setDraft(trimmed);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center min-w-0">
      {isEditing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(projectName);
              setIsEditing(false);
            }
          }}
          className="h-6 text-xs bg-transparent border-b border-accent text-foreground outline-none w-36 px-0"
          maxLength={64}
          spellCheck={false}
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setDraft(projectName); setIsEditing(true); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]"
        >
          {projectName}
        </button>
      )}
    </div>
  );
}
