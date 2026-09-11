"use client";

/**
 * One quote, on its own page, for printing.
 *
 * The same document the quote surface shows, rendered without the chat
 * session behind it: it reads the view once, picks one offer, and lays it out
 * with a print control and nothing else.
 */

import { ArrowLeftIcon, PrinterIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { QuoteDocument } from "@/components/configurator/document";
import type { View } from "@/components/configurator/provider";

export default function QuotePage() {
  const { quote: id } = useParams<{ quote: string }>();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/configurator/view", {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "could not read the state");
        if (!cancelled) setView(body);
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Empty className="h-svh">
        <EmptyHeader>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (!view) {
    return (
      <Empty className="h-svh">
        <EmptyHeader>
          <Spinner />
        </EmptyHeader>
      </Empty>
    );
  }
  const quote = view.quotes.find((q) => q.quote === id);
  if (!quote) {
    return (
      <Empty className="h-svh">
        <EmptyHeader>
          <EmptyDescription>There is no quote {id}.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
        <div className="mb-6 flex items-center gap-2 print:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeftIcon />
              Back to the configurator
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => window.print()}
          >
            <PrinterIcon />
            Print
          </Button>
        </div>
        <QuoteDocument quote={quote} view={view} />
      </div>
    </div>
  );
}
