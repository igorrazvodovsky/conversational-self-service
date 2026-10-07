# Detailing

```
concept Detailing [Item]

purpose
  to keep what the seller publishes about what an item is and does,
  so that a question about it is answered from the seller's record

state
  particulars: Item -> seq Particular
  topic:       Particular -> string
  text:        Particular -> string

actions
  detail [ item: Item ; topic: string ; text: string ]
    => [ particular: Particular ]
    append a particular to those the item carries,
    under the topic it answers

  detail [ item: Item ; topic: string ; text: string ]
    => [ error: string ]
    if the text is empty
    return the error description

operational principle
  after detail [ item: access_control:destination_linked ;
                 topic: "interface" ;
                 text: "OSDP v2 from the reader in each lobby panel" ]
    => [ particular: p1 ]
  and detail [ item: access_control:destination_linked ;
               topic: "coverage" ;
               text: "the lobby panels; the car has no floor buttons" ]
    => [ particular: p2 ]
  then particulars of access_control:destination_linked is p1 then p2
  and topic of p1 is "interface"
  and detail [ item: access_control:destination_linked ; topic: "limits" ; text: "" ]
    => [ error: e ]
```
