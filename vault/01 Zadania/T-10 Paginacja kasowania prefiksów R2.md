---
id: T-10
typ: zadanie
status: todo
priorytet: P1
obszar: [rodo, dane, infrastruktura]
projekt: Baza
szacunek: 1h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P1
  - obszar/rodo
  - obszar/dane
---

# T-10 Paginacja kasowania prefiksów R2

## Problem

`storage/r2-storage.service.ts:402-445` robi **jedno** `ListObjectsV2` i **jedno** `DeleteObjects`:

```ts
const listed = await client.send(new ListObjectsV2Command({
  Bucket: bucket,
  Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
}));                                    // ← bez ContinuationToken, cap 1000 kluczy
const keys = (listed.Contents ?? []).map((o) => o.Key).filter(...);
if (!keys.length) return;
await client.send(new DeleteObjectsCommand({
  Bucket: bucket,
  Delete: { Objects: keys.map((Key) => ({ Key })) },
}));                                    // ← też cap 1000 kluczy na request
```

Oba API mają twardy limit 1000. Przy ofercie z >1000 aplikacji `deletePrivatePrefixOrThrow` **zgłosi sukces** (bo `DeleteObjects` na pierwszej stronie się powiedzie), `deleteOwnedOfferRow` skasuje wiersz oferty, a nadmiarowe CV zostaną w buckecie.

Efekt: **osierocone dane osobowe w R2, bez żadnego wskaźnika w bazie**. Nikt się o nich nie dowie i nikt ich nie usunie. To problem RODO, nie tylko porządkowy — nie potrafisz zrealizować żądania usunięcia danych, bo nie wiesz, że te pliki istnieją.

Ironia: ten kod był pisany z myślą o fail-closed (`deletePrivatePrefixOrThrow` jawnie rzuca zamiast połykać błędy, `job-offer.service.ts:200-214` blokuje usunięcie oferty, gdy prywatne R2 jest niedostępne). Intencja dobra, pętla zapomniana.

## Jak naprawić

```ts
private async deletePrefixInBucket(
  client: S3Client, bucket: string, prefix: string,
  options: { failClosed?: boolean } = {}
): Promise<void> {
  const Prefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  let ContinuationToken: string | undefined;

  try {
    do {
      const listed = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix, ContinuationToken })
      );
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => !!k);

      if (keys.length) {
        // DeleteObjects przyjmuje max 1000 kluczy — ListObjectsV2 też tyle zwraca,
        // ale nie zakładaj tego: tnij na paczki.
        for (let i = 0; i < keys.length; i += 1000) {
          const batch = keys.slice(i, i + 1000);
          const out = await client.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })) },
          }));
          if (out.Errors?.length) {
            throw new Error(`R2 delete zwrócił ${out.Errors.length} błędów`);
          }
        }
      }
      ContinuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (ContinuationToken);
  } catch (err) {
    // ...istniejąca obsługa
  }
}
```

> [!important] Drugi bug przy okazji
> Dzisiejszy kod **ignoruje `out.Errors`**. `DeleteObjects` zwraca 200 nawet gdy część kluczy się nie skasowała — błędy są w ciele odpowiedzi. Fail-closed bez sprawdzenia `Errors` nie jest fail-closed.

## Definicja ukończenia

- [ ] Pętla po `ContinuationToken`
- [ ] Batchowanie po 1000 kluczy
- [ ] `out.Errors` sprawdzane i eskalowane
- [ ] Test z mockiem zwracającym `IsTruncated: true` na pierwszej stronie
- [ ] Sprawdzone, czy na produkcji nie ma już osieroconych prefiksów

## Powiązane

- [[T-16 Retencja danych aplikacji i CV]]
- [[RODO i dane osobowe]]
