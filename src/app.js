import express, { json } from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"

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

    if (!name) return res.status(422).send("Campo Obrigatorio")

    try {
        const jaLogado = await db.collection("participants").findOne({ name })
        if (jaLogado) return res.status(409).send("Usuario ja cadastrado")
        await db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })

        await db.collection("messages").insertOne(
            { from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: 'HH:mm:ss' }
        )
        res.sendStatus(201)
    } catch (err) {
        res.status(500).send(err.message)
    }


})

app.get("/participants", (req, res) => {
    const { user } = req.headers
    db.collection("participants").find().toArray()
        .then(users => res.status(201).send(users))
        .catch(() => res.sendStatus(500))
})

app.post("/messages", (req, res) => {
    const { to, text, type } = req.body
    const { user } = req.headers

    db.collection("participants").findOne({ name: user })
        .catch(err => {
            res.send(err.message)
            return
        })

    if (!to || !text || !type) {
        return res.status(422).send("mensagem não enviada")
    } else if (typeof to === "string" && typeof text === "string" && (type === "message" || type === "private_message")) {
        db.collection("messages").insertOne({ to, text, type })
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