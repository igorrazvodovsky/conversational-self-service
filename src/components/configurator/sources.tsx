"use client";

/**
 * The sources, and what was read from each.
 *
 * A document the person attached is a file in `Filing`; something they said
 * that the model read a requirement from is an utterance in `Conversing`.
 * Beside each, every item the model read from it — the words, the options it
 * took to answer them, and what became of the clause: answered, unanswered,
 * or struck by the person, which is the disowning the case's plan counts.
 * The reading is checked against its source whole here, where the ledger
 * shows it clause by clause. See docs/syncs/reading.md, "What the canvas
 * reads".
 */

import { ChevronDownIcon, FileTextIcon, MessageSquareIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { address, addressable, Said, targeted as targetedRing, To, useHash, useTargeted } from "./address";
import { useConfigurator, type ReadItem, type Source } from "./provider";

const BECAME: Record<NonNullable<ReadItem["became"]>, string> = {
  answered: "answered",
  unanswered: "not answered",
  struck: "struck",
};

function OneItem({ source, item }: { source: Source; item: ReadItem }) {
  const id = address.item(source.kind, source.id, item.item);
  const isTarget = useTargeted(id);
  return (
    <li
      id={id}
      className={cn(addressable, "flex flex-wrap items-baseline gap-x-2 text-xs", isTarget && targetedRing)}
    >
      <span className={cn("text-sm", item.became === "struck" && "line-through")}>
        {item.clause && item.became !== "struck" ? (
          <To id={address.clause(item.clause)} title="The clause it became">
            “{item.words}”
          </To>
        ) : (
          <>“{item.words}”</>
        )}
      </span>
      {item.answer.length ? (
        <span className="text-muted-foreground">
          read as {item.answer.map((a) => a.label).join(", ")}
        </span>
      ) : (
        <span className="text-muted-foreground">nothing in the catalogue for this</span>
      )}
      {item.became ? (
        <Badge variant={item.became === "answered" ? "secondary" : "outline"}>
          {BECAME[item.became]}
        </Badge>
      ) : null}
    </li>
  );
}

function OneSource({ source }: { source: Source }) {
  const file = source.kind === "file";
  const isTarget = useTargeted(address.source(source.kind, source.id));
  return (
    <Card
      id={address.source(source.kind, source.id)}
      size="sm"
      className={cn(addressable, "scroll-mt-4", isTarget && targetedRing)}
    >
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 uppercase tracking-wide">
          {file ? <FileTextIcon className="size-3.5" /> : <MessageSquareIcon className="size-3.5" />}
          {file ? "document" : source.broughtBy === "browser" ? "your agent said" : "you said"}
        </CardDescription>
        <CardTitle className={cn(!file && "font-normal")}>
          {file ? (
            source.name
          ) : (
            <Said utterance={source.id} text={source.text} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {source.items.length ? (
          <ul className="space-y-1">
            {source.items.map((item) => (
              <OneItem key={item.item} source={source} item={item} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nothing read from it yet.
          </p>
        )}
        {file ? (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="xs" className="-ml-2 text-muted-foreground">
                <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
                The document, as brought
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1 max-h-72 overflow-auto border bg-muted/40 p-2 text-xs whitespace-pre-wrap">
                {source.text}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * The section: every source with a reading, or a document with none yet.
 * Under the ledger and closed by default — it is where a reading is checked
 * against its source whole, not where the work happens; each clause already
 * links to its source, and following the link opens this. What only this
 * section holds is an item the person struck, and a document nothing was
 * read from yet.
 */
export function Sources() {
  const { view } = useConfigurator();
  const hash = useHash();
  const [open, setOpen] = useState(false);
  const addressed = hash === "read-from" || hash.startsWith("source:");
  useEffect(() => {
    if (addressed) setOpen(true);
  }, [addressed]);
  if (!view?.sources.length) return null;
  const read = view.sources.reduce((n, s) => n + s.items.length, 0);
  const struck = view.sources.reduce(
    (n, s) => n + s.items.filter((i) => i.became === "struck").length,
    0,
  );
  return (
    <Collapsible id="read-from" open={open} onOpenChange={setOpen} className="mt-6 scroll-mt-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="xs" className="-ml-2 text-muted-foreground">
          <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
          Read from {view.sources.length} {view.sources.length === 1 ? "source" : "sources"}
          {read ? ` · ${read} read` : ""}
          {struck ? ` · ${struck} struck` : ""}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 grid gap-2">
          {view.sources.map((source) => (
            <OneSource key={`${source.kind}:${source.id}`} source={source} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
