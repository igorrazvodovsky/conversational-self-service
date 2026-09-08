# Scheduling

A domain [concept](../method/concept.md) of the elevator configurator.

```
concept Scheduling [Meeting, Time]

purpose
  to fix a time that the parties to a meeting have agreed on

state
  occasion: Meeting -> string
  duration: Meeting -> number
  proposed: Meeting -> set Time
  agreed:   Meeting -> Time

actions
  propose [ meeting: Meeting ; occasion: string ; duration: number ]
    => [ meeting: Meeting ]
    record what the meeting is for and how long it should run
    leave the time unsettled

  offer [ meeting: Meeting ; times: set Time ]
    => [ meeting: Meeting ]
    record the times at which the meeting could be held

  agree [ meeting: Meeting ; time: Time ]
    => [ meeting: Meeting ]
    record the time as settled

  agree [ meeting: Meeting ; time: Time ]
    => [ error: string ]
    if the time was not among those offered,
    or a time is already agreed
    return the error description

  abandon [ meeting: Meeting ]
    => [ meeting: Meeting ]
    discard the proposal without settling a time

operational principle
  after propose [ meeting: m ; occasion: "learn CopilotKit" ; duration: 30 ]
    => [ meeting: m ]
  and offer [ meeting: m ; times: T ] => [ meeting: m ]
  then agree [ meeting: m ; time: t ] => [ meeting: m ] for some t in T
  and agreed of m is t
```

## In the code

`propose` exists, as the two parameters of the `scheduleTime` tool: `reasonForScheduling` and `meetingDuration` (`src/hooks/use-generative-ui-examples.tsx:30-35`). `offer` and `agree` happen inside `MeetingTimePicker` (`src/components/generative-ui/meeting-time-picker.tsx`), and nothing persists: once the component unmounts, no fact records that a time was ever settled.

The concept has no state in this application. A meeting is agreed and then forgotten, which is defensible in a demo and would not be in anything else.

## What the operational principle demands

The `agree => [ error: string ]` case is the one worth keeping when this gets built for real. A time agreed outside the offered set is the difference between scheduling and merely recording a string, and it is the kind of condition that lives naturally in a concept and awkwardly anywhere else.

## See also

- [Deciding](deciding.md) — the reusable protocol currently fused into the same tool
- [Concept](../method/concept.md) — on why a concept without state is a warning sign
