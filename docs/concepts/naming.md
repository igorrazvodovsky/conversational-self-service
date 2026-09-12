# Naming

```
concept Naming [Item]

purpose
  to give an item a title and a place that a person will
  recognise it by

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
