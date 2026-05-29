const WebSocket = require('ws')
const fs = require('fs')
const path = require('path')
const encodeUrl = require('encodeurl');
const fetch = require("cross-fetch")
const fastify = require('fastify')({ logger: false });

function getData() {
    return JSON.parse(fs.readFileSync(path.join(process.cwd() + "/config.json"), "utf-8"))
}

let accessToken = null;


fastify.get("/get", async (request, reply) => {
    if (!request?.query?.access_token) return console.log("[ERROR] Access token is required!")
    fs.writeFileSync(path.join(process.cwd() + "/.token"), request?.query?.access_token)
    accessToken = request?.query?.access_token
    await loginStreamlab(accessToken)
    return reply.send("Access token has been received, you can close this page and start receive donation data on Gateway.")
})

const start = async () => {
    try {
        await fastify.listen({ port: 6660, host: "0.0.0.0" }).then(async () => {
            console.log("[Logs] server has start on http://localhost:6660")
            accessToken = fs.existsSync(path.join(process.cwd() + "/.token")) ? fs.readFileSync(path.join(process.cwd() + "/.token"), "utf-8") : null
            if (!accessToken) {
                console.log("\nconnecting to Streamlabs, please open this link on your browser and login to your Streamlabs account to connect with Gateway.\n")
                console.log("https://streamlabs.com/api/v2.0/authorize?client_id=2f076e56-f11e-446a-8d32-1806307d804d&redirect_uri=http://localhost:6661/api/v1/account/redirect&scope=donations.read+donations.create&response_type=code&state=123456")
            } else {
                await loginStreamlab(accessToken)
            }
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()

async function loginStreamlab(token) {
    const { isError, _res } = await fetch('https://streamlabs.com/api/v2.0/user',
        {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        }).then(async (x) => ({ isError: !x.ok, _res: await x.json() }))
        .catch(() => ({ isError: true, res: null }));

    if (!_res?.streamlabs?.username) {

        console.log("\nconnecting to Streamlabs, please open this link on your browser and login to your Streamlabs account to connect with Gateway.\n")
        console.log("https://streamlabs.com/api/v2.0/authorize?client_id=2f076e56-f11e-446a-8d32-1806307d804d&redirect_uri=http://localhost:6661/api/v1/account/redirect&scope=donations.read+donations.create&response_type=code&state=123456")

        return;
    } else {

        accessToken = token
        console.log("[Logs] Access token has been found, you can start receive donation data on Gateway.")
        console.log(`Welcome back, ${_res?.streamlabs?.username}!\n`)
        connectWebSocket()
        return;
    }
}

function connectWebSocket() {

    //ganknow
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
                    sendDonate(donorName, amount, donorMessage, accessToken)
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
}

async function sendDonate(name, amount, msg, token) {
    // steamlab v2
    const { isError, data } = await fetch('https://streamlabs.com/api/v2.0/donations', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer " + token
        },
        body: JSON.stringify({
            "name": name,
            "message": msg,
            "identifier": name,
            "amount": parseInt(amount),
            "currency": "THB"
        })
    }).then(async (res) => ({ isError: !res.ok, data: await res.json() }))
        .catch(() => ({ isError: true, data: null }));
    if (!data?.error) {
        console.log("[Logs] Donate has been sent to Streamlabs.")
    }
    else {
        console.log("[ERROR] Failed to send donate data to Streamlabs, please check your access token.")
        console.log(data)
    }
}