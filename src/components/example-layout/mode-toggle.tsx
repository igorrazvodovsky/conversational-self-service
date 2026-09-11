import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ModeToggleProps {
  mode: "chat" | "canvas";
  onModeChange: (mode: "chat" | "canvas") => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={mode}
      // Radix reports "" when the pressed item is pressed again; a surface is
      // always showing, so that is not a change.
      onValueChange={(value) => value && onModeChange(value as "chat" | "canvas")}
      aria-label="Surface"
      className="fixed top-4 right-4 z-50 bg-background"
    >
      <ToggleGroupItem value="chat" className="px-4">
        Chat
      </ToggleGroupItem>
      <ToggleGroupItem value="canvas" className="px-4">
        Configurator
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
