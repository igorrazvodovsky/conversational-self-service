# Profiling

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
