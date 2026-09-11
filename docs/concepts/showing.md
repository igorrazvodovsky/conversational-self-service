# Showing

A domain [concept](../method/concept.md) of the elevator configurator.

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

A facet is a name the canvas interprets, and the concept holds the name and
a sentence. What the sentence describes is a fact some other concept already
holds — a price in [Pricing](pricing.md), a rule in
[Constraining](constraining.md), a clause in [Binding](binding.md) — and the
canvas reads that fact only when the facet is shown. `show` on a facet that
is already shown changes nothing and is not an error; `hide` is its inverse
and costs what it cost.

## Where this comes from

Min et al. (CHI '25, *Malleable Overview-Detail Interfaces*) looked at three
hundred interfaces that show a collection of items with a detail view of one,
and found that which facts appear beside each item is decided once, by the
developer, for everybody. Twelve people given the same task and the same
defaults produced twelve different overviews, and split into those who never
hid anything and those who pruned the overview to what their decision needed.
Eleven of the twelve asked an assistant to surface something. Meridian (UIST
'25) turned that into a specification with a `shownAttributes` list that the
developer, the person and a model all write to.

That list is this concept's `shown`, and the three writers are what make it a
concept rather than a component's state. The defaults are seeded at boot, as
[Moding](moding.md)'s surfaces are; a person shows or hides a facet from a
menu on the canvas; and a rule lets the model do the same when asked — *show
me the price next to each option* is a request the assistant can act on
rather than answer with a recital. See [Gestures](../syncs/gestures.md) and
[Conduct](../syncs/conduct.md).

What was not taken. The papers also make the *layout* and *composition* of an
overview malleable — list to grid, one overview to several — and the canvas
does not. Its sections are the design's one claim, and a person who could
flatten *asserted*, *follows from that* and *still open* into one grid would
have a form again. The grouping is not a facet. Nor is a computed attribute:
the papers let a model invent a *total cost* column and fill it, and here a
facet can only name a fact a concept holds, so the model can choose which
facts a person sees and cannot make one up. That is the same line
[Pricing](pricing.md#the-total-is-a-read-and-here-is-the-arithmetic) draws
for the total.

## Why this is shared state and not view state

[Moding's note](moding.md#what-is-not-a-surface) keeps the chat's geometry
out of the concepts because no rule reaches it: how wide a transcript is
drawn is the person's alone, and a concept whose state only one component
ever writes is a component's state under another name. This concept passes
the same test in the other direction. `TheModelMayShowAFacet` is a rule, so
what the canvas shows is something the second root actor may change, and
that puts it in the log with an actor and a provenance edge like any other
change. The person can see that *the assistant showed the prices*, and take
it back.

The other half of the purpose follows from the same fact. The engine holds
`shown`, so the choice survives a reload, which the chat's geometry does not.
*Keep the choice* means for as long as the workspace exists — the study's
customise-once temperament wants exactly that, and the dealer who configures
lifts weekly is that temperament.

## Why it is not Moding

The two concepts have the same shape at a glance and differ in the one
relation that matters. `Moding.active` is one surface of several: the panel
shows the canvas or the offer. `Showing.shown` is a subset of facets, all of
which can be on at once, and none of which has to be. A unified
`Attending [Workspace, Thing]` with `active: Workspace -> set Thing` would
express both and would lose the guarantee `Moding.focus` gives, that exactly
one artifact has the viewer's attention. The candidate unification noted in
[Theming](theming.md) does not extend here for that reason.

## What the canvas reads

The facets seeded for this catalogue, and whether each is shown before
anyone has touched the menu:

| Facet | What it shows | Default |
|---|---|---|
| `price` | what each option adds to the price, beside its label | hidden |
| `carbon` | what each option adds to the embodied carbon | hidden |
| `notes` | the catalogue's note on each option, under the options | hidden |
| `excluded` | for each option ruled out, the rule that rules it out | hidden |
| `rules` | on a value that follows, the rule that forces it and the assertion it rests on | shown |
| `answers` | on an asserted value, the requirement it answers | shown |
| `how` | on an asserted value, who asserted it and by what route | shown |

The defaults are the canvas without this concept, so a person who never
opens the menu sees the canvas unchanged. The three that are on
by default are the ones a first-time buyer needs to read the canvas at all;
the four that are off are the ones a dealer asked for and a buyer would not.
Which of those two readings holds is what the log records — the paper's
figure 22, taken off `Showing/show` and `Showing/hide` instead of a study.

`excluded` is the one facet that costs something to read: it is the
[calculation `excluding`](constraining.md#why-an-option-is-ruled-out-is-a-read)
on Constraining, one solver check per option ruled out, and the view asks
only while the facet is shown.

## See also

- [Moding](moding.md) — the neighbouring concept, and the argument for view state this one has to answer
- [Conduct](../syncs/conduct.md) — the rule that lets the model show a facet, and why it costs nothing to grant
- [Gestures](../syncs/gestures.md) — the person's two acts
- [Constraining](constraining.md) — the read behind `excluded`
