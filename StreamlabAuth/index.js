const fastify = require('fastify')({ logger: true });
require("dotenv").config()
const encodeUrl = require('encodeurl');
const fetch = require("cross-fetch")

fastify.options('*', function (request, reply) {
    reply.send()
})

fastify.addHook('onSend', function (request, reply, payload, next) {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Headers', '*')
    next()
})

fastify.get("/api/v1/account/redirect", async (req, res) => {
    if (!req?.query?.code) return res.redirect(encodeUrl(process.env.HOST_URL + "/error?msg=Streamlab ไม่สามารถเข้าถึงข้อมูลได้!"))
    const { isError, data } = await fetch('https://streamlabs.com/api/v2.0/token',
        {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            maxBodyLength: Infinity,
            body: JSON.stringify({
                "code": req?.query?.code,
                "redirect_uri": process.env.REDIRECT,
                "client_secret": process.env.CLIENT_SECRECT,
                "client_id": process.env.CLIENT_ID,
                "grant_type": "authorization_code"
            })
        }).then(async (_res) => ({ isError: !_res.ok, data: await _res.json() }))
        .catch(() => ({ isError: true, data: null }));
    if (data.access_token) {
        return res.redirect(encodeUrl(process.env.HOST_URL + "/get?access_token=" + data.access_token))
    }else {
        return res.redirect(encodeUrl(process.env.HOST_URL + "/error?msg=Streamlab ไม่สามารถเข้าถึงข้อมูลได้!"))
    }
})

const start = async () => {
    try {
        await fastify.listen({ port: process.env.PORT, host: "0.0.0.0" }).then(() => {
            console.log("[Logs] server has start on", process.env.PORT)
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()