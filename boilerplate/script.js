import { HandLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";

const enableWebcamButton = document.getElementById("webcamButton")
const logButton = document.getElementById("logButton")

const video = document.getElementById("webcam")
const canvasElement = document.getElementById("output_canvas")
const canvasCtx = canvasElement.getContext("2d")

const drawUtils = new DrawingUtils(canvasCtx)
let handLandmarker = undefined;
let webcamRunning = false;
let results = undefined;

let image = document.querySelector("#myimage")


/********************************************************************
// CREATE THE POSE DETECTOR
********************************************************************/
const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });
    console.log("model loaded, you can start webcam")
    
    enableWebcamButton.addEventListener("click", (e) => enableCam(e))
    logButton.addEventListener("click", (e) => logAllHands(e)) 
}

/********************************************************************
// START THE WEBCAM
********************************************************************/
async function enableCam() {
    webcamRunning = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
        video.addEventListener("loadeddata", () => {
            canvasElement.style.width = video.videoWidth;
            canvasElement.style.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
            document.querySelector(".videoView").style.height = video.videoHeight + "px";
            predictWebcam();
        });
    } catch (error) {
        console.error("Error accessing webcam:", error);
    }
}

/********************************************************************
// START PREDICTIONS    
********************************************************************/
async function predictWebcam() {
    results = await handLandmarker.detectForVideo(video, performance.now())

    let hand = results.landmarks[0]
    if(hand) {
        let thumb = hand[4]
        image.style.transform = `translate(${video.videoWidth - thumb.x * video.videoWidth}px, ${thumb.y * video.videoHeight}px)`
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    for(let hand of results.landmarks){
        drawUtils.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
        drawUtils.drawLandmarks(hand, { radius: 4, color: "#FF0000", lineWidth: 2 });
    }

    if (webcamRunning) {
       window.requestAnimationFrame(predictWebcam)
    }
}


const dataset = [];

const saveButton = document.getElementById("savePose");
saveButton.addEventListener("click", () => {
    const label = document.getElementById("gestureLabel").value;
    const hand = results?.landmarks?.[0];

    if (hand) {
        const flatLandmarks = hand.flatMap(p => [p.x, p.y, p.z]);
        const pose = {
            label,
            landmarks: flatLandmarks
        };
        dataset.push(pose);
        console.log("Pose saved:", pose);
    } else {
        console.warn("No hand detected – nothing saved.");
    }
});

const downloadButton = document.getElementById("downloadData");
downloadButton.addEventListener("click", () => {
    if (dataset.length === 0) {
        alert("No data to download!");
        return;
    }

    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "hand_gestures.json";
    a.click();

    URL.revokeObjectURL(url);
});


/********************************************************************
// LOG HAND COORDINATES IN THE CONSOLE
********************************************************************/
function logAllHands(){
    for (let hand of results.landmarks) {
        // console.log(hand)
        const flatLandmarks = hand.flatMap(p => [p.x, p.y, p.z]);
        console.log(flatLandmarks);
    }
}

/********************************************************************
// START THE APP
********************************************************************/
if (navigator.mediaDevices?.getUserMedia) {
    createHandLandmarker()
}
