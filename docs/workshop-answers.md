# Workshop answers

What the workshop actually does, in the owner's own words, gathered a session at
a time. This is the specification. Where the code and this file disagree, this
file is right and the code is a bug.

Question numbering follows the field guide.

---

## Session 1: the recipe

**1. What is the acid measured in?**
2 grams per litre of water. Not on the weight of the fabric.

**2. How does the acid scale from lab to machine?**
By the water, not the fabric. 1000 litres in the machine takes 2 kg of acid. A
250 ml lab bottle takes 0.5 g. He notes the concentration is on the high side.

> This corrected the assumption flagged in the first build, which scaled the
> acid with fabric weight. `Sample.acid` became `Sample.acidGPerL`.

**3. How much water in the lab?**
About 250 ml for a 10 gram swatch, and it is the same every time. You fill the
cup, whichever cup it is, so the volume does not really vary.

**4. How are the dyes dosed and scaled?**
By fabric weight, worked out in the lab and carried down to the floor as a
finished number to pour in.

His worked example: 46 kg of fabric, a sample needing 2.2 for the main colour
and 0.25 for the second.

```
2.2  x 46 x 10 = 1012 g
0.25 x 46 x 10 =  115 g
```

He explained the 10 as "for every kilogram of fabric, 10 litres of water are
required". That is true of the machine, but it is not what the 10 is doing in
this formula. `percent x kilograms x 10` is the standard conversion from a
percentage on weight of fabric into grams, and the two 10s coincide.

The check: read as grams per 10 g of swatch, 2.2 would be a 22 percent shade,
which no dyeing runs at, and the answer would be 10,120 g. Read as a percentage
it is a 2.2 percent shade giving 1,012 g, which is an ordinary medium to dark
navy. The percentage reading is the correct one, so the app keeps the `% o.w.f.`
column and reproduces his formula verbatim in the machine hand-off panel.

Sometimes 20 litres per kg is used instead of 10. Reason not known yet.

**5. When is carrier used?**
Polyester only.

**6. When is anti break used?**
When the fabric feels like it may harshen or break apart in the bath. It softens
things and stops the breaking. His term is **مضاد تكسر**, anti break, not
مضاد التجعد, anti crease. The app now uses his word.

**7. Samples machine temperature?**
Not fixed. It depends on the fabric. Some need high heat, some cannot take it.
To be gone into in a later session.

---

## Session 2: dyes and colours

**8. How is a dye identified?**
Commercial names, with types and categories. Between 3,000 and 5,000 of them,
effectively arbitrary. He keeps a small bottle of each type even when he has no
bulk of it, and orders bulk on demand. When testing a sample he writes down each
name he used and the amount.

> So the name is the identifier, not a code. Code is now optional, name is the
> primary column, and a `hasBulk` flag separates a real stock item from a
> testing bottle.

**9. Same colour from several suppliers?**
Covered by 8.

**10. Is the dye list written anywhere?**
No. He will try to write it.

> Hence the bulk paste importer on the dyes screen. When the list exists it gets
> pasted in, one per line, rather than typed 3,000 times.

**11. How is an old recipe found today?**
It is written on paper, and they search and search. He called it a headache and
asked for it to be in the system.

> Sample search now also matches on the dyes used and on the notes, not just the
> code and the colour name.

**12. How many tries to match a sample?**
Anywhere from one to six or more. The man doing it is experienced so he usually
lands it fast, and only rare cases drag.

> A prediction system for this was raised and parked. It would need a large
> reference database plus measuring hardware. Recorded as an idea, not a plan.

**13. What happens when a sample fails?**
You adjust the same sample. You do not start a new one.

> So the sheet stays live and each go is snapshotted into an attempts log.
> Nothing is overwritten and nothing is duplicated.

---

## Still open

1. **The lab acid figure does not reconcile.** 2 g/L across 250 ml is 0.5 g, but
   the original notes said 0.25. Either the lab bottle is 125 ml, or the lab
   uses a different concentration from the machine, or 0.25 meant something
   else. The app calculates 0.5 g and shows its working, so this is visible
   rather than hidden.
2. **How are carrier and anti break dosed?** Grams per litre like the acid, or a
   percentage on fabric? Each has a basis selector on the sample sheet so it can
   be set correctly without the code assuming.
3. **Why 20 litres per kg instead of 10 sometimes?** Set per fabric today.
4. Sessions 3 to 7 of the field guide.
