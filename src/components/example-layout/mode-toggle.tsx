import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Surface } from "@/components/configurator/provider";

interface ModeToggleProps {
  mode: Surface;
  onModeChange: (mode: Surface) => void;
}

/** The three surfaces `Moding` offers, in the order a configuration runs:
 * what is required, what is the case, and what is offered. */
export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={mode}
      // Radix reports "" when the pressed item is pressed again; a surface is
      // always showing, so that is not a change.
      onValueChange={(value) => value && onModeChange(value as Surface)}
      aria-label="Surface"
      className="bg-background"
    >
      <ToggleGroupItem value="requirements" className="px-3">
        Requirements
      </ToggleGroupItem>
      <ToggleGroupItem value="canvas" className="px-3">
        Configuration
      </ToggleGroupItem>
      <ToggleGroupItem value="quote" className="px-3">
        Quote
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
