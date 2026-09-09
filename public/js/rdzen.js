/* ============================================================
   RDZEŃ — fundament aplikacji EcoPro
   Ten plik zawiera tylko: stan aplikacji, niskopoziomową komunikację
   z pamięcią (window.storage) oraz uniwersalne funkcje pomocnicze.
   NIE zawiera żadnej logiki biznesowej ani widoków — dzięki temu
   praktycznie nigdy nie trzeba go zmieniać.
   ============================================================ */

const ECOPRO_LOGO_SVG = `<svg viewBox="645.4 -178.9 898 273.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
<path d="M1219.1-163.6c0,0-74.2-16.7-144.4-15.1c-70.2,1.6-149.1,33.3-189.5,53.6c-40,20.1-97.8,43.4-148.1,48.6
c-50.3,5.1-91.7-1.9-91.7-1.9s97.9,25.9,179.5,17.7c81.6-8.2,112.3-23.8,158.2-44.8c55.4-25.3,93.4-41.2,130.5-50.4
C1150.8-165.3,1219.1-163.6,1219.1-163.6L1219.1-163.6z"/>
<path d="M1543.4-128.6c0,0-44.3-9.7-86.3-8.8c-41.9,0.9-89.1,19.4-113.2,31.2c-23.9,11.7-58.4,25.3-88.5,28.2
c-30.1,3-54.8-1.1-54.8-1.1s58.5,15,107.2,10.3c48.7-4.8,67.1-13.9,94.5-26c33.1-14.7,55.8-23.9,78-29.3
C1502.6-129.6,1543.4-128.6,1543.4-128.6L1543.4-128.6z"/>
<path d="M1410.1-145.7c0,0-62.6-14.1-121.9-12.8c-59.2,1.3-125.9,28.2-160,45.3c-33.8,17-82.6,36.7-125,41.1
c-42.5,4.3-77.4-1.6-77.4-1.6s82.7,21.9,151.5,14.9c68.9-6.9,94.8-20.2,133.5-37.9c46.8-21.4,78.9-34.8,110.2-42.7
C1352.4-147.2,1410.1-145.7,1410.1-145.7L1410.1-145.7z"/>
<polygon points="830.8,31.6 830.8,-34.7 923.7,-34.7 923.7,-23.5 856.2,-23.5 856.2,-8.8 918.9,-8.8 918.9,2.4
856.2,2.4 856.2,20.4 926.1,20.4 926.1,31.6 "/>
<path d="M1026.7-2.2L1003.1,0c-0.8-2.5-2.6-4.3-5.4-5.6c-2.8-1.2-6.5-1.9-11-1.9c-6,0-10.8,1.1-14.3,3.3
c-3.6,2.2-5.3,5.8-5.3,11c0,5.7,1.8,9.7,5.4,12.1c3.6,2.4,8.5,3.5,14.5,3.5c4.6,0,8.3-0.7,11.2-2.1c2.9-1.4,5-3.7,6.2-7.1
l23.7,2.1c-2.5,5.7-7.2,10.1-14.1,13s-16.3,4.4-28,4.4c-13.3,0-23.9-2.2-31.7-6.6c-7.9-4.4-11.9-10.6-11.9-18.4
c0-7.9,4-14.1,11.9-18.5c7.9-4.4,18.6-6.6,32.2-6.6c11,0,19.8,1.3,26.4,3.8C1019.2-11.2,1023.8-7.3,1026.7-2.2L1026.7-2.2z"/>
<path d="M1039.3,7c0-4.2,2-8.3,5.9-12.3c3.9-4,9.5-7,16.7-9c7.2-2.1,15.2-3.1,24.2-3.1
c13.8,0,25,2.4,33.8,7.1c8.8,4.7,13.2,10.7,13.2,17.9c0,7.3-4.4,13.3-13.3,18.1c-8.9,4.8-20,7.2-33.5,7.2c-8.3,0-16.3-1-23.8-3
c-7.5-2-13.3-4.9-17.2-8.8C1041.3,17.2,1039.3,12.5,1039.3,7L1039.3,7z M1064.1,7.7c0,4.8,2.1,8.4,6.4,10.9
c4.3,2.5,9.5,3.8,15.8,3.8c6.2,0,11.5-1.3,15.7-3.8c4.2-2.5,6.4-6.2,6.4-11c0-4.7-2.1-8.3-6.4-10.9c-4.2-2.5-9.5-3.8-15.7-3.8
c-6.3,0-11.5,1.3-15.8,3.8C1066.2-0.8,1064.1,2.9,1064.1,7.7z"/>
<path d="M1152.2,31.6v-66.2h40.6c15.4,0,25.4,0.3,30.1,1c7.2,1,13.2,3.2,18,6.5c4.8,3.3,7.3,7.6,7.3,12.9
c0,4.1-1.4,7.5-4.2,10.3c-2.8,2.8-6.3,4.9-10.6,6.5c-4.3,1.6-8.7,2.6-13.1,3.1c-6,0.6-14.8,1-26.2,1h-16.5v25L1152.2,31.6
L1152.2,31.6z M1177.6-23.5v18.9h13.8c10,0,16.6-0.4,19.9-1c3.4-0.7,6-1.8,7.9-3.3c1.9-1.5,2.9-3.2,2.9-5.2c0-2.4-1.3-4.4-4-6
c-2.7-1.6-6-2.6-10.2-3c-3-0.3-9.1-0.4-18.2-0.4L1177.6-23.5L1177.6-23.5z"/>
<path d="M1291.8,31.6h-24v-48h22.3v6.8c3.8-3.2,7.3-5.3,10.3-6.3c3.1-1,6.5-1.5,10.4-1.5
c5.5,0,10.8,0.8,15.9,2.4L1319.2-4c-4.1-1.4-7.8-2.1-11.3-2.1c-3.4,0-6.2,0.5-8.6,1.5c-2.3,1-4.2,2.7-5.5,5.3
c-1.3,2.6-2,7.9-2,16.1V31.6L1291.8,31.6z"/>
<path d="M1331.4,7c0-4.2,2-8.3,5.9-12.3c3.9-4,9.5-7,16.7-9c7.2-2.1,15.2-3.1,24.2-3.1
c13.8,0,25,2.4,33.8,7.1c8.8,4.7,13.2,10.7,13.2,17.9c0,7.3-4.4,13.3-13.3,18.1c-8.9,4.8-20,7.2-33.5,7.2c-8.3,0-16.3-1-23.8-3
c-7.5-2-13.3-4.9-17.2-8.8C1333.4,17.2,1331.4,12.5,1331.4,7L1331.4,7z M1356.1,7.7c0,4.8,2.1,8.4,6.4,10.9
c4.3,2.5,9.5,3.8,15.8,3.8c6.2,0,11.5-1.3,15.7-3.8c4.2-2.5,6.4-6.2,6.4-11c0-4.7-2.1-8.3-6.4-10.9c-4.2-2.5-9.5-3.8-15.7-3.8
c-6.3,0-11.5,1.3-15.8,3.8C1358.3-0.8,1356.1,2.9,1356.1,7.7z"/>
</svg>`;

/* ---------------- stan aplikacji ----------------
   Poszczególne pola (users, employees, codes, log) są WYPEŁNIANE
   przez odpowiednie pliki danych (uzytkownicy.js, godziny.js,
   dziennik.js) w ich własnych funkcjach loadXxxData(). Ten plik
   tylko rezerwuje dla nich miejsce w jednym wspólnym obiekcie. */
const S = {
  ready:false,
  users:[],       // wypełniane przez uzytkownicy.js — konta logowania
  employees:[],   // wypełniane przez godziny.js — lista pracowników
  codes:[],       // wypełniane przez uzytkownicy.js — kody dostępu
  log:[],         // wypełniane przez dziennik.js — dziennik zdarzeń
  session:null,
  theme: 'dark',
  view:'dashboard',
  saving:false,
  lastSaveTime:null,
  autoPopupShown:false,
  summaryPopupShown:false,
  currentDate: todayStr(),
  currentMonth: monthStr(new Date()),
};

/* ---------------- daty i formatowanie ---------------- */
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function monthStr(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1); }
function pad(n){ return n<10 ? '0'+n : ''+n; }
function ymOf(dateStr){ return dateStr.slice(0,7); }
function humanDate(dateStr){
  const [y,m,d] = dateStr.split('-');
  const months=['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}
function humanMonth(ym){
  const [y,m]=ym.split('-');
  const months=['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
  return `${months[parseInt(m)-1]} ${y}`;
}
function prevMonth(ym){
  let [y,m]=ym.split('-').map(Number);
  m -= 1; if(m===0){m=12; y-=1;}
  return y+'-'+pad(m);
}
const WEEKDAY_NAMES_PL = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
function weekdayNamePL(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  return WEEKDAY_NAMES_PL[d.getDay()];
}
function addDaysStr(dateStr, n){
  const d = new Date(dateStr+'T00:00:00');
  d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function startOfWeekStr(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  const day = d.getDay(); // 0=niedziela
  const diff = day===0 ? -6 : 1-day; // poniedziałek jako pierwszy dzień
  return addDaysStr(dateStr, diff);
}
function startOfMonthStr(dateStr){ return dateStr.slice(0,8)+'01'; }
function endOfMonthStr(dateStr){
  const [y,m] = dateStr.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return dateStr.slice(0,8)+pad(last);
}

/* ---------------- identyfikatory ---------------- */
function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
function genCode(len=6){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez O,0,I,1
  let s='';
  for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- niskopoziomowa pamięć ----------------
   Ta funkcja automatycznie wybiera właściwy sposób zapisu:
   - w podglądzie na czacie (Claude) korzysta z window.storage,
   - na prawdziwym serwerze (po wdrożeniu z ecopro-server) korzysta
     z własnego, prostego API zapisującego pliki JSON na dysku
     serwera, w folderze data/ (patrz server.js).
   Dzięki temu ten sam plik działa w obu miejscach bez zmian. */
const HAS_ARTIFACT_STORAGE = (typeof window !== 'undefined' && window.storage && typeof window.storage.get === 'function');

async function stGet(key, fallback){
  try{
    if(HAS_ARTIFACT_STORAGE){
      const r = await window.storage.get(key, true);
      if(!r) return fallback;
      return JSON.parse(r.value);
    } else {
      const res = await fetch('/api/data/' + encodeURIComponent(key));
      if(res.status === 404) return fallback;
      if(!res.ok) return fallback;
      const data = await res.json();
      return (data && data.value !== undefined) ? data.value : fallback;
    }
  }catch(e){ return fallback; }
}
async function stSet(key, value){
  S.saving = true; renderSaveIndicator();
  try{
    if(HAS_ARTIFACT_STORAGE){
      await window.storage.set(key, JSON.stringify(value), true);
    } else {
      await fetch('/api/data/' + encodeURIComponent(key), {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({value})
      });
    }
    S.lastSaveTime = new Date();
    // Automatyczne oznaczenie "ostatniej zmiany" widocznej dla wszystkich —
    // przy KAŻDYM prawdziwym zapisie, poza samymi znacznikami
    // aktywności/obecności, żeby uniknąć nieskończonej pętli.
    if(key !== 'app:activity' && key !== 'app:presence'){
      const stamp = {ts: Date.now(), by: S.session ? S.session.displayName : 'system'};
      if(HAS_ARTIFACT_STORAGE){
        window.storage.set('app:activity', JSON.stringify(stamp), true).catch(()=>{});
      } else {
        fetch('/api/data/app%3Aactivity', {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({value:stamp})
        }).catch(()=>{});
      }
    }
  }catch(e){ console.error('Błąd zapisu', e); }
  S.saving = false; renderSaveIndicator();
}
