/*
 * The installed shadcn primitives import `cn` from shadcn's own `cn` package,
 * which is what the registry ships since shadcn 4.19. App code imports it from
 * here, so both sides merge class names with the same engine (docs/ui.md).
 */
export { cn } from "cn";
