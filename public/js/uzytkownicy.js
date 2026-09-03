async function hashPassword(password, salt){
  const enc = new TextEncoder();
  const data = enc.encode(salt + ':' + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
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
  return false;
}

async function doRegisterWithCode(e){
  e.preventDefault();
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
  return false;
}

async function logout(){
  S.session=null; loginMode='login'; loginError=''; render();
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
      <td>${escapeHtml(u.displayName)}</td>
      <td class="mono">@${escapeHtml(u.login)}</td>
      <td>${roleBadge(u.role)}${u.isManager ? ' '+managerBadge() : ''}</td>
      <td>
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
    <div class="ticket" style="padding:0;">
      <div class="ticket-name"><span class="codebox">${c.code}</span></div>
      <div class="ticket-field"><label>RANGA</label><div class="readonly-val" style="font-size:13px;">${roleLabel(c.role)}</div></div>
      <div class="ticket-badge"><button class="btn btn-sm btn-danger" onclick="revokeCode('${c.code}')">Unieważnij</button></div>
    </div>`).join('');

  return `
    <div class="backlink" onclick="goView('dashboard')">← Panel główny</div>
    <div class="panel">
      <div class="panel-head"><h2>👤 Panel użytkowników strony</h2></div>
      <table class="utable">
        <thead><tr><th>Imię</th><th>Login</th><th>Ranga</th><th>Akcje</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
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

