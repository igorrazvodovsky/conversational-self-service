import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { Check, X, Clock, ChevronRight } from "lucide-react";

export interface TimeSlot {
  date: string;
  time: string;
  duration?: string;
}

export interface MeetingTimePickerProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  reasonForScheduling?: string;
  meetingDuration?: number;
  title?: string;
  timeSlots?: TimeSlot[];
}

function Outcome({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="mx-auto mb-4 w-full max-w-md">
      <CardContent>
        <Empty className="p-2">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          {children}
        </Empty>
      </CardContent>
    </Card>
  );
}

export function MeetingTimePicker({
  status,
  respond,
  reasonForScheduling,
  meetingDuration,
  title = "Schedule a Meeting",
  timeSlots = [
    { date: "Tomorrow", time: "2:00 PM", duration: "30 min" },
    { date: "Friday", time: "10:00 AM", duration: "30 min" },
    { date: "Next Monday", time: "3:00 PM", duration: "30 min" },
  ],
}: MeetingTimePickerProps) {
  const displayTitle = reasonForScheduling || title;
  const slots = meetingDuration
    ? timeSlots.map((slot) => ({ ...slot, duration: `${meetingDuration} min` }))
    : timeSlots;
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [declined, setDeclined] = useState(false);

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    respond?.(
      `Meeting scheduled for ${slot.date} at ${slot.time}${slot.duration ? ` (${slot.duration})` : ""}.`,
    );
  };

  const handleDecline = () => {
    setDeclined(true);
    respond?.(
      "The user declined all proposed meeting times. Please suggest alternative times or ask for their availability.",
    );
  };

  // Confirmed state
  if (selectedSlot) {
    return (
      <Outcome
        icon={<Check />}
        title="Meeting Scheduled"
        description={`${selectedSlot.date} at ${selectedSlot.time}`}
      >
        {selectedSlot.duration && (
          <Badge variant="secondary">
            <Clock />
            {selectedSlot.duration}
          </Badge>
        )}
      </Outcome>
    );
  }

  // Declined state
  if (declined) {
    return (
      <Outcome
        icon={<X />}
        title="No Time Selected"
        description="Looking for a better time that works for you"
      />
    );
  }

  // Selection state
  return (
    <Outcome
      icon={<Clock />}
      title={displayTitle}
      description={
        status === "inProgress"
          ? "Finding available times..."
          : "Pick a time that works for you"
      }
    >
      {status === "inProgress" && <Spinner className="size-6" />}

      {status === "executing" && (
        <div className="w-full space-y-2">
          <ItemGroup className="gap-2">
            {slots.map((slot, index) => (
              <Item key={index} variant="outline" role="listitem" asChild>
                <button
                  type="button"
                  className="cursor-pointer text-left hover:bg-muted"
                  onClick={() => handleSelectSlot(slot)}
                >
                  <ItemContent>
                    <ItemTitle className="text-sm">{slot.date}</ItemTitle>
                    <ItemDescription>{slot.time}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    {slot.duration && (
                      <Badge variant="secondary">{slot.duration}</Badge>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </ItemActions>
                </button>
              </Item>
            ))}
          </ItemGroup>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={handleDecline}
          >
            None of these work
          </Button>
        </div>
      )}
    </Outcome>
  );
}
