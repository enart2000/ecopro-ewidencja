/* ============================================================
   GODZINY — pracownicy, godziny pracy i wyjścia służbowe
   Wyjścia służbowe trzymamy w tym samym pliku co godziny, bo w
   praktyce są częścią tego samego rekordu dnia (jeden pracownik,
   jeden dzień = jedno wejście/wyjście + zero lub więcej wyjść
   służbowych tego dnia). Rozdzielanie ich do osobnego pliku
   wymagałoby rozbicia jednego rekordu na dwa i tylko komplikowałoby
   synchronizację między widokiem „Godziny pracy” i „Wyjścia służbowe”.
   ============================================================ */

/* Kody nieobecności — odpowiednik czerwonych wpisów typu "L4" z
   papierowej ewidencji. Gdy ustawione, zastępują godziny wejścia/wyjścia. */
const ABSENCE_CODES = [
  {code:'',     label:'— obecność —'},
  {code:'L4',   label:'L4 — zwolnienie lekarskie'},
  {code:'UP',   label:'UP — urlop wypoczynkowy'},
  {code:'OP',   label:'OP — opieka nad dzieckiem'},
  {code:'NN',   label:'NN — nieobecność nieusprawiedliwiona'},
  {code:'INNE', label:'INNE'},
];
function absenceLabel(code){
  const found = ABSENCE_CODES.find(a=>a.code===code);
  return found ? found.label : code;
}

/* ---------------- wczytywanie / zapisywanie ---------------- */
async function loadGodzinyData(){
  S.employees = await stGet('app:employees', []);
}
async function saveEmployees(){ await stSet('app:employees', S.employees); }

async function getMonthData(ym){ return await stGet('app:month:'+ym, {}); }
async function setMonthData(ym, data){ await stSet('app:month:'+ym, data); }

async function getDayRecord(dateStr){
  const ym = ymOf(dateStr);
  const month = await getMonthData(ym);
  return month[dateStr] || {};
}
async function updateDayRecord(dateStr, dayObj){
  const ym = ymOf(dateStr);
  const month = await getMonthData(ym);
  month[dateStr] = dayObj;
  await setMonthData(ym, month);
}

/* Pobiera rekordy dla zakresu dat (może obejmować kilka miesięcy),
   cache'ując każdy potrzebny miesiąc tylko raz. Zwraca mapę data -> dzień. */
async function getRangeRecords(fromDate, toDate){
  const months = {};
  const out = {};
  let d = fromDate;
  let guard = 0;
  while(d <= toDate && guard < 400){
    const ym = ymOf(d);
    if(!months[ym]) months[ym] = await getMonthData(ym);
    out[d] = months[ym][d] || {};
    d = addDaysStr(d, 1);
    guard++;
  }
  return out;
}

/* ---------------- obliczenia godzin ---------------- */
function timeToMin(t){ if(!t) return null; const [h,m]=t.split(':').map(Number); return h*60+m; }

function computeWorkedMinutes(rec){
  if(!rec || rec.absenceCode) return 0;
  if(!rec.arrival || !rec.departure) return 0;
  let mins = timeToMin(rec.departure) - timeToMin(rec.arrival);
  if(mins<0) mins=0;
  (rec.trips||[]).forEach(t=>{
    if(t.type==='sluzbowe') return; // wyjścia służbowe nie pomniejszają czasu pracy, tylko prywatne
    if(t.start && t.end){
      let d = timeToMin(t.end)-timeToMin(t.start);
      if(d>0) mins -= d;
    }
  });
  return Math.max(mins,0);
}

/* Standardowy dzienny wymiar godzin (kolumna "Godziny pracy" z Excela) —
   zwraca np. "8:00" dla dni roboczych, pustą wartość dla weekendu. */
function formatHoursHM(hoursDecimal){
  if(hoursDecimal === null || hoursDecimal === undefined || hoursDecimal === '') return '';
  const h = Math.floor(hoursDecimal);
  const m = Math.round((hoursDecimal-h)*60);
  return `${h}:${pad(m)}`;
}
function standardDailyHours(emp, dateStr){
  const wd = new Date(dateStr+'T00:00:00').getDay();
  if(wd===0 || wd===6) return ''; // weekend
  return formatHoursHM(emp.dailyHours || 8);
}
