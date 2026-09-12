# Scheduling

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
