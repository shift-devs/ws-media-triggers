import axios, {AxiosResponse} from "axios";
import {WebSocket, WebSocketServer} from 'ws';
import fs from "fs/promises";
import tmi from "tmi.js";
import io from "socket.io-client";
import {OPTION_BUILDER} from "./option.js";

const MERCH_UPDATE_TIME = 60 * 1000;
const OPT_WRITE_INTERVAL = 60 * 1000;
const WS_HB_TIME = 10 * 1000;
const WS_PORT = 3004;
const MEDIA_MAX_FILENAME = 99;
const DATA_ROOT = '../data';

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

interface AaronWebSocket extends WebSocket {
    isAlive: boolean
    hbInterval: NodeJS.Timeout | number
}

interface AaronOptionMediaElement {
    name: string,
    option: object
}

interface AaronOption {
    global: object,
    media: AaronOptionMediaElement[]
}

// i cant name things sensibly right now im cooked sorry
function optionBuilderPartToDefaultOption(inOptionBuilderPart: Object[]){
    const retObj = {};
    const shrimpOption = inOptionBuilderPart;
    for (var i = 0; i < shrimpOption.length; i++){
        const stack: Object[] = [];
        stack.push(shrimpOption[i]);
        while (stack.length != 0){
            const curShrimpOption = stack[0];
            stack.shift();
            if (curShrimpOption.hasOwnProperty("sub")){
                for (var j = 0; j < curShrimpOption["sub"].length; j++)
                    stack.push(curShrimpOption["sub"][j]);
            }
            retObj[curShrimpOption["op"]] = curShrimpOption["default"];
        }
    }
    return retObj;
}

async function loadMediaOption(){
    console.log("Loading any media option files");

    const defaultMediaOption = optionBuilderPartToDefaultOption(OPTION_BUILDER.media);
    let mediaFiles: string[];
    let optionFiles: string[];
    let outMediaOption: AaronOptionMediaElement[] = [];

    try {await fs.mkdir(`${DATA_ROOT}/media/`)}
    catch{}
    try {await fs.mkdir(`${DATA_ROOT}/option/`)}
    catch{}

    try {
        mediaFiles = await fs.readdir(`${DATA_ROOT}/media/`);
        optionFiles = await fs.readdir(`${DATA_ROOT}/option/`);
    }
    catch (err) {
        console.error('ERROR! Could not read the media and option directories! Quitting!',err)
        process.exit();
    }

    const mediaFilesF = mediaFiles.filter((filename)=>!(filename.endsWith('/')||filename.endsWith('\\')));
    const optionFilesF = optionFiles.filter((filename)=>!(filename.endsWith('/')||filename.endsWith('\\')));

    for (var i = 0; i < mediaFilesF.length; i++){
        const curMediaFile = mediaFilesF[i];
        if (curMediaFile.length > MEDIA_MAX_FILENAME){
            console.warn(`WARNING! Filename '${curMediaFile}' is too long! It may not work properly and will be ignored!`);
            continue;
        }
        
        const curOptionFile = `${curMediaFile}.json`;
        let bHasOptionFile = false;

        for (var j = 0; j < optionFilesF.length; j++){
            if (optionFilesF[j].toLowerCase() == curOptionFile.toLowerCase()){
                bHasOptionFile = true;
                break;
            }
        }

        if (!bHasOptionFile){
            console.warn(`WARNING! Media file '${curMediaFile}' has no associated option file! Creating one!`);
            try {
                await fs.writeFile(`${DATA_ROOT}/option/${curMediaFile}.json`,JSON.stringify(defaultMediaOption,null,4));
            }
            catch (err) {
                console.error('ERROR! Could not write to the option file! Skipping!',err);
                continue;
            }
        }

        console.log(`Loading option file: ${curMediaFile}.json`);

        let optionData: string;
        let optionObj: Object;

        try {
            optionData = await fs.readFile(`${DATA_ROOT}/option/${curMediaFile}.json`,{encoding: 'utf-8'});
            optionObj = JSON.parse(optionData);
        }
        catch (err){
            console.error('ERROR! Could not read/parse JSON option file! Skipping!',err);
            continue;
        }
        for (let key in defaultMediaOption){
            if (!optionObj.hasOwnProperty(key)){
                console.warn(`WARNING! File is missing option ${key}, setting to default value of ${defaultMediaOption[key]}!`);
                optionObj[key] = defaultMediaOption[key];
            }
        }
        outMediaOption.push({
            name: curMediaFile,
            option: optionObj
        });
    }
    return outMediaOption;
}

async function loadGlobalOption(){
    console.log(`Loading global option file`);

    let optionData: string;
    let optionObj: object;
    let outGlobalOption: object = {};
    const defaultGlobalOption = optionBuilderPartToDefaultOption(OPTION_BUILDER.global);
    
    try {
        optionData = await fs.readFile(`${DATA_ROOT}/global.json`,{encoding: 'utf-8'});
        optionObj = JSON.parse(optionData);
    }
    catch (err){
        console.error('ERROR! Could not read/parse JSON option file! Writing a default one!',err);
        for (let key in defaultGlobalOption){
            outGlobalOption[key] = defaultGlobalOption[key];
        }
        try{
            await fs.writeFile(`${DATA_ROOT}/global.json`, JSON.stringify(outGlobalOption,null,4));
        }
        catch (errx){
            console.error('ERROR! Could not write to global.json! Quitting!',errx);
            process.exit();
        }
        return outGlobalOption;
    }
    for (let key in defaultGlobalOption){
        if (!optionObj.hasOwnProperty(key)){
            console.warn(`WARNING! File is missing option ${key}, setting to default value of ${defaultGlobalOption[key]}!`);
            outGlobalOption[key] = defaultGlobalOption[key];
            continue;
        }
        outGlobalOption[key] = optionObj[key];
    }

    return outGlobalOption;
}

async function saveOption(inOption: AaronOption){
    console.log('Flushing all option data from memory to disk')
    try {
        await fs.writeFile(`${DATA_ROOT}/global.json`,JSON.stringify(inOption.global,null,4));
        for (var i = 0; i < inOption.media.length; i++){
            await fs.writeFile(`${DATA_ROOT}/option/${inOption.media[i].name}.json`,JSON.stringify(inOption.media[i].option,null,4)); // I don't like this...
        }
    }
    catch (err){
        console.warn('WARNING! Failed to write to option files!',err);
    }
}

async function loadOption(){
    let combinedOption: AaronOption = {global: {}, media: []};
    combinedOption.global = await loadGlobalOption();
    combinedOption.media = await loadMediaOption();
    return combinedOption;
}

function getOption(option: object, optionName: string){
    if (!option.hasOwnProperty(optionName)){
        console.warn(`WARNING! OPTION OBJECT HAS NO OPTION: "${optionName}" - RETURNING FALSE!`);
        return false;
    }
    return option[optionName];
}

function tmiLogin(option: AaronOption, wss: WebSocketServer){
    const name = getOption(option.global,"GOP_TWITCH_USERNAME");

    if (name == "") // make sure its actually set before logging in tmi
        return 0;

    const client = new tmi.Client({
        connection: {
            reconnect: true,
            reconnectInterval: 5000,
        },
        channels: [name]
    });

    client.connect().catch((err)=>{
        console.log(`TMI - Unable to connect: ${name}`);
    });

    function l(event) {
        return function(){
            console.log(event, arguments);
        }
    }

    client.on("connecting", l(`Connecting to ${name}'s Twitch Chat...`));
    client.on("connected", l(`Connected to ${name}'s Twitch Chat!`));
    client.on("disconnected", l(`Disconnected from ${name}'s Twitch Chat!`));

    client.on("message", (channel, tags, message, self) => {
        let filterMessage = message.toLowerCase().replaceAll(/[^ -~]/g,"").trim();
        var mSplit = filterMessage.split(" ");
        console.log(`(${name}) TWITCH MESSAGE - ${tags.username}: ${filterMessage}`);
        if (tags.username) {
            for (var i = 0; i < option.media.length; i++){
                const curMedia = option.media[i];
                if (!getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT"))
                    continue;
                if (getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_BROADCASTER") && tags.username.toLowerCase() != name)
                    continue;
                if (getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_MOD") && tags.username.toLowerCase() != name && !tags.mod)
                    continue;
                if (getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_VIP") && tags.username.toLowerCase() != name && !tags.mod && !tags.badges?.vip)
                    continue;
                if (getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_SUB") && tags.username.toLowerCase() != name && !tags.mod && !tags.badges?.vip && !tags.subscriber)
                    continue;
                if (getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_START")){
                    const bIsCaseSensitive = getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_START_CASESENS");
                    if (!(bIsCaseSensitive ? message : message.toLowerCase()).startsWith(bIsCaseSensitive ? getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_START_TEXT") : getOption(curMedia.option,"MOP_TRIGGER_TWITCH_CHAT_START_TEXT").toLowerCase()))
                        continue;
                }
                wss.clients.forEach((cli)=>{
                    cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
                });
            }
        }
    });

    const isAnon = (uname: any) => {
        const upUname = uname.toUpperCase();
        return upUname == "ANANONYMOUSGIFTER";
    }

    const calcTier = (ustate: any) => {
        const plan = ustate["msg-param-sub-plan"] || "1000";
        const tempTier = plan == "Prime" ? 1 : parseInt(plan,10) / 1000;
        return tempTier == 3 ? 5 : tempTier;
    }

    client.on("submysterygift",(channel, username, numbOfSubs, methods, userstate) => {
        const tier = calcTier(userstate);
        console.log(`(${name}) TMI - ${username} is gifting ${numbOfSubs} tier ${tier} subs!`);
        for (var i = 0; i < option.media.length; i++){
            const curMedia = option.media[i];
            if (!getOption(curMedia.option,"MOP_TRIGGER_GIFTBOMB"))
                continue;
            if (getOption(curMedia.option,"MOP_TRIGGER_GIFTBOMB_NOANON") && isAnon(username))
                continue;
            if (getOption(curMedia.option,"MOP_TRIGGER_GIFTBOMB_MIN") > numbOfSubs)
                continue;
            if (getOption(curMedia.option,"MOP_TRIGGER_GIFTBOMB_MAX") != 0 && getOption(curMedia.option,"MOP_TRIGGER_GIFTBOMB_MAX") < numbOfSubs)
                continue;
            wss.clients.forEach((cli)=>{
                cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
            });
        }
        
    });

    client.on("subgift",(channel, username, streakMonths, recipient, methods, userstate) => {
        if (userstate["msg-param-community-gift-id"]) // Mass subgifts are handled in submysterygift
            return;
        const tier = calcTier(userstate);
        console.log(`(${name}) TMI - subgift from ${username} to ${recipient} of tier ${tier}!`);
        for (var i = 0; i < option.media.length; i++){
            const curMedia = option.media[i];
            if (!getOption(curMedia.option,"MOP_TRIGGER_ONESUB"))
                continue;
            if (getOption(curMedia.option,"MOP_TRIGGER_ONESUB_NOANON") && isAnon(username))
                continue;
            wss.clients.forEach((cli)=>{
                cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
            });
        }
    });

    client.on("anongiftpaidupgrade", (_channel, _username, userstate) => {
        const tier = calcTier(userstate);
        console.log(`(${name}) TMI - anongiftpaidupgrade from ${_username} to tier ${tier}!`);
        for (var i = 0; i < option.media.length; i++){
            const curMedia = option.media[i];
            if (!getOption(curMedia.option,"MOP_TRIGGER_ONESUB"))
                continue;
            wss.clients.forEach((cli)=>{
                cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
            });
        }
    });

    client.on("giftpaidupgrade", (_channel, _username, sender, userstate) => {
        const tier = calcTier(userstate);
        console.log(`(${name}) TMI - giftpaidupgrade from ${_username} to tier ${tier}!`);
        for (var i = 0; i < option.media.length; i++){
            const curMedia = option.media[i];
            if (!getOption(curMedia.option,"MOP_TRIGGER_ONESUB"))
                continue;
            wss.clients.forEach((cli)=>{
                cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
            });
        }
    });

    client.on("resub",(_channel, _username, _months, _message, userstate, _methods) => {
        const tier = calcTier(userstate);
        console.log(`(${name}) TMI - ${_username} has resubscribed with tier ${tier}!`);
        for (var i = 0; i < option.media.length; i++){
            const curMedia = option.media[i];
            if (!getOption(curMedia.option,"MOP_TRIGGER_ONESUB"))
                continue;
            wss.clients.forEach((cli)=>{
                cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
            });
        }
    });

    client.on("subscription",(_channel, _username, _method, _message, userstate) => {
        const tier = calcTier(userstate);
        console.log(`(${name}) TMI - ${_username} has subscribed with tier ${tier}!`);
        for (var i = 0; i < option.media.length; i++){
            const curMedia = option.media[i];
            if (!getOption(curMedia.option,"MOP_TRIGGER_ONESUB"))
                continue;
            wss.clients.forEach((cli)=>{
                cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
            });
        }
    });

    client.on("cheer", (_channel, userstate, _message) => {
        var bits: string = userstate["bits"] || "0";
        console.log(`(${name}) TMI - cheer of ${bits} bits from ${userstate["display-name"]}`);
        for (var i = 0; i < option.media.length; i++){
            const curMedia = option.media[i];
            if (!getOption(curMedia.option,"MOP_TRIGGER_BITS"))
                continue;
            if (getOption(curMedia.option,"MOP_TRIGGER_BITS_MIN") > bits)
                continue;
            if (getOption(curMedia.option,"MOP_TRIGGER_BITS_MAX") != 0 && getOption(curMedia.option,"MOP_TRIGGER_BITS_MAX") < bits)
                continue;
            wss.clients.forEach((cli)=>{
                cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
            });
        }
    });

    return client;
}

function slLogin(option: AaronOption, wss: WebSocketServer){
    const slToken = getOption(option.global,"GOP_STREAMLABS_TOKEN");
    const username = getOption(option.global,"GOP_TWITCH_USERNAME");
    if (slToken == "" || username == "")
        return 0;

    let merchInterval: NodeJS.Timeout | number = 0;
    let merchValues = {};

    const socket = io(`https://sockets.streamlabs.com?token=${slToken}`, {
        transports: ["websocket"],
    });

    socket.on("connect", () => {
        console.log(`Connected to Streamlabs!`);
        slInstallMerch(username, merchValues);
        if (merchInterval == 0)
            merchInterval = setInterval(slInstallMerch.bind(null, username, merchValues), MERCH_UPDATE_TIME);
    });

    socket.on("disconnect", () => {
        console.log(`Disconnected from Streamlabs!`);
        if (merchInterval != 0){
            clearInterval(merchInterval);
            merchInterval = 0;
        }
    });

    socket.on("event", (e: any) => {
        console.log(`Streamlabs Event: ${JSON.stringify(e)}`);
        let money = 0;
        switch (e.type){
            case "donation":
                money = e.message[0].amount;
                console.log(`STREAMLABS - $${money}!`);
                for (var i = 0; i < option.media.length; i++){
                    const curMedia = option.media[i];
                    if (!getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_DONO"))
                        continue;
                    if (getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_DONO_MIN") > money)
                        continue;
                    if (getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_DONO_MAX") != 0 && getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_DONO_MAX") < money)
                        continue;
                    wss.clients.forEach((cli)=>{
                        cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
                    });
                }
                break;
            case "merch":
                if (!merchValues[e.message[0].product]){
                    console.warn(`WARNING! STREAMLABS PRODUCT "${e.message[0].product}" IS NOT IN MERCHVALUES!!`);
                    return;
                }
                money = merchValues[e.message[0].product];
                console.log(`STREAMLABS - $${money}!`);
                for (var i = 0; i < option.media.length; i++){
                    const curMedia = option.media[i];
                    if (!getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_MERCH"))
                        continue;
                    if (getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_MERCH_MIN") > money)
                        continue;
                    if (getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_MERCH_MAX") != 0 && getOption(curMedia.option,"MOP_TRIGGER_STREAMLABS_MERCH_MAX") < money)
                        continue;
                    wss.clients.forEach((cli)=>{
                        cli.send(JSON.stringify({op: WS_OP.TRIGGER_MEDIA, name: curMedia.name}));
                    });
                }
                break;
        }
    });

    return socket;
}

function slInstallMerch(username, merchValues){
    const newMerchValues = {};
    console.log(`Getting New Streamlabs Merch...`);
    axios
    .get(`https://streamlabs.com/api/v6/user/${username}`, {
    })
    .then((httpRes) => {
        if (Math.trunc(httpRes.status / 100)!=2)
            return;
        axios
        .get(`https://streamlabs.com/api/v6/${httpRes.data.token}/merchandise/products`, {
        })
        .then(httpRes2 => {
            if (Math.trunc(httpRes2.status / 100)!=2)
                return;
            let merchProducts = httpRes2.data.products;
            merchProducts.map((x: any)=>{
                newMerchValues[x.name] = x.variants[0].price / 100;
            });
            merchValues = Object.assign({}, newMerchValues);
            console.log(`Done Getting Streamlabs Merch!`);
        });
    });
}


async function main(){
    let option: AaronOption = await loadOption();
    await saveOption(option); // Save any dumb changes made immediately after loading

    const saveInterval = setInterval(saveOption.bind(null,option),OPT_WRITE_INTERVAL);

    let tmiClient: any = 0;
    let slClient: any = 0;
    let lastSLToken = getOption(option.global, "GOP_STREAMLABS_TOKEN");

    const wss = new WebSocketServer({ port: WS_PORT });
    tmiClient = tmiLogin(option, wss);
    slClient = slLogin(option, wss);

    wss.on('connection', (ws: AaronWebSocket) => {
        console.log('A Client connected to the WebSocket Server!');
        ws.isAlive = true;

        ws.hbInterval = setInterval(()=>{
            if (!ws.isAlive){
                ws.close(1001, 'Client did not pong back in time!');
                return;
            }
            ws.isAlive = false;
            ws.ping();
        },WS_HB_TIME);

        ws.on('pong',()=>{
            ws.isAlive = true;
        });

        ws.on('message', async (message: string) => {
            console.log(`Received msg from a websocket client -> ${message}`);
            let pMsg = {};
            try {
                pMsg = JSON.parse(message); // TRY CATCH
            }
            catch {
                console.warn("WARNING: Failed to parse message from client as JSON")
                return;
            }
            switch (pMsg["op"]){
                case WS_OP.CS_GET_OPTION_BUILDER:
                    ws.send(JSON.stringify({op: WS_OP.SC_GET_OPTION_BUILDER, data: OPTION_BUILDER}));
                    break;
                case WS_OP.CS_GET_OPTION:
                    ws.send(JSON.stringify({op: WS_OP.SC_GET_OPTION, data: option}));
                    break;
                case WS_OP.TRIGGER_MEDIA:
                case WS_OP.STOP_MEDIA:
                    // oh. a client told us. lets pass the message along to the other clients then.
                    wss.clients.forEach((cli)=>{
                        cli.send(JSON.stringify({op: pMsg["op"], "name": pMsg["name"]}));
                    });
                    break;
                case WS_OP.SET_OPTION:
                    console.log("Settings have been changed! Syncing new option!");
                    for (let key in option.global){
                        option.global[key] = pMsg["data"]["global"][key];
                    }
                    // its so bad man
                    for (var i = 0; i < option.media.length; i++){
                        const one = option.media.filter(a=>a.name==pMsg["data"]["media"][i]["name"]);
                        if (one.length!=1){
                            console.log(`Epic fail on ${pMsg["data"]["media"][i]["name"]}`);
                            continue;
                        }
                        for (let key in one[0].option){
                            one[0].option[key] = pMsg["data"]["media"][i]["option"][key];
                        }
                    }

                    if (tmiClient == 0){
                        tmiClient = tmiLogin(option, wss);
                    }
                    else {
                        const tmiChannels = tmiClient.getChannels();
                        if (tmiChannels.length != 1 || tmiChannels[0].slice(1) != getOption(option.global,"GOP_TWITCH_USERNAME")){
                            tmiClient.disconnect();
                            tmiClient = tmiLogin(option, wss);
                        }
                    }

                    if (slClient == 0){
                        slClient = slLogin(option, wss);
                    }
                    else {
                        let curSLToken = getOption(option.global,"GOP_STREAMLABS_TOKEN");
                        if (curSLToken != lastSLToken){
                            slClient.disconnect();
                            lastSLToken = curSLToken;
                            slClient = slLogin(option, wss);
                        }
                    }
                    break;
                case WS_OP.SELF_DESTRUCT:
                    console.log('See you on the other side...');
                    clearInterval(saveInterval);
                    wss.clients.forEach((cli)=>{
                        cli.terminate();
                    });
                    wss.close();
                    if (tmiClient)
                        tmiClient.disconnect()
                    if (slClient)
                        slClient.disconnect();
                    await saveOption(option);
                    setTimeout(main,0);
            }
        });

        ws.on('close', () => {
            console.log('A Client disconnected from the WebSocket Server!');
            if (ws.hbInterval != 0){
                clearInterval(ws.hbInterval);
                ws.hbInterval = 0;
            }
            ws.close(1000, 'Connection closed');
        });
    });
}

main();