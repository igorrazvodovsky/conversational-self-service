# Delegating

```
concept Delegating [Party, Act]

purpose
  to let a person decide how far an assistant may act on their
  behalf, one kind of act at a time, and change their mind at any point

state
  usual:   Act -> ("act" | "suggest" | "withhold")
  granted: Party -> Act -> ("act" | "suggest" | "withhold")

actions
  offer [ act: Act ; level: string ]
    => [ act: Act ]
    record the level an assistant has for the act
    wherever a party has granted none of their own

  offer [ act: Act ; level: string ]
    => [ error: string ]
    if the level is not one of "act", "suggest" or "withhold"
    return the error description

  entrust [ party: Party ; act: Act ; level: string ]
    => [ party: Party ; act: Act ; level: string ; former: string ]
    record the level the party grants for the act,
    replacing any they granted before,
    and return the level that held until now

  entrust [ party: Party ; act: Act ; level: string ]
    => [ error: string ]
    if the act was never offered,
    or the level is not one of "act", "suggest" or "withhold"
    return the error description

operational principle
  after offer [ act: assert ; level: "act" ] => [ act: assert ]
  then granted of p holds nothing for assert, and usual of assert is "act"
  and after entrust [ party: p ; act: assert ; level: "suggest" ]
    => [ party: p ; act: assert ; level: "suggest" ; former: "act" ]
  then granted of p maps assert to "suggest"
  and after entrust [ party: p ; act: assert ; level: "act" ]
    => [ party: p ; act: assert ; level: "act" ; former: "suggest" ]
  then granted of p maps assert to "act"
  and usual of assert is still "act"
  and entrust [ party: p ; act: quote ; level: "act" ] => [ error: e ]
```
