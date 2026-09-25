# Rewinding

```
concept Rewinding [Turn, Act]

purpose
  to let a person take back, as one, everything an assistant did
  in reply to one thing they said

state
  done:    Turn -> seq Act
  rewound: set Turn

actions
  note [ turn: Turn ; act: Act ]
    => [ turn: Turn ]
    append the act to what was done in reply to the turn

  note [ turn: Turn ; act: Act ]
    => [ error: string ]
    if the turn is none, or has been rewound
    return the error description

  rewind [ turn: Turn ]
    => [ turn: Turn ; acts: seq Act ]
    record the turn as rewound,
    and return what was done in reply to it, the latest first

  rewind [ turn: Turn ]
    => [ error: string ]
    if the turn has been rewound already,
    or nothing was done in reply to it
    return the error description

operational principle
  after note [ turn: u ; act: a1 ] => [ turn: u ]
  and note [ turn: u ; act: a2 ] => [ turn: u ]
  then done of u is [a1, a2]
  and after rewind [ turn: u ] => [ turn: u ; acts: [a2, a1] ]
  then u is rewound
  and rewind [ turn: u ] => [ error: e ]
  and note [ turn: u ; act: a3 ] => [ error: e ]
```
