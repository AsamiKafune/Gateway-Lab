const WebSocket = require('ws')
const fs = require('fs')
const path = require('path')

function getData() {
    return JSON.parse(fs.readFileSync(path.join(process.cwd() + "/config.json"), "utf-8"))
}

if (getData().platform.ganknow.overlayURL.length > 0) {
    let gankController = new WebSocket(getData().platform.ganknow.endpoint + getData().platform.ganknow.overlayURL.replace("https://stream.ganknow.com/", ""))
    gankController.on("open", event => {
        console.log('gankController websocket has been connected!');
    })
    gankController.on("message", msg => {
        let data = JSON.parse(msg.toString())
        console.log(`[GANK] data`, data)
        if (data?.notificationType == "QUEUE") {
            if (data?.eventType == "ALERT_AND_TTS") {
                let _donateData = data?.data?.mediaQueue;
                let amount = parseInt(parseFloat(_donateData?.donationAmount).toFixed(0))
                let donorName = _donateData?.donorName
                let donorMessage = _donateData?.donorMessage
            }
        }
    })
    gankController.on("error", (e) => {
        console.log(e)
        console.log("[ERROR] Gank has been self destroy please restart program to reconnect.")
    })
} else {
    setTimeout(() => {
        console.log("[WARN] Gank doesn't Activate.")
    }, 120)
}
