

/* ====== Single-file JS ====== */

/* Elements */
const bspFloatBtn = document.getElementById('bsp_float_btn');
const bspNotif = document.getElementById('bsp_notif_box');
const bspOverlay = document.getElementById('bsp_overlay');
const bspWindow = document.getElementById('bsp_window');
const bspBody = document.getElementById('bsp_body');
const bspHeaderSub = document.getElementById('bsp_header_sub');
const bspMicBtn = document.getElementById('bsp_mic_btn');
const bspSendBtn = document.getElementById('bsp_send_btn');
const bspInput = document.getElementById('bsp_input');
const bspListen = document.getElementById('bsp_listen');
const bspListenDone = document.getElementById('bsp_listen_done');
const bspGlobalMute = document.getElementById('bsp_global_mute');
const bspGlobalMuteIcon = document.getElementById('bsp_global_mute_icon');
const bspMinimize = document.getElementById('bsp_minimize');
const bspRefresh = document.getElementById('bsp_refresh');

let GLOBAL_MUTED = false;
let SESSION_NAME = sessionStorage.getItem('bsp_user_name') || '';
let CHAT_LOCKED_CAT = null;
let voices = [];
let VOICES_LOADED = false;

/* Categories (kept) */
const CATEGORIES = {
  "History": { text: "Bhilai Steel Plant (BSP) was established in 1959 with Soviet collaboration. BSP is known for producing rails and wide steel plates used across India.", img: "" },
  "Products": { text: "BSP products include\n• Rails\n• Wide Plates\n• Merchant Sections (Angles, Channels)\n• TMT Bars\n• Wire Rods", imgList: ["https://sail.co.in/sites/default/files/banner/2020-10/hot_rails_lying_on_cooling_bed__of_rail___strl_mill.JPG","https://images.unsplash.com/photo-1562600323-5b7c68d6efb0?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=0c3a6a3b23c9b8a6c6d6b0c1b2a9f3c8"] },
  "Production": { text: "Typical steel making route used: Blast Furnace → Basic Oxygen Furnace (BOF) → Continuous Casting → Rolling → Finishing. BSP operates integrated plant units to produce both basic & special steels.", img: "" },
  "Branches": { text: "SAIL plants include Bhilai, Bokaro, Rourkela, Durgapur and ISP (Burnpur).", img: "" },
  "Departments": { text: "Some departments: Coke Ovens, Blast Furnace, Sinter Plant, Plate Mill, Wire Rod Mill, Merchant Mill, TMT Mill, RMP & SMS.", img: "" },
  "Contacts": { text: "Official contacts available on BSP/SAIL websites. For immediate help use the Contact form in this app.", img: "" }
};

/* WebAudio for open/close chimes (no external files) */
let audioCtx = null;
function ensureAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playAiChime(open=true){
  if(GLOBAL_MUTED) return;
  ensureAudioCtx();
  const ctx = audioCtx;
  const now = ctx.currentTime;
  // create a short futuristic sequence
  const gain = ctx.createGain(); gain.connect(ctx.destination); gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now+0.01);
  // sequence of decreasing pulses for open, reverse for close
  const freqs = open ? [880, 1320, 1760] : [1760, 1320, 880];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + i*0.05);
    osc.connect(gain);
    osc.start(now + i*0.05);
    osc.stop(now + i*0.05 + 0.18 + i*0.01);
  });
  // fade out
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
}

/* Speech voices load */
function loadVoices(){
  voices = speechSynthesis.getVoices() || [];
  VOICES_LOADED = voices.length>0;
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

/* show notif briefly */
setTimeout(()=>{ try{ bspNotif.style.display='flex'; }catch(e){} }, 800);

/* open bot: play open chime and show overlay */
bspFloatBtn.addEventListener('click', openBot);
function openBot(){
  // play sound
  playAiChime(true);
  if(audioCtx && audioCtx.state === 'suspended' && !GLOBAL_MUTED) audioCtx.resume();
  bspFloatBtn.parentElement.style.display='none';
  bspNotif.style.display='none';
  bspOverlay.style.display='flex';
  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';
  loadChat();
  if(!SESSION_NAME && !sessionStorage.getItem('bsp_chat_started')){
    sessionStorage.setItem('bsp_chat_started','1');
    botSay("Hello — I am BSP Assistant. Please fill this quick form to continue.");
    setTimeout(showFormBubble,600);
  } else if(SESSION_NAME){
    botSay(`Welcome back ${SESSION_NAME}. Select a category or type hello.`);
    setTimeout(showMainMenu,700);
  } else {
    botSay("Welcome — Please fill the form to continue.");
    setTimeout(showFormBubble,600);
  }
}

/* minimize: play close chime */
bspMinimize.addEventListener('click', ()=> {
  playAiChime(false);
  if(audioCtx && !GLOBAL_MUTED) {
    // allow chime to finish
    setTimeout(()=>{ try{ audioCtx.suspend(); }catch(e){} }, 400);
  }
  bspOverlay.style.display='none';
  bspFloatBtn.parentElement.style.display='block';
  document.documentElement.style.overflow='';
  document.body.style.overflow='';
});

/* refresh */
bspRefresh.addEventListener('click', ()=>{
  const keepName = SESSION_NAME;
  sessionStorage.removeItem('bsp_chat_html');
  sessionStorage.removeItem('bsp_chat_started');
  bspBody.innerHTML = '';
  if(keepName){
    SESSION_NAME = keepName;
    sessionStorage.setItem('bsp_user_name', SESSION_NAME);
    botSay(`Chat refreshed. Welcome back ${SESSION_NAME}.`);
    setTimeout(showMainMenu,700);
  } else {
    botSay("Chat refreshed. Please fill the form to continue.");
    setTimeout(showFormBubble,700);
  }
});

/* global mute toggle */
bspGlobalMute.addEventListener('click', ()=>{
  GLOBAL_MUTED = !GLOBAL_MUTED;
  bspGlobalMuteIcon.className = GLOBAL_MUTED ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
  // stop speech if muting
  if(GLOBAL_MUTED) speechSynthesis.cancel();
});

/* ----------------- Form (in-chat) ----------------- */
function showFormBubble(){
  removeExistingForm();
  const html = `
    <div style="font-weight:900;margin-bottom:6px">Quick contact</div>
    <div class="bsp_form" id="bsp_form_wrap" role="form" aria-label="Quick contact form">
      <input id="bsp_form_name" type="text" placeholder="Full name" aria-label="Name">
      <div class="err_label" id="err_name">Please enter your name</div>

      <input id="bsp_form_email" type="email" placeholder="Email (optional)" aria-label="Email">
      <div class="err_label" id="err_email">Please enter a valid email</div>

      <input id="bsp_form_phone" type="tel" placeholder="Mobile number (10 digits)" aria-label="Phone">
      <div class="err_label" id="err_phone">Please enter a valid 10-digit mobile number</div>

      <div class="bsp_form_cta">
        <div class="bsp_checkwrap">
          <div id="bsp_human_check" class="bsp_check" title="Verify you're human">
            <div class="dot"></div>
          </div>
          <div style="display:flex;flex-direction:column;">

            <div style="font-weight:700">Are you human?</div>
            <div id="bsp_human_status" class="small_info">Click to verify</div>
          </div>
        </div>
        <div style="margin-left:auto;">
          <button id="bsp_form_submit" type="button" style="background:linear-gradient(90deg,var(--primary),var(--accent));color:#fff;padding:10px;border-radius:10px;border:none;font-weight:800;margin-right:100px;">Submit</button>
        </div>
      </div>

      <div id="bsp_form_err" style="color:var(--error);font-size:13px;display:none;margin-top:6px"></div>
    </div>
  `;
  appendBotBubble(html, {avatar:false, includeMainMenu:false, rawText:"Quick contact - please provide name, email and mobile"});
  setTimeout(()=> {
    const sub = document.getElementById('bsp_form_submit');
    const humanCheck = document.getElementById('bsp_human_check');
    if(sub) sub.addEventListener('click', submitForm);
    if(humanCheck) humanCheck.addEventListener('click', doHumanVerify);
    removeInlineMainMenuButtons();
  },80);
}
function removeExistingForm(){
  const prev = bspBody.querySelectorAll('#bsp_form_wrap');
  prev.forEach(el=>{ const parent = el.closest('.bsp_bubble'); if(parent) parent.remove(); });
}
function removeLastBotForm(){
  const last = Array.from(bspBody.querySelectorAll('.bsp_bubble.bsp_bot')).reverse().find(b=> b.querySelector('#bsp_form_wrap'));
  if(last) last.remove();
}

/* human verify */
let HUMAN_VERIFIED = false;
function doHumanVerify(){
  if(HUMAN_VERIFIED) return;
  const check = document.getElementById('bsp_human_check');
  const status = document.getElementById('bsp_human_status');
  if(!check || !status) return;
  check.innerHTML = `<span class="loader_small" aria-hidden="true"></span>`;
  status.textContent = 'Verifying...';
  setTimeout(()=> {
    HUMAN_VERIFIED = true;
    check.classList.add('verify');
    check.innerHTML = `<i class="fa-solid fa-person" style="color:var(--primary);"></i>`;
    status.innerHTML = '<span style="color:var(--ok);font-weight:700">Ok — you are human</span>';
  }, 1200);
}

/* submit */
function submitForm(){
  const nameEl = document.getElementById('bsp_form_name');
  const emailEl = document.getElementById('bsp_form_email');
  const phoneEl = document.getElementById('bsp_form_phone');
  const errName = document.getElementById('err_name');
  const errEmail = document.getElementById('err_email');
  const errPhone = document.getElementById('err_phone');
  const topErr = document.getElementById('bsp_form_err');

  let valid = true;
  const name = (nameEl.value||'').trim();
  if(!name){ valid=false; showInputError(nameEl, errName, "Please enter your name"); } else { clearInputError(nameEl, errName); }

  const email = (emailEl.value||'').trim();
  if(email){
    const pat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!pat.test(email)){ valid=false; showInputError(emailEl, errEmail, "Please enter a valid email (example@domain.com)"); } else { clearInputError(emailEl, errEmail); }
  } else { clearInputError(emailEl, errEmail); }

  const phone = (phoneEl.value||'').trim();
  const phonePat = /^\d{10}$/;
  if(!phonePat.test(phone)){ valid=false; showInputError(phoneEl, errPhone, "Please enter a valid 10-digit mobile number"); } else { clearInputError(phoneEl, errPhone); }

  if(!HUMAN_VERIFIED){ valid=false; topErr.style.display='block'; topErr.textContent = "Please verify 'Are you human?' before submitting."; return; } else { topErr.style.display='none'; }

  if(!valid) return;

  // animate submit button text change
  const lastFormWrap = bspBody.querySelector('#bsp_form_wrap');
  if(lastFormWrap){
    const submitBtn = lastFormWrap.querySelector('#bsp_form_submit');
    if(submitBtn){
      submitBtn.innerHTML = 'Submitting...';
      submitBtn.style.opacity = '0.9';
    }
  }

  setTimeout(()=> {
    SESSION_NAME = name;
    sessionStorage.setItem('bsp_user_name', SESSION_NAME);
    // remove form bubble smoothly
    removeLastBotForm();
    // Bot replies welcome WITHOUT avatar per your request (message only)
    botSayNoAvatar(`Welcome ${SESSION_NAME}. Please select any category to continue.`);
    setTimeout(showMainMenu,700);
    saveChat();
  }, 900);
}

function showInputError(inputEl, errEl, message){
  if(inputEl) inputEl.classList.add('err');
  if(errEl){ errEl.style.display='block'; errEl.textContent = message; }
}
function clearInputError(inputEl, errEl){
  if(inputEl) inputEl.classList.remove('err');
  if(errEl){ errEl.style.display='none'; errEl.textContent = ''; }
}

/* -------------- Main menu & categories -------------- */
function showMainMenu(){
  CHAT_LOCKED_CAT = null;
  removeInlineMainMenuButtons();
  const chips = Object.keys(CATEGORIES).map(k=> `<button class="bsp_chip" data-cat="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join('');
  appendBotBubble(`<div style="font-weight:900">Main Menu</div><div class="bsp_chips">${chips}</div>`, {avatar:false, includeMainMenu:false, rawText:'Main Menu - choose a category'});
  setTimeout(()=> {
    document.querySelectorAll('.bsp_chip').forEach(btn=>{
      btn.onclick = (e)=>{
        const cat = e.currentTarget.getAttribute('data-cat');
        if(CHAT_LOCKED_CAT){ botSayNoAvatar("Main Menu is locked. Use 'Main Menu' button to open it."); return; }
        CHAT_LOCKED_CAT = cat;
        document.querySelectorAll('.bsp_chip').forEach(c=>{
          if(c.getAttribute('data-cat')===cat){ c.classList.add('selected'); } else { c.classList.add('chips-hide'); }
        });
        setTimeout(()=>{ document.querySelectorAll('.bsp_chip.chips-hide').forEach(x=>x.style.display='none'); }, 350);
        appendUserBubble(cat);
        setTimeout(()=> { sendCategoryInfo(cat); }, 450);
        saveChat();
      };
    });
  },50);
}

/* send category info: no voice icons for category replies per request */
function sendCategoryInfo(cat){
  const obj = CATEGORIES[cat];
  if(!obj){ botSayNoAvatar("No information found for this category."); return; }

  removeInlineMainMenuButtons();

  // show loader then typed content
  const loader = document.createElement('div');
  loader.className = 'bsp_bubble bsp_bot enter';
  loader.id = 'bsp_cat_loader';
  loader.innerHTML = `<div class="bsp_loader"><div class="bsp_dot"></div><div class="bsp_dot"></div><div class="bsp_dot"></div></div>`;
  bspBody.appendChild(loader);
  bspBody.scrollTop = bspBody.scrollHeight;

  setTimeout(()=> {
    if(loader) loader.remove();
    // append bubble WITHOUT avatar and WITHOUT voice icons
    const bubble = appendBotBubble(`<div class="bsp_raw"></div>`, {avatar:false, includeMainMenu:true, rawText: obj.text});
    // remove play/mute buttons (category reply shouldn't have them)
    const play = bubble.querySelector('.bsp_actions .bsp_action_btn:first-child');
    const mute = bubble.querySelector('.bsp_actions .bsp_action_btn:nth-child(2)');
    if(play) play.remove();
    if(mute) mute.remove();

    const contentWrap = bubble.querySelector('.bsp_content');
    const typedContainer = document.createElement('div');
    contentWrap.insertBefore(typedContainer, contentWrap.querySelector('.bsp_ts'));

    typeOutText(obj.text || '', typedContainer, 18, ()=> {
      if(obj.imgList && Array.isArray(obj.imgList)){
        obj.imgList.forEach((src, idx)=> {
          setTimeout(()=> {
            appendBotBubble(`<div style="font-weight:800">${escapeHtml(cat)} — sample image</div><img class="bsp_msg_img" src="${src}" alt="${escapeHtml(cat)}">`, {avatar:false, includeMainMenu:true, rawText: `${cat} sample image`});
          }, idx*600 + 300);
        });
      }
      saveChat();
    });

  }, 700);
}

/* typing out helper */
function typeOutText(text, container, delayPerChar = 20, doneCb){
  container.innerHTML = '';
  const chars = Array.from(text);
  let i = 0;
  function step(){
    if(i >= chars.length){
      if(typeof doneCb === 'function') doneCb();
      return;
    }
    const ch = chars[i];
    const span = document.createElement('span');
    span.className = 'type_char';
    span.style.animationDelay = (i * (delayPerChar/1000)) + 's';
    span.textContent = ch;
    container.appendChild(span);
    bspBody.scrollTop = bspBody.scrollHeight;
    i++;
    setTimeout(step, delayPerChar);
  }
  step();
}

/* ------------- Input / send handling ------------- */
bspSendBtn.addEventListener('click', ()=> {
  const txt = bspInput.value.trim();
  if(!txt) return;
  bspInput.value = ''; toggleFooterIcons();
  if(!SESSION_NAME){
    botSayNoAvatar("Please submit the onboarding form first so I can personalize your experience.");
    setTimeout(()=> {
      removeExistingForm();
      showFormBubble();
      saveChat();
    },400);
    return;
  }
  appendUserBubble(escapeHtml(txt));
  const low = txt.toLowerCase();
  if(/^(hi|hello|hey|who are you|what's up|\bnamaste\b|\bnamaskar\b)/.test(low)){
    const replies = [
      `Hello ${SESSION_NAME ? SESSION_NAME + '!' : '!'} How can I help you today?`,
      `Hi there${SESSION_NAME ? ' ' + SESSION_NAME : ''}! What would you like to know?`,
      `Greetings${SESSION_NAME ? ' ' + SESSION_NAME : ''}! Select a category or ask me something.`
    ];
    const r = replies[Math.floor(Math.random()*replies.length)];
    botSay(r);
    setTimeout(showMainMenu,600);
    saveChat();
    return;
  }
  if(CHAT_LOCKED_CAT){
    botSayNoAvatar("You have an active category selection. Use 'Main Menu' button to switch categories.");
    saveChat(); return;
  }
  let match = null;
  Object.keys(CATEGORIES).forEach(k => { if(low.includes(k.toLowerCase().slice(0,4))) match = k; });
  if(match){
    CHAT_LOCKED_CAT = match;
    const el = Array.from(document.querySelectorAll('.bsp_chip')).find(b => b.textContent.trim()===match);
    if(el) {
      document.querySelectorAll('.bsp_chip').forEach(c=>{ if(c.getAttribute('data-cat')!==match) c.classList.add('chips-hide'); else c.classList.add('selected'); });
      setTimeout(()=>{ document.querySelectorAll('.bsp_chip.chips-hide').forEach(x=>x.style.display='none'); }, 350);
    }
    setTimeout(()=> sendCategoryInfo(match), 450);
    saveChat();
    return;
  }
  botSayNoAvatar("Sorry — please select from the Main Menu.");
  setTimeout(showMainMenu,600);
  saveChat();
});

/* footer icon toggle */
function toggleFooterIcons(){
  if(bspInput.value.trim()){
    bspSendBtn.style.display='flex';
    bspMicBtn.style.display='none';
  } else {
    bspSendBtn.style.display='none';
    bspMicBtn.style.display='flex';
  }
}
bspInput.addEventListener('input', toggleFooterIcons);
toggleFooterIcons();

/* mic simulated */
bspMicBtn.addEventListener('click', ()=> { bspListen.style.display='block'; });
bspListenDone.addEventListener('click', ()=> {
  bspListen.style.display='none';
  const txt = prompt("Simulated voice input — type what you said:");
  if(txt && txt.trim()){
    bspInput.value = txt.trim();
    toggleFooterIcons();
  }
});

/* ----------- append user & bot bubbles (no avatars inside) ---------- */
function appendUserBubble(text){
  const wrapper = document.createElement('div');
  wrapper.className = 'bsp_bubble bsp_user enter';
  wrapper.innerHTML = `<div class="bsp_content">${text}<span class="bsp_ts">${timeNow()}</span></div>`;
  bspBody.appendChild(wrapper);
  bspBody.scrollTop = bspBody.scrollHeight;
  saveChat();
  return wrapper;
}

/* append bot bubble: by default includes play/mute actions (except category replies we remove them) */
function appendBotBubble(html, opts = {avatar:false, includeMainMenu:false, rawText:''}){
  const wrapper = document.createElement('div');
  wrapper.className = 'bsp_bubble bsp_bot enter';
  const contentWrap = document.createElement('div');
  contentWrap.className = 'bsp_content';
  contentWrap.innerHTML = html + `<div class="bsp_ts">${timeNow()}</div>`;

  // actions (voice play & per-bubble mute)
  const actions = document.createElement('div'); actions.className = 'bsp_actions';
  const playBtn = document.createElement('button'); playBtn.className='bsp_action_btn'; playBtn.title='Play'; playBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
  const muteBtn = document.createElement('button'); muteBtn.className='bsp_action_btn'; muteBtn.title='Mute'; muteBtn.innerHTML = `<i class="fa-solid fa-volume-xmark hidden"></i>`;
  actions.appendChild(playBtn); actions.appendChild(muteBtn);

  wrapper.appendChild(contentWrap);
  wrapper.appendChild(actions);
  bspBody.appendChild(wrapper);
  bspBody.scrollTop = bspBody.scrollHeight;

  // dataset.text for speak
  let raw = '';
  try{ raw = contentWrap.querySelector('.bsp_raw') ? contentWrap.querySelector('.bsp_raw').innerText : contentWrap.innerText.replace(/\d{1,2}:\d{2}\s(?:AM|PM)$/,'').trim(); }catch(e){ raw = contentWrap.innerText || ''; }
  wrapper.dataset.text = raw;
  wrapper.dataset.muted = 'false';

  // inline Main Menu button if requested
  if(opts.includeMainMenu){
    removeInlineMainMenuButtons();
    const mm = document.createElement('div'); mm.style.marginTop='8px';
    const btn = document.createElement('button'); btn.className='bsp_mainmenu_btn_inbubble'; btn.textContent='Main Menu';
    btn.addEventListener('click', ()=>{ CHAT_LOCKED_CAT=null; botSayNoAvatar('Opened Main Menu...'); setTimeout(showMainMenu,500); });
    mm.appendChild(btn);
    contentWrap.appendChild(mm);
  }

  // play action
  playBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    if(wrapper.dataset.muted === 'true'){ wrapper.dataset.muted='false'; muteBtn.querySelector('i').classList.add('hidden'); }
    speakText(wrapper.dataset.text);
  });
  // mute toggle per bubble
  muteBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    if(wrapper.dataset.muted === 'true'){ wrapper.dataset.muted='false'; muteBtn.querySelector('i').classList.add('hidden'); } 
    else { wrapper.dataset.muted='true'; muteBtn.querySelector('i').classList.remove('hidden'); }
  });

  saveChat();
  return wrapper;
}
function removeInlineMainMenuButtons(){ document.querySelectorAll('.bsp_mainmenu_btn_inbubble').forEach(b=>b.remove()); }

/* botSay: shows loader then typed content. This function keeps voice icon (so message replies have it) */
function botSay(text){
  bspHeaderSub.textContent = 'Typing...';
  const loader = document.createElement('div');
  loader.className = 'bsp_bubble bsp_bot enter';
  loader.id = 'bsp_temp_loader';
  loader.innerHTML = `<div class="bsp_loader"><div class="bsp_dot"></div><div class="bsp_dot"></div><div class="bsp_dot"></div></div>`;
  bspBody.appendChild(loader);
  bspBody.scrollTop = bspBody.scrollHeight;
  const delay = Math.min(400 + text.length*4, 1600);
  setTimeout(()=> {
    const t = document.getElementById('bsp_temp_loader');
    if(t) t.remove();
    const bubble = appendBotBubble(`<div class="bsp_raw"></div>`, {avatar:false, includeMainMenu:true, rawText:text});
    const contentWrap = bubble.querySelector('.bsp_content');
    const typedContainer = document.createElement('div');
    contentWrap.insertBefore(typedContainer, contentWrap.querySelector('.bsp_ts'));
    typeOutText(text, typedContainer, 20, ()=> {
      bspHeaderSub.textContent = 'Online';
      if(!GLOBAL_MUTED && bubble.dataset.muted !== 'true'){ speakText(bubble.dataset.text); }
    });
  }, delay);
}

/* botSayNoAvatar: same as botSay but ensures no voice is auto-played (useful for some messages) */
function botSayNoAvatar(text){
  bspHeaderSub.textContent = 'Typing...';
  const loader = document.createElement('div');
  loader.className = 'bsp_bubble bsp_bot enter';
  loader.id = 'bsp_temp_loader2';
  loader.innerHTML = `<div class="bsp_loader"><div class="bsp_dot"></div><div class="bsp_dot"></div><div class="bsp_dot"></div></div>`;
  bspBody.appendChild(loader);
  bspBody.scrollTop = bspBody.scrollHeight;
  const delay = Math.min(400 + text.length*4, 1200);
  setTimeout(()=> {
    const t = document.getElementById('bsp_temp_loader2');
    if(t) t.remove();
    // create bubble (will include play/mute actions but we won't auto-speak)
    const bubble = appendBotBubble(`<div class="bsp_raw"></div>`, {avatar:false, includeMainMenu:true, rawText:text});
    // we won't auto play voice here; user can press play if they want
    const contentWrap = bubble.querySelector('.bsp_content');
    const typedContainer = document.createElement('div');
    contentWrap.insertBefore(typedContainer, contentWrap.querySelector('.bsp_ts'));
    typeOutText(text, typedContainer, 20, ()=> {
      bspHeaderSub.textContent = 'Online';
    });
  }, delay);
}

/* speakText: robotic, prefer Indian male-like voice if available */
function speakText(text){
  if(!('speechSynthesis' in window) || GLOBAL_MUTED) return;
  let s = (text||'') + '';
  try{ s = s.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,''); }catch(e){}
  s = s.replace(/[^a-zA-Z0-9\s\.,\u0900-\u097F]/g,''); // allow basic Devanagari too
  s = s.replace(/\s{2,}/g,' ').trim();
  if(!s) return;
  speechSynthesis.cancel();
  if(!VOICES_LOADED) loadVoices();
  // pick an Indian/robotic male-ish voice if available
  const preferredNames = [/Google UK English Male/i, /en-IN/i, /Indian Male/i, /Microsoft Server Speech Text to Speech Voice \(en-IN.*Male\)/i, /Alloy/i];
  let preferred = null;
  for(const p of preferredNames){
    preferred = voices.find(v => p.test(v.name));
    if(preferred) break;
  }
  if(!preferred) preferred = voices.find(v=>/male/i.test(v.name)) || voices[0];
  const utter = new SpeechSynthesisUtterance(s);
  // prefer Indian locale if possible
  if(preferred) utter.voice = preferred;
  // robotic tuning
  utter.lang = preferred && /en-IN|hi-IN|in/i.test(preferred.lang || preferred.name) ? 'en-IN' : 'en-US';
  // make it slightly robotic
  utter.rate = 0.95;
  utter.pitch = 0.7;
  // speak
  speechSynthesis.speak(utter);
}

/* utility */
function timeNow(){
  const d = new Date();
  let hh = d.getHours(); const mm = d.getMinutes();
  const ampm = hh>=12 ? 'PM' : 'AM';
  hh = hh % 12; hh = hh ? hh : 12;
  const mmStr = mm < 10 ? '0' + mm : mm;
  return `${hh}:${mmStr} ${ampm}`;
}
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

/* Save / Load chat */
function saveChat(){ try{ sessionStorage.setItem('bsp_chat_html', bspBody.innerHTML); sessionStorage.setItem('bsp_user_name', SESSION_NAME || ''); }catch(e){} }
function loadChat(){
  try{
    const html = sessionStorage.getItem('bsp_chat_html');
    if(html){
      bspBody.innerHTML = html;
      setTimeout(()=> {
        // reattach actions for bot bubbles
        document.querySelectorAll('.bsp_bubble.bsp_bot').forEach(wrap=>{
          const playBtn = wrap.querySelector('.bsp_actions .bsp_action_btn:first-child');
          const muteBtn = wrap.querySelector('.bsp_actions .bsp_action_btn:nth-child(2)');
          wrap.dataset.text = wrap.querySelector('.bsp_content')?.innerText?.replace(/\d{1,2}:\d{2}\s(?:AM|PM)$/,'') || '';
          if(playBtn) playBtn.onclick = (e)=>{ e.stopPropagation(); if(wrap.dataset.muted === 'true'){ wrap.dataset.muted='false'; muteBtn.querySelector('i').classList.add('hidden'); } speakText(wrap.dataset.text); };
          if(muteBtn) muteBtn.onclick = (e)=>{ e.stopPropagation(); if(wrap.dataset.muted === 'true'){ wrap.dataset.muted='false'; muteBtn.querySelector('i').classList.add('hidden'); } else { wrap.dataset.muted='true'; muteBtn.querySelector('i').classList.remove('hidden'); } };
        });
        document.querySelectorAll('.bsp_chip').forEach(btn=>{
          btn.onclick = (e)=> { const cat = e.currentTarget.getAttribute('data-cat'); if(CHAT_LOCKED_CAT){ botSayNoAvatar("Main Menu is locked. Use Main Menu button to change."); return; } CHAT_LOCKED_CAT = cat; e.currentTarget.classList.add('selected'); document.querySelectorAll('.bsp_chip').forEach(c=>{ if(c.getAttribute('data-cat')!==cat) c.classList.add('chips-hide'); }); setTimeout(()=>{ document.querySelectorAll('.bsp_chip.chips-hide').forEach(x=>x.style.display='none'); }, 350); appendUserBubble(cat); setTimeout(()=> sendCategoryInfo(cat),900); saveChat(); };
        });
      },60);
    }
    const nm = sessionStorage.getItem('bsp_user_name');
    if(nm) SESSION_NAME = nm;
  }catch(e){}
}
setInterval(saveChat, 2000);
window.addEventListener('beforeunload', saveChat);


/* initial load */
loadChat();



/* Done */
