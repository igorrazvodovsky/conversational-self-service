import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Surface } from "@/components/configurator/provider";

interface ModeToggleProps {
  mode: Surface;
  onModeChange: (mode: Surface) => void;
}

/** The two artifacts `Moding` offers, in the order a configuration runs. */
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
      <ToggleGroupItem value="canvas" className="px-3">
        Configurator
      </ToggleGroupItem>
      <ToggleGroupItem value="quote" className="px-3">
        Quote
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
