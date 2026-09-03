# ecopro-ewidencja

Ewidencja czasu pracy EcoPro — strona + lekki serwer Node.js (bez
zależności, bez bazy SQL). Dane zapisywane są jako pliki JSON w
folderze `data/`, podzielone na miesiące.

## Uruchomienie lokalne

    node server.js

Domyślnie działa na porcie 3000. Inny port:

    PORT=8080 node server.js

## Struktura

    server.js         ← cały backend
    public/            ← strona (HTML/CSS/JS)
    data/              ← TU LĄDUJĄ DANE (nie jest w repozytorium git — patrz .gitignore)

## Dane

Wszystko w `data/` zapisuje się na zawsze, bez limitu czasu — jedyny
wyjątek to dziennik zdarzeń (`data/app/log.json`), który trzyma
ostatnie 500 wpisów. Backup to zwykłe kopiowanie folderu `data/`
(np. przez cron).

## Wdrożenie na serwerze (systemd)

Patrz plik `ecopro.service` w tym repo — gotowa konfiguracja do
`/etc/systemd/system/`.

## Licencja

Wszelkie prawa zastrzeżone — patrz plik `LICENSE`. Repozytorium jest
publiczne wyłącznie do celów podglądowych, nie jest to oprogramowanie
open source.
