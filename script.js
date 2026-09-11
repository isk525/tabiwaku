const STORAGE_KEY = "tabiwaku-v1-2";
const TYPES = {
  move: { label: "移動", icon: "🚗" },
  sight: { label: "観光", icon: "📍" },
  food: { label: "食事", icon: "🍴" },
  stay: { label: "宿泊", icon: "🏨" },
  other: { label: "その他", icon: "●" }
};

const tripTitleInput = document.getElementById("tripTitle");
const tripDateInput = document.getElementById("tripDate");
const addDayButton = document.getElementById("addDayButton");
const daysEditor = document.getElementById("daysEditor");
const previewTitle = document.getElementById("previewTitle");
const previewDate = document.getElementById("previewDate");
const countdown = document.getElementById("countdown");
const emptyPreview = document.getElementById("emptyPreview");
const timeline = document.getElementById("timeline");
const saveStatus = document.getElementById("saveStatus");
let trip = loadTrip();
let saveStatusTimer;

renderAll();
tripTitleInput.addEventListener("input", function(){ trip.title=tripTitleInput.value; persistAndPreview(); });
tripDateInput.addEventListener("input", function(){ trip.date=tripDateInput.value; persistAndPreview(); });
addDayButton.addEventListener("click", function(){ trip.days.push(createDay()); persistAndRender(); });

function createId(){ return window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : String(Date.now())+"-"+Math.random().toString(16).slice(2); }
function createSchedule(){ return { id:createId(), type:"sight", time:"", place:"" }; }
function createDay(){ return { id:createId(), schedules:[createSchedule()] }; }
function createEmptyTrip(){ return { title:"", date:"", days:[createDay()] }; }
function loadTrip(){
  const saved=localStorage.getItem(STORAGE_KEY);
  if(!saved) return createEmptyTrip();
  try {
    const parsed=JSON.parse(saved);
    if(!parsed || !Array.isArray(parsed.days)) return createEmptyTrip();
    parsed.days.forEach(function(day){
      if(!Array.isArray(day.schedules)) day.schedules=[createSchedule()];
      day.schedules.forEach(function(s){ if(!TYPES[s.type]) s.type="sight"; });
    });
    return { title:typeof parsed.title==="string"?parsed.title:"", date:typeof parsed.date==="string"?parsed.date:"", days:parsed.days.length?parsed.days:[createDay()] };
  } catch(error){ console.error("保存データを読み込めませんでした。",error); return createEmptyTrip(); }
}
function saveTrip(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(trip)); showSavedStatus(); }
function showSavedStatus(){ saveStatus.textContent="保存しました"; clearTimeout(saveStatusTimer); saveStatusTimer=setTimeout(function(){saveStatus.textContent="自動保存";},1200); }
function renderAll(){ tripTitleInput.value=trip.title; tripDateInput.value=trip.date; renderEditor(); renderPreview(); }
function persistAndRender(){ saveTrip(); renderEditor(); renderPreview(); }
function persistAndPreview(){ saveTrip(); renderPreview(); }

function renderEditor(){
  daysEditor.replaceChildren();
  trip.days.forEach(function(day,dayIndex){
    const card=document.createElement("section"); card.className="day-card";
    const heading=document.createElement("div"); heading.className="day-heading";
    const title=document.createElement("h3"); title.textContent="DAY "+(dayIndex+1);
    const actions=document.createElement("div"); actions.className="day-actions";
    const add=document.createElement("button"); add.type="button"; add.className="button button-primary"; add.textContent="＋ 予定を追加";
    add.addEventListener("click",function(){day.schedules.push(createSchedule());persistAndRender();}); actions.appendChild(add);
    if(trip.days.length>1){
      const delDay=document.createElement("button"); delDay.type="button"; delDay.className="button button-danger"; delDay.textContent="この日を削除";
      delDay.addEventListener("click",function(){trip.days.splice(dayIndex,1);persistAndRender();}); actions.appendChild(delDay);
    }
    heading.append(title,actions);
    const list=document.createElement("div"); list.className="schedule-list";
    day.schedules.forEach(function(schedule,scheduleIndex){
      const row=document.createElement("div"); row.className="schedule-row";
      const type=document.createElement("select"); type.className="schedule-type"; type.setAttribute("aria-label","予定の種別");
      Object.keys(TYPES).forEach(function(key){ const option=document.createElement("option"); option.value=key; option.textContent=TYPES[key].icon+" "+TYPES[key].label; option.selected=schedule.type===key; type.appendChild(option); });
      type.addEventListener("change",function(){schedule.type=type.value;persistAndPreview();});
      const time=document.createElement("input"); time.type="time"; time.className="schedule-time"; time.value=schedule.time; time.setAttribute("aria-label","時刻");
      time.addEventListener("input",function(){schedule.time=time.value;persistAndPreview();});
      const place=document.createElement("input"); place.type="text"; place.className="schedule-place"; place.placeholder="目的地・移動・食事・宿泊など"; place.value=schedule.place; place.setAttribute("aria-label","予定の内容");
      place.addEventListener("input",function(){schedule.place=place.value;persistAndPreview();});
      const del=document.createElement("button"); del.type="button"; del.className="icon-button"; del.textContent="×"; del.title="この予定を削除";
      del.addEventListener("click",function(){ if(day.schedules.length===1){schedule.type="sight";schedule.time="";schedule.place="";}else{day.schedules.splice(scheduleIndex,1);} persistAndRender(); });
      row.append(type,time,place,del); list.appendChild(row);
    });
    card.append(heading,list); daysEditor.appendChild(card);
  });
}

function renderPreview(){
  previewTitle.textContent=trip.title.trim()||"旅行名未設定";
  previewDate.textContent=formatDate(trip.date);
  countdown.textContent=getCountdownText(trip.date);
  timeline.replaceChildren();
  const has=trip.days.some(function(day){return day.schedules.some(function(s){return s.time||s.place.trim();});});
  emptyPreview.hidden=has;
  if(!has) return;
  trip.days.forEach(function(day,dayIndex){
    const filled=day.schedules.filter(function(s){return s.time||s.place.trim();});
    if(!filled.length) return;
    const section=document.createElement("section"); section.className="preview-day";
    const h=document.createElement("h3"); h.className="preview-day-title"; h.textContent="DAY "+(dayIndex+1); section.appendChild(h);
    filled.forEach(function(schedule){
      const meta=TYPES[schedule.type]||TYPES.other;
      const item=document.createElement("div"); item.className="preview-item";
      const time=document.createElement("div"); time.className="preview-time"; time.textContent=schedule.time||"--:--";
      const line=document.createElement("div"); line.className="preview-line";
      const icon=document.createElement("span"); icon.className="preview-icon"; icon.textContent=meta.icon; line.appendChild(icon);
      const content=document.createElement("div"); content.className="preview-content";
      const place=document.createElement("div"); place.className="preview-place"; place.textContent=schedule.place.trim()||"内容未入力";
      const type=document.createElement("div"); type.className="preview-type"; type.textContent=meta.label; content.append(place,type);
      item.append(time,line,content);
      if(schedule.place.trim()){
        const map=document.createElement("a"); map.className="map-link"; map.textContent="🗺 地図"; map.target="_blank"; map.rel="noopener noreferrer";
        map.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(schedule.place.trim()); item.appendChild(map);
      }
      section.appendChild(item);
    });
    timeline.appendChild(section);
  });
}
function formatDate(value){ if(!value)return ""; const p=value.split("-"); return p.length===3?p[0]+"年"+Number(p[1])+"月"+Number(p[2])+"日":value; }
function getCountdownText(value){
  if(!value)return ""; const p=value.split("-").map(Number); if(p.length!==3||p.some(Number.isNaN))return "";
  const today=new Date(); today.setHours(0,0,0,0); const departure=new Date(p[0],p[1]-1,p[2]); departure.setHours(0,0,0,0);
  const days=Math.round((departure.getTime()-today.getTime())/(24*60*60*1000));
  if(days>0)return "出発まであと "+days+" 日"; if(days===0)return "本日出発！"; return "旅行終了";
}
