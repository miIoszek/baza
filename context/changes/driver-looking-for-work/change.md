---
change_id: driver-looking-for-work
title: Karta kierowcy „szukam pracy” (odwrotna pętla)
status: implementing
created: 2026-09-19
updated: 2026-09-19
archived_at: null
---

## Notes

Idziemy **powoli**. Hipoteza („kierowca nie chce polować — wpisuje raz i czeka”) jest intuicją, nie danymi; zdrowie pętli oferta → aplikacja → skrzynka jest nieznane. Fazy 2–4 (konto kierowcy, karta, zainteresowanie) nie ruszamy, dopóki pierwsza pętla nie pokaże realnego ruchu.

Teraz tylko **faza 1**: wymagana forma zatrudnienia (multi-select `uop | b2b | zlecenie`) na ofertach firm + filtr na Job Offers. To jedyny kawałek z jasnym ROI w istniejącym produkcie.

Świadomie poza v1 karty: CV, paywall, „zweryfikowana firma”, chat, publiczny URL karty.

Kryterium śmierci (gdy dojdziemy do kart): 30 dni od produkcji — mało kart albo zero zainteresowań od realnych firm → stop, nie dokładaj CV/paywalla/czatu.
