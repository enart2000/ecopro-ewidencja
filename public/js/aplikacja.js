function renderSaveIndicator(){
  const el = document.getElementById('saveIndicator');
  if(!el) return;
  const dot = el.querySelector('.savedot');
  const txt = el.querySelector('.savetxt');
  if(dot) dot.classList.toggle('saving', S.saving);
  if(txt) txt.textContent = S.saving ? 'Zapisywanie…' : (S.lastSaveTime ? 'Zapisano o ' + S.lastSaveTime.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'Brak zapisów w tej sesji');
}


function toast(msg){
  const t = document.createElement('div');
  t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3200);
}

/* ---------------- role helpers ---------------- */

function render(){
  const root = document.getElementById('app');
  document.documentElement.setAttribute('data-theme', S.theme);
  if(!S.ready){
    root.innerHTML = `<div class="login-wrap"><p class="mono" style="color:var(--ink-dim)">Ładowanie…</p></div>`;
    return;
  }
  if(!S.session){
    root.innerHTML = renderLogin();
    return;
  }
  root.innerHTML = `
    ${renderTopbar()}
    <div class="main" id="mainArea">${renderView()}</div>
  `;
  renderSaveIndicator();
  wireViewEvents();
  maybeAutoPopups();
}


/* ============================================================
   TOPBAR
   ============================================================ */

function renderTopbar(){
  const u = S.session;
  return `
  <div class="topbar">
    <div class="brand">
      <div class="brand-mark">${ECOPRO_LOGO_SVG}</div>
      <div>
        <div class="brand-sub">EWIDENCJA CZASU PRACY</div>
      </div>
    </div>
    <div class="top-right">
      <div id="saveIndicator" class="savebar"><span class="savedot"></span><span class="savetxt">—</span></div>
      <button class="icon-btn" title="Zmień motyw" onclick="toggleTheme()">${S.theme==='dark' ? '☀' : '☾'}</button>
      <div class="hello">Witaj, <b>${escapeHtml(u.displayName)}</b>${u.role!=='employee' ? roleBadge(u.role) : ''}${u.isManager ? ' '+managerBadge() : ''}</div>
      <button class="icon-btn" title="Profil" onclick="goView('profile')">⚙</button>
      <button class="icon-btn" title="Wyloguj" onclick="logout()">⏻</button>
    </div>
  </div>`;
}

function toggleTheme(){ S.theme = S.theme==='dark' ? 'light' : 'dark'; render(); }

function goView(v){ S.view=v; render(); }


/* ============================================================
   VIEW ROUTER
   ============================================================ */

function renderView(){
  switch(S.view){
    case 'hours': return renderHoursView();
    case 'trips': return renderTripsView();
    case 'profile': return renderProfileView();
    case 'userpanel': return renderUserPanel();
    case 'summary': return renderSummaryView(S.summaryYm || prevMonth(monthStr(new Date())));
    case 'log': return renderLogView();
    case 'changelog': return renderChangelogView();
    case 'employees': return renderEmployeesView();
    default: return renderDashboard();
  }
}


function renderDashboard(){
  const u = S.session;
  return `
    <h1 style="font-size:26px; margin-bottom:6px;">Panel główny</h1>
    <p style="color:var(--ink-dim); font-size:14px; margin-bottom:22px;">${humanDate(todayStr())}</p>
    <div class="tiles">
      <div class="tile tile-1" onclick="goView('hours')">
        <div class="tile-ico">🕘</div>
        <h3>Godziny pracy</h3>
        <p>Przyjścia, wyjścia, edycja wpisów i eksport do Excela.</p>
      </div>
      <div class="tile tile-2" onclick="goView('trips')">
        <div class="tile-ico">🚗</div>
        <h3>Wyjścia służbowe</h3>
        <p>Rejestr wyjść w czasie pracy wraz z notatkami.</p>
      </div>
    </div>
    <div class="row-actions" style="margin-top:22px;">
      ${isAdminLike(u) ? `<button class="btn" onclick="goView('userpanel')">👤 Panel użytkowników</button>` : ''}
      ${(isAdminLike(u) || u.isManager) ? `<button class="btn" onclick="goView('employees')">👥 Lista pracowników</button>` : ''}
      <button class="btn" onclick="openSummary('${monthStr(new Date())}')">📊 Podsumowanie miesięczne</button>
      ${isAdminLike(u) ? `<button class="btn" onclick="goView('log')">📜 Dziennik zdarzeń</button>` : ''}
      ${isAdminLike(u) ? `<button class="btn" onclick="goView('changelog')">🗂️ Historia zmian</button>` : ''}
      ${u.isManager ? `<button class="btn" onclick="openGenerateEmployeeCodeModal()">🎫 Kod dla nowego pracownika</button>` : ''}
      ${u.isManager ? `<button class="btn btn-teal" onclick="openTransferModal()">⇄ Przekaż rangę managera</button>` : ''}
    </div>
  `;
}


/* ============================================================
   DZIENNIK ZDARZEŃ (tylko admin / superadmin)
   ============================================================ */
function renderLogView(){
  const u = S.session;
  if(!isAdminLike(u)){
    return `<div class="backlink" onclick="goView('dashboard')">← Panel główny</div><div class="empty">Dziennik zdarzeń jest dostępny tylko dla administratorów.</div>`;
  }
  const entries = (S.log || []).slice().sort((a,b)=>b.ts-a.ts);
  const rows = entries.map(e=>{
    const d = new Date(e.ts);
    const dateStr = d.toLocaleString('pl-PL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    return `<tr>
      <td class="mono" style="white-space:nowrap; color:var(--ink-dim); font-size:12px;">${dateStr}</td>
      <td style="white-space:nowrap;">${escapeHtml(e.userName)}${e.role ? roleBadge(e.role) : ''}</td>
      <td style="white-space:nowrap; font-weight:600;">${escapeHtml(e.action)}</td>
      <td style="color:var(--ink-dim); font-size:13px;">${escapeHtml(e.details||'')}</td>
    </tr>`;
  }).join('');
  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel">
      <div class="panel-head">
        <h2>📜 Dziennik zdarzeń</h2>
        <span class="small-note">${entries.length} wpisów (przechowywane ostatnie ${LOG_MAX_ENTRIES})</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="utable">
          <thead><tr><th>Data i godzina</th><th>Kto</th><th>Zdarzenie</th><th>Szczegóły</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="empty">Brak zarejestrowanych zdarzeń.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ============================================================
   HISTORIA ZMIAN (changelog aplikacji — tylko admin / superadmin)
   WYŁĄCZNIE do odczytu: dane pochodzą ze stałej listy w zmiany.js,
   na stronie nie ma żadnego formularza ani przycisku pozwalającego
   coś tu dodać, zmienić czy usunąć.
   ============================================================ */
function renderChangelogView(){
  const u = S.session;
  if(!isAdminLike(u)){
    return `<div class="backlink" onclick="goView('dashboard')">← Panel główny</div><div class="empty">Historia zmian jest dostępna tylko dla administratorów.</div>`;
  }
  const rows = CHANGELOG.map(entry=>{
    const cat = CHANGELOG_CATEGORIES[entry.category] || {label: entry.category, color: 'var(--ink-dim)'};
    return `
    <div class="panel" style="padding:16px 18px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="pill" style="border-color:${cat.color}; color:${cat.color}; margin-right:8px;">${escapeHtml(cat.label)}</span>
          <b style="font-size:15px;">${escapeHtml(entry.title)}</b>
        </div>
        <span class="mono" style="color:var(--ink-dim); font-size:12px; white-space:nowrap;">${humanDate(entry.date)}</span>
      </div>
      <p style="color:var(--ink-dim); font-size:13.5px; margin:8px 0 0;">${escapeHtml(entry.description)}</p>
    </div>`;
  }).join('');
  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel-head">
      <h2>🗂️ Historia zmian</h2>
      <span class="small-note">${CHANGELOG.length} wpisów · tylko do odczytu</span>
    </div>
    ${rows || '<div class="empty">Brak wpisów.</div>'}
  `;
}


/* ============================================================
   GODZINY PRACY
   ============================================================ */

let hoursDayData = null; // cache aktualnie edytowanego dnia

let hoursLoading = false;


async function renderHoursViewAsync(){
  hoursDayData = await getDayRecord(S.currentDate);
  rerenderMain();
}

function renderHoursView(){
  if(hoursDayData === null && !hoursLoading){
    hoursLoading = true;
    renderHoursViewAsync().then(()=>{hoursLoading=false;});
    return `<div class="empty">Wczytywanie danych dnia…</div>`;
  }
  const u = S.session;
  const editable = canEnterHours(u);
  const day = hoursDayData || {};
  const activeEmployees = S.employees.filter(e=>e.active !== false);

  const rows = activeEmployees.map(emp=>{
    const rec = day[emp.id] || {};
    const arrival = rec.arrival || '';
    const departure = rec.departure || '';
    const hasAbsence = !!rec.absenceCode;
    let dot = 'dot-absent', statusTxt='Brak wpisu';
    if(hasAbsence){ statusTxt = absenceLabel(rec.absenceCode); }
    else if(arrival && !departure){ dot='dot-present'; statusTxt='Obecny'; }
    else if(arrival && departure){ dot='dot-out'; statusTxt='Zakończono'; }
    return `
    <div class="ticket">
      <div class="ticket-name">
        <div class="nm"><span class="dot ${dot}"></span>${escapeHtml(emp.name)}</div>
        <div class="tag">${statusTxt}${emp.standardDeparture ? ' · domyślne wyjście '+emp.standardDeparture : ''}</div>
      </div>
      <div class="perf"></div>
      <div class="ticket-field">
        <label>STATUS DNIA</label>
        ${editable ? `<select onchange="updateHourField('${emp.id}','absenceCode',this.value)">
            ${ABSENCE_CODES.map(a=>`<option value="${a.code}" ${(rec.absenceCode||'')===a.code?'selected':''}>${escapeHtml(a.label)}</option>`).join('')}
          </select>` :
          `<div class="readonly-val" style="font-size:13px;">${hasAbsence ? escapeHtml(absenceLabel(rec.absenceCode)) : 'Obecność'}</div>`}
      </div>
      <div class="perf"></div>
      <div class="ticket-field">
        <label>PRZYJŚCIE</label>
        ${hasAbsence ? `<div class="readonly-val" style="color:var(--red); font-weight:700;">${escapeHtml(rec.absenceCode)}</div>` :
          editable ? `<input type="time" value="${arrival}" onchange="updateHourField('${emp.id}','arrival',this.value)">` :
          `<div class="readonly-val">${arrival || '—'}</div>`}
      </div>
      <div class="perf"></div>
      <div class="ticket-field">
        <label>WYJŚCIE</label>
        ${hasAbsence ? `<div class="readonly-val" style="color:var(--red); font-weight:700;">${escapeHtml(rec.absenceCode)}</div>` :
          editable ? `<input type="time" value="${departure}" onchange="updateHourField('${emp.id}','departure',this.value)">` :
          `<div class="readonly-val">${departure || '—'}</div>`}
        ${!hasAbsence && editable && emp.standardDeparture ? `<button class="btn btn-sm" style="margin-top:4px;" onclick="useStandardDeparture('${emp.id}')">Użyj domyślnej (${emp.standardDeparture})</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel-head">
      <h2>🕘 Godziny pracy</h2>
      <div class="row-actions">
        <input type="date" value="${S.currentDate}" class="mono" style="padding:8px 10px; border-radius:8px; border:1px solid var(--line-strong); background:var(--panel-2); color:var(--ink);" onchange="changeHoursDate(this.value)">
        ${(isAdminLike(u) || u.isManager) ? `<button class="btn btn-sm" onclick="openExportModal()">📤 Eksport / Kopiowanie</button>` : ''}
      </div>
    </div>
    <p style="color:var(--ink-dim); font-size:13.5px; margin-top:-8px; margin-bottom:16px;">${humanDate(S.currentDate)}</p>
    ${!editable ? `<div class="okbox">Widok tylko do odczytu — Twoja ranga (${roleLabel(u.role)}) nie pozwala na edycję godzin.</div>` : ''}
    ${activeEmployees.length===0 ? `<div class="empty">Brak pracowników na liście. ${isAdminLike(u)||u.isManager ? 'Dodaj pracownika w sekcji „Lista pracowników” w Panelu głównym.' : ''}</div>` : rows}
  `;
}

function ymOfCurrent(){ return ymOf(S.currentDate); }

function changeHoursDate(v){ S.currentDate=v; hoursDayData=null; render(); }

async function updateHourField(empId, field, value){
  hoursDayData = hoursDayData || {};
  hoursDayData[empId] = hoursDayData[empId] || {};
  hoursDayData[empId][field] = value;
  await updateDayRecord(S.currentDate, hoursDayData);
  const emp = S.employees.find(e=>e.id===empId);
  const fieldLabel = {arrival:'przyjście', departure:'wyjście', note:'notatka', absenceCode:'status dnia'}[field] || field;
  const displayValue = field==='absenceCode' ? (value ? absenceLabel(value) : 'obecność') : value;
  await logEvent('Wpis godzin pracy', `${emp?emp.name:empId} (${S.currentDate}): ${fieldLabel} = "${displayValue}"`);
  render();
}

async function useStandardDeparture(empId){
  const emp = S.employees.find(e=>e.id===empId);
  if(!emp || !emp.standardDeparture) return;
  await updateHourField(empId, 'departure', emp.standardDeparture);
}


function renderEmployeesView(){
  const u = S.session;
  if(!(isAdminLike(u) || u.isManager)){
    return `<div class="backlink" onclick="goView('dashboard')">← Panel główny</div><div class="empty">Lista pracowników jest dostępna tylko dla managera i administratorów.</div>`;
  }
  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <h1 style="font-size:22px; margin-bottom:16px;">👥 Lista pracowników</h1>
    ${renderEmployeeManager()}
  `;
}

function renderEmployeeManager(){
  const rows = S.employees.map(emp=>`
    <div class="ticket" style="align-items:stretch;">
      <div class="ticket-name" style="flex:1;">
        <div class="nm">${escapeHtml(emp.name)}</div>
        <div class="tag">${emp.active===false ? 'nieaktywny' : 'aktywny'}</div>
      </div>
      <div class="ticket-field">
        <label>GODZ. PRACY DZIENNIE</label>
        <input type="text" inputmode="numeric" value="${emp.dailyHours||8}" onchange="updEmp('${emp.id}','dailyHours',this.value)">
      </div>
      <div class="ticket-field">
        <label>DOMYŚLNE WYJŚCIE</label>
        <input type="time" value="${emp.standardDeparture||''}" onchange="updEmp('${emp.id}','standardDeparture',this.value)">
      </div>
      <div class="ticket-field">
        <label>WYMAGANE GODZ./MIES.</label>
        <input type="text" inputmode="numeric" value="${emp.requiredMonthlyHours||160}" onchange="updEmp('${emp.id}','requiredMonthlyHours',this.value)">
      </div>
      <div class="ticket-field" style="flex:0.9; justify-content:center; gap:6px; flex-direction:row;">
        <button class="btn btn-sm ${emp.active===false?'btn-teal':'btn-danger'}" onclick="toggleEmpActive('${emp.id}')">${emp.active===false?'Przywróć':'Dezaktywuj'}</button>
        ${emp.active===false ? `<button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Usuń trwale</button>` : ''}
      </div>
    </div>`).join('');
  return `
    <div class="panel" style="margin-top:22px;">
      <div class="panel-head"><h2>Lista pracowników</h2></div>
      ${rows || '<div class="empty">Brak pracowników.</div>'}
      <form onsubmit="return addEmployee(event)" style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <input id="new-emp-name" placeholder="Imię i nazwisko nowego pracownika" required style="flex:1; min-width:200px; padding:10px 12px; border-radius:8px; border:1px solid var(--line-strong); background:var(--panel-2); color:var(--ink);">
        <button class="btn btn-primary" type="submit">+ Dodaj pracownika</button>
      </form>
    </div>`;
}

async function addEmployee(e){
  e.preventDefault();
  const name = document.getElementById('new-emp-name').value.trim();
  if(!name) return false;
  S.employees.push({id:uid(), name, active:true, standardDeparture:'', requiredMonthlyHours:160, dailyHours:8});
  await saveEmployees();
  await logEvent('Dodanie pracownika', name);
  render();
  return false;
}

async function updEmp(id, field, value){
  const emp = S.employees.find(e=>e.id===id);
  if(!emp) return;
  if(field==='requiredMonthlyHours') emp[field] = parseFloat(value)||160;
  else if(field==='dailyHours') emp[field] = parseFloat(value)||8;
  else emp[field] = value;
  await saveEmployees();
  const fieldLabel = {standardDeparture:'domyślne wyjście', requiredMonthlyHours:'wymagane godziny/mies.', dailyHours:'godziny pracy dziennie'}[field] || field;
  await logEvent('Edycja danych pracownika', `${emp.name}: ${fieldLabel} = ${emp[field]}`);
  render();
}

async function toggleEmpActive(id){
  const emp = S.employees.find(e=>e.id===id);
  if(!emp) return;
  emp.active = emp.active===false ? true : false;
  await saveEmployees();
  await logEvent('Zmiana statusu pracownika', `${emp.name} → ${emp.active===false?'nieaktywny':'aktywny'}`);
  render();
}

async function deleteEmployee(id){
  const emp = S.employees.find(e=>e.id===id);
  if(!emp || emp.active!==false) return; // trwałe usunięcie tylko po wcześniejszej dezaktywacji
  if(!confirm('Trwale usunąć pracownika '+emp.name+' z listy? Wcześniej zapisane godziny i wyjścia pozostaną w plikach danego miesiąca, ale przestaną być widoczne na liście.')) return;
  S.employees = S.employees.filter(e=>e.id!==id);
  await saveEmployees();
  await logEvent('Trwałe usunięcie pracownika', `${emp.name}`);
  render();
}


/* ============================================================
   WYJŚCIA SŁUŻBOWE
   ============================================================ */

function renderTripsView(){
  if(hoursDayData === null && !hoursLoading){
    hoursLoading = true;
    renderHoursViewAsync().then(()=>{hoursLoading=false;});
    return `<div class="empty">Wczytywanie danych dnia…</div>`;
  }
  const u = S.session;
  const editable = canEnterHours(u);
  const day = hoursDayData || {};
  const activeEmployees = S.employees.filter(e=>e.active !== false);
  const employeesWithTrips = activeEmployees.filter(e=>((day[e.id]||{}).trips||[]).length > 0);

  const rows = employeesWithTrips.map(emp=>{
    const rec = day[emp.id] || {};
    const trips = rec.trips || [];
    const tripsHtml = trips.map((t,i)=>{
      const type = t.type || 'prywatne';
      const typeLabel = type==='sluzbowe' ? 'Służbowe' : 'Prywatne';
      const typeColor = type==='sluzbowe' ? 'var(--teal)' : 'var(--amber)';
      return `
      <div class="trip-item">
        <span class="pill" style="border-color:${typeColor}; color:${typeColor};">${typeLabel}</span>
        ${editable ? `
          <input type="time" value="${t.start||''}" onchange="updTrip('${emp.id}',${i},'start',this.value)">
          <span class="mono" style="color:var(--ink-dim);">→</span>
          <input type="time" value="${t.end||''}" onchange="updTrip('${emp.id}',${i},'end',this.value)">
          ${type==='sluzbowe' ? `<input type="text" placeholder="km" style="width:64px;" value="${escapeHtml(t.km||'')}" onchange="updTrip('${emp.id}',${i},'km',this.value)">` : ''}
          ${t.note ? `<span class="small-note" style="flex:1;">💬 ${escapeHtml(t.note)}</span><button type="button" class="btn btn-sm" onclick="editTripComment('${emp.id}',${i})">✎</button>` :
            `<button type="button" class="btn btn-sm" onclick="editTripComment('${emp.id}',${i})">+ komentarz</button>`}
          <button class="btn btn-sm btn-danger" onclick="removeTrip('${emp.id}',${i})">✕</button>
        ` : `
          <span class="mono">${t.start||'—'} → ${t.end||'—'}</span>
          ${type==='sluzbowe' && t.km ? `<span class="mono" style="color:var(--ink-dim);">${escapeHtml(t.km)} km</span>` : ''}
          ${t.note ? `<span style="color:var(--ink-dim); font-size:12.5px;">💬 ${escapeHtml(t.note)}</span>` : ''}
        `}
      </div>`;
    }).join('');
    return `
    <div class="panel" style="padding:16px 18px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="nm" style="font-weight:600;">${escapeHtml(emp.name)}</div>
        ${editable ? `<button class="btn btn-sm" onclick="openAddTripModal('${emp.id}')">+ Dodaj wyjście</button>` : ''}
      </div>
      ${tripsHtml}
    </div>`;
  }).join('');

  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel-head">
      <h2>🚗 Wyjścia służbowe</h2>
      <div class="row-actions">
        <input type="date" value="${S.currentDate}" class="mono" style="padding:8px 10px; border-radius:8px; border:1px solid var(--line-strong); background:var(--panel-2); color:var(--ink);" onchange="changeHoursDate(this.value)">
        ${editable && activeEmployees.length>0 ? `<button class="btn btn-sm btn-primary" onclick="openAddTripPickEmployee()">+ Dodaj wyjście</button>` : ''}
      </div>
    </div>
    <p style="color:var(--ink-dim); font-size:13.5px; margin-top:-8px; margin-bottom:16px;">${humanDate(S.currentDate)} — synchronizowane z godzinami pracy tego dnia</p>
    ${!editable ? `<div class="okbox">Widok tylko do odczytu.</div>` : ''}
    ${activeEmployees.length===0 ? '<div class="empty">Brak pracowników na liście.</div>' :
      employeesWithTrips.length===0 ? '<div class="empty">Brak zarejestrowanych wyjść służbowych tego dnia.</div>' : rows}
  `;
}

/* ---------------- wybór pracownika przy dodawaniu wyjścia z góry widoku ---------------- */

function openAddTripPickEmployee(){
  const activeEmployees = S.employees.filter(e=>e.active!==false);
  showModal(`
    <h2>Dla kogo dodać wyjście?</h2>
    ${activeEmployees.map(e=>`
      <div class="ticket" style="cursor:pointer;" onclick="openAddTripModal('${e.id}')">
        <div class="ticket-name"><div class="nm">${escapeHtml(e.name)}</div></div>
      </div>`).join('')}
  `);
}

/* ---------------- dodawanie nowego wyjścia (kreator: kategoria → opcjonalny komentarz) ---------------- */

let newTripDraft = { type:'prywatne', start:'', end:'', km:'', hasComment:false, note:'' };

function openAddTripModal(empId){
  newTripDraft = { type:'prywatne', start:'', end:'', km:'', hasComment:false, note:'' };
  showModal(renderAddTripModalBody(empId));
}

function renderAddTripModalBody(empId){
  const emp = S.employees.find(e=>e.id===empId);
  const d = newTripDraft;
  return `
    <h2>+ Nowe wyjście</h2>
    <p class="hint" style="margin-bottom:14px;">${escapeHtml(emp ? emp.name : '')} · ${humanDate(S.currentDate)}</p>
    <div class="field">
      <label>Kategoria</label>
      <div class="row-actions">
        <button type="button" class="btn ${d.type==='prywatne' ? 'btn-primary' : ''}" onclick="setTripDraftType('${empId}','prywatne')">Prywatne</button>
        <button type="button" class="btn ${d.type==='sluzbowe' ? 'btn-teal' : ''}" onclick="setTripDraftType('${empId}','sluzbowe')">Służbowe</button>
      </div>
    </div>
    <div class="grid2">
      <div class="field"><label>Godzina wyjścia</label><input type="time" value="${d.start}" onchange="setTripDraftField('${empId}','start',this.value)"></div>
      <div class="field"><label>Godzina powrotu</label><input type="time" value="${d.end}" onchange="setTripDraftField('${empId}','end',this.value)"></div>
    </div>
    ${d.type==='sluzbowe' ? `<div class="field"><label>Kilometry (opcjonalnie)</label><input type="text" value="${escapeHtml(d.km)}" onchange="setTripDraftField('${empId}','km',this.value)"></div>` : ''}
    <label style="display:flex; align-items:center; gap:8px; margin:12px 0 6px;">
      <input type="checkbox" ${d.hasComment ? 'checked' : ''} onchange="toggleTripDraftComment('${empId}', this.checked)">
      Dodaj komentarz
    </label>
    ${d.hasComment ? `<div class="field"><input type="text" placeholder="np. Starostwo, wizyta u lekarza…" value="${escapeHtml(d.note)}" onchange="setTripDraftField('${empId}','note',this.value)"></div>` : ''}
    <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="submitNewTrip('${empId}')">Dodaj wyjście</button>
  `;
}
function setTripDraftType(empId, type){ newTripDraft.type = type; refreshAddTripModal(empId); }
function setTripDraftField(empId, field, value){ newTripDraft[field] = value; }
function toggleTripDraftComment(empId, val){ newTripDraft.hasComment = val; if(!val) newTripDraft.note=''; refreshAddTripModal(empId); }
function refreshAddTripModal(empId){
  const modal = document.querySelector('#modalBg .modal');
  if(modal) modal.innerHTML = `<button class="modal-close" onclick="closeModal()">✕</button>${renderAddTripModalBody(empId)}`;
}

async function submitNewTrip(empId){
  hoursDayData = hoursDayData || {};
  hoursDayData[empId] = hoursDayData[empId] || {};
  hoursDayData[empId].trips = hoursDayData[empId].trips || [];
  const d = newTripDraft;
  hoursDayData[empId].trips.push({
    type: d.type, start: d.start, end: d.end, km: d.km,
    note: d.hasComment ? d.note : ''
  });
  await updateDayRecord(S.currentDate, hoursDayData);
  const emp = S.employees.find(e=>e.id===empId);
  const typeLabel = d.type==='sluzbowe' ? 'służbowe' : 'prywatne';
  await logEvent('Dodanie wyjścia służbowego', `${emp?emp.name:empId} (${S.currentDate}): ${typeLabel}${d.hasComment && d.note ? ' — '+d.note : ''}`);
  closeModal();
  render();
}

/* ---------------- edycja komentarza istniejącego wyjścia ---------------- */

function editTripComment(empId, idx){
  const t = hoursDayData[empId].trips[idx];
  showModal(`
    <h2>Komentarz do wyjścia</h2>
    <div class="field"><input type="text" id="tc-input" value="${escapeHtml(t.note||'')}" placeholder="np. Starostwo, wizyta u lekarza…"></div>
    <div class="row-actions">
      <button class="btn btn-primary" onclick="saveTripComment('${empId}',${idx})">Zapisz</button>
      ${t.note ? `<button class="btn btn-danger" onclick="saveTripComment('${empId}',${idx},true)">Usuń komentarz</button>` : ''}
    </div>
  `);
}
async function saveTripComment(empId, idx, clear){
  const val = clear ? '' : document.getElementById('tc-input').value.trim();
  await updTrip(empId, idx, 'note', val);
  closeModal();
}

async function updTrip(empId, idx, field, value){
  hoursDayData[empId].trips[idx][field] = value;
  await updateDayRecord(S.currentDate, hoursDayData);
  const emp = S.employees.find(e=>e.id===empId);
  await logEvent('Edycja wyjścia służbowego', `${emp?emp.name:empId} (${S.currentDate}): ${field} = "${value}"`);
  render();
}

async function removeTrip(empId, idx){
  hoursDayData[empId].trips.splice(idx,1);
  await updateDayRecord(S.currentDate, hoursDayData);
  const emp = S.employees.find(e=>e.id===empId);
  await logEvent('Usunięcie wyjścia służbowego', `${emp?emp.name:empId} (${S.currentDate})`);
  render();
}


/* ============================================================
   PROFIL
   ============================================================ */

function renderProfileView(){
  const u = S.session;
  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel" style="max-width:480px;">
      <h2 style="margin-bottom:4px;">Twój profil</h2>
      <p style="color:var(--ink-dim); font-size:13px; margin-bottom:18px;">Ranga: ${roleBadge(u.role)}${u.isManager ? ' '+managerBadge() : ''}</p>
      <form onsubmit="return saveProfile(event)">
        <div class="field"><label>Imię wyświetlane</label><input id="pf-name" value="${escapeHtml(u.displayName)}" required></div>
        <div class="field"><label>Login</label><input id="pf-login" value="${escapeHtml(u.login)}" required></div>
        <div class="field"><label>Nowe hasło (zostaw puste, aby nie zmieniać)</label><input id="pf-pass" type="password" minlength="4"></div>
        <button class="btn btn-primary" type="submit">Zapisz zmiany</button>
      </form>
    </div>
    ${u.isManager ? `
    <div class="panel" style="max-width:480px;">
      <h2 style="margin-bottom:10px;">Przekazanie rangi managera</h2>
      <p style="color:var(--ink-dim); font-size:13px; margin-bottom:14px;">Jeśli wybierasz się na urlop, przekaż uprawnienia managera innej osobie z listy kont. Zachowasz swoją obecną rangę.</p>
      <button class="btn btn-teal" onclick="openTransferModal()">⇄ Przekaż rangę managera</button>
    </div>` : ''}
  `;
}

async function saveProfile(e){
  e.preventDefault();
  const u = S.session;
  const name = document.getElementById('pf-name').value.trim();
  const login = document.getElementById('pf-login').value.trim();
  const pass = document.getElementById('pf-pass').value;
  if(S.users.some(x=>x.id!==u.id && x.login.toLowerCase()===login.toLowerCase())){
    toast('Ten login jest już zajęty.'); return false;
  }
  u.displayName = name; u.login = login;
  if(pass){ const {salt,passHash} = await makePasswordRecord(pass); u.salt=salt; u.passHash=passHash; }
  await saveUsers();
  await logEvent('Edycja własnego profilu', `${name} (@${login})${pass ? ', zmieniono hasło' : ''}`);
  toast('Zapisano zmiany profilu.');
  render();
  return false;
}

/* ---------------- transfer managera ---------------- */

/* ============================================================
   PODSUMOWANIE MIESIĘCZNE
   ============================================================ */

function openSummary(ym){ S.summaryYm = ym; goView('summary'); }

let summaryCache = {};
let availableMonthsCache = null;

async function loadAvailableMonths(){
  const candidates = lastMonths(12);
  const checks = await Promise.all(candidates.map(async m=>{
    const data = await getMonthData(m);
    return {m, has: Object.keys(data).length>0};
  }));
  const withData = new Set(checks.filter(c=>c.has).map(c=>c.m));
  withData.add(monthStr(new Date())); // bieżący miesiąc zawsze dostępny do wyboru
  availableMonthsCache = candidates.filter(m=>withData.has(m));
}

function renderSummaryView(ym){
  if(!summaryCache[ym]){
    getMonthData(ym).then(data=>{ summaryCache[ym]=data; rerenderMain(); });
    return `<div class="backlink" onclick="goView('dashboard')">← Panel główny</div><div class="empty">Wczytywanie podsumowania…</div>`;
  }
  if(!availableMonthsCache){
    loadAvailableMonths().then(()=>rerenderMain());
  }
  const monthOptions = availableMonthsCache || [ym];
  const data = summaryCache[ym];
  const cards = S.employees.map(emp=>{
    let totalMin = 0;
    Object.values(data).forEach(day=>{ totalMin += computeWorkedMinutes(day[emp.id]); });
    const totalH = totalMin/60;
    const req = emp.requiredMonthlyHours || 160;
    const pct = Math.min(100, Math.round((totalH/req)*100));
    return `
    <div class="sumcard">
      <div class="nm">${escapeHtml(emp.name)}</div>
      <div class="bar-outer"><div class="bar-inner" style="width:${pct}%;"></div></div>
      <div class="figs"><span>${totalH.toFixed(1)} godz.</span><span>cel: ${req} godz.</span></div>
      ${totalH < req ? `<div class="small-note" style="color:var(--red);">brakuje ${(req-totalH).toFixed(1)} godz.</div>` : `<div class="small-note" style="color:var(--teal);">cel osiągnięty (+${(totalH-req).toFixed(1)} godz.)</div>`}
    </div>`;
  }).join('');
  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel-head">
      <h2>📊 Podsumowanie — ${humanMonth(ym)}</h2>
      <div class="row-actions">
        <select onchange="changeSummaryMonth(this.value)" style="padding:8px; border-radius:8px; border:1px solid var(--line-strong); background:var(--panel-2); color:var(--ink);">
          ${monthOptions.map(m=>`<option value="${m}" ${m===ym?'selected':''}>${humanMonth(m)}</option>`).join('')}
        </select>
        <button class="btn btn-sm" onclick="exportMonthExcel('${ym}')">⬇ Eksport do Excela</button>
      </div>
    </div>
    <div class="summary-grid">${cards || '<div class="empty">Brak pracowników.</div>'}</div>
  `;
}

function lastMonths(n){
  const arr=[]; let d=new Date();
  for(let i=0;i<n;i++){ arr.push(monthStr(d)); d.setMonth(d.getMonth()-1); }
  return arr;
}

function changeSummaryMonth(ym){ S.summaryYm=ym; render(); }

/* ---------------- auto popupy ---------------- */

function maybeAutoPopups(){
  const u = S.session;
  if(!canEnterHours(u)) return;
  if(!S.autoPopupShown){
    S.autoPopupShown = true;
    checkMissingArrivals();
  } else if(!S.summaryPopupShown){
    S.summaryPopupShown = true;
    const d = new Date();
    if(d.getDate() <= 5){
      const ym = prevMonth(monthStr(d));
      if(u.lastSummarySeenMonth !== ym){
        openMonthlyReminder(ym);
      }
    }
  }
}

async function checkMissingArrivals(){
  const today = todayStr();
  const day = await getDayRecord(today);
  const missing = S.employees.filter(e=>e.active!==false && !(day[e.id] && day[e.id].arrival));
  if(missing.length===0) return;
  showModal(`
    <h2>Uzupełnij dzisiejsze przyjścia</h2>
    <p style="color:var(--ink-dim); font-size:13px; margin-bottom:14px;">${humanDate(today)} — poniżsi pracownicy nie mają jeszcze zapisanej godziny przyjścia.</p>
    ${missing.map(e=>`
      <div class="ticket">
        <div class="ticket-name"><div class="nm">${escapeHtml(e.name)}</div></div>
        <div class="ticket-field"><label>PRZYJŚCIE</label><input type="time" id="qa-${e.id}"></div>
        <div class="ticket-badge"><button class="btn btn-sm btn-primary" onclick="quickSetArrival('${e.id}')">Zapisz</button></div>
      </div>`).join('')}
    <button class="btn btn-block" style="margin-top:12px;" onclick="closeModal()">Zamknij, uzupełnię później</button>
  `);
}

async function quickSetArrival(empId){
  const val = document.getElementById('qa-'+empId).value;
  if(!val) return;
  const today = todayStr();
  const day = await getDayRecord(today);
  day[empId] = day[empId] || {};
  day[empId].arrival = val;
  await updateDayRecord(today, day);
  // zsynchronizuj z widokiem "Godziny pracy", jeśli jest akurat otwarty na dziś
  if(S.currentDate === today){
    hoursDayData = day;
    render();
  }
  toast('Zapisano przyjście.');
  closeModal();
  checkMissingArrivals();
}

function openMonthlyReminder(ym){
  showModal(`
    <h2>Podsumowanie miesiąca: ${humanMonth(ym)}</h2>
    <p style="color:var(--ink-dim); font-size:13px; margin-bottom:14px;">Zaczyna się nowy miesiąc — oto podsumowanie godzin za poprzedni okres.</p>
    <button class="btn btn-primary btn-block" onclick="dismissMonthlyReminder('${ym}'); openSummary('${ym}')">Zobacz podsumowanie</button>
    <button class="btn btn-block" style="margin-top:8px;" onclick="dismissMonthlyReminder('${ym}')">Później</button>
  `);
}
async function dismissMonthlyReminder(ym){
  closeModal();
  if(S.session){
    S.session.lastSummarySeenMonth = ym;
    await saveUsers();
  }
}


/* ============================================================
   EKSPORT / KOPIOWANIE DANYCH
   Kolumny odpowiadają układowi istniejącej tabeli Excela zespołu:
   Dzień | Data | Godziny pracy | Godzina wejścia | Godzina wyjścia |
   wyjście prywatne od | wyjście prywatne do | Suma wyjść prywatnych |
   Ilość godzin z wyjściami pryw
   Kolumny "Suma wyjść prywatnych" i "Ilość godzin..." w ich arkuszu
   wyglądają na wyliczane formułą Excela — dlatego przy KOPIOWANIU
   do schowka są domyślnie pomijane (żeby nie nadpisać formuł).
   Przy pobieraniu osobnego pliku .xlsx są zawsze dołączane jako
   gotowe wartości (do wglądu / weryfikacji).
   ============================================================ */

let exportState = { from: null, to: null, selected: {}, includeCalc: false };

function openExportModal(){
  const activeEmployees = S.employees.filter(e=>e.active!==false);
  if(!exportState.from) exportState.from = S.currentDate;
  if(!exportState.to) exportState.to = S.currentDate;
  if(Object.keys(exportState.selected).length===0){
    activeEmployees.forEach(e=>{ exportState.selected[e.id]=true; });
  }
  showModal(renderExportModalBody());
}

function renderExportModalBody(){
  const activeEmployees = S.employees.filter(e=>e.active!==false);
  const empRows = activeEmployees.map(e=>`
    <label style="display:flex; align-items:center; gap:8px; padding:6px 0; font-size:13.5px;">
      <input type="checkbox" ${exportState.selected[e.id]?'checked':''} onchange="toggleExportEmp('${e.id}', this.checked)">
      ${escapeHtml(e.name)}
    </label>`).join('');
  return `
    <h2>📤 Eksport / kopiowanie danych</h2>
    <p class="hint" style="margin-bottom:14px;">Wybierz zakres dat i pracowników. Układ kolumn odpowiada Waszej tabeli Excela.</p>
    <div class="row-actions" style="margin-bottom:12px;">
      <button class="btn btn-sm" onclick="setExportPreset('day')">Dziś</button>
      <button class="btn btn-sm" onclick="setExportPreset('week')">Ten tydzień</button>
      <button class="btn btn-sm" onclick="setExportPreset('month')">Ten miesiąc</button>
      <button class="btn btn-sm" onclick="setExportPreset('prevmonth')">Poprzedni miesiąc</button>
    </div>
    <div class="grid2" style="margin-bottom:14px;">
      <div class="field"><label>Od</label><input type="date" value="${exportState.from}" onchange="setExportRange(this.value, null)"></div>
      <div class="field"><label>Do</label><input type="date" value="${exportState.to}" onchange="setExportRange(null, this.value)"></div>
    </div>
    <div style="margin-bottom:8px; font-size:11px; color:var(--ink-dim); font-family:'IBM Plex Mono',monospace;">PRACOWNICY</div>
    <div style="max-height:160px; overflow-y:auto; border:1px solid var(--line); border-radius:8px; padding:4px 14px; margin-bottom:14px;">
      ${empRows || '<div class="empty">Brak pracowników.</div>'}
    </div>
    <label style="display:flex; align-items:flex-start; gap:8px; margin-bottom:16px; font-size:12.5px; color:var(--ink-dim);">
      <input type="checkbox" style="margin-top:2px;" ${exportState.includeCalc?'checked':''} onchange="setExportIncludeCalc(this.checked)">
      <span>Dołącz do kopiowania też wyliczone kolumny (Suma wyjść prywatnych, Ilość godzin) — zaznacz tylko jeśli te komórki w Waszym arkuszu NIE są formułami Excela.</span>
    </label>
    <div class="row-actions">
      <button class="btn btn-primary" onclick="doExportCopy()">📋 Kopiuj do schowka (1. zaznaczony)</button>
      <button class="btn btn-teal" onclick="doExportExcel()">⬇ Pobierz Excel (zaznaczeni)</button>
    </div>
  `;
}
function refreshExportModal(){
  const modal = document.querySelector('#modalBg .modal');
  if(modal) modal.innerHTML = `<button class="modal-close" onclick="closeModal()">✕</button>${renderExportModalBody()}`;
}
function toggleExportEmp(id, val){ exportState.selected[id]=val; refreshExportModal(); }
function setExportIncludeCalc(val){ exportState.includeCalc=val; refreshExportModal(); }
function setExportRange(from, to){
  if(from) exportState.from = from;
  if(to) exportState.to = to;
  refreshExportModal();
}
function setExportPreset(kind){
  const today = todayStr();
  if(kind==='day'){ exportState.from=today; exportState.to=today; }
  else if(kind==='week'){ const s=startOfWeekStr(today); exportState.from=s; exportState.to=addDaysStr(s,6); }
  else if(kind==='month'){ exportState.from=startOfMonthStr(today); exportState.to=endOfMonthStr(today); }
  else if(kind==='prevmonth'){ const pm=prevMonth(monthStr(new Date())); const f=pm+'-01'; exportState.from=f; exportState.to=endOfMonthStr(f); }
  refreshExportModal();
}

/* Buduje wiersze danych dla jednego pracownika w zakresie dat,
   w kolejności kolumn zgodnej z tabelą Excela zespołu. */
async function buildExportRows(empId, fromDate, toDate){
  const emp = S.employees.find(e=>e.id===empId);
  const range = await getRangeRecords(fromDate, toDate);
  const rows = [];
  let d = fromDate, guard=0;
  while(d <= toDate && guard < 400){
    const rec = range[d] || {};
    const rEmp = rec[empId] || {};
    const hasAbsence = !!rEmp.absenceCode;
    const privTrip = (rEmp.trips||[]).find(t=>t.type!=='sluzbowe' && (t.start||t.end));
    const dzien = weekdayNamePL(d);
    const godzPracy = hasAbsence ? rEmp.absenceCode : standardDailyHours(emp, d);
    const wejscie = hasAbsence ? rEmp.absenceCode : (rEmp.arrival||'');
    const wyjscie = hasAbsence ? rEmp.absenceCode : (rEmp.departure||'');
    const privOd = (!hasAbsence && privTrip) ? (privTrip.start||'') : '';
    const privDo = (!hasAbsence && privTrip) ? (privTrip.end||'') : '';
    let sumaPryw = '', iloscGodzin = '';
    if(!hasAbsence){
      const privMin = (rEmp.trips||[]).filter(t=>t.type!=='sluzbowe' && t.start && t.end)
        .reduce((s,t)=>s+Math.max(0, timeToMin(t.end)-timeToMin(t.start)), 0);
      if(privMin) sumaPryw = formatHoursHM(privMin/60);
      if(rEmp.arrival && rEmp.departure) iloscGodzin = formatHoursHM(computeWorkedMinutes(rEmp)/60);
    }
    rows.push([dzien, d, godzPracy, wejscie, wyjscie, privOd, privDo, sumaPryw, iloscGodzin]);
    d = addDaysStr(d, 1); guard++;
  }
  return rows;
}

async function doExportCopy(){
  const ids = Object.keys(exportState.selected).filter(id=>exportState.selected[id]);
  if(ids.length===0){ toast('Zaznacz co najmniej jednego pracownika.'); return; }
  const empId = ids[0];
  const emp = S.employees.find(e=>e.id===empId);
  const rows = await buildExportRows(empId, exportState.from, exportState.to);
  const cols = exportState.includeCalc ? rows : rows.map(r=>r.slice(0,7));
  const tsv = cols.map(r=>r.join('\t')).join('\n');
  try{
    await navigator.clipboard.writeText(tsv);
    toast('Skopiowano dane („'+emp.name+'”) do schowka — wklej w arkuszu Excela.');
  }catch(err){
    toast('Nie udało się skopiować automatycznie (uprawnienia przeglądarki). Spróbuj ponownie.');
  }
  await logEvent('Kopiowanie danych do schowka', `${emp.name}: ${exportState.from} → ${exportState.to}`);
}

async function doExportExcel(){
  const ids = Object.keys(exportState.selected).filter(id=>exportState.selected[id]);
  if(ids.length===0){ toast('Zaznacz co najmniej jednego pracownika.'); return; }
  const header = ['Dzień','Data','Godziny pracy','Godzina wejścia','Godzina wyjścia','wyjście prywatne od','wyjście prywatne do','Suma wyjść prywatnych','Ilość godzin z wyjściami pryw'];
  const wb = XLSX.utils.book_new();
  for(const empId of ids){
    const emp = S.employees.find(e=>e.id===empId);
    const rows = await buildExportRows(empId, exportState.from, exportState.to);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    let sheetName = (emp.name||'pracownik').substring(0,31).replace(/[\\/?*\[\]:]/g,' ');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  XLSX.writeFile(wb, `eksport_${exportState.from}_${exportState.to}.xlsx`);
  await logEvent('Eksport do Excela', `${ids.length} pracowników, ${exportState.from} → ${exportState.to}`);
  closeModal();
}


/* ============================================================
   EKSPORT DO EXCELA — CAŁY MIESIĄC (skrót używany w Podsumowaniu)
   ============================================================ */

async function exportMonthExcel(ym){
  const data = await getMonthData(ym);
  const dates = Object.keys(data).sort();
  const rows = [];
  S.employees.forEach(e=>{
    let total=0;
    dates.forEach(d=>{
      const r = data[d][e.id];
      if(r && (r.arrival||r.departure)){
        const worked = computeWorkedMinutes(r)/60;
        total += worked;
        rows.push({
          'Data': d, 'Pracownik': e.name, 'Przyjście': r.arrival||'', 'Wyjście': r.departure||'',
          'Wyjścia służbowe': (r.trips||[]).map(t=>`${t.start||'?'}-${t.end||'?'}${t.note?' ('+t.note+')':''}`).join('; '),
          'Notatka': r.note||'', 'Godziny': worked?worked.toFixed(2):''
        });
      }
    });
    rows.push({'Data':'RAZEM', 'Pracownik':e.name, 'Przyjście':'', 'Wyjście':'', 'Wyjścia służbowe':'', 'Notatka':'wymagane: '+(e.requiredMonthlyHours||160)+' godz.', 'Godziny': total.toFixed(2)});
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ym);
  XLSX.writeFile(wb, `miesiac_${ym}.xlsx`);
  await logEvent('Eksport do Excela', `miesiąc ${ym}`);
}


/* ============================================================
   MODAL
   ============================================================ */

function showModal(innerHtml){
  let bg = document.getElementById('modalBg');
  if(!bg){
    bg = document.createElement('div');
    bg.id='modalBg'; bg.className='modal-bg';
    bg.onclick = (e)=>{ if(e.target===bg) closeModal(); };
    document.body.appendChild(bg);
  }
  bg.innerHTML = `<div class="modal"><button class="modal-close" onclick="closeModal()">✕</button>${innerHtml}</div>`;
  bg.style.display='flex';
}

function closeModal(){
  const bg = document.getElementById('modalBg');
  if(bg) bg.remove();
}

/* ---------------- partial rerender helper ---------------- */

function rerenderMain(){
  const el = document.getElementById('mainArea');
  if(el){ el.innerHTML = renderView(); }
}

function wireViewEvents(){ /* zdarzenia obsłużone przez atrybuty onclick/onchange w HTML */ }


/* ============================================================
   INIT
   ============================================================ */

(async function init(){
  render();
  await loadGodzinyData();
  await loadUzytkownicyData();
  await loadDziennikData();
  S.ready = true;
  render();
})();
