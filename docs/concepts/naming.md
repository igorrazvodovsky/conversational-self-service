# Naming

```
concept Naming [Item]

purpose
  to identify an item the way a document names it, by its title
  and the site it is for

state
  title: Item -> string
  site:  Item -> string

actions
  entitle [ item: Item ; title: string ; site: string ]
    => [ item: Item ]
    record the title and the site given, replacing either
    that was recorded before, and leave one not given as it was

operational principle
  after entitle [ item: s ; title: "Riverside clinic, bed lift" ;
                  site: "Kaai 14, 3000 Leuven" ] => [ item: s ]
  then title of s is "Riverside clinic, bed lift"
  and site of s is "Kaai 14, 3000 Leuven"
```
