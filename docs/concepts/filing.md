# Filing

```
concept Filing [Party]

purpose
  to keep a document a party brought, as it was brought, so that a
  passage of it can be cited

state
  files:     seq File
  broughtBy: File -> Party
  name:      File -> string
  text:      File -> string

actions
  file [ party: Party ; name: string ; text: string ]
    => [ file: File ; party: Party ; name: string ]
    append a file to those kept, attributed to the party,
    under the name given, holding the text as brought

  file [ party: Party ; name: string ; text: string ]
    => [ error: string ]
    if the text is empty
    return the error description

operational principle
  after file [ party: p ; name: "RFQ 2026-04.pdf" ;
               text: "1. Scope. The lift serves six storeys …" ]
    => [ file: f ; party: p ; name: "RFQ 2026-04.pdf" ]
  then f is last in files
  and broughtBy of f is p
  and name of f is "RFQ 2026-04.pdf"
  and text of f is "1. Scope. The lift serves six storeys …"
  and file [ party: p ; name: "empty.pdf" ; text: "" ] => [ error: e ]
```
