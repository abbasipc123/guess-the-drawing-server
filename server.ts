<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Guess The Drawing">
<meta name="theme-color" content="#121212">
<title>Guess The Drawing</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js"></script>
<style>
:root{--bg:#121212;--panel:#1e1e1e;--amber:#ffc107;--red:#ff6b6b;--green:#4caf50}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);color:#fff;font:15px/1.3 system-ui,-apple-system,sans-serif;overscroll-behavior:none}
.s{display:none;height:var(--vh,100dvh);padding:calc(10px + env(safe-area-inset-top)) 14px calc(10px + env(safe-area-inset-bottom));flex-direction:column;gap:8px;max-width:520px;margin:auto}
.s.on{display:flex}
h1{margin:0;text-align:center;font-size:34px;line-height:1}h1 b{color:var(--amber);font-size:44px;display:block}
input,select,textarea{font:16px system-ui;background:#2a2a2a;color:#fff;border:1px solid #555;border-radius:10px;padding:11px;width:100%}
button{font:700 15px system-ui;border:0;border-radius:12px;padding:13px;background:var(--amber);color:#000}
button.o{background:#2a2a2a;color:#fff;border:1px solid #666}button:disabled{opacity:.4}
.card{background:var(--panel);border-radius:12px;padding:8px 10px}
.row{display:flex;gap:6px;align-items:center}.row>*{flex:1}
.grow{flex:1;min-height:0;overflow:auto}
.err{color:var(--red);text-align:center;min-height:18px}
.am{color:var(--amber)}.gr{color:#999}
#ban{position:fixed;top:0;left:0;right:0;background:#b71c1c;text-align:center;padding:5px;font-weight:700;display:none;z-index:9}
#cwrap{position:relative;flex:1;min-height:0;background:#fff;border-radius:12px;overflow:hidden}
#cv{width:100%;height:100%;display:block;touch-action:none}
.ov{position:absolute;inset:0;background:#000b;display:none;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:16px;text-align:center}
#top{display:flex;gap:8px;align-items:center}
#time{width:52px;height:52px;display:grid;place-items:center;font-size:22px;font-weight:800}
#hint{font-size:20px;font-weight:700;color:var(--amber);letter-spacing:1px;word-break:break-word}
#tools{display:none;flex-direction:column;gap:5px}
.pal{display:flex;gap:6px;overflow-x:auto}.dot{flex:none;width:30px;height:30px;border-radius:50%;border:2px solid #777}
.dot.sel{border-color:var(--amber);border-width:3px}
#strip{position:absolute;left:6px;right:6px;bottom:6px;display:none;gap:8px;justify-content:center;background:#212121ee;border-radius:12px;padding:8px;overflow-x:auto}
#strip button{flex:none;width:44px;height:44px;padding:0;background:#2a2a2a;color:#fff;border:1px solid #666;border-radius:10px;font-size:22px;display:grid;place-items:center}
#strip button.sel{border-color:var(--amber);border-width:2px}
.tb{display:flex;gap:4px}.tb button{display:flex;align-items:center;justify-content:center}.tb button{flex:1;padding:9px 0;background:#2a2a2a;color:#fff;border:1px solid #666;font-size:17px}
.tb button.sel{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 20%,transparent)}
#react{position:absolute;top:6px;right:6px;display:none;gap:5px}
#react button{padding:6px 10px;border-radius:20px;background:#212121e6;color:#fff;font-size:13px}
.egg{position:absolute;width:100px;height:100px;transform:translate(-50%,-50%);pointer-events:none;animation:eggpop .18s ease-out,eggfade .5s 2.5s forwards}
.egg svg{width:100%;height:100%;display:block}
@keyframes eggpop{from{transform:translate(-50%,-50%) scale(.3);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes eggfade{to{opacity:0}}
#log{height:104px;overflow:auto;font-size:13px}
#log.dr{cursor:pointer;border:1px dashed #444}
#log:empty::before{content:"Type your guess below 👇";display:block;text-align:center;padding-top:34px;color:#777;font-size:13px}
#log.dr:empty::before{content:"Tap to chat 🔒 - Tap again to hide Text Box"}
#scores{font-size:12px;overflow-x:auto;white-space:nowrap}
#fw{position:fixed;inset:0;pointer-events:none;z-index:5}
.pl{padding:5px 0}
.bw{display:flex;flex-direction:column;margin-bottom:6px}.bw.me{align-items:flex-end}
.bb{max-width:84%;padding:6px 10px;border-radius:2px 14px 14px 14px;background:#2e2e2e;font-size:14px;word-break:break-word}
.bw.me .bb{background:#1b5e20;border-radius:14px 2px 14px 14px}
.bb.ok{background:#1b5e20;font-weight:700}
.bb .n{display:block;font-weight:700;font-size:13px}
.rq{background:#0005;border-radius:6px;padding:3px 7px;margin:2px 0;font-size:12px;border-left:3px solid var(--amber);color:#ccc}
.rq b{display:block;color:var(--amber)}
.chips{display:flex;gap:4px;margin-top:2px;flex-wrap:wrap}.chips span{background:#2a2a2a;border-radius:10px;padding:1px 7px;font-size:12px}.chips span.mine{outline:1px solid var(--amber)}
.pick{display:flex;gap:2px;margin-top:3px;background:#2a2a2a;border-radius:18px;padding:2px 6px}.pick span{font-size:22px;padding:2px 4px}
.sys{text-align:center;color:var(--amber);font-style:italic;font-size:13px;margin-bottom:6px}

/* ---- final score screen (matches Android) ---- */
.fin{flex:none;margin:auto 0;display:flex;flex-direction:column}
.pod{display:flex;align-items:flex-end;gap:8px;margin-top:24px}
.pc{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
.pc .cr{font-size:24px;line-height:1.1}
.pc .nm{font-weight:700;font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc .sc{color:var(--amber);font-weight:800;font-size:16px;margin-bottom:4px}
.pc .bar{width:100%;height:0;border-radius:10px 10px 0 0;display:flex;justify-content:center;padding-top:6px;font-size:26px;transition:height .9s ease}
.pc.go .bar{height:var(--h)}
.rest,.awc{background:var(--panel);border-radius:14px;padding:8px 16px;margin-top:16px}
.rr{display:flex;align-items:center;padding:6px 0;font-size:16px}
.rr .rk{width:40px;color:#9e9e9e}
.rr .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rr b{color:var(--amber)}
.awt{margin-top:20px;font-size:14px;font-weight:800;color:var(--amber)}
.awc{margin-top:8px;padding:6px 16px}
.ar{display:flex;align-items:center;padding:8px 0}
.ar .ic{width:40px;font-size:24px}
.ar .tx{flex:1;min-width:0}
.ar .tt{color:#9e9e9e;font-size:12px}
.ar .pn{font-weight:700;font-size:16px}
.ar .dt{color:var(--amber);font-weight:700;font-size:14px}

/* ---- keyboard / viewport fixes ---- */
body{overflow:hidden}
.s{transform:translateY(var(--top,0px))}
/* bubble with the latest chat lines, shown on the drawing while the keyboard is open */
#pop{position:absolute;left:6px;bottom:30px;max-width:85%;display:none;flex-direction:column;gap:2px;background:#0009;border-radius:8px;padding:6px;font-size:12px;pointer-events:none}
#pop div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kb #pop:not(:empty){display:flex}
/* keyboard open: lobby shows only the chat */
.kb #lhead,.kb #plist,.kb #host,.kb #wait,.kb #leave{display:none!important}
/* keyboard open: game shows only timer, hint/word and drawing */
.kb #info,.kb #tools,.kb #log,.kb #scores{display:none!important}
.kb #time{width:40px;height:34px;font-size:18px}

/* ================= DESKTOP / WIDE SCREENS ONLY ================= */
@media (min-width:900px) and (min-height:600px){
  button,.dot,#rcode,.pl,.bb{cursor:pointer}
  #cv{cursor:crosshair}

  /* ---------- LOBBY: settings on the left, chat on the right ---------- */
  #lobby{max-width:1100px;width:100%;overflow-y:auto}
  #lobby.on{
    display:grid;
    grid-template-columns:380px 1fr;
    grid-template-rows:auto auto auto 1fr auto auto;
    gap:12px 20px;
  }
  #lhead{grid-column:1;grid-row:1}
  #plist{grid-column:1;grid-row:2;max-height:35vh;overflow:auto}
  #host,#wait{grid-column:1;grid-row:3}
  #leave{grid-column:1;grid-row:6}
  #chat{grid-column:2;grid-row:1 / 5}
  #rbar{grid-column:2;grid-row:5}
  #msg{grid-column:2;grid-row:6}

  /* ---------- GAME: drawing on the left, chat on the right ---------- */
  #game{max-width:1280px;width:100%}
  #game.on{
    display:grid;
    grid-template-columns:minmax(0,1fr) 340px;
    grid-template-rows:auto minmax(0,1fr) auto auto;
    gap:10px 16px;
  }
  #top{grid-column:1;grid-row:1}
  #cwrap{grid-column:1;grid-row:2}
  #tools{grid-column:1;grid-row:3;flex-direction:row;align-items:center;gap:14px}
  #log{grid-column:2;grid-row:1 / 3;height:auto;min-height:0;font-size:14px}
  #guess{grid-column:2;grid-row:3}
  #scores{grid-column:1 / -1;grid-row:4;white-space:normal;max-height:84px;overflow:auto;font-size:14px}

  /* bigger hint, timer and tools */
  #hint{font-size:26px}
  #time{width:60px;height:60px;font-size:26px}
  .pal{flex:1;flex-wrap:wrap;overflow:visible}
  .dot{width:34px;height:34px}
  .tb{width:340px}

  /* ---------- FINAL SCREEN: a bit wider ---------- */
  #final{max-width:720px}
}

/* ===== SCORES COLUMN (desktop only) ===== */
@media (min-width:900px) and (min-height:600px){
  #scores{white-space:normal;overflow-x:hidden;overflow-y:auto;font-size:15px;padding:10px 12px}
  #scores .sh{display:block;margin-bottom:6px;letter-spacing:1px}
  #scores .sp{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid #333}
  #scores .sp b{flex:none}

  /* medium screens: scores get their own column on the left */
  #game{max-width:1466px}
  #game.on{
    grid-template-columns:150px minmax(0,1fr) 340px;
    grid-template-rows:auto minmax(0,1fr) auto;
  }
  #top,#cwrap,#tools{grid-column:2}
  #log{grid-column:3;grid-row:1 / 3}
  #guess{grid-column:3;grid-row:3}
  #scores{grid-column:1;grid-row:2;align-self:start;max-height:100%}
}

/* wide screens: scores sit in the blank space left of the drawing,
   so the drawing stays exactly where it was */
@media (min-width:1650px) and (min-height:600px){
  #game{max-width:1280px}
  #game.on{
    grid-template-columns:minmax(0,1fr) 340px;
    grid-template-rows:auto minmax(0,1fr) auto;
  }
  #top,#cwrap,#tools{grid-column:1}
  #log{grid-column:2;grid-row:1 / 3}
  #guess{grid-column:2;grid-row:3}
  #scores{
    position:absolute;
    right:calc(100% + 16px);
    top:70px;
    width:calc((100vw - 1280px) / 2 - 32px);
    max-width:240px;
    max-height:60%;
  }
}

/* ---- settings / modal / themes ---- */
#menu{position:relative}
#gear{position:absolute;top:calc(10px + env(safe-area-inset-top));left:14px;background:none;border:0;color:var(--amber);padding:8px;font-size:14px}
.sr{display:flex;align-items:center;gap:8px;background:var(--panel);border-radius:14px;padding:14px 16px;cursor:pointer}
.sr .si{width:32px;font-size:22px}.sr .st{flex:1;font-size:17px}
#modal{position:fixed;inset:0;background:#000c;display:none;align-items:center;justify-content:center;z-index:20;padding:16px}
#modal.on{display:flex}
#mbox{background:#2b2b2b;border-radius:16px;padding:18px;width:100%;max-width:400px;max-height:85%;overflow:auto;display:flex;flex-direction:column;gap:10px}
.opt{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;border:1px solid #888;background:#2a2a2a;cursor:pointer}
.opt.sel{border:2px solid var(--amber)}.opt.lock{opacity:.6;cursor:default}
.sw{width:28px;height:28px;border-radius:50%;flex:none}
.av{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.av span{font-size:24px;text-align:center;padding:6px;border-radius:50%;background:#2a2a2a;cursor:pointer}
.av span.sel{background:var(--amber)}
.pb{height:6px;background:#333;border-radius:3px;overflow:hidden;margin-top:6px}
.pb i{display:block;height:100%;background:var(--amber)}
</style></head><body>
<div id="ban">Connecting to server…</div>

<div id="menu" class="s on" style="justify-content:center">
 <button id="gear">⚙ SETTINGS</button>
 <h1>GUESS THE<b class="am">DRAWING</b></h1>
 <p class="gr" style="text-align:center;margin:0">Draw • Guess • Win</p>
 <input id="name" maxlength="20" placeholder="Your name" autocomplete="off">
 <button id="play">PLAY</button>
 <button id="create" class="o">CREATE ROOM</button>
 <button id="jopen" class="o">JOIN ROOM</button>
 <div class="err" id="merr"></div>
</div>

<div id="joinscr" class="s" style="justify-content:center">
 <h1 style="font-size:30px">JOIN ROOM</h1>
 <input id="name2" maxlength="20" placeholder="Your name" autocomplete="off">
 <input id="code" maxlength="6" placeholder="Room code" autocapitalize="characters" autocomplete="off">
 <button id="join">JOIN</button>
 <div class="err" id="jerr"></div>
 <button id="jback" class="o" style="background:none;border:0;color:#999">← Back</button>
</div>

<div id="lobby" class="s">
 <div id="lhead" style="text-align:center"><span class="gr">ROOM CODE</span><br>
  <b id="rcode" class="am" style="font-size:28px;letter-spacing:4px;cursor:pointer;padding:2px 10px;display:inline-block"></b><br>
  <span id="chint" class="gr" style="font-size:11px">Tap to copy</span></div>
 <div class="card" id="plist"></div>
 <div class="card grow" id="chat"></div>
 <div id="rbar" class="card" style="display:none;align-items:center;gap:8px"><div style="flex:1;min-width:0"><b class="am" id="rn" style="font-size:12px"></b><div id="rq2" class="gr" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div><button id="rx" class="o" style="padding:6px 12px">✕</button></div>
 <input id="msg" maxlength="200" placeholder="Message" enterkeyhint="send" autocomplete="off">
 <div id="host" style="display:none;flex-direction:column;gap:6px">
  <div class="row">
   <select id="rounds"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>
   <select id="rtime"><option>30</option><option>45</option><option selected>60</option><option>90</option><option>120</option></select>
   <select id="choices"><option>2</option><option selected>3</option><option>4</option><option>5</option></select>
  </div>
  <div class="gr" style="font-size:12px;text-align:center">rounds · seconds per round · words to pick from</div>
  <textarea id="custom" rows="2" placeholder="Custom words (comma separated)"></textarea>
  <label class="row gr"><input type="checkbox" id="conly" style="flex:none;width:auto"> <span>Use only my words</span></label>
  <div class="err" id="lerr"></div>
  <button id="start">START GAME</button>
 </div>
 <div id="wait" class="gr" style="text-align:center">Waiting for the host to start…</div>
 <button id="leave" class="o">Leave room</button>
</div>

<div id="game" class="s">
 <div id="top"><div class="card" id="time">--</div><div class="card" style="flex:1"><div id="info" class="gr" style="font-size:12px"></div><div id="hint"></div></div></div>
 <div id="cwrap"><canvas id="cv"></canvas><div id="eggs"></div>
  <div id="react"><button id="like">👍 0</button><button id="dis">👎 0</button><button id="egg">🥚</button></div>
  <div id="toast" style="position:absolute;bottom:6px;left:6px;right:6px;text-align:center;font-weight:700;font-size:13px"></div>
  <div id="pop"></div><div id="strip"></div><div class="ov" id="choose"></div><div class="ov" id="over"></div></div>
 <div id="tools">
  <div class="pal" id="pal"></div>
  <div class="tb" id="tb"></div>
 </div>
 <input id="guess" maxlength="100" placeholder="Type your guess" enterkeyhint="send" autocomplete="off" autocapitalize="off">
 <div class="card" id="log"></div>
 <div id="scores" class="card"></div>
</div>

<div id="final" class="s" style="overflow-y:auto">
 <div class="fin">
  <h1 style="font-size:26px">GAME OVER<b class="am" style="font-size:20px">FINAL SCORES</b></h1>
  <div class="pod" id="pod"></div>
  <div id="fsc"></div>
  <div id="faw"></div>
  <div id="fback" class="gr" style="text-align:center;margin-top:24px;font-size:15px"></div>
  <button class="o" id="fleave" style="background:none;border:0;color:#bbb;margin-top:8px">← Back to menu</button>
 </div>
</div>

<div id="settings" class="s">
 <h1 style="font-size:28px"><b class="am" style="font-size:28px">SETTINGS</b></h1>
 <div class="grow" id="srows" style="display:flex;flex-direction:column;gap:10px"></div>
 <button id="sback" class="o" style="background:none;border:0;color:#bbb">← Back</button>
</div>
<div id="modal"><div id="mbox"><h2 id="mt" style="margin:0;font-size:20px"></h2><div id="mb" style="display:flex;flex-direction:column;gap:8px"></div><button id="mx" class="o">CLOSE</button></div></div>
<canvas id="fw"></canvas>

<script>
// Render server address
const SERVER = "https://guess-the-drawing-server.onrender.com";

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pid = localStorage.pid || (localStorage.pid = 'w' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const PAL = ['#000000','#ffffff','#9e9e9e','#00ffff','#f44336','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0','#e91e63','#795548'];
const S = {panel:'', reply:null, chat:[], pickKey:'', players:[], scores:{}, room:'', drawer:'', isDrawer:false, strokes:[], redo:[], live:null, color:'#000000', size:8,
  tool:'pen', guessed:false, vote:'', eggsLeft:0, eggThrown:false, phase:'menu', canSkip:false, over:false, choosing:false};
let sound = localStorage.snd !== 'off', ac, finalTimer;

// ---------- sound ----------
function beep(n){ if(!sound)return; try{ ac=ac||new(window.AudioContext||window.webkitAudioContext)(); let t=ac.currentTime;
  n.forEach(([f,d])=>{const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.25,t);
  g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d);t+=d*.8;});}catch(e){} }
addEventListener('pointerdown',()=>{try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();ac.resume()}catch(e){}},{once:true});
const SND = {correct:[[523,.1],[659,.1],[784,.1],[1047,.3]], fail:[[392,.2],[370,.2],[349,.2],[330,.5]], tick:[[1800,.04]],
  end:[[784,.12],[659,.12],[523,.3]], win:[[523,.1],[659,.1],[784,.1],[1047,.15],[784,.1],[1047,.5]], start:[[500,.08],[700,.08],[1000,.15]]};

// ---------- stats / themes / skins / avatars / achievements ----------
const ST = { get:k=>+localStorage['st_'+k]||0, add:k=>{ localStorage['st_'+k]=ST.get(k)+1; },
  reset:()=>['played','won','lost','correct'].forEach(k=>localStorage.removeItem('st_'+k)) };

const THEMES=[
 {id:'classic',name:'Classic',accent:'#ffc107',bg:'#121212',panel:'#1e1e1e',txt:'Free',ok:()=>true},
 {id:'ocean',name:'Ocean',accent:'#4fc3f7',bg:'#0b1620',panel:'#15283a',txt:'Play 3 games',ok:()=>ST.get('played')>=3},
 {id:'forest',name:'Forest',accent:'#81c784',bg:'#0f1a12',panel:'#1a2a1e',txt:'Win 1 game',ok:()=>ST.get('won')>=1},
 {id:'sunset',name:'Sunset',accent:'#ff7043',bg:'#1a0f0f',panel:'#2a1a18',txt:'25 correct guesses',ok:()=>ST.get('correct')>=25},
 {id:'violet',name:'Violet',accent:'#ba68c8',bg:'#140f1f',panel:'#221a33',txt:'Win 5 games',ok:()=>ST.get('won')>=5}];
const theme=()=>THEMES.find(t=>t.id===localStorage.theme)||THEMES[0];
function applyTheme(){ const t=theme(), r=document.documentElement.style;
  r.setProperty('--amber',t.accent); r.setProperty('--bg',t.bg); r.setProperty('--panel',t.panel);
  document.querySelector('meta[name=theme-color]').content=t.bg; }
applyTheme();

const SKINS=[
 {id:'egg',name:'Fried Egg',emoji:'🥚',what:'an egg',txt:'Free',ok:()=>true},
 {id:'tomato',name:'Tomato',emoji:'🍅',what:'a tomato',main:'#e53935',dark:'#b71c1c',dot:'#ffeb3b',txt:'Play 5 games',ok:()=>ST.get('played')>=5},
 {id:'pie',name:'Cream Pie',emoji:'🥧',what:'a cream pie',main:'#fff8e1',dark:'#d7ccc8',dot:'#e53935',txt:'10 correct guesses',ok:()=>ST.get('correct')>=10},
 {id:'slime',name:'Green Slime',emoji:'🟢',what:'green slime',main:'#76ff03',dark:'#2e7d32',dot:'#ccff90',txt:'Win 3 games',ok:()=>ST.get('won')>=3}];
const skinOf=id=>SKINS.find(s=>s.id===id)||SKINS[0];
const skin=()=>skinOf(localStorage.skin);
function blobSplat(k){ const L=[[-.22,-.12],[.24,-.16],[-.18,.22],[.22,.2]];
  let s=`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="${k.dark}"/>`;
  L.forEach(([x,y])=>s+=`<circle cx="${50+x*50}" cy="${50+y*50}" r="15" fill="${k.dark}"/>`);
  s+=`<circle cx="50" cy="50" r="22" fill="${k.main}"/>`;
  L.forEach(([x,y])=>s+=`<circle cx="${50+x*50}" cy="${50+y*50}" r="13" fill="${k.main}"/>`);
  s+=`<circle cx="47.5" cy="54" r="2" fill="${k.dot}"/><circle cx="57" cy="47.5" r="1.75" fill="${k.dot}"/><circle cx="51" cy="61" r="1.5" fill="${k.dot}"/><circle cx="42.5" cy="41" r="4.5" fill="#fff" opacity=".4"/>`;
  for(let i=0;i<8;i++){ const a=Math.random()*6.283, d=(.55+Math.random()*.4)*50;
    s+=`<circle cx="${(50+Math.cos(a)*d).toFixed(1)}" cy="${(50+Math.sin(a)*d).toFixed(1)}" r="${(2.5+Math.random()*3.5).toFixed(1)}" fill="${k.main}"/>`; }
  return s+'</svg>'; }
const splat=id=>{ const k=skinOf(id); return k.id==='egg'?friedEgg():blobSplat(k); };

const AVATARS=['🙂','😎','🤠','🥳','🤓','😺','🐶','🐼','🦊','🐸','🐵','🦁','🐯','🐧','🦄','🐙','🦖','🤖','👻','👽','🎨','🚀','⚽','🍕'];
S.avatar = AVATARS.includes(localStorage.avatar) ? localStorage.avatar : '🙂';
const avOf=id=>(S.players.find(p=>p.id===id)||{}).avatar||'🙂';

const ACH=[
 ['first_game','🎮','First Steps','Play 1 game',1,'played'],
 ['regular','🎲','Regular','Play 10 games',10,'played'],
 ['veteran','🏅','Veteran','Play 50 games',50,'played'],
 ['first_win','🏆','First Win','Win 1 game',1,'won'],
 ['champion','👑','Champion','Win 10 games',10,'won'],
 ['sharp_eye','👀','Sharp Eye','Make 10 correct guesses',10,'correct'],
 ['mind_reader','🧠','Mind Reader','Make 50 correct guesses',50,'correct'],
 ['guess_guru','🔮','Guess Guru','Make 100 correct guesses',100,'correct']
].map(([id,ic,name,desc,goal,stat])=>({id,ic,name,desc,goal,stat}));
const achDone=()=>ACH.filter(a=>ST.get(a.stat)>=a.goal).length;
function checkAch(){ let seen=[]; try{ seen=JSON.parse(localStorage.ach_seen||'[]'); }catch(e){}
  const fresh=ACH.filter(a=>ST.get(a.stat)>=a.goal && !seen.includes(a.id)); if(!fresh.length)return;
  localStorage.ach_seen=JSON.stringify(seen.concat(fresh.map(a=>a.id)));
  modal(fresh.length===1?'Achievement unlocked!':'Achievements unlocked!',
    fresh.map(a=>`<div class="opt" style="cursor:default"><span style="font-size:30px">${a.ic}</span><div><b>${a.name}</b><div class="gr" style="font-size:12px">${a.desc}</div></div></div>`).join(''), null, 'NICE!'); }

// ---- modal + settings screen ----
function modal(t,h,fn,btn){ $('mt').textContent=t; $('mb').innerHTML=h; $('mb').onclick=fn||null; $('mx').textContent=btn||'CLOSE'; $('modal').classList.add('on'); }
function closeModal(){ $('modal').classList.remove('on'); }
$('mx').onclick=closeModal; $('modal').onclick=e=>{ if(e.target.id==='modal') closeModal(); };

function openAvatar(){ modal('Choose your avatar','<div class="av">'+AVATARS.map(a=>`<span data-a="${a}" class="${a===S.avatar?'sel':''}">${a}</span>`).join('')+'</div>',
  e=>{ const a=e.target.dataset.a; if(!a)return; S.avatar=localStorage.avatar=a; closeModal(); renderSettings(); }); }
function openTheme(){ modal('Themes', THEMES.map(t=>{ const ok=t.ok(), sel=theme().id===t.id;
  return `<div class="opt${sel?' sel':''}${ok?'':' lock'}" data-t="${ok?t.id:''}" style="background:${t.panel};border-color:${sel?t.accent:'#888'}"><i class="sw" style="background:${t.accent}"></i><div style="flex:1"><b style="color:${ok?'#fff':'#888'}">${t.name}</b>${ok?'':`<div class="gr" style="font-size:12px">🔒 ${t.txt}</div>`}</div>${sel?`<b style="color:${t.accent};font-size:20px">✓</b>`:''}</div>`; }).join(''),
  e=>{ const el=e.target.closest('[data-t]'); if(!el||!el.dataset.t)return; localStorage.theme=el.dataset.t; applyTheme(); renderSettings(); openTheme(); }); }
function openSkin(){ modal('Egg skin', SKINS.map(k=>{ const ok=k.ok(), sel=skin().id===k.id;
  return `<div class="opt${sel?' sel':''}${ok?'':' lock'}" data-k="${ok?k.id:''}"><span style="font-size:28px;width:44px">${k.emoji}</span><div style="flex:1"><b style="color:${ok?'#fff':'#888'}">${k.name}</b>${ok?'':`<div class="gr" style="font-size:12px">🔒 ${k.txt}</div>`}</div>${sel?'<b class="am" style="font-size:20px">✓</b>':''}</div>`; }).join(''),
  e=>{ const el=e.target.closest('[data-k]'); if(!el||!el.dataset.k)return; localStorage.skin=el.dataset.k; renderSettings(); openSkin(); }); }
function openStats(){ const r=(l,k)=>`<div class="row" style="padding:8px 0"><span style="font-size:18px">${l}</span><b class="am" style="font-size:20px;text-align:right">${ST.get(k)}</b></div>`;
  modal('My stats', r('Games played','played')+r('Games won','won')+r('Games lost','lost')+r('Correct guesses','correct')+'<button class="o" data-reset="1" style="background:none;border:0;color:#999">Reset stats</button>',
  e=>{ if(e.target.dataset.reset && confirm('Reset stats? All your numbers will go back to 0.')){ ST.reset(); renderSettings(); openStats(); } }); }
function openAch(){ modal(`Achievements ${achDone()}/${ACH.length}`, ACH.map(a=>{ const p=Math.min(ST.get(a.stat),a.goal), d=p>=a.goal;
  return `<div class="opt" style="cursor:default;${d?'border:2px solid var(--amber)':''}"><span style="font-size:28px;width:40px">${d?a.ic:'🔒'}</span><div style="flex:1"><b style="color:${d?'#fff':'#999'}">${a.name}</b><div class="gr" style="font-size:12px">${a.desc}</div><div class="pb"><i style="width:${p/a.goal*100}%"></i></div></div><b class="${d?'am':'gr'}" style="font-size:${d?20:12}px">${d?'✓':p+'/'+a.goal}</b></div>`; }).join('')); }

const srow=(ic,t,v,id)=>`<div class="sr" data-r="${id}"><span class="si">${ic}</span><b class="st">${t}</b><span class="gr">${v}</span><span class="gr">›</span></div>`;
function renderSettings(){ $('srows').innerHTML =
  srow(S.avatar,'Avatar','','avatar') + srow(sound?'🔊':'🔇','Sound',sound?'ON':'OFF','sound') +
  srow('🎨','Theme',theme().name,'theme') + srow(skin().emoji,'Egg skin',skin().name,'skin') +
  srow('📊','My stats','','stats') + srow('🏆','Achievements',`${achDone()}/${ACH.length}`,'ach'); }
$('srows').onclick = e => { const el=e.target.closest('[data-r]'); if(!el)return; const r=el.dataset.r;
  if(r==='sound'){ sound=!sound; localStorage.snd=sound?'on':'off'; renderSettings(); }
  else if(r==='avatar') openAvatar(); else if(r==='theme') openTheme(); else if(r==='skin') openSkin();
  else if(r==='stats') openStats(); else if(r==='ach') openAch(); };
$('gear').onclick = () => { renderSettings(); show('settings'); };
$('sback').onclick = () => show('menu');
checkAch();

// ---------- screens ----------
function show(id){ S.phase=id; document.querySelectorAll('.s').forEach(e=>e.classList.toggle('on',e.id===id));
  if(id==='game') requestAnimationFrame(fit); if(id==='menu') checkAch(); }
const me = () => S.players.find(p=>p.id===pid);
const nameOf = id => (S.players.find(p=>p.id===id)||{}).name || '?';

// ---------- socket ----------
const socket = io(SERVER, {query:{playerId:pid}, transports:['websocket','polling']});
socket.on('connect', () => $('ban').style.display='none');
socket.on('disconnect', () => { $('ban').textContent = S.room ? 'Connection lost. Reconnecting…' : 'Connecting to server…'; $('ban').style.display='block'; });
socket.on('connect_error', () => { $('ban').textContent='Connecting to server…'; $('ban').style.display='block'; });
socket.on('resync_none', () => { if(S.phase!=='menu'&&S.phase!=='joinscr'&&S.phase!=='settings'){ S.room=''; show('menu'); } });
socket.on('resync', d => {
  S.room=d.roomCode; S.pub=!!d.isPublic; S.players=d.players; S.scores=d.scores||{}; S.strokes=(d.strokes||[]).slice(); S.redo=[]; S.live=null;
  S.drawer=d.drawerName; S.isDrawer=d.drawerId===pid; S.guessed=!!d.iGuessedCorrectly; S.vote=d.myVote||''; S.eggsLeft=d.eggsLeft||0; S.eggThrown=!!d.eggThrown;
  S.canSkip=!!d.canSkip; S.chat=(d.lobbyChat||[]).slice(); S.pickKey=''; drawChat();
  if(!d.gameActive){ drawLobby(); show('lobby'); return; }
  show('game'); $('info').textContent = `Round ${d.currentRound}/${d.totalRounds}`; setHint(d.hint, d.word); $('time').textContent=d.choosing?'--':d.timeLeft;
  setReact(d.likes,d.dislikes); $('log').innerHTML=''; hideOv();
  if(d.choosing) showChoose(d.words, 10); if(d.betweenRounds) $('over').style.display='flex';
  S.over=!!d.betweenRounds; S.choosing=!!d.choosing; updateUI(); redraw();
});
socket.on('room_updated', d => { S.room=d.roomCode; S.pub=!!d.isPublic; S.players=d.players; drawLobby(); drawScores(); });
socket.on('score_update', d => { S.scores=d.scores; drawScores(); });
socket.on('kicked', () => { S.room=''; show('menu'); alert('The host removed you from the room'); });
socket.on('lobby_message', d => { S.chat.push(d); if(S.chat.length>200) S.chat.shift(); drawChat(); });
socket.on('round_started', d => { S.strokes=[]; S.redo=[]; S.live=null; S.guessed=false; S.vote=''; S.eggThrown=false; S.drawer=d.drawerName; S.isDrawer=d.drawerId===pid;
  $('info').textContent=`Round ${d.currentRound}/${d.totalRounds}`; $('log').innerHTML=''; $('eggs').innerHTML=''; $('toast').textContent=''; show('game'); redraw(); });
socket.on('word_choice_started', d => { S.choosing=true; S.over=false; S.isDrawer=d.drawerId===pid; S.canSkip=d.canSkip; S.eggsLeft=d.eggsLeft; S.drawer=d.drawerName;
  hideOv(); showChoose(d.words, d.choiceSeconds); setHint('',null); $('time').textContent='--'; setReact(0,0); updateUI();
  if(S.isDrawer) beep([[392,.09],[523,.09],[659,.09],[784,.22]]); });
socket.on('game_started', d => { S.choosing=false; S.over=false; S.isDrawer=d.drawerId===pid; S.drawer=d.drawerName; hideOv(); setHint(d.hint,d.word);
  $('time').textContent=d.timeLeft; updateUI(); beep(SND.start); });
socket.on('timer_update', d => { $('time').textContent=d.timeLeft; $('time').style.color = d.timeLeft<=10&&d.timeLeft>0?'#ff5252':'#fff';
  if(!S.choosing && !S.over && d.timeLeft>0 && d.timeLeft<=5) beep(SND.tick); });
socket.on('hint_update', d => setHint(d.hint, S.isDrawer?$('hint').dataset.w:null));
socket.on('draw_stroke', s => { if(!S.isDrawer){ S.live=null; S.strokes.push(s); redraw(); } });
socket.on('draw_clear', () => { S.strokes=[]; S.live=null; redraw(); });
socket.on('draw_undo', () => { S.strokes.pop(); redraw(); });
socket.on('draw_live', d => { if(S.isDrawer)return; if(d.start||!S.live) S.live={points:d.points,color:d.color,width:d.width}; else S.live.points.push(...d.points); redraw(); });
socket.on('draw_live_end', () => { S.live=null; redraw(); });
socket.on('chat_message', d => { const mine=d.playerId===pid; bubble((mine?'':`<span style="color:${nameColor(d.playerId,d.playerName)};font-weight:700">${esc(d.playerName)}</span>: `)+esc(d.message), mine); });
socket.on('correct_guess', d => { bubble(`✓ ${esc(d.playerName)} got it! +${d.points}`, d.playerId===pid, 'ok');
  if(d.playerId===pid){ S.guessed=true; ST.add('correct'); updateUI(); } beep(SND.correct); });
socket.on('close_guess', () => { sys('So close!'); beep([[659,.06],[880,.14]]); });
socket.on('drawer_left', d => sys(`${d.playerName} left…`));
socket.on('reaction_update', d => setReact(d.likes,d.dislikes));
socket.on('reaction_made', d => { const t=$('toast'); t.style.color=d.type==='like'?'#4caf50':'#ff5252';
  t.textContent=`${d.playerName} ${d.type==='like'?'liked':'disliked'} the drawing`; setTimeout(()=>{t.textContent=''},3000); });
socket.on('eggs_update', d => { S.eggsLeft=d.eggsLeft; updateUI(); });
socket.on('egg_thrown', d => {
  if(d.playerId===pid){ S.eggThrown=true; updateUI(); }
  const k=skinOf(d.skin);
  const e=document.createElement('div'); e.className='egg'; e.innerHTML=splat(k.id); e.style.left=d.x*100+'%'; e.style.top=d.y*100+'%'; $('eggs').appendChild(e);
  setTimeout(()=>e.remove(),3000); beep([[150,.06],[90,.12]]); if(S.isDrawer && navigator.vibrate) navigator.vibrate([45,60,80]);
  sys(`${k.emoji} ${d.playerName} threw ${k.what}!`); });
socket.on('round_ended', d => {
  S.over=true; S.choosing=false; S.scores=d.scores; drawScores(); updateUI();
  const rows=Object.entries(d.roundPoints||{}).map(([id,p])=>`<div class="row" style="justify-content:space-between"><span style="text-align:left">${esc(avOf(id))} ${esc(nameOf(id))}</span><b style="color:#4caf50;text-align:right">+${p}</b></div>`).join('');
  $('over').innerHTML=`<div style="font-size:24px;font-weight:800">ROUND OVER</div><div class="gr">The word was</div><div class="am" style="font-size:22px;font-weight:700">${esc(d.word||'—')}</div><div style="width:100%;max-width:300px">${rows}</div><div class="gr">Next round starting…</div>`;
  $('over').style.display='flex';
  const missed = d.word && !S.isDrawer && !S.guessed; beep(missed?SND.fail:SND.end); });
socket.on('game_finished', d => {
  S.scores=d.scores;
  const list=S.players.map(p=>({id:p.id,name:p.name,av:p.avatar,score:d.scores[p.id]??0})).sort((a,b)=>b.score-a.score);
  const top=list.length?list[0].score:0; hideOv();
  const MED=['🥇','🥈','🥉'], COL=['#ffc107','#b0bec5','#cd7f32'], HT=[130,100,80];

  // podium order: 2nd, 1st, 3rd
  $('pod').innerHTML=[1,0,2].map(i=>{ const r=list[i]; if(!r) return '<div class="pc"></div>';
    return `<div class="pc">${r.score===top&&top>0?'<div class="cr">👑</div>':''}<div style="font-size:26px">${esc(r.av||'🙂')}</div><div class="nm">${esc(r.name)}</div><div class="sc">${r.score}</div><div class="bar" style="background:${COL[i]};--h:${HT[i]}px">${MED[i]}</div></div>`; }).join('');
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll('#pod .pc').forEach(e=>e.classList.add('go'))));

  // everyone after 3rd place
  const rest=list.slice(3);
  $('fsc').innerHTML = rest.length ? `<div class="rest">${rest.map((r,i)=>`<div class="rr"><span class="rk">#${i+4}</span><span class="nm">${esc(r.av||'🙂')} ${esc(r.name)}</span><b>${r.score}</b></div>`).join('')}</div>` : '';

  // awards
  const aw=d.awards||[];
  $('faw').innerHTML = aw.length ? `<div class="awt">AWARDS</div><div class="awc">${aw.map(a=>`<div class="ar"><span class="ic">${esc(a.icon||'')}</span><div class="tx"><div class="tt">${esc(a.title||'')}</div><div class="pn">${esc(a.playerName||'')}</div></div><span class="dt">${esc(a.detail||'')}</span></div>`).join('')}</div>` : '';

  show('final'); $('final').scrollTop=0;
  const won=top>0&&(d.scores[pid]??-1)===top;
  if(d.scores[pid]!==undefined){ ST.add('played'); ST.add(won?'won':'lost'); }
  if(won){ beep(SND.win); fireworks(); } else beep([[523,.12],[659,.12],[784,.12],[1047,.4]]);
  let s=15; clearInterval(finalTimer); $('fback').textContent=`Back to lobby in ${s}s...`;
  finalTimer=setInterval(()=>{ s--; $('fback').textContent=`Back to lobby in ${s}s...`; if(s<=0){ clearInterval(finalTimer); stopFw(); drawLobby(); show('lobby'); } },1000);
});

// ---------- menu ----------
$('name').value = $('name2').value = localStorage.name || '';
const q = new URLSearchParams(location.search).get('room'); if(q){ $('code').value=q.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); show('joinscr'); }
$('code').oninput = e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
function enter(ev, extra, nameEl, errEl){ const name=nameEl.value.trim(); if(!name){ errEl.textContent='Enter your name.'; return; }
  localStorage.name=name; errEl.textContent='';
  socket.emit(ev, {playerName:name, avatar:S.avatar, ...extra}, r => { if(r&&r.success){ S.room=r.roomCode; S.pub=!!r.isPublic; S.players=r.players; S.chat=[]; S.pickKey=''; drawChat(); drawLobby(); show('lobby'); } else errEl.textContent=(r&&r.message)||'Could not connect.'; }); }
$('create').onclick = () => enter('create_room', {}, $('name'), $('merr'));
$('play').onclick = () => enter('play_public', {}, $('name'), $('merr'));
$('jopen').onclick = () => { $('name2').value=$('name').value; $('jerr').textContent=''; show('joinscr'); };
$('jback').onclick = () => { $('name').value=$('name2').value; show('menu'); };
$('join').onclick = () => { const c=$('code').value.trim(); if(c.length!==6){ $('jerr').textContent='Enter the 6-character room code.'; return; } enter('join_room', {roomCode:c}, $('name2'), $('jerr')); };

// ---------- lobby ----------
function drawLobby(){
  $('rcode').textContent=S.room; const m=me(), host=!!(m&&m.isHost);
  $('plist').innerHTML=S.players.map(p=>`<div class="pl" data-id="${p.id}">${esc(p.avatar||'🙂')} <span style="color:${p.connected?'#fff':'#777'}">${esc(p.name)}${p.connected?'':' (reconnecting…)'}</span>${p.isHost?' <b class="am" style="float:right;font-size:11px">HOST</b>':''}</div>`).join('');
  $('host').style.display=host?'flex':'none'; $('wait').style.display=host?'none':'block';
  $('start').disabled = S.players.filter(p=>p.connected).length<2; }
$('plist').onclick = e => { const el=e.target.closest('.pl'); const m=me(); if(!el||!m||!m.isHost||el.dataset.id===pid)return;
  const id=el.dataset.id, n=nameOf(id);
  if(S.pub){ if(confirm(`Kick ${n}?`)) socket.emit('kick_player',{playerId:id}); return; }
  if(confirm(`Make ${n} the host?\n(Cancel for the kick option)`)) socket.emit('transfer_host',{playerId:id}); else if(confirm(`Kick ${n}?`)) socket.emit('kick_player',{playerId:id}); };

// ---- chat bubbles + reactions (same wire format as the Android app, so both see each other's) ----
const REACT='⚑|', REPLY='↪|', EMOJIS=['👍','❤️','😂','😮','😢'];
const NAMECOL=['#ff7043','#42a5f5','#66bb6a','#ab47bc','#ffca28','#26c6da','#ec407a','#9ccc65','#7e57c2','#ffa726'];
const jhash=t=>{ let h=0; for(let i=0;i<t.length;i++) h=(Math.imul(31,h)+t.charCodeAt(i))|0; return h; };
const clean=t=>String(t).replace(/\|/g,' ').trim();
function nameColor(id,name){ let i=S.players.findIndex(p=>p.id===id); if(i<0) i=S.players.findIndex(p=>p.name===String(name).replace(/ 🔒$/,'')); if(i<0) i=Math.abs(jhash(String(name)))%10; return NAMECOL[i%10]; }
function drawChat(){
  const rx={};
  S.chat.forEach(m=>{ if(!m.message.startsWith(REACT))return; const p=m.message.slice(REACT.length).split('|'); if(p.length<2)return;
    const u=rx[p[0]]=rx[p[0]]||{}, e=p.slice(1).join('|'); if(u[m.playerId]===e) delete u[m.playerId]; else u[m.playerId]=e; });
  const c=$('chat'), near=c.scrollHeight-c.scrollTop-c.clientHeight<60;
  c.innerHTML=S.chat.filter(m=>!m.message.startsWith(REACT)).map(m=>{
    const k=clean(m.playerName)+'#'+jhash(m.message), mine=m.playerId===pid; let rn=null, rq=null, text=m.message;
    if(text.startsWith(REPLY)){ const p=text.slice(REPLY.length).split('|'); if(p.length>=3){ rn=p[0]; rq=p[1]; text=p.slice(2).join('|'); } }
    const cnt={}, mineE={}; Object.entries(rx[k]||{}).forEach(([id,e])=>{ cnt[e]=(cnt[e]||0)+1; if(id===pid) mineE[e]=1; });
    const chips=Object.keys(cnt).map(e=>`<span data-k="${esc(k)}" data-e="${e}" class="${mineE[e]?'mine':''}">${e} ${cnt[e]}</span>`).join('');
    const pick=S.pickKey===k?`<div class="pick"><span data-r="${esc(k)}">↩</span>${EMOJIS.map(e=>`<span data-k="${esc(k)}" data-e="${e}">${e}</span>`).join('')}</div>`:'';
    return `<div class="bw${mine?' me':''}"><div class="bb" data-k="${esc(k)}">${mine?'':`<span class="n" style="color:${nameColor(m.playerId,m.playerName)}">${esc(m.playerName)}</span>`}${rq!==null?`<div class="rq"><b>${esc(rn)}</b>${esc(rq)}</div>`:''}${esc(text)}</div>${pick}${chips?`<div class="chips">${chips}</div>`:''}</div>`; }).join('');
  if(near) c.scrollTop=c.scrollHeight; }
// Tap a message to pick an emoji; tap a reaction chip to add or remove yours.
$('chat').onclick = e => { const el=e.target.closest('[data-e],[data-r],.bb'); if(!el)return; if(el.dataset.r){ replyTo(el.dataset.r); return; } const k=el.dataset.k;
  if(el.dataset.e){ socket.emit('lobby_chat',{message:REACT+k+'|'+el.dataset.e}); S.pickKey=''; return; }
  S.pickKey = S.pickKey===k ? '' : k; drawChat(); };

// ---- reply: tap a message then ↩, or swipe a bubble to the right ----
function setReply(r){ S.reply=r; $('rbar').style.display=r?'flex':'none'; $('msg').maxLength=r?130:200;
  if(r){ $('rn').textContent='Replying to '+r.name; $('rq2').textContent=r.quote; } }
function replyTo(k){ const m=S.chat.find(x=>!x.message.startsWith(REACT)&&clean(x.playerName)+'#'+jhash(x.message)===k); if(!m)return;
  let text=m.message; if(text.startsWith(REPLY)){ const p=text.slice(REPLY.length).split('|'); if(p.length>=3) text=p.slice(2).join('|'); }
  S.pickKey=''; setReply({name:m.playerName,quote:text}); drawChat(); $('msg').focus(); }
$('rx').onclick=()=>setReply(null);
let sw=null; const chatEl=$('chat');
chatEl.addEventListener('touchstart',e=>{ const b=e.target.closest('.bb'); if(!b){sw=null;return;} const t=e.touches[0]; sw={b,k:b.dataset.k,x:t.clientX,y:t.clientY,dx:0}; },{passive:true});
chatEl.addEventListener('touchmove',e=>{ if(!sw)return; const t=e.touches[0], dx=t.clientX-sw.x, dy=t.clientY-sw.y;
  if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>10){ sw.b.style.transform=''; sw=null; return; }
  sw.dx=Math.max(0,Math.min(120,dx)); sw.b.style.transform=`translateX(${sw.dx}px)`; },{passive:true});
chatEl.addEventListener('touchend',()=>{ if(!sw)return; sw.b.style.transform=''; const k=sw.k, go=sw.dx>80; sw=null; if(go) replyTo(k); });
$('msg').onkeydown = e => { if(e.key!=='Enter')return; let t=e.target.value.trim(); if(!t)return;
  if(S.reply){ t=REPLY+clean(S.reply.name)+'|'+clean(S.reply.quote).slice(0,40)+'|'+t.slice(0,130); }
  socket.emit('lobby_chat',{message:t}); e.target.value=''; setReply(null); };
$('rcode').onclick = async () => { const c=S.room; if(!c)return;
  try{ await navigator.clipboard.writeText(c); }catch(e){ const t=document.createElement('textarea'); t.value=c; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(_){} t.remove(); }
  const h=$('chint'); h.textContent='Room code copied ✓'; setTimeout(()=>{ h.textContent='Tap to copy'; },1500); };
$('start').onclick = () => { $('lerr').textContent='';
  socket.emit('start_game',{rounds:+$('rounds').value, roundTime:+$('rtime').value, choiceCount:+$('choices').value,
    customWords:$('custom').value.split(/[,\n]/).map(s=>s.trim()).filter(Boolean), customOnly:$('conly').checked}, r=>{ if(r&&!r.success) $('lerr').textContent=r.message; }); };
$('leave').onclick = $('fleave').onclick = () => { socket.emit('leave_room'); S.room=''; S.chat=[]; setReply(null); clearInterval(finalTimer); stopFw(); show('menu'); };

// ---------- game UI ----------
function setHint(h, word){ const el=$('hint'); if(S.isDrawer&&word){ el.dataset.w=word; el.textContent=word; return; }
  el.textContent = h ? h.split(' ').filter(Boolean).map(w=>[...w].join('\u00A0')+'\u00A0'+w.length).join('   ') : (S.choosing?`${S.drawer} is choosing a word…`:''); }
function setReact(l,d){ $('like').textContent='👍 '+l; $('dis').textContent='👎 '+d; }
function bubble(inner,mine,cls){ const l=$('log'); l.insertAdjacentHTML('beforeend',`<div class="bw${mine?' me':''}"><div class="bb ${cls||''}">${inner}</div></div>`); l.scrollTop=l.scrollHeight; }
function sys(t){ const l=$('log'); l.insertAdjacentHTML('beforeend',`<div class="sys">${esc(t)}</div>`); l.scrollTop=l.scrollHeight; }
function drawScores(){ $('scores').innerHTML='<b class="am sh">SCORES</b> '+S.players.slice().sort((a,b)=>(S.scores[b.id]||0)-(S.scores[a.id]||0)).map(p=>`<span class="sp">${esc(p.avatar||'🙂')} ${esc(p.name)} <b class="am">${S.scores[p.id]||0}</b></span>`).join(' &nbsp; '); }
function hideOv(){ $('choose').style.display='none'; $('over').style.display='none'; }
let chTimer;
function showChoose(words, secs){ const o=$('choose'); o.style.display='flex'; clearInterval(chTimer);
  if(S.isDrawer&&words&&words.length){ o.innerHTML=`<div style="font-size:22px;font-weight:800">CHOOSE A WORD</div><div class="gr" id="chs">${secs}s</div>`+words.map(w=>`<button data-w="${esc(w)}" style="width:240px">${esc(w)}</button>`).join('');
    let s=secs; chTimer=setInterval(()=>{ s--; const e=$('chs'); if(e)e.textContent=Math.max(0,s)+'s'; if(s<=0)clearInterval(chTimer); },1000);
    o.querySelectorAll('button').forEach(b=>b.onclick=()=>socket.emit('choose_word',{word:b.dataset.w})); }
  else o.innerHTML=`<div style="font-size:18px;font-weight:700">${esc(S.drawer)} is choosing a word</div><div class="gr">Get ready to guess!</div>`; }
function canDraw(){ return S.isDrawer && !S.over && !S.choosing; }
function updateUI(){
  $('tools').style.display = S.isDrawer ? 'flex' : 'none'; if(!S.isDrawer&&S.panel){ S.panel=''; renderTb(); } if(!S.isDrawer) S.chatOpen=false; $('guess').style.display = (!S.isDrawer||S.chatOpen) ? 'block' : 'none'; $('log').classList.toggle('dr',!!S.isDrawer);
  $('guess').placeholder = S.isDrawer ? 'Chat 🔒 (only players who guessed)' : S.guessed ? 'Chat 🔒 (drawer & guessers only)' : 'Type your guess';
  const r=$('react'); r.style.display = (!S.isDrawer && !S.choosing && !S.over) ? 'flex' : 'none';
  $('egg').style.display = (S.eggsLeft>0 && !S.eggThrown) ? '' : 'none'; $('egg').textContent = skin().emoji;
  $('like').style.opacity = S.vote==='dislike'?.4:1; $('dis').style.opacity = S.vote==='like'?.4:1; }
$('like').onclick = () => { if(!S.vote){ S.vote='like'; socket.emit('react',{type:'like'}); updateUI(); } };
$('dis').onclick = () => { if(!S.vote){ S.vote='dislike'; socket.emit('react',{type:'dislike'}); updateUI(); } };
$('egg').onclick = () => socket.emit('throw_egg', {skin: skin().id});
$('guess').onkeydown = e => { if(e.key==='Enter'){ const t=e.target.value.trim(); if(t){ socket.emit('player_guess',{guess:t}); e.target.value=''; } } };

// Drawer: tap the messages box to start chatting (no permanent text box)
function closeChat(){ S.chatOpen=false; S.closedAt=Date.now(); const g=$('guess'); g.blur(); g.style.display='none'; }
$('log').onclick = () => { if(!S.isDrawer) return;
  if(S.chatOpen){ closeChat(); return; }
  if(Date.now()-(S.closedAt||0)<400) return;   // this tap already closed it (blur fired first)
  S.chatOpen=true; const g=$('guess'); g.style.display='block'; g.focus(); };
$('guess').onblur = () => { if(!S.isDrawer) return; setTimeout(()=>{ const g=$('guess'); if(S.chatOpen && document.activeElement!==g && !g.value.trim()) closeChat(); },150); };

// tools
$('pal').innerHTML = PAL.map(c=>`<div class="dot${c===S.color?' sel':''}" data-c="${c}" style="background:${c}"></div>`).join('');
$('pal').onclick = e => { const c=e.target.dataset.c; if(!c)return; S.color=c; S.panel=''; renderTb(); document.querySelectorAll('.dot').forEach(d=>d.classList.toggle('sel',d.dataset.c===c)); };
const SYM={pen:'<span style="color:#42a5f5">✎</span>',tri:'△',sq:'□',cir:'○'}, SIZES=[4,8,14,22,32];
const sdot=z=>`<i style="display:block;border-radius:50%;background:#fff;width:${z}px;height:${z}px"></i>`;
function friedEgg(){ let d=''; for(let i=0;i<8;i++){ const a=Math.random()*6.283, r=27+Math.random()*20, x=50+Math.cos(a)*r, y=50+Math.sin(a)*r;
    d+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.5+Math.random()*3.5).toFixed(1)}" fill="#ffc928"/>`; }
  return `<svg viewBox="0 0 100 100"><path d="M26 49C17.5 35 28.5 26 40 30C47.5 19 59 24 62.5 32.5C77.5 28.5 83 41 74 51C84 63.5 70 74 59 69.5C51 79 40 76 37 68C22.5 74 16 60 26 49Z" fill="#fffef5" stroke="#d9c89b" stroke-width="2.2" stroke-linejoin="round"/>`+
  `<circle cx="29" cy="38" r="2.2" fill="#c99b52" opacity=".35"/><circle cx="71.5" cy="60" r="1.8" fill="#c99b52" opacity=".3"/><circle cx="56" cy="71.5" r="2" fill="#c99b52" opacity=".3"/>`+
  `<circle cx="51.5" cy="53.5" r="12.8" fill="#e99a00"/><circle cx="50" cy="50" r="11.8" fill="#ffc928"/><circle cx="47.7" cy="47.2" r="8" fill="#ffe36a"/><circle cx="45" cy="44" r="2.3" fill="#fff" opacity=".7"/>`+d+`</svg>`; }
const bucket=c=>`<svg width="26" height="26" viewBox="0 0 28 28"><g transform="rotate(-20 14 14)"><path d="M8 6a6 6 0 0 1 12 0" fill="none" stroke="#b0bec5" stroke-width="1.6" stroke-linecap="round"/><path d="M5 9h18l-2.6 14H7.6z" fill="#546e7a"/><ellipse cx="14" cy="9" rx="9" ry="2.6" fill="#cfd8dc"/><ellipse cx="14" cy="9.2" rx="7.2" ry="1.7" fill="${c}" stroke="#888" stroke-width=".5"/></g><path d="M24 14c2 3 3 4 3 5.5a3 3 0 0 1-6 0c0-1.5 1-2.5 3-5.5z" fill="${c}" stroke="#888" stroke-width=".5"/></svg>`;
function renderTb(){ const t=S.tool, sel=c=>c?' class="sel"':'';
  $('tb').innerHTML=
    `<button data-p="shape"${sel(S.panel==='shape')}>${SYM[t]||SYM.pen}</button>`+
    `<button data-p="size"${sel(S.panel==='size')}>${sdot(Math.min(24,Math.max(5,S.size)))}</button>`+
    `<button data-a="fill"${sel(t==='fill')}>${bucket(S.color)}</button><button data-a="undo">↶</button><button data-a="redo">↷</button><button data-a="clear">🗑</button>`;
  const st=$('strip');
  if(S.panel==='shape') st.innerHTML=['pen','tri','sq','cir'].map(x=>`<button data-t="${x}"${sel(t===x)}>${SYM[x]}</button>`).join('');
  else if(S.panel==='size') st.innerHTML=SIZES.map(z=>`<button data-s="${z}"${sel(S.size===z)}>${sdot(Math.min(32,z))}</button>`).join('');
  st.style.display = S.panel&&S.isDrawer ? 'flex' : 'none'; }
$('tb').onclick = e => { const b=e.target.closest('button'); if(!b)return; const a=b.dataset.a, p=b.dataset.p;
  if(p){ if(S.tool==='fill'){ S.tool='pen'; S.panel=p; } else S.panel = S.panel===p ? '' : p; }
  else if(a==='fill'){ S.tool = S.tool==='fill' ? 'pen' : 'fill'; S.panel=''; }
  else if(a==='undo'){ S.panel=''; const s=S.strokes.pop(); if(s){ S.redo.push(s); socket.emit('draw_undo'); redraw(); } }
  else if(a==='redo'){ S.panel=''; const s=S.redo.pop(); if(s){ S.strokes.push(s); socket.emit('draw_stroke',s); redraw(); } }
  else if(a==='clear'){ S.panel=''; S.strokes=[]; S.redo=[]; socket.emit('draw_clear'); redraw(); }
  renderTb(); };
$('strip').onclick = e => { const b=e.target.closest('button'); if(!b)return; if(b.dataset.t) S.tool=b.dataset.t; if(b.dataset.s) S.size=+b.dataset.s; S.panel=''; renderTb(); };
renderTb();

// ---------- canvas ----------
const cv=$('cv'), cx=cv.getContext('2d');
function fit(){ const r=cv.parentElement.getBoundingClientRect(); if(r.width<1)return; cv.width=Math.round(r.width); cv.height=Math.round(r.height); redraw(); }
addEventListener('resize', fit); if(window.ResizeObserver) new ResizeObserver(()=>{ if(S.phase==='game') fit(); }).observe($('cwrap')); addEventListener('orientationchange', ()=>setTimeout(fit,300));
function floodFill(x,y,hex){ const w=cv.width,h=cv.height; if(x<0||y<0||x>=w||y>=h)return;
  const im=cx.getImageData(0,0,w,h), d=im.data, c=parseInt(hex.slice(1),16), R=c>>16, G=c>>8&255, B=c&255, i0=(y*w+x)*4, tr=d[i0], tg=d[i0+1], tb=d[i0+2];
  if(Math.abs(tr-R)+Math.abs(tg-G)+Math.abs(tb-B)<3)return;
  const ok=i=>Math.abs(d[i]-tr)<=48&&Math.abs(d[i+1]-tg)<=48&&Math.abs(d[i+2]-tb)<=48, seen=new Uint8Array(w*h), st=[y*w+x];
  while(st.length){ const p=st.pop(); if(seen[p]||!ok(p*4))continue; seen[p]=1; const i=p*4; d[i]=R; d[i+1]=G; d[i+2]=B; d[i+3]=255;
    const px=p%w; if(px>0)st.push(p-1); if(px<w-1)st.push(p+1); if(p>=w)st.push(p-w); if(p<w*(h-1))st.push(p+w); }
  cx.putImageData(im,0,0); }
function paint(s){ if(!s||!s.points||!s.points.length)return; const w=cv.width, h=cv.height, P=s.points;
  if(s.width<=0&&P.length===1){ floodFill(P[0].x*w|0, P[0].y*h|0, s.color); return; }
  const lw=Math.max(1,s.width*w/1000); cx.strokeStyle=cx.fillStyle=s.color; cx.lineCap=cx.lineJoin='round'; cx.lineWidth=lw;
  if(P.length===1){ cx.beginPath(); cx.arc(P[0].x*w,P[0].y*h,lw/2,0,7); cx.fill(); return; }
  cx.beginPath(); P.forEach((p,i)=>i?cx.lineTo(p.x*w,p.y*h):cx.moveTo(p.x*w,p.y*h)); cx.stroke(); }
function redraw(){ cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height); S.strokes.forEach(paint); if(S.live)paint(S.live); }
function shape(t,a,b){ const l=Math.min(a.x,b.x), r=Math.max(a.x,b.x), tp=Math.min(a.y,b.y), bt=Math.max(a.y,b.y);
  if(t==='sq') return [{x:l,y:tp},{x:r,y:tp},{x:r,y:bt},{x:l,y:bt},{x:l,y:tp}];
  if(t==='tri'){ const m=(l+r)/2; return [{x:m,y:tp},{x:r,y:bt},{x:l,y:bt},{x:m,y:tp}]; }
  const cxn=(l+r)/2, cyn=(tp+bt)/2, rx=(r-l)/2, ry=(bt-tp)/2; return Array.from({length:49},(_,i)=>({x:cxn+rx*Math.cos(i/48*6.2832), y:cyn+ry*Math.sin(i/48*6.2832)})); }
let cur=null, origin=null, sent=0, lastLive=0;
const pos = e => { const r=cv.getBoundingClientRect(); return {x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)), y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))}; };
const wireW = () => S.size*1000/cv.width;
function sendLive(start){ if(S.tool==='pen'){ const pts=cur.points.slice(sent); if(!pts.length)return; sent=cur.points.length;
    socket.emit('draw_live',{points:pts,color:cur.color,width:cur.width,start}); }
  else socket.emit('draw_live',{points:cur.points,color:cur.color,width:cur.width,start:true}); }
cv.onpointerdown = e => { if(!canDraw())return; e.preventDefault(); if(S.panel){ S.panel=''; renderTb(); } cv.setPointerCapture(e.pointerId); const p=pos(e);
  if(S.tool==='fill'){ const s={points:[p],color:S.color,width:0}; S.redo=[]; S.strokes.push(s); paint(s); socket.emit('draw_stroke',s); return; }
  origin=p; cur={points:[p],color:S.color,width:wireW()}; sent=0; if(S.tool==='pen') sendLive(true); };
cv.onpointermove = e => { if(!cur)return; e.preventDefault(); const p=pos(e);
  if(S.tool==='pen') cur.points.push(p); else cur.points=shape(S.tool,origin,p);
  S.live=cur; redraw(); const n=Date.now(); if(n-lastLive>40){ lastLive=n; sendLive(false); } };
function endDraw(e){ if(!cur)return; const pts=cur.points, c=cur; cur=null; S.live=null;
  const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y), big = S.tool==='pen' || Math.max(...xs)-Math.min(...xs) > 6/cv.width || Math.max(...ys)-Math.min(...ys) > 6/cv.height;
  if(big && pts.length>=1 && e.type!=='pointercancel'){ S.redo=[]; S.strokes.push(c); socket.emit('draw_stroke',c); } else socket.emit('draw_live_end');
  redraw(); }
cv.onpointerup = cv.onpointercancel = endDraw;

// ---------- fireworks (winner) ----------
let fwOn=false, sparks=[];
function stopFw(){ fwOn=false; sparks=[]; const f=$('fw'); f.getContext('2d').clearRect(0,0,f.width,f.height); }
function fireworks(){ const f=$('fw'), c=f.getContext('2d'); f.width=innerWidth; f.height=innerHeight; fwOn=true; sparks=[]; let next=0, last=performance.now();
  const cols=['#ff5252','#ffd740','#69f0ae','#40c4ff','#e040fb','#fff'];
  (function tick(now){ if(!fwOn)return; const dt=Math.min(.05,(now-last)/1000); last=now; next-=dt;
    if(next<=0){ const x=f.width*(.15+Math.random()*.7), y=f.height*(.12+Math.random()*.38), col=cols[Math.random()*6|0]; next=.4+Math.random()*.6;
      for(let i=0;i<45;i++){ const a=Math.random()*6.283, v=150+Math.random()*300; sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,col,l:1,r:2+Math.random()*3}); }
      beep([[110,.08],[70,.18]]); }
    c.clearRect(0,0,f.width,f.height);
    sparks=sparks.filter(s=>s.l>0); sparks.forEach(s=>{ s.vy+=320*dt; s.vx*=.985; s.vy*=.985; s.x+=s.vx*dt; s.y+=s.vy*dt; s.l-=dt*.9;
      c.globalAlpha=Math.max(0,s.l); c.fillStyle=s.col; c.beginPath(); c.arc(s.x,s.y,s.r,0,7); c.fill(); });
    c.globalAlpha=1; requestAnimationFrame(tick); })(last); }

// ---------- keyboard / viewport ----------
// When the phone keyboard opens, the page is resized to the visible area
// (instead of being pushed up), and the "kb" class hides the extra parts.
let baseH = 0;
function vp(){
  const v = window.visualViewport, h = v ? v.height : innerHeight;
  if(h > baseH) baseH = h;
  const desktop = matchMedia('(min-width:900px) and (min-height:600px)').matches;
  const kb = !desktop && baseH - h > 120;          // keyboard is open (phones only)
  document.body.classList.toggle('kb', kb);
  const r = document.documentElement.style;
  r.setProperty('--vh', h + 'px');
  r.setProperty('--top', (v ? v.offsetTop : 0) + 'px');
  if(kb && S.panel){ S.panel = ''; renderTb(); }   // close the tool menu while typing
  if(kb){ window.scrollTo(0,0); const c = $('chat'); c.scrollTop = c.scrollHeight; }
}
if(window.visualViewport){
  visualViewport.addEventListener('resize', vp);
  visualViewport.addEventListener('scroll', vp);
}
addEventListener('resize', vp);
addEventListener('orientationchange', () => { baseH = 0; setTimeout(vp, 300); });
vp();

// Latest 3 chat lines as a bubble on the drawing (visible only while the keyboard is open)
function popSync(){
  const items = [...$('log').querySelectorAll('.bb,.sys')].slice(-3);
  $('pop').innerHTML = items.map(e => `<div>${e.innerHTML}</div>`).join('');
}
new MutationObserver(popSync).observe($('log'), {childList:true});
</script>
</body></html>
