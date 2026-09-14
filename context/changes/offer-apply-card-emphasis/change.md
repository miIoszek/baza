---
change_id: offer-apply-card-emphasis
title: Emphasize the apply card on job offer detail
status: implemented
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

Wyróżnić kartę „Aplikuj” na widoku oferty, żeby przyciągała uwagę względem karty szczegółów — glass/gradient, mocniejszy border i CTA (baza-btn-premium), bez animowanej obwódki, paska z lewej i perk pillek. Zachować prosty formularz (ikony mail/telefon, lepszy upload CV z nazwą pliku).

Decyzje z rozmowy (2026-09-14):
- Za dużo fancy (spinning border, badge, perki) → odrzucone
- Za mało wyróżnienia po tonowaniu → podkręcić gradient/border/glow
- Lewy accent bar → nie
- Gradient + mocniejszy border/glow → tak
- „Aplikuj teraz” w headerze oferty jako baza-btn-premium → tak
- Complexity: LOWER — plan z ustaleń, bez dodatkowych pytań
- Implement: branch `feat/offer-apply-card-emphasis` z `main`
