# Value

One of the four phenomena of the ontology. See [the ontology](README.md).

> A value represents something that can be interpreted by virtue of its structure or by comparison to other values. Thus dollar amounts, phone numbers and email addresses are values; so are mailing addresses, domain names and the contents of messages.
>
> — MSM §4.1

A value is not a lesser individual. The test is whether identity does any work: "passwords are just strings, and what makes a particular string a password is that it's the password of some user" ([objects](objects.md)). Two users named Alice are two users; two strings spelling `alice` are one value.

The distinction from an [individual](individual.md) is interpretability. An individual has identity alone and cannot be decomposed; a value can be read, compared and taken apart. Two strings that spell the same thing are the same value. Two users who share a name are not the same user.

In code, values are primitives and collections — MSM §5.2 calls them value-objects, "treated as interpretable by their structure and content alone."

## In this repository

| Value | Where |
|---|---|
| `label`, `note`, `heading`, `family` | `agent/concepts/cataloguing.py` |
| `because` — a rule's sentence | `agent/concepts/constraining.py` |
| money: `capital`, `monthly`, `factor`, `months` | `agent/concepts/pricing.py` |
| mass and energy: `embodied`, `installed`, `upkeep`, `ended`, `demand`, `intensity` | `agent/concepts/footprinting.py` |
| `scope` — what the carbon estimate covers and omits | `agent/concepts/footprinting.py` |
| a retraction candidate, `{variable, option}` | `agent/syncs/propagation.py` |
| an assignment, `Variable -> Option` | `agent/concepts/constraining.py`, `complete` |
| `act` ∈ {`start`, `say`, `assert`, `withdraw`, `discard`, `choose`, `decline`} | `agent/engine/bootstrap.py` |

Two are worth arguing about, because both look like individuals at first.

_A retraction candidate._ `{variable: "rated_load", option: "rated_load:kg630"}`
is what [Deciding](../concepts/deciding.md)'s `Option` parameter is instantiated
with when a conflict is put to a person. It has structure and can be read and
compared, and two candidates naming the same variable and option are the same
candidate — so identity would do no work, and minting one would be inventing a
thing where a description will do.

_An assignment._ Likewise a map, not a thing. `Constraining/complete` returns
one and records nothing; if assignments were individuals they would need a
lifetime, and there is no question anybody asks of an assignment after it has
been adopted or refused.

The counter-example that keeps the distinction honest is `Rule`. `R15` looks
like a value — it is a short string — but it is an individual, because
`because(R15, "Hospitals require stretcher/bed-depth cars")` is a fact *about*
it and the string `"R15"` is not what makes it that rule. That is the
[objects piece](objects.md)'s password test run in reverse.

## See also

- [Individual](individual.md) — the phenomenon a value is contrasted with
- [Fact](fact.md) — how a value gets attached to an individual
- [Objects](objects.md) — on what does and does not deserve an identity
