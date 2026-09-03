/* ============================================================
   DZIENNIK — dziennik zdarzeń (kto, kiedy, co zrobił)
   Widoczny tylko dla admina i super admina (kontrola dostępu
   znajduje się w warstwie widoku, w aplikacja.js).
   Przechowywane jest tylko ostatnie 500 wpisów w jednym pliku —
   starsze są automatycznie obcinane, żeby dziennik nie rósł
   w nieskończoność. Dane pracowników i godzin (w godziny.js) NIE
   mają takiego limitu — ten limit dotyczy wyłącznie dziennika.
   ============================================================ */

const LOG_MAX_ENTRIES = 500;

async function loadDziennikData(){
  S.log = await stGet('app:log', []);
}

async function logEvent(action, details){
  const u = S.session;
  S.log.push({
    id: uid(),
    ts: Date.now(),
    userId: u ? u.id : null,
    userName: u ? u.displayName : 'system',
    role: u ? u.role : null,
    action,
    details: details || ''
  });
  if(S.log.length > LOG_MAX_ENTRIES){
    S.log = S.log.slice(S.log.length - LOG_MAX_ENTRIES);
  }
  await stSet('app:log', S.log);
}
