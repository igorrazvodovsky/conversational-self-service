# Constraining

```
concept Constraining [Spec, Variable, Option, Rule]

purpose
  to work out what a specification can still become under the rules
  that say what can be built, given what is asked of it firmly and
  what only as a preference

state
  range:    Variable -> set Option
  scope:    Rule -> seq Variable
  allows:   Rule -> set (seq Option)
  because:  Rule -> string
  assumed:  Spec -> Variable -> Option
  inclined: Spec -> Variable -> Option
  possible: Spec -> Variable -> set Option
  settled:  Spec -> Variable -> Option
  owing:    Spec -> Variable -> set Rule
  following: Spec -> Variable -> set Variable
  refused:  Spec -> Variable -> set Rule

actions
  offer [ variable: Variable ; option: Option ]
    => [ variable: Variable ]
    add the option to the variable's range
    recompute every specification being tracked

  withhold [ variable: Variable ; option: Option ]
    => [ variable: Variable ; conceding: set Spec ]
    remove the option from the variable's range,
    so that no specification may settle on it again
    remove it from whatever any specification assumed or inclined
    for that variable, and recompute those specifications
    return the specifications that had assumed it

  tabulate [ rule: Rule ; over: seq Variable ; allows: set (seq Option) ; because: string ]
    => [ rule: Rule ]
    record that the variables may only take the listed combinations
    record the sentence that says why

  imply [ rule: Rule ; given: set Condition ; entails: Condition ; because: string ]
    => [ rule: Rule ]
    record that when every given condition holds,
    the entailed condition must hold too
    record the sentence that says why

  consider [ spec: Spec ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    begin tracking the specification with nothing assumed of it
    compute, for every variable, which options remain possible

  assume [ spec: Spec ; variable: Variable ; option: Option ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    record the option as assumed for the variable,
    replacing any option previously assumed or inclined for it
    clear any refusal recorded against the variable
    recompute, for every variable, which options remain possible
    and which are settled to one, by which rules, and resting on
    which of the specification's assumptions
    return both

  assume [ spec: Spec ; variable: Variable ; option: Option ]
    => [ error: string ; culprits: set Rule ; conceding: set Variable ]
    if no combination satisfies every rule together with the assumptions
    leave the assumptions as they were
    record against the variable the rules that refused it
    return the smallest set of rules that cannot hold together with them,
    and the variables whose assumptions took part

  incline [ spec: Spec ; variable: Variable ; option: Option ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    record the option as inclined for the variable,
    replacing any option previously assumed or inclined for it,
    and clear any refusal recorded against the variable
    then recompute as for assume, counting among the assumptions
    every inclination that can hold together with the rules, the
    assumptions and the inclinations honoured before it, earlier first;
    an inclination that cannot is dropped from the recompute and stays recorded

  release [ spec: Spec ; variable: Variable ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    remove whatever was assumed or inclined for the variable
    clear any refusal recorded against the variable
    then recompute as for assume

  forget [ spec: Spec ]
    => [ spec: Spec ]
    stop tracking the specification,
    with everything assumed, inclined and refused of it

  complete [ spec: Spec ; cost: Option -> number ]
    => [ assignment: Variable -> Option ; cost: number ]
    choose one option for every variable such that every rule holds,
    every assumption is kept, and the summed cost of the chosen options
    is as small as any such choice allows
    change nothing

  complete [ spec: Spec ; cost: Option -> number ]
    => [ error: string ; culprits: set Rule ]
    if no such choice exists
    return the smallest set of rules that rules it out

queries
  excluding [ spec: Spec ; variable: Variable ; option: Option ]
    => set Rule
    the rules that, with the specification's assumptions and the
    inclinations honoured in its recompute, rule the option out;
    nothing when the option is still possible

  narrowing [ spec: Spec ; variable: Variable ; option: Option ]
    => set Variable
    the variables whose assumptions or honoured inclinations take part
    in ruling the option out, read from the same core as excluding

  foreseeing [ spec: Spec ; assumptions: Variable -> Option ;
               inclinations: Variable -> Option ]
    => [ spec: Spec ; buildable: boolean ;
         possible: Variable -> set Option ; settled: Variable -> Option ]
    what would be possible and settled if these were the specification's
    assumptions and inclinations in place of its own, the inclinations
    honoured as in the recompute; not buildable, with nothing possible,
    when the assumptions cannot hold together; records nothing

operational principle
  after offer [ variable: drive ; option: hydraulic ] => [ variable: drive ]
  and imply [ rule: R32 ; given: { usage_profile among {heavy} } ;
              entails: { drive among {gearless_mrl, gearless_mr} } ;
              because: "near-continuous traffic exceeds the hydraulic duty cycle" ]
    => [ rule: R32 ]
  then assume [ spec: s ; variable: usage_profile ; option: heavy ]
    => [ spec: s ; possible: p ; settled: q ]
  and p maps drive to {gearless_mrl, gearless_mr}, which no longer contains hydraulic
  and assume [ spec: s ; variable: drive ; option: hydraulic ]
    => [ error: e ; culprits: {R32} ; conceding: {usage_profile} ]
  and refused of (s, drive) is {R32}
  and excluding [ spec: s ; variable: drive ; option: hydraulic ] is {R32}
  and narrowing [ spec: s ; variable: drive ; option: hydraulic ] is {usage_profile}
  and foreseeing [ spec: s ; assumptions: { drive: hydraulic } ; inclinations: {} ]
    => [ spec: s ; buildable: true ; possible: p' ; settled: q' ]
    in which p' maps usage_profile to a set without heavy,
    and assumed of s still maps usage_profile to heavy
  and after release [ spec: s ; variable: usage_profile ] => [ spec: s ]
  then refused of (s, drive) is empty
```
