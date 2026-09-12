# Showing

```
concept Showing [Lens, Facet]

purpose
  to let a viewer choose which facts about an item are shown at a glance,
  and keep the choice

state
  offered: Lens -> set Facet
  about:   Facet -> string
  shown:   Lens -> set Facet

actions
  offer [ lens: Lens ; facet: Facet ; about: string ]
    => [ lens: Lens ]
    add the facet to those the lens can show
    record what the facet is, in words a viewer can recognise it by

  show [ lens: Lens ; facet: Facet ]
    => [ lens: Lens ; facet: Facet ]
    add the facet to those shown through the lens

  show [ lens: Lens ; facet: Facet ]
    => [ error: string ]
    if the lens does not offer the facet
    return the error description

  hide [ lens: Lens ; facet: Facet ]
    => [ lens: Lens ; facet: Facet ]
    remove the facet from those shown through the lens

  hide [ lens: Lens ; facet: Facet ]
    => [ error: string ]
    if the lens does not offer the facet
    return the error description

operational principle
  after offer [ lens: w ; facet: price ;
                about: "what each option adds to the price" ] => [ lens: w ]
  then shown of w does not contain price
  and after show [ lens: w ; facet: price ] => [ lens: w ; facet: price ]
  then shown of w contains price
  and after hide [ lens: w ; facet: price ] => [ lens: w ; facet: price ]
  then shown of w does not contain price
```
