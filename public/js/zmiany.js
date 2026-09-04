/* ============================================================
   ZMIANY — historia zmian w aplikacji (changelog)
   To NIE jest dziennik zdarzeń (kto/co/kiedy zrobił coś w danych
   firmy) — to log zmian w SAMEJ APLIKACJI: co zostało dodane,
   poprawione albo zmienione wizualnie w kolejnych aktualizacjach.

   Wpisy są ręcznie utrzymywane w tym pliku przez osobę rozwijającą
   aplikację. Na stronie NIE MA żadnej możliwości dodawania,
   edytowania ani usuwania ich z poziomu interfejsu — to zwykła,
   stała lista w kodzie, tylko do odczytu. Widoczna wyłącznie dla
   Admina i Super Admina (patrz renderChangelogView w aplikacja.js).

   Daty ustalone z najlepszą możliwą dokładnością (co do dnia) na
   podstawie przebiegu prac nad projektem.
   ============================================================ */

const CHANGELOG_CATEGORIES = {
  funkcja:        { label: 'Nowa funkcja',    color: 'var(--amber)' },
  wyglad:         { label: 'Wygląd',          color: 'var(--teal)'  },
  poprawka:       { label: 'Poprawka',        color: 'var(--ink-dim)' },
  bezpieczenstwo: { label: 'Bezpieczeństwo',  color: 'var(--red)'   },
  infrastruktura: { label: 'Infrastruktura',  color: 'var(--gold)'  },
};

const CHANGELOG = [
  { date:'2026-09-04', category:'poprawka', title:'Podsumowanie miesięczne otwierało zły miesiąc',
    description:'Przycisk „Podsumowanie miesięczne” na Panelu głównym domyślnie pokazywał poprzedni miesiąc zamiast bieżącego, przez co wyglądało, jakby przepracowane godziny się nie liczyły. Samo liczenie działało cały czas poprawnie i na bieżąco — teraz przycisk od razu otwiera aktualny miesiąc.' },
  { date:'2026-09-04', category:'wyglad', title:'Ikona strony (favicon) w karcie przeglądarki',
    description:'Dodano ikonę widoczną w karcie przeglądarki (prosty, kontrastowy zegar w kolorze marki) zamiast domyślnej, pustej ikony pliku.' },
  { date:'2026-09-04', category:'funkcja', title:'Kody dla pracowników i osobny widok listy pracowników',
    description:'Manager może teraz sam wygenerować kod dostępu ograniczony wyłącznie do rangi Pracownik (bez dostępu do pełnego panelu kont). Dodawanie i zarządzanie listą pracowników przeniesione z zakładki „Godziny pracy” do osobnej sekcji „Lista pracowników” w Panelu głównym — nie zaśmieca już widoku wpisywania godzin.' },
  { date:'2026-09-04', category:'infrastruktura', title:'SSL i własna domena',
    description:'Strona działa teraz pod własnym adresem (ecopro-ewidencja.ddns.net) z szyfrowanym połączeniem HTTPS zamiast wcześniejszego dostępu po adresie IP przez zwykłe, niezabezpieczone HTTP.' },
  { date:'2026-09-04', category:'bezpieczenstwo', title:'Naprawa logowania na serwerze bez SSL',
    description:'Dodano zapasowy sposób hashowania haseł na wypadek, gdy przeglądarka blokuje wbudowaną funkcję kryptograficzną — co dzieje się na zwykłym HTTP, bez certyfikatu SSL. Logowanie i zakładanie kont działa teraz niezależnie od tego.' },

  { date:'2026-09-03', category:'infrastruktura', title:'Wdrożenie na serwer produkcyjny i GitHub',
    description:'Konfiguracja usługi systemd (automatyczny start po restarcie serwera), repozytorium GitHub do wygodnych aktualizacji kodu oraz automatyczny, codzienny backup danych z rotacją starych kopii.' },

  { date:'2026-09-03', category:'poprawka', title:'Poprawka podwójnego przycisku zamykania okien',
    description:'Okna „Dodaj wyjście” i „Eksport / kopiowanie” pokazywały dwa przyciski zamknięcia zamiast jednego.' },

  { date:'2026-09-03', category:'poprawka', title:'Synchronizacja szybkiego wpisywania przyjścia',
    description:'Uzupełnienie brakującej godziny przyjścia w okienku przypominającym nie zawsze od razu pojawiało się w tabeli „Godziny pracy” — trzeba było wpisywać ponownie. Naprawione.' },

  { date:'2026-09-03', category:'bezpieczenstwo', title:'Ochrona przed samo-degradacją administratora',
    description:'Zablokowano możliwość przypadkowej zmiany własnej rangi lub usunięcia własnego konta z panelu użytkowników.' },

  { date:'2026-09-03', category:'funkcja', title:'Kreator dodawania wyjść służbowych',
    description:'Dodawanie wyjścia prowadzi teraz krok po kroku: wybór kategorii (prywatne / służbowe), godziny, a komentarz jest opcjonalny i domyślnie ukryty.' },

  { date:'2026-09-03', category:'poprawka', title:'Drobne poprawki wygody użytkowania',
    description:'Zniknięcie plakietki „Pracownik” w górnym pasku, jednorazowe (a nie powtarzające się) powiadomienie o podsumowaniu miesiąca, ukrywanie pracowników bez wyjść służbowych zamiast pustych wpisów, lista podsumowania miesięcznego pokazuje tylko miesiące z realnymi danymi.' },

  { date:'2026-09-03', category:'funkcja', title:'Trwałe usuwanie pracowników',
    description:'Po wcześniejszej dezaktywacji można już ostatecznie usunąć pracownika z listy.' },

  { date:'2026-09-03', category:'funkcja', title:'Ranga managera jako niezależna flaga',
    description:'Uprawnienia managera stały się osobną, przekazywalną flagą — administrator może jednocześnie pełnić funkcję managera bez utraty swojej rangi, a po przekazaniu jej komuś innemu odzyskuje ją bez problemu.' },

  { date:'2026-09-03', category:'wyglad', title:'Nowa animacja kafelków na pulpicie',
    description:'Niebieska poświata rozchodząca się od środka kafelka po najechaniu, zamiast wcześniejszego paska z boku.' },

  { date:'2026-09-03', category:'poprawka', title:'Naprawa zawieszającego się ładowania strony',
    description:'Usunięto błędne odwołanie do nieistniejącej już funkcji, które blokowało uruchomienie całej aplikacji.' },

  { date:'2026-09-03', category:'infrastruktura', title:'Prawdziwy serwer produkcyjny',
    description:'Własny, lekki serwer Node.js (bez bazy SQL) zapisujący dane jako zwykłe pliki JSON na dysku, z automatycznym podziałem na miesiące.' },

  { date:'2026-09-03', category:'funkcja', title:'Eksport dopasowany do firmowego Excela',
    description:'Kopiowanie danych do schowka gotowe do wklejenia w istniejącej tabeli zespołu oraz eksport wieloarkuszowy (jedna zakładka na pracownika) z wyborem zakresu dat i gotowymi zestawami: dzień / tydzień / miesiąc.' },

  { date:'2026-09-03', category:'infrastruktura', title:'Pełny podział danych na osobne pliki',
    description:'Dane pracowników i godzin, konta użytkowników oraz dziennik zdarzeń trafiły do osobnych, niezależnych plików — aktualizacje wyglądu czy funkcji nie mogą już naruszyć zapisanych danych.' },

  { date:'2026-09-03', category:'funkcja', title:'Kody nieobecności i dopasowanie do papierowej ewidencji',
    description:'Status dnia (L4, urlop i inne), rozróżnienie wyjść prywatnych i służbowych (z polem na kilometry) oraz indywidualne godziny pracy dziennie dla każdego pracownika.' },

  { date:'2026-09-02', category:'funkcja', title:'Dziennik zdarzeń',
    description:'Rejestr działań (kto, co i kiedy zrobił) widoczny wyłącznie dla administratorów.' },

  { date:'2026-09-02', category:'infrastruktura', title:'Podział na osobne pliki',
    description:'Rozdzielenie kodu na warstwę danych, warstwę kont oraz warstwę wyglądu i logiki strony.' },

  { date:'2026-09-02', category:'wyglad', title:'Branding EcoPro',
    description:'Zamiana tymczasowej kolorystyki i nazwy na markę EcoPro — niebieskie logo i kolor przewodni zamiast wcześniejszego pomarańczowego.' },

  { date:'2026-09-02', category:'funkcja', title:'Pierwsza wersja systemu',
    description:'Stworzenie całej aplikacji od podstaw: logowanie, role (Super Admin / Admin / Manager / Pracownik), lista pracowników, wpisywanie godzin przyjścia i wyjścia, wyjścia służbowe, eksport do Excela, kody dostępu, tryb ciemny i jasny.' },
];
