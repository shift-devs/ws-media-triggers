const WS_RECONNECT_TIMEOUT = 3000;
const WS_HOST = `ws://localhost:3004`; // another ew

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
let mainVideo;

const wsShenanigans = () => {
    gWS = new WebSocket(WS_HOST);

    gWS.addEventListener("open", () => {
        console.log("Connected to the WebSocket server.");
    });
    gWS.addEventListener('error', () => {
        console.log("Error connecting to the WebSocket server.");
        gWS.close();
    });
    gWS.addEventListener('close', () => {
        console.log(`Disconnected from WebSocket server. Reconnecting in ${WS_RECONNECT_TIMEOUT}ms...`);
        setTimeout(wsShenanigans, WS_RECONNECT_TIMEOUT);
    })
    gWS.addEventListener('message', (e) => {
        let shrimp = JSON.parse(e.data);
        const thisURL = new URL(window.location);
        const mediaLink = thisURL.searchParams.get("media");
        switch (shrimp.op){
            case WS_OP.TRIGGER_MEDIA:
                console.log('prelog');
                console.log(shrimp.name, mediaLink);
                if (shrimp.name == mediaLink){
                    mainVideo.style.display = "initial";
                    mainVideo.currentTime = 0;
                    mainVideo.play();
                }
                break
            case WS_OP.STOP_MEDIA:
                console.log('prelog');
                console.log(shrimp.name, mediaLink);
                if (shrimp.name == mediaLink){
                    mainVideo.style.display = "none";
                    mainVideo.pause();
                    mainVideo.currentTime = 0;
                }
                break
        }
    });
}
const pageLoaded = () => {
    const thisURL = new URL(window.location);
    const mediaLink = thisURL.searchParams.get("media");
    if (!mediaLink)
        return;
    const vidTag = document.createElement("video");
    const srcTag = document.createElement("source");
    srcTag.type = "video/mp4";
    srcTag.src = `/data/media/${mediaLink}`;
    vidTag.id = "mainVideo";
    vidTag.appendChild(srcTag);
    document.body.appendChild(vidTag);

    mainVideo = vidTag;
    mainVideo.addEventListener("play",()=>{
        mainVideo.style.display = "initial";
    });
    mainVideo.addEventListener("ended",()=>{
        mainVideo.style.display = "none";
    });
    wsShenanigans();
}
window.addEventListener('load',pageLoaded);