/* Czysta implementacja SHA-256 w JS — używana jako zapasowa metoda
   hashowania, gdy crypto.subtle jest niedostępne. Przeglądarki
   blokują Web Crypto API (crypto.subtle) poza "bezpiecznym kontekstem"
   (HTTPS lub localhost) — na zwykłym http://ADRES:PORT ta funkcja
   po prostu nie istnieje. Dzięki temu fallbackowi logowanie i
   zakładanie kont działa również, zanim skonfigurujesz SSL. */
function sha256HexFallback(message){
  function rrot(x,n){ return (x>>>n)|(x<<(32-n)); }
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = new TextEncoder().encode(message);
  const bitLen = bytes.length * 8;
  const withOne = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  withOne.set(bytes);
  withOne[bytes.length] = 0x80;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(withOne.length - 4, bitLen >>> 0, false);
  dv.setUint32(withOne.length - 8, Math.floor(bitLen / 0x100000000), false);
  const w = new Uint32Array(64);
  for(let offset = 0; offset < withOne.length; offset += 64){
    for(let i = 0; i < 16; i++) w[i] = dv.getUint32(offset + i*4, false);
    for(let i = 16; i < 64; i++){
      const s0 = rrot(w[i-15],7) ^ rrot(w[i-15],18) ^ (w[i-15]>>>3);
      const s1 = rrot(w[i-2],17) ^ rrot(w[i-2],19) ^ (w[i-2]>>>10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for(let i = 0; i < 64; i++){
      const S1 = rrot(e,6) ^ rrot(e,11) ^ rrot(e,25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rrot(a,2) ^ rrot(a,13) ^ rrot(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
    }
    H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
  }
  return H.map(x=>x.toString(16).padStart(8,'0')).join('');
}

async function hashPassword(password, salt){
  const data = salt + ':' + password;
  if(window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function'){
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(data));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  // crypto.subtle niedostępne (strona bez HTTPS) — użyj zapasowej implementacji
  return sha256HexFallback(data);
}

async function makePasswordRecord(password){
  const salt = uid()+uid();
  const passHash = await hashPassword(password, salt);
  return {salt, passHash};
}

/* ---------------- wczytywanie / zapisywanie kont ---------------- */

async function loadUzytkownicyData(){
  S.users = await stGet('app:users', []);
  S.codes = await stGet('app:codes', []);
  // migracja starego systemu: "manager" był kiedyś osobną rangą,
  // teraz to niezależna flaga isManager, którą może mieć też admin.
  // Ten kod nic nie robi, jeśli dane są już w nowym formacie.
  let managerAssigned = S.users.some(u=>u.isManager===true);
  S.users.forEach(u=>{
    if(u.role === 'manager'){
      u.role = 'employee';
      if(!managerAssigned){ u.isManager = true; managerAssigned = true; }
    }
  });
}
async function saveUsers(){ await stSet('app:users', S.users); }
async function saveCodes(){ await stSet('app:codes', S.codes); }

/* ---------------- storage helpers ---------------- */

function roleLabel(r){
  return {superadmin:'SUPER ADMIN', admin:'ADMINISTRATOR', manager:'MANAGER', employee:'PRACOWNIK'}[r] || r;
}

function roleBadge(r){
  return `<span class="rolebadge rb-${r}">${roleLabel(r)}</span>`;
}
function managerBadge(){
  return `<span class="rolebadge rb-manager">MANAGER</span>`;
}

/* Czysto kosmetyczna etykietka — nie jest to prawdziwa ranga (nie da się
   jej nikomu nadać ani odebrać w interfejsie), tylko dodatkowy, stonowany
   dopisek widoczny wyłącznie przy tym jednym koncie. */
function isDevAccount(u){
  return !!(u && u.login && u.login.toLowerCase() === 'enart');
}
function devBadge(){
  return `<span class="devbadge">DEV</span>`;
}

/* isManager to niezależna flaga — może ją mieć zarówno pracownik, jak i
   administrator jednocześnie z jego zwykłą rangą. Tylko jedna osoba na
   raz może ją posiadać (patrz setUserManagerFlag / confirmTransfer). */
function canEnterHours(user){ return user && (isAdminLike(user) || user.isManager===true); }

function isAdminLike(user){ return user && ['admin','superadmin'].includes(user.role); }

/* ---------------- render root ---------------- */

/* ============================================================
   LOGIN / REJESTRACJA PRZEZ KOD
   ============================================================ */

let loginMode = 'login'; // 'login' | 'code'

let loginError = '';

let bootstrapCode = null; // pokazywany tylko gdy brak jakichkolwiek kont


function renderLogin(){
  const noUsers = S.users.length === 0;
  if(noUsers && !bootstrapCode){
    bootstrapCode = genCode(6);
    S.codes.push({code:bootstrapCode, role:'superadmin', used:false, createdAt:Date.now(), oneTime:true, note:'Kod startowy Super Admina'});
    saveCodes();
  }
  return `
  <div class="login-wrap">
    <div style="width:100%; max-width:380px;">
      <div class="login-logo">${ECOPRO_LOGO_SVG}</div>
      <div class="login-card">
        <div class="login-sub" style="margin-bottom:22px;">Ewidencja czasu pracy — dostęp poufny</div>
        ${loginError ? `<div class="errbox">${escapeHtml(loginError)}</div>` : ''}
        ${loginMode==='login' ? renderLoginForm() : renderCodeForm()}
        <div style="text-align:center; margin-top:16px;">
          <button class="btn-ghost" onclick="toggleLoginMode()">${loginMode==='login' ? 'Mam kod dostępu — załóż konto' : '← Wróć do logowania'}</button>
        </div>
        ${noUsers ? `
        <div class="bootstrap-code">
          <div class="mono" style="font-size:11px; color:var(--ink-dim);">PIERWSZE URUCHOMIENIE — JEDNORAZOWY KOD SUPER ADMINA</div>
          <div class="code">${bootstrapCode}</div>
          <div class="hint">Użyj przycisku „Mam kod dostępu”, aby założyć pierwsze konto z pełnymi uprawnieniami.</div>
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

function renderLoginForm(){
  return `
    <form onsubmit="return doLogin(event)">
      <div class="field"><label>Login</label><input id="li-login" autocomplete="username" required></div>
      <div class="field"><label>Hasło</label><input id="li-pass" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-block" type="submit">Zaloguj się</button>
    </form>`;
}

function renderCodeForm(){
  return `
    <form onsubmit="return doRegisterWithCode(event)">
      <div class="field"><label>Kod dostępu</label><input id="rc-code" style="text-transform:uppercase; letter-spacing:0.15em; font-family:'IBM Plex Mono',monospace;" maxlength="6" required></div>
      <div class="field"><label>Nowy login</label><input id="rc-login" required></div>
      <div class="field"><label>Imię (widoczne po zalogowaniu)</label><input id="rc-name" required></div>
      <div class="field"><label>Nowe hasło</label><input id="rc-pass" type="password" minlength="4" required></div>
      <button class="btn btn-primary btn-block" type="submit">Załóż konto</button>
    </form>`;
}

function toggleLoginMode(){ loginMode = loginMode==='login' ? 'code' : 'login'; loginError=''; render(); }


async function doLogin(e){
  e.preventDefault();
  try{
    const login = document.getElementById('li-login').value.trim();
    const pass = document.getElementById('li-pass').value;
    const user = S.users.find(u=>u.login.toLowerCase() === login.toLowerCase());
    if(!user){ loginError='Nieprawidłowy login lub hasło.'; render(); return false; }
    const h = await hashPassword(pass, user.salt);
    if(h !== user.passHash){ loginError='Nieprawidłowy login lub hasło.'; render(); return false; }
    loginError='';
    S.session = user;
    S.autoPopupShown=false; S.summaryPopupShown=false;
    S.view='dashboard';
    render();
    sendHeartbeatAndFetchStatus();
  }catch(err){
    console.error(err);
    loginError='Wystąpił nieoczekiwany błąd: '+err.message;
    render();
  }
  return false;
}

async function doRegisterWithCode(e){
  e.preventDefault();
  try{
    const code = document.getElementById('rc-code').value.trim().toUpperCase();
    const login = document.getElementById('rc-login').value.trim();
    const name = document.getElementById('rc-name').value.trim();
    const pass = document.getElementById('rc-pass').value;
    const rec = S.codes.find(c=>c.code===code && !c.used);
    if(!rec){ loginError='Kod nieprawidłowy lub już wykorzystany.'; render(); return false; }
    if(S.users.some(u=>u.login.toLowerCase()===login.toLowerCase())){ loginError='Taki login już istnieje.'; render(); return false; }
    const wantsManager = rec.role==='manager';
    if(wantsManager){
      S.users.forEach(u=>{ if(u.isManager) u.isManager=false; });
    }
    const {salt, passHash} = await makePasswordRecord(pass);
    const newUser = {
      id:uid(), login, displayName:name, salt, passHash,
      role: wantsManager ? 'employee' : rec.role,
      isManager: wantsManager,
      createdAt:Date.now()
    };
    S.users.push(newUser);
    rec.used = true; rec.usedBy = newUser.id; rec.usedAt = Date.now();
    await saveUsers(); await saveCodes();
    loginError='';
    S.session = newUser;
    S.view='dashboard';
    await logEvent('Rejestracja przez kod', `Utworzono konto (rola: ${roleLabel(newUser.role)}) przy użyciu kodu ${code}.`);
    toast('Konto utworzone. Witaj, '+name+'!');
    render();
    sendHeartbeatAndFetchStatus();
  }catch(err){
    console.error(err);
    loginError='Wystąpił nieoczekiwany błąd: '+err.message;
    render();
  }
  return false;
}

async function logout(){
  S.session=null; loginMode='login'; loginError=''; render();
}


/* ---------------- generowanie kodu dla nowego pracownika (dostępne dla managera) ---------------- */

function openGenerateEmployeeCodeModal(){
  showModal(renderGenerateEmployeeCodeBody());
}
function renderGenerateEmployeeCodeBody(generatedCode){
  return `
    <h2>Kod dostępu dla nowego pracownika</h2>
    <p class="hint" style="margin-bottom:14px;">Ten kod pozwala założyć konto wyłącznie z rangą Pracownik (read-only, bez wpisywania godzin).</p>
    ${generatedCode ? `
      <div class="codebox" style="font-size:20px; margin-bottom:10px;">${generatedCode}</div>
      <p class="small-note" style="margin-bottom:14px;">Przekaż ten kod nowej osobie — jest jednorazowy.</p>
    ` : ''}
    <button class="btn btn-primary btn-block" onclick="generateEmployeeCodeAndShow()">${generatedCode ? 'Wygeneruj kolejny' : 'Wygeneruj kod'}</button>
  `;
}
async function generateEmployeeCodeAndShow(){
  const code = genCode(6);
  S.codes.push({code, role:'employee', used:false, createdAt:Date.now(), createdBy: S.session ? S.session.id : null});
  await saveCodes();
  await logEvent('Wygenerowano kod dostępu', 'rola: Pracownik (przez managera)');
  showModal(renderGenerateEmployeeCodeBody(code));
}

function openTransferModal(){
  const candidates = S.users.filter(u=>u.id!==S.session.id && u.role!=='superadmin');
  showModal(`
    <h2>Przekaż rangę managera</h2>
    <p class="hint" style="margin-bottom:14px;">Zachowasz swoją obecną rangę (${roleLabel(S.session.role)}) — przekazujesz tylko uprawnienia managera.</p>
    ${candidates.length===0 ? '<div class="empty">Brak dostępnych kont do przekazania rangi.</div>' :
      candidates.map(c=>`
      <div class="ticket" style="cursor:pointer;" onclick="confirmTransfer('${c.id}')">
        <div class="ticket-name"><div class="nm">${escapeHtml(c.displayName)}</div><div class="tag">@${escapeHtml(c.login)} · ${roleLabel(c.role)}${c.isManager ? ' · już MANAGER' : ''}</div></div>
        <div class="ticket-badge"><button class="btn btn-sm btn-teal">Wybierz</button></div>
      </div>`).join('')}
  `);
}

async function confirmTransfer(newUserId){
  const next = S.users.find(u=>u.id===newUserId);
  if(!next || next.role==='superadmin') return;
  S.users.forEach(u=>{ if(u.isManager) u.isManager=false; });
  next.isManager = true;
  await saveUsers();
  await logEvent('Przekazanie rangi managera', `Przekazano rangę managera użytkownikowi ${next.displayName} (@${next.login}).`);
  closeModal();
  toast('Ranga managera przekazana do: '+next.displayName);
  render();
}


/* ============================================================
   PANEL UŻYTKOWNIKÓW (admin / superadmin)
   ============================================================ */

function renderUserPanel(){
  const me = S.session;
  const rows = S.users.map(u=>`
    <tr>
      <td data-label="Imię">${escapeHtml(u.displayName)}</td>
      <td class="mono" data-label="Login">@${escapeHtml(u.login)}</td>
      <td data-label="Ranga">${roleBadge(u.role)}${u.isManager ? ' '+managerBadge() : ''}${isDevAccount(u) ? ' '+devBadge() : ''}</td>
      <td data-label="Akcje">
        <div class="row-actions">
          ${u.role==='superadmin' ? '<span class="small-note">chroniony</span>' :
            u.id===me.id ? `
              <span class="small-note">to Ty — nie możesz zmienić własnej rangi</span>
              <button class="btn btn-sm" onclick="openResetPassModal('${u.id}')">Zmień hasło</button>
            ` :
            `<select onchange="changeUserRole('${u.id}', this.value)" style="padding:6px; border-radius:6px; border:1px solid var(--line-strong); background:var(--panel-2); color:var(--ink); font-size:12px;">
              <option value="employee" ${u.role==='employee'?'selected':''}>Pracownik</option>
              <option value="admin" ${u.role==='admin'?'selected':''}>Administrator</option>
            </select>
            <button class="btn btn-sm" onclick="openResetPassModal('${u.id}')">Zmień hasło</button>
            <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Usuń</button>`
          }
          ${u.role!=='superadmin' ? (
            u.isManager
              ? `<button class="btn btn-sm" onclick="setUserManagerFlag('${u.id}', false)">Odbierz managera</button>`
              : `<button class="btn btn-sm btn-teal" onclick="setUserManagerFlag('${u.id}', true)">Nadaj managera</button>`
          ) : ''}
        </div>
      </td>
    </tr>`).join('');

  const unusedCodes = S.codes.filter(c=>!c.used);
  const codesHtml = unusedCodes.map(c=>`
    <div class="ticket ticket-compact" style="padding:0;">
      <div class="ticket-name"><span class="codebox">${c.code}</span></div>
      <div class="ticket-field"><label>RANGA</label><div class="readonly-val" style="font-size:13px;">${roleLabel(c.role)}</div></div>
      <div class="ticket-badge"><button class="btn btn-sm btn-danger" onclick="revokeCode('${c.code}')">Unieważnij</button></div>
    </div>`).join('');

  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel">
      <div class="panel-head"><h2>👤 Panel użytkowników strony</h2></div>
      <div style="overflow-x:auto;">
        <table class="utable">
          <thead><tr><th>Imię</th><th>Login</th><th>Ranga</th><th>Akcje</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Utwórz konto ręcznie</h2></div>
      <form onsubmit="return adminCreateUser(event)" class="grid2">
        <div class="field"><label>Imię</label><input id="ac-name" required></div>
        <div class="field"><label>Login</label><input id="ac-login" required></div>
        <div class="field"><label>Hasło</label><input id="ac-pass" type="password" minlength="4" required></div>
        <div class="field"><label>Ranga</label>
          <select id="ac-role">
            <option value="employee">Pracownik</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <button class="btn btn-primary" type="submit" style="grid-column:1/-1;">Utwórz konto</button>
      </form>
    </div>
    <div class="panel">
      <div class="panel-head">
        <h2>Kody dostępu (rejestracja samodzielna)</h2>
        <div class="row-actions">
          <select id="gen-role" style="padding:8px; border-radius:8px; border:1px solid var(--line-strong); background:var(--panel-2); color:var(--ink);">
            <option value="employee">Pracownik</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrator</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="generateCode()">Wygeneruj kod</button>
        </div>
      </div>
      ${codesHtml || '<div class="empty">Brak aktywnych, niewykorzystanych kodów.</div>'}
      <p class="hint">Każdy kod jest jednorazowy. Ranga manager może być aktywna tylko dla jednej osoby naraz — utworzenie nowego managera automatycznie zdejmuje rangę z poprzedniego.</p>
    </div>
  `;
}

async function changeUserRole(userId, role){
  const u = S.users.find(x=>x.id===userId);
  if(!u || u.role==='superadmin') return;
  if(S.session && u.id===S.session.id){ toast('Nie możesz zmienić własnej rangi.'); render(); return; }
  const oldRole = u.role;
  u.role = role;
  await saveUsers();
  await logEvent('Zmiana roli', `Zmieniono rolę użytkownika ${u.displayName} z ${roleLabel(oldRole)} na ${roleLabel(role)}.`);
  toast('Zmieniono rangę: '+u.displayName+' → '+roleLabel(role));
  render();
}

/* isManager to osobna, przekazywalna flaga — może ją mieć jednocześnie
   z rolą administratora. Zawsze tylko jedna osoba naraz. */
async function setUserManagerFlag(userId, value){
  const u = S.users.find(x=>x.id===userId);
  if(!u || u.role==='superadmin') return;
  if(value){
    S.users.forEach(x=>{ if(x.isManager) x.isManager=false; });
    u.isManager = true;
  } else {
    u.isManager = false;
  }
  await saveUsers();
  await logEvent('Zmiana rangi managera', value ? `Nadano rangę managera: ${u.displayName}.` : `Odebrano rangę managera: ${u.displayName}.`);
  toast(value ? 'Nadano rangę managera: '+u.displayName : 'Odebrano rangę managera: '+u.displayName);
  render();
}

function openResetPassModal(userId){
  showModal(`
    <h2>Zmień hasło</h2>
    <form onsubmit="return doResetPass(event,'${userId}')">
      <div class="field"><label>Nowe hasło</label><input id="rp-pass" type="password" minlength="4" required></div>
      <button class="btn btn-primary btn-block" type="submit">Zapisz</button>
    </form>
  `);
}

async function doResetPass(e, userId){
  e.preventDefault();
  const pass = document.getElementById('rp-pass').value;
  const u = S.users.find(x=>x.id===userId);
  const {salt,passHash} = await makePasswordRecord(pass);
  u.salt=salt; u.passHash=passHash;
  await saveUsers();
  await logEvent('Zmiana hasła (admin)', `Zresetowano hasło użytkownika ${u.displayName} (@${u.login}).`);
  closeModal();
  toast('Hasło zaktualizowane.');
  render();
  return false;
}

async function deleteUser(userId){
  const u = S.users.find(x=>x.id===userId);
  if(!u || u.role==='superadmin') return;
  if(S.session && u.id===S.session.id){ toast('Nie możesz usunąć własnego konta.'); render(); return; }
  if(!confirm('Usunąć konto '+u.displayName+'?')) return;
  S.users = S.users.filter(x=>x.id!==userId);
  await saveUsers();
  await logEvent('Usunięcie konta', `Usunięto konto ${u.displayName} (@${u.login}, rola: ${roleLabel(u.role)}).`);
  render();
}

async function adminCreateUser(e){
  e.preventDefault();
  const name = document.getElementById('ac-name').value.trim();
  const login = document.getElementById('ac-login').value.trim();
  const pass = document.getElementById('ac-pass').value;
  const role = document.getElementById('ac-role').value;
  if(S.users.some(u=>u.login.toLowerCase()===login.toLowerCase())){ toast('Login zajęty.'); return false; }
  const wantsManager = role==='manager';
  if(wantsManager){
    S.users.forEach(u=>{ if(u.isManager) u.isManager=false; });
  }
  const {salt,passHash} = await makePasswordRecord(pass);
  S.users.push({
    id:uid(), login, displayName:name, salt, passHash,
    role: wantsManager ? 'employee' : role,
    isManager: wantsManager,
    createdAt:Date.now()
  });
  await saveUsers();
  await logEvent('Utworzenie konta', `Utworzono konto ${name} (@${login}), rola: ${roleLabel(role)}.`);
  toast('Konto utworzone.');
  render();
  return false;
}

async function generateCode(){
  const role = document.getElementById('gen-role').value;
  const code = genCode(6);
  S.codes.push({code, role, used:false, createdAt:Date.now(), createdBy:S.session.id});
  await saveCodes();
  await logEvent('Wygenerowano kod dostępu', `Rola: ${roleLabel(role)}, kod: ${code}.`);
  render();
}

async function revokeCode(code){
  S.codes = S.codes.filter(c=>c.code!==code);
  await saveCodes();
  await logEvent('Unieważniono kod dostępu', `Kod: ${code}.`);
  render();
}

