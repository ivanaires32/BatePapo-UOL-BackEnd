import express, { json } from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import dayjs from "dayjs"

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
        await db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })

        const time = dayjs().format("HH:mm:ss")
        await db.collection("messages").insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time })

        res.sendStatus(201)
    } catch (err) {
        res.status(500).send(err.message)
    }


})

app.get("/participants", async (req, res) => {
    const { user } = req.headers
    try {
        const usersOn = await db.collection("participants").find().toArray()

        await db.collection("participants").findOne({ user })
        res.status(201).send(usersOn)
    } catch (err) {
        res.sendStatus(500)
    }
})

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const { user } = req.headers

    if (!user || !to || !text || !type || text === "" || to === "" || type !== "message" || type !== "private_message") {
        return res.status(422).send("algo deu errado")
    }
    try {
        const userOn = await db.collection("participants").findOne({ name: user })
        if (!userOn) return res.sendStatus(422)
        const time = dayjs().format("HH:mm:ss")
        await db.collection("messages").insertOne({ from: user, to, text, type, time })
        res.sendStatus(201)
    } catch (err) {
        res.sendStatus(422)
    }
})

app.get("/messages", async (req, res) => {
    const { limit } = req.query
    try {
        const msgs = await db.collection("/messages").find().toArray()
        if (msgs.length > limit) msgs.shift()
        res.send(msgs)
    } catch (err) {
        res.sendStatus(500)
    }
})

app.listen(5000, () => console.log("Servidor rodando"))