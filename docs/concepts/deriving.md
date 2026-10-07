# Deriving

```
concept Deriving [Method, Quantity, Target]

purpose
  to work a quantity out from stated ones by a method a person can
  inspect, so that they can see what the number rests on and what
  was assumed

state
  meaning:  Quantity -> string
  unit:     Quantity -> string
  methods:  seq Method
  yields:   Method -> Quantity
  formula:  Method -> string
  needs:    Method -> set Quantity
  presumes: Method -> Quantity -> Real
  method:   Derivation -> Method
  for:      Derivation -> Target
  stated:   Derivation -> Quantity -> Real
  assumed:  Derivation -> Quantity -> Real
  result:   Derivation -> Real

actions
  describe [ quantity: Quantity ; meaning: string ; unit: string ]
    => [ quantity: Quantity ]
    record what the quantity is, in words a person reads it by,
    and the unit it is counted or measured in, which may be none

  define [ method: Method ; yields: Quantity ; formula: string ;
           needs: set Quantity ; presumes: Quantity -> Real ]
    => [ method: Method ]
    append the method to those defined, recording the quantity it
    works out, the arithmetic it works it out by, the quantities that
    arithmetic needs, and the value it takes for any of them when
    none is stated

  define [ method: Method ; yields: Quantity ; formula: string ;
           needs: set Quantity ; presumes: Quantity -> Real ]
    => [ error: string ]
    if the method is defined already,
    or the formula is not arithmetic over numbers and the quantities
    it needs — sums, differences, products, quotients and brackets,
    or it presumes a value for a quantity it does not need,
    or a value it presumes is not a finite number
    return the error description

  derive [ method: Method ; for: Target ; stated: Quantity -> Real ;
           derivation: Derivation ]
    => [ derivation: Derivation ; method: Method ; for: Target ;
         yields: Quantity ; result: Real ;
         stated: Quantity -> Real ; assumed: Quantity -> Real ]
    take each quantity the method needs from what is stated,
    and each one not stated from what the method presumes
    work the formula out over them, to two decimal places
    record the derivation as made for the target by the method,
    with the stated values it used, the presumed values it assumed,
    and the result

  derive [ method: Method ; for: Target ; stated: Quantity -> Real ;
           derivation: Derivation ]
    => [ error: string ]
    if the method is not defined, or the derivation exists already,
    or a quantity the method needs is neither stated nor presumed,
    or a value is not a finite number, or the formula does not come
    out to one
    return the error description

operational principle
  after describe [ quantity: upper_floors ;
                   meaning: "floors above the ground floor" ; unit: "" ]
    => [ quantity: upper_floors ]
  and define [ method: travel_from_upper_floors ; yields: travel ;
               formula: "(upper_floors + basements) * storey_height" ;
               needs: { upper_floors, basements, storey_height } ;
               presumes: { basements: 0, storey_height: 3.5 } ]
    => [ method: travel_from_upper_floors ]
  and after derive [ method: travel_from_upper_floors ; for: c ;
                     stated: { upper_floors: 5 } ; derivation: d ]
    => [ derivation: d ; method: travel_from_upper_floors ; for: c ;
         yields: travel ; result: 17.5 ;
         stated: { upper_floors: 5 } ;
         assumed: { basements: 0, storey_height: 3.5 } ]
  then result of d is 17.5
  and assumed of d says the storey height was taken as 3.5, not stated
  and after derive [ method: travel_from_upper_floors ; for: c' ;
                     stated: { upper_floors: 5, storey_height: 4.2 } ;
                     derivation: d' ]
    => [ derivation: d' ; result: 21 ; assumed: { basements: 0 } ]
  then result of d is still 17.5
  and derive [ method: travel_from_upper_floors ; for: c'' ;
               stated: { basements: 1 } ; derivation: d'' ] => [ error: e ]
```
