const WS_RECONNECT_TIMEOUT = 3000;

const WS_OP = {
    HELLO: 0,
    TRIGGER_MEDIA: 1,
    STOP_MEDIA: 2,
    CS_GET_OPTION_BUILDER: 3,
    CS_GET_OPTION: 4,
    SC_GET_OPTION_BUILDER: 5,
    SC_GET_OPTION: 6,
    SET_OPTION: 7,
    SELF_DESTRUCT: 8
}

const OPTION_TYPES = {
    NULL: 0,
    CHECKBOX: 1,
    NUMBER: 2,
    TEXT: 3
}

let gLocalOptionBuilder = {}
let gLocalOption = {};
let gMainPre = 0;
let gWS = 0;
let gFetchState = 0;
let gEditing = -1;

const WS_HOST = `ws://localhost:3004`; // ew

const WHITESPACE = 50;
const DIRFLAIR_ELEMENT = `|--- `;
const DIRFLAIR_SUBPASS = `|    `
const DIRFLAIR_TAILSTR = `     `
const LOADINGTEXT = `Loading...`;

function reloadMedia(){
    gWS.send(JSON.stringify({op: WS_OP.SELF_DESTRUCT}));
    gWS.close();
}

function triggerMedia(i){
    const mediaName = gLocalOption.media[i].name;
    console.log(`Triggering ${mediaName}`)
    gWS.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: mediaName}));
}

function stopMedia(i){
    const mediaName = gLocalOption.media[i].name;
    console.log(`Stopping ${mediaName}`)
    gWS.send(JSON.stringify({op: WS_OP.STOP_MEDIA, name: mediaName}));
}

function copyWidget(i){
    const mediaName = gLocalOption.media[i].name;
    const wl = window.location;
    navigator.clipboard.writeText(`${wl.protocol}//${wl.host}/widget?media=${encodeURIComponent(mediaName)}`);
}

function openForEditing(i){
    if (gEditing == i)
        return;
    if (gEditing != -1){
        alert("You are already editing another media's options!\nClose the other window first!");
        return;
    }
    gEditing = i;
    render();
}

function saveMedia(i){
    for (let key in gLocalOption.media[i].option){
        const theElement = document.getElementById(`${key}@${i}`);
        if (theElement === null){
            console.log("Unable or unwilling to save the media settings laid before him...");
            alert('Error while saving media settings!');
            return;
        }
        gLocalOption.media[i].option[key] = theElement.type == 'checkbox' ? theElement.checked : theElement.value;
    }
    // Seems successful. Send it.
    gWS.send(JSON.stringify({op: WS_OP.SET_OPTION, data: gLocalOption}));
    console.log(gLocalOption);
    gEditing = -1;
    render();
}

function discardMedia(i){
    // really big shrimp
    gEditing = -1;
    render();
}

function saveGlobal(){
    for (let key in gLocalOption.global){
        const theElement = document.getElementById(key);
        if (theElement === null){
            console.log("Unable or unwilling to save the global settings laid before him...");
            alert('Error while saving global settings!');
            return;
        }
        gLocalOption.global[key] = theElement.type == 'checkbox' ? theElement.checked : theElement.value;
    }
    // Seems successful. Send it.
    gWS.send(JSON.stringify({op: WS_OP.SET_OPTION, data: gLocalOption}));
    console.log(gLocalOption);
}

function discardGlobal(){
    // giant shrimp
    render();
}

function renderOptions(bGlobal, inM){
    const optionBuilderPart = bGlobal ? gLocalOptionBuilder.global : gLocalOptionBuilder.media;
    const lastMedia = inM==gLocalOption.media.length-1;
    let renderBuffer = '';
    for (var i = 0; i < optionBuilderPart.length; i++){
        const stack = [];
        stack.push(optionBuilderPart[i]);
        subLevel = 0;
        while (stack.length != 0){
            // okay
            renderBuffer += bGlobal?DIRFLAIR_ELEMENT:(lastMedia?DIRFLAIR_TAILSTR:DIRFLAIR_SUBPASS)+DIRFLAIR_SUBPASS.repeat(subLevel)+DIRFLAIR_ELEMENT;
            const curOption = stack[0];
            const curOptionValue = bGlobal ? gLocalOption.global[curOption.op] : gLocalOption.media[inM].option[curOption.op];
            stack.shift();
            let idName = `${curOption.op}${bGlobal?'':'@'+inM}`;
            switch (curOption.type){
                case OPTION_TYPES.CHECKBOX:
                    renderBuffer += `<input type="checkbox" id="${idName}" ${curOptionValue?'checked':''}> ${curOption.text}`;
                    break;
                case OPTION_TYPES.TEXT:
                    renderBuffer += `${curOption.text}: <input type="text" id="${idName}" value="${curOptionValue}">`;
                    break;
                case OPTION_TYPES.NUMBER:
                    renderBuffer += `${curOption.text}: <input type="number" id="${idName}" min="${curOption.min}" max="${curOption.max}" value="${curOptionValue}">`;
                    break;
            }
            renderBuffer += '\n';
            if (curOption.hasOwnProperty("sub")){
                subLevel++;
                for (var j = 0; j < curOption.sub.length; j++)
                    stack.push(curOption.sub[j])
            }
        }
    }
    if (bGlobal){
        renderBuffer += `${DIRFLAIR_ELEMENT}<button onclick="saveGlobal()">Save</button> <button onclick="discardGlobal()">Discard Changes</button>\n`;
    } else {
        renderBuffer += `${lastMedia?DIRFLAIR_TAILSTR:DIRFLAIR_SUBPASS}${DIRFLAIR_ELEMENT}<button onclick="saveMedia(${inM})">Save</button> <button onclick="discardMedia(${inM})">Discard Changes</button>\n`;
    }
    
    return renderBuffer;
}

function render(){
    if (gFetchState != 3){
        gMainPre.innerHTML = LOADINGTEXT;
        return;
    }

    let renderBuffer = '';

    renderBuffer += `Settings:\n`
    renderBuffer += renderOptions(true, 0);
    renderBuffer += '\n';
    renderBuffer += `Your Media:\n`;
    for (var i = 0; i < gLocalOption.media.length; i++){
        let shortMediaName = gLocalOption.media[i].name;
        shortMediaName = shortMediaName.replaceAll(/[^ -~]/g,"?"); // todo escape out html bad things in filename
        if (shortMediaName.length >= WHITESPACE - DIRFLAIR_ELEMENT.length){
            shortMediaName = `${shortMediaName.slice(0, WHITESPACE - DIRFLAIR_ELEMENT.length - 3)}...`;
        }
        let pRenderBuffer = `${DIRFLAIR_ELEMENT}${shortMediaName}`;
        renderBuffer += `${pRenderBuffer}${' '.repeat(Math.max(WHITESPACE-pRenderBuffer.length,0))}`;
        renderBuffer += `[<a href="#" onclick="triggerMedia(${i})">⚡</a>]`;
        renderBuffer += `[<a href="#" onclick="stopMedia(${i})">🛑</a>]`;
        renderBuffer += `[<a href="#" onclick="copyWidget(${i})">🔗</a>]`;
        renderBuffer += `[<a href="#" onclick="openForEditing(${i})">🔧</a>]`;
        renderBuffer += `\n`;
        if (gEditing == i){
            renderBuffer += renderOptions(false, i);
        }
    }
    renderBuffer += `\n\nTip: Add media by copying it into the data/media folder.\nThen... just click this button -> <button onclick="reloadMedia()">Restart Backend</button>\n\nREMEMBER: Changes to any options won't actually be put into effect\nuntil you click the Save button!`;

    gMainPre.innerHTML = renderBuffer;
}

function mainFrontend(){
    gMainPre = document.getElementById("mainPre");
    gMainPre.innerHTML = LOADINGTEXT;
    
    gWS = new WebSocket(WS_HOST); // erm.. this should be defined in like... .env !!

    gWS.addEventListener("open", () => {
        console.log("Connected to the WebSocket server.");
        gWS.send(JSON.stringify({op: WS_OP.CS_GET_OPTION_BUILDER}));
        gWS.send(JSON.stringify({op: WS_OP.CS_GET_OPTION}));
    });
    gWS.addEventListener('error', () => {
        console.log("Error connecting to the WebSocket server.");
        gWS.close();
    });
    gWS.addEventListener('close', () => {
        console.log(`Disconnected from WebSocket server. Reconnecting in ${WS_RECONNECT_TIMEOUT}ms...`);
        gMainPre.innerHTML = LOADINGTEXT;
        gFetchState = 0;
        gEditing = -1;
        setTimeout(mainFrontend, WS_RECONNECT_TIMEOUT);
    })
    gWS.addEventListener('message', (e) => {
        let shrimp = JSON.parse(e.data);
        switch (shrimp.op){
            case WS_OP.SC_GET_OPTION_BUILDER:
                gFetchState |= 1;
                gLocalOptionBuilder = shrimp.data;
                render();
                break;
            case WS_OP.SC_GET_OPTION:
                gFetchState |= 2;
                gLocalOption = shrimp.data;
                render();
                break;
        }
    });
}

window.addEventListener("load", async () => {
    setTimeout(mainFrontend, 100);
});