# Profiling

A domain [concept](../method/concept.md) of the elevator configurator. Built
on 2026-09-11 because a quote is addressed, and until then nobody here had a
name.

```
concept Profiling [Party]

purpose
  to hold what a party says of who they are, so that a document
  can name and address them

state
  name:         Party -> string
  organisation: Party -> string
  address:      Party -> string
  email:        Party -> string
  phone:        Party -> string

actions
  introduce [ party: Party ; name: string ; organisation: string ;
              address: string ; email: string ; phone: string ]
    => [ party: Party ]
    record each detail that is given, replacing what was recorded
    for it before, and leave the details not given as they were

operational principle
  after introduce [ party: p ; name: "J. Dotson" ; organisation: "Gonzalez Renovations" ]
    => [ party: p ]
  then name of p is "J. Dotson"
  and after introduce [ party: p ; email: "jd@example.org" ] => [ party: p ]
  then name of p is still "J. Dotson"
  and email of p is "jd@example.org"
```

## Why one action, and why it is partial

A person tells the assistant their name in one message and their company in
the next, and a form on the canvas is filled in one field at a time. An
`introduce` that demanded every detail at once would force the interface to
hold a draft the concept does not know about, which is the shared-blob pattern
this repository exists to avoid. So each call carries what it carries, and the
profile is whatever has been said so far.

There is no inverse, and that is a finding rather than an oversight: a person
can overwrite a detail and cannot erase one. MSM §5.1.2's asymmetry test fails
here, recorded in [§8](../conceptual-model.md#what-is-wrong-with-this-one).

## Who the parties are

Two profiles exist in this build. The *seller's* is seeded at boot from the
catalogue's `vendor` block, by the wiring, like a price. The *person's* is
what they say of themselves, by a gesture from the quote surface or through
the assistant. The party identities are the same two the rules already use —
`person` and `seller` — and nothing in this concept knows which is which.

## What this is not

_An account._ The case's catalogue puts `Account` and `Role` — login, price
visibility — outside the case, and this concept is not them. It holds no
credential and grants nothing; it is the half of a user profile that appears
on a letterhead.

_The site._ Where the lift is going is a fact of the job, not of the party
ordering it, and it is held by [Naming](naming.md).

## See also

- [Naming](naming.md) — the job, as against the party
- [Quoting](quoting.md) — where a profile ends up, frozen into the offer
- [Gestures](../syncs/gestures.md) and [Conduct](../syncs/conduct.md) — the two ways a person's profile is written
