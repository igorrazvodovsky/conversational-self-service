# Deciding

```
concept Deciding [Request, Option]

purpose
  to obtain a person's choice on a matter the system cannot
  settle on its own

state
  reason:   Request -> string
  offered:  Request -> set Option
  chosen:   Request -> Option
  declined: set Request

actions
  ask [ request: Request ; reason: string ; options: set Option ]
    => [ request: Request ; displaced: set Option ]
    record the reason the choice is needed
    record the options among which it may be made,
    replacing any options previously offered for the request
    and discarding any answer previously given to it
    return whatever was offered before, which may be nothing

  choose [ request: Request ; option: Option ]
    => [ request: Request ]
    record the option as chosen for the request

  choose [ request: Request ; option: Option ]
    => [ error: string ]
    if the option is not among those offered for the request,
    or the request is already answered
    return the error description

  decline [ request: Request ]
    => [ request: Request ]
    record the request as declined without choosing an option

  withdraw [ request: Request ]
    => [ request: Request ; offered: set Option ]
    remove the request, with whatever was offered and answered for it
    return what had been offered

operational principle
  after ask [ request: r ; reason: "intro call" ; options: {9am, 2pm} ]
    => [ request: r ; displaced: {} ]
  then choose [ request: r ; option: 9am ] => [ request: r ]
  and chosen of r is 9am
  and choose [ request: r ; option: 4pm ] => [ error: e ]
  and after ask [ request: r ; reason: "they moved it" ; options: {3pm, 4pm} ]
    => [ request: r ; displaced: {9am, 2pm} ]
  then chosen of r is nothing
```
