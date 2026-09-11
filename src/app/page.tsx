/**
 * The page's server half, and the only reason it has one: the split between
 * the artifact panel and the chat is remembered in a cookie, and the server
 * has to render the division the browser will (`src/lib/split-layout.ts`).
 *
 * Nothing else belongs here. The page itself is `home.tsx`.
 */

import { cookies } from "next/headers";

import { SPLIT_COOKIE, canvasPercentFrom } from "@/lib/split-layout";
import { HomeRoot } from "./home";

export default async function HomePage() {
  const jar = await cookies();
  return (
    <HomeRoot canvasPercent={canvasPercentFrom(jar.get(SPLIT_COOKIE)?.value)} />
  );
}
