const STORAGE_KEY = "tabiwaku-v1-3";
const PREVIOUS_KEYS = ["tabiwaku-v1-2", "tabiwaku-v1-1"];
const TYPES = {
  move:{label:"移動",icon:"🚗"}, sight:{label:"観光",icon:"📍"},
  food:{label:"食事",icon:"🍴"}, stay:{label:"宿泊",icon:"🏨"}, other:{label:"その他",icon:"●"}
};

const elements = {
  title:document.getElementById("tripTitle"), date:document.getElementById("tripDate"),
  addDay:document.getElementById("addDayButton"), days:document.getElementById("daysEditor"),
  previewTitle:document.getElementById("previewTitle"), previewDate:document.getElementById("previewDate"),
  countdown:document.getElementById("countdown"), empty:document.getElementById("emptyPreview"),
  timeline:document.getElementById("timeline"), status:document.getElementById("saveStatus")
};
let trip = loadTrip();
let statusTimer;

renderAll();
elements.title.addEventListener("input",function(){trip.title=elements.title.value;saveAndPreview();});
elements.date.addEventListener("input",function(){trip.date=elements.date.value;saveAndPreview();});
elements.addDay.addEventListener("click",function(){trip.days.push(createDay());saveAndRender();});
document.querySelectorAll(".tab-button").forEach(function(button){
  button.addEventListener("click",function(){switchMobileView(button.dataset.view);});
});

function id(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2);}
function createSchedule(){return{id:id(),type:"sight",time:"",place:""};}
function createDay(){return{id:id(),schedules:[createSchedule()]};}
function emptyTrip(){return{title:"",date:"",days:[createDay()]};}
function normalize(data){
  if(!data||!Array.isArray(data.days))return emptyTrip();
  const days=data.days.length?data.days:[createDay()];
  days.forEach(function(day){
    if(!Array.isArray(day.schedules)||!day.schedules.length)day.schedules=[createSchedule()];
    day.schedules.forEach(function(s){s.id=s.id||id();s.type=TYPES[s.type]?s.type:"sight";s.time=typeof s.time==="string"?s.time:"";s.place=typeof s.place==="string"?s.place:"";});
  });
  return{title:typeof data.title==="string"?data.title:"",date:typeof data.date==="string"?data.date:"",days:days};
}
function loadTrip(){
  const keys=[STORAGE_KEY].concat(PREVIOUS_KEYS);
  for(const key of keys){
    const raw=localStorage.getItem(key);
    if(raw){try{return normalize(JSON.parse(raw));}catch(error){console.error("保存データ読込失敗",error);}}
  }
  return emptyTrip();
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(trip));elements.status.textContent="保存しました";clearTimeout(statusTimer);statusTimer=setTimeout(function(){elements.status.textContent="自動保存";},1000);}
function saveAndRender(){save();renderEditor();renderPreview();}
function saveAndPreview(){save();renderPreview();}
function renderAll(){elements.title.value=trip.title;elements.date.value=trip.date;renderEditor();renderPreview();}

function renderEditor(){
  elements.days.replaceChildren();
  trip.days.forEach(function(day,dayIndex){
    const card=node("section","day-card");
    const heading=node("div","day-heading");
    const dayTitle=node("h3","","DAY "+(dayIndex+1));
    const actions=node("div","day-actions");
    if(trip.days.length>1){
      const deleteDay=button("この日を削除","button button-danger",function(){trip.days.splice(dayIndex,1);saveAndRender();});
      actions.appendChild(deleteDay);
    }
    heading.append(dayTitle,actions);
    const list=node("div","schedule-list");
    day.schedules.forEach(function(schedule,index){list.appendChild(renderScheduleCard(day,schedule,index));});
    const add=button("＋ 予定を追加","button button-primary add-schedule-full",function(){day.schedules.push(createSchedule());saveAndRender();});
    card.append(heading,list,add);elements.days.appendChild(card);
  });
}

function renderScheduleCard(day,schedule,index){
  const card=node("article","schedule-card");
  const top=node("div","schedule-card-top");
  const type=document.createElement("select");type.className="schedule-type";type.setAttribute("aria-label","予定の種別");
  Object.keys(TYPES).forEach(function(key){const op=document.createElement("option");op.value=key;op.textContent=TYPES[key].icon+" "+TYPES[key].label;op.selected=schedule.type===key;type.appendChild(op);});
  type.addEventListener("change",function(){schedule.type=type.value;saveAndPreview();});
  const del=button("×","delete-button",function(){if(day.schedules.length===1){Object.assign(schedule,createSchedule(),{id:schedule.id});}else{day.schedules.splice(index,1);}saveAndRender();});del.title="この予定を削除";
  top.append(type,del);

  const timeBox=node("div","time-editor");
  const timeLabel=node("div","field-label","時刻");
  const timeMain=node("div","time-main");
  const minus=button("−","step-button",function(){adjustTime(schedule,-15);});
  const time=document.createElement("input");time.type="time";time.className="time-input";time.value=schedule.time;time.step="300";time.setAttribute("aria-label","時刻");
  time.addEventListener("input",function(){schedule.time=time.value;saveAndPreview();});
  const plus=button("＋","step-button",function(){adjustTime(schedule,15);});
  timeMain.append(minus,time,plus);
  const shortcuts=node("div","time-shortcuts");
  ["07:00","08:00","09:00","12:00","18:00"].forEach(function(value){shortcuts.appendChild(button(value,"shortcut-button",function(){schedule.time=value;saveAndRender();}));});
  const previous=findPreviousTime(day,index);
  if(previous){shortcuts.appendChild(button("前の予定＋30分","shortcut-button",function(){schedule.time=addMinutes(previous,30);saveAndRender();}));}
  timeBox.append(timeLabel,timeMain,shortcuts);

  const placeBox=node("label","place-field");placeBox.appendChild(node("span","field-label","目的地・予定"));
  const place=document.createElement("input");place.type="text";place.placeholder="例：下灘駅、昼食、ホテルへ移動";place.value=schedule.place;
  place.addEventListener("input",function(){schedule.place=place.value;saveAndPreview();});placeBox.appendChild(place);
  card.append(top,timeBox,placeBox);return card;
}

function adjustTime(schedule,minutes){schedule.time=addMinutes(schedule.time||"09:00",minutes);saveAndRender();}
function addMinutes(value,minutes){const parts=value.split(":").map(Number);let total=(parts[0]*60+parts[1]+minutes+1440)%1440;return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0");}
function findPreviousTime(day,index){for(let i=index-1;i>=0;i--){if(day.schedules[i].time)return day.schedules[i].time;}return "";}
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function button(text,className,handler){const el=document.createElement("button");el.type="button";el.className=className;el.textContent=text;el.addEventListener("click",handler);return el;}

function renderPreview(){
  elements.previewTitle.textContent=trip.title.trim()||"旅行名未設定";
  elements.previewDate.textContent=formatDate(trip.date);
  elements.countdown.textContent=countdownText(trip.date);
  elements.timeline.replaceChildren();
  const has=trip.days.some(function(day){return day.schedules.some(function(s){return s.time||s.place.trim();});});
  elements.empty.hidden=has;if(!has)return;
  trip.days.forEach(function(day,dayIndex){
    const filled=day.schedules.filter(function(s){return s.time||s.place.trim();});if(!filled.length)return;
    const section=node("section","preview-day");section.appendChild(node("h3","preview-day-title","DAY "+(dayIndex+1)));
    filled.forEach(function(s){
      const meta=TYPES[s.type]||TYPES.other;const item=node("div","preview-item");
      item.appendChild(node("div","preview-time",s.time||"--:--"));
      const line=node("div","preview-line");line.appendChild(node("span","preview-icon",meta.icon));item.appendChild(line);
      const content=node("div","preview-content");content.append(node("div","preview-place",s.place.trim()||"内容未入力"),node("div","preview-type",meta.label));item.appendChild(content);
      if(s.place.trim()){const map=document.createElement("a");map.className="map-link";map.textContent="🗺 地図";map.target="_blank";map.rel="noopener noreferrer";map.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(s.place.trim());item.appendChild(map);}
      section.appendChild(item);
    });elements.timeline.appendChild(section);
  });
}
function formatDate(value){if(!value)return"";const p=value.split("-");return p.length===3?p[0]+"年"+Number(p[1])+"月"+Number(p[2])+"日":value;}
function countdownText(value){if(!value)return"";const p=value.split("-").map(Number);if(p.length!==3||p.some(Number.isNaN))return"";const today=new Date();today.setHours(0,0,0,0);const target=new Date(p[0],p[1]-1,p[2]);const days=Math.round((target-today)/86400000);return days>0?"出発まであと "+days+" 日":days===0?"本日出発！":"旅行終了";}
function switchMobileView(view){document.querySelectorAll(".tab-button").forEach(function(b){b.classList.toggle("active",b.dataset.view===view);});document.getElementById("editPanel").classList.toggle("active",view==="edit");document.getElementById("previewPanel").classList.toggle("active",view==="preview");window.scrollTo({top:0,behavior:"smooth"});}
