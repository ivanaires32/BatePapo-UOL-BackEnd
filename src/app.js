import express, { json } from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import dayjs from "dayjs"
import joi from "joi"

const app = express()

app.use(json())
app.use(cors())
dotenv.config()

//config database

const mongoClient = new MongoClient(process.env.DATABASE_URL)
try {
    await mongoClient.connect()
    console.log("servidor conectado")
} catch (err) {
    console.log(err.message)
}

const db = mongoClient.db()

app.post("/participants", async (req, res) => {
    const { name } = req.body

    if (!name || typeof name !== "string") return res.status(422).send("Campo Obrigatorio e não deve ser numero")

    try {

        const jaLogado = await db.collection("participants").findOne({ name })
        if (jaLogado) return res.status(409).send("Usuario ja cadastrado")
        await db.collection("participants").insertOne({ name, lastStatus: Date.now() })

        const time = dayjs().format("HH:mm:ss")
        await db.collection("messages").insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time })

        res.sendStatus(201)
    } catch (err) {
        res.status(500).send(err.message)
    }


})

app.get("/participants", async (req, res) => {
    const { user } = req.headers
    const time = Date.now()
    try {
        const on = await db.collection("participants").find().toArray()

        await db.collection("participants").findOne({ user })
        await db.collection("participants").deleteOne({ lastStatus: { $lt: time - 10000 } })
        res.status(201).send(on)
    } catch (err) {
        res.sendStatus(500)
    }
})

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const { user } = req.headers
    const time = dayjs().format("HH:mm:ss")

    const msg = { from: user, to, text, type, time }
    const result = joi.object({
        from: joi.string().required(),
        to: joi.string().min(3).max(15).required(),
        text: joi.string().min(3).max(100).required(),
        type: joi.string().valid("message", "private_message").required(),
        time: joi.string()
    })
    const validate = result.validate(msg, { abortEarly: false })
    if (validate.error) {
        const erros = validate.error.details.map(e => e.message)
        return res.status(422).send(erros)
    }
    try {
        const userOn = await db.collection("participants").findOne({ name: user })
        if (!userOn) return res.sendStatus(422)

        await db.collection("messages").insertOne(msg)

        res.sendStatus(201)
    } catch (err) {
        res.status(422).send("erro")
    }
})

app.get("/messages", async (req, res) => {
    const { limit } = req.query
    const { user } = req.headers

    const result = joi.object({
        limit: joi.number().integer().min(1)
    })
    const validate = result.validate({ limit })
    if (validate.error) return res.status(422).send(validate.error)
    try {
        const msgs = await db.collection("messages").find({ $or: [{ to: "Todos" }, { to: user }, { from: user }] }).toArray()
        res.send(msgs.slice(-limit))
    } catch (err) {
        res.sendStatus(500)
    }
})

app.post("/status", async (req, res) => {
    const { user } = req.headers

    try {
        if (!user) return res.sendStatus(404)
        const on = await db.collection("participants").findOne({ name: user })
        if (!on) return res.sendStatus(404)
        await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } })
        res.sendStatus(200)
    } catch (err) {
        res.sendStatus(404)
    }
})

app.listen(5000, () => console.log("Servidor rodando"))