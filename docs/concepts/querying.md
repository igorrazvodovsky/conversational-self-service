# Querying

```
concept Querying [Question, Record]

purpose
  to retrieve the records that answer a question posed in the
  asker's own words

state
  text:    Question -> string
  matched: Question -> set Record

actions
  ask [ question: Question ; text: string ]
    => [ question: Question ]
    record the text of the question
    determine, by a service that reads the records, which bear on it
    record those as matched for the question

  ask [ question: Question ; text: string ]
    => [ error: string ]
    if the text cannot be interpreted as a question over the records
    return the error description

operational principle
  after ask [ question: q ; text: "revenue by category" ] => [ question: q ]
  then matched of q is a set R
  and every record in R bears on revenue by category
  and after ask [ question: q' ; text: "headcount by region" ] => [ question: q' ]
  then matched of q' is a set R' which is not R
```
