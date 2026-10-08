# Staling

```
concept Staling [Item, Basis, Party]

purpose
  to mark an item whose basis has changed without changing the item,
  so that nothing a person committed is silently re-decided

state
  stale:   set Item
  because: Item -> set Basis

actions
  flag [ item: Item ; basis: Basis ]
    => [ item: Item ; basis: Basis ]
    mark the item stale, adding the basis to those recorded against it;
    an item already stale stays stale, with one more basis

  clear [ party: Party ; item: Item ]
    => [ item: Item ; party: Party ]
    remove the mark and every basis recorded against the item

  clear [ party: Party ; item: Item ]
    => [ error: string ]
    if the item is not stale
    return the error description

operational principle
  after flag [ item: q ; basis: [ variable: rated_load ] ]
    => [ item: q ; basis: [ variable: rated_load ] ]
  then q is in stale
  and because of q is { [ variable: rated_load ] }
  and after flag [ item: q ; basis: [ variable: rated_speed ] ]
    => [ item: q ; basis: [ variable: rated_speed ] ]
  then because of q is { [ variable: rated_load ] ; [ variable: rated_speed ] }
  and after clear [ party: p ; item: q ] => [ item: q ; party: p ]
  then q is not in stale, and because of q is nothing
  and clear [ party: p ; item: q ] => [ error: e ]
```
