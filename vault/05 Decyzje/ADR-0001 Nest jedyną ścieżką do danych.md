---
id: ADR-0001
typ: decyzja
status: zaakceptowana
data: 2026-09-11
projekt: Baza
tags: [decyzja, obszar/bezpieczeństwo]
---

# ADR-0001: Nest jedyną ścieżką do danych

> [!note] Decyzja odtworzona
> Została podjęta w kodzie (migracje z 2026-09-11) i udokumentowana wstecznie podczas [[2026-09-17 Review techniczne pod produkcję|review]]. Warto ją mieć spisaną, bo jest fundamentem modelu bezpieczeństwa.

## Status

zaakceptowana

## Kontekst

Supabase domyślnie wystawia tabele przez PostgREST — frontend z kluczem `anon` i JWT użytkownika może czytać i pisać bezpośrednio, a dostępem rządzą polityki RLS.

Pierwsza wersja Bazy tak działała: `companies` i `job_offers` miały polityki „właściciel może SELECT/INSERT/UPDATE" i granty dla `anon, authenticated`.

Problem ujawnił się przy regule „nie opublikujesz oferty bez współrzędnych bazy firmy". Reguła żyła w Neście (`assertCanPublish`), ale frontend z anon JWT mógł pisać do `job_offers` **z pominięciem Nesta** — i tym samym z pominięciem reguły. Migracja `20260911120000` nazywa to wprost:

> anon JWT + RLS owner policies previously allowed bypassing Nest publish-coords gate

Do wyboru były dwie ścieżki: zdublować każdą regułę biznesową w politykach SQL, albo zamknąć drugą ścieżkę.

## Decyzja

Frontend nie rozmawia z PostgREST. Supabase jest używane jako dostawca Auth i jako baza, do której sięga **wyłącznie** Nest przez `service_role`.

```sql
revoke all on table public.<tabela> from anon, authenticated;
grant select, insert, update, delete on table public.<tabela> to service_role;
drop policy if exists ... ;
```

RLS zostaje włączone mimo braku polityk — jako deny-by-default, gdyby ktoś kiedyś przywrócił grant.

## Konsekwencje

**Dobre:**
- Jedno miejsce na reguły biznesowe. Nie da się ich obejść, bo nie ma drugiej drogi
- Kontrola nad kształtem odpowiedzi — publiczne endpointy zwracają wybrane pola, nie całe wiersze (`user_id`, `photo_key` nie wyciekają)
- Walidacja w jednym miejscu, nie rozdzielona między TypeScript i polityki SQL
- Łatwiejsze do zrozumienia przy czytaniu kodu: żeby wiedzieć, kto może co, czytasz serwisy, nie polityki

**Złe / koszt:**
- Każdy odczyt przechodzi przez Nest — więcej kodu niż wygenerowany klient PostgREST
- Nest staje się pojedynczym punktem awarii dla danych
- `service_role` omija RLS, więc **bug w sprawdzaniu własności zasobu = pełny dostęp**. Stąd wzorzec `.eq('id', x).eq('company_id', y)` w zapytaniu, nie po pobraniu
- Realtime Supabase i generowane klienty stają się niedostępne bez powrotu do PostgREST

**Co to zamyka:** powrót do bezpośredniego dostępu z frontu wymagałby przepisania reguł biznesowych na polityki RLS. To praktycznie nieodwracalne.

## Rozważane alternatywy

| Opcja | Dlaczego odrzucona |
| ----- | ------------------ |
| Zduplikować reguły w politykach RLS | Dwa źródła prawdy, które muszą pozostać zgodne. Reguła „opublikuj tylko ze współrzędnymi" w SQL jest nieczytelna i trudna do przetestowania |
| Zostawić obejście, pilnować konwencją | Reguła, którą da się obejść z DevToolsów, nie jest regułą |

## Powiązane

- [[Model danych i RLS]] · [[Architektura]] · [[Bezpieczeństwo]]
