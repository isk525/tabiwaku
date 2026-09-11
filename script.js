const tripTitle =
document.getElementById("tripTitle");

const tripDate =
document.getElementById("tripDate");

const scheduleText =
document.getElementById("scheduleText");

const previewTitle =
document.getElementById("previewTitle");

const previewDate =
document.getElementById("previewDate");

const timeline =
document.getElementById("timeline");

const countdown =
document.getElementById("countdown");

loadData();

tripTitle.addEventListener("input", updatePreview);
tripDate.addEventListener("input", updatePreview);
scheduleText.addEventListener("input", updatePreview);

function updatePreview(){

    saveData();

    previewTitle.textContent =
        tripTitle.value || "旅行名未設定";

    previewDate.textContent =
        tripDate.value;

    updateCountdown();

    buildTimeline();
}

function buildTimeline(){

    timeline.innerHTML = "";

    const lines =
        scheduleText.value
            .split("\n")
            .filter(line => line.trim());

    lines.forEach((line,index)=>{

        const match =
        line.match(/^(\d{1,2}:\d{2})\s+(.*)$/);

        const time =
            match ? match[1] : "";

        const content =
            match ? match[2] : line;

        const item =
        document.createElement("div");

        item.className = "timeline-item";

        item.innerHTML = `
            <div class="time">${time}</div>
            <div class="content">${content}</div>
        `;

        timeline.appendChild(item);

        if(index < lines.length -1){

            const arrow =
            document.createElement("div");

            arrow.className = "arrow";
            arrow.textContent = "↓";

            timeline.appendChild(arrow);
        }

    });

}

function updateCountdown(){

    if(!tripDate.value){

        countdown.textContent = "";
        return;
    }

    const today = new Date();

    const target =
        new Date(tripDate.value);

    const diff =
        target - today;

    const days =
        Math.ceil(
            diff / (1000*60*60*24)
        );

    if(days > 0){

        countdown.textContent =
        `出発まであと ${days} 日`;

    }else if(days === 0){

        countdown.textContent =
        "本日出発！";

    }else{

        countdown.textContent = "";
    }

}

function saveData(){

    const data = {

        title: tripTitle.value,
        date: tripDate.value,
        schedule: scheduleText.value

    };

    localStorage.setItem(
        "tabiwaku",
        JSON.stringify(data)
    );

}

function loadData(){

    const saved =
        localStorage.getItem("tabiwaku");

    if(!saved){

        updatePreview();
        return;
    }

    const data =
        JSON.parse(saved);

    tripTitle.value =
        data.title || "";

    tripDate.value =
        data.date || "";

    scheduleText.value =
        data.schedule || "";

    updatePreview();
}