"use client";

/**
 * One moment of the document, on its own page, for printing: an issued
 * quote, or `draft`, the deal as it stands, marked as a draft where the
 * number and the validity would be.
 *
 * The same proposal the canvas shows, rendered without the chat session
 * behind it.
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

  // The tab says which proposal it is, most specific first.
  const number = view?.quotes.find((q) => q.quote === id)?.number;
  useEffect(() => {
    document.title = number
      ? `Quotation No. ${number} · Northline Lifts`
      : id === "draft"
        ? "Draft proposal · Northline Lifts"
        : "Quotation · Northline Lifts";
  }, [number, id]);

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
          <EmptyDescription role="alert">{error}</EmptyDescription>
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
  const quote = id === "draft" ? view.draft : view.quotes.find((q) => q.quote === id);
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
      <main className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
        <div className="mb-6 flex items-center gap-2 print:hidden">
          <Button variant="ghost" size="sm" asChild>
            {/* Whoever opens this page may have come straight to it from a
                link someone sent, so the way into the app names where it
                goes rather than assuming they came from there. */}
            <Link
              href={`/?view=proposal${id === "draft" ? "" : `&quote=${encodeURIComponent(id)}`}#quote:${encodeURIComponent(id)}`}
            >
              <ArrowLeftIcon />
              Open in the configurator
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
        <QuoteDocument
          quote={quote}
          view={view}
          open={
            id === "draft"
              ? view.variables
                  .filter((v) => v.standing === "open")
                  .map((v) => ({ name: v.name, heading: v.heading, family: v.family }))
              : []
          }
        />
      </main>
    </div>
  );
}
