import express, { json } from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"

const app = express()

app.use(json())
app.use(cors())
dotenv.config()

//config database
let db
const mongoClient = new MongoClient(process.env.DATABASE_URL)
mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch(err => console.log(err.message))

app.post("/participants", (req, res) => {
    const { name } = req.body

    if (!name) res.status(400).send("Campo Obrigatorio")

    db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })
        .then(() => {
            db.collection("messages").insertOne(
                { from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: 'HH:mm:ss' }
            )
                .then(() => res.sendStatus(201))
                .catch(() => res.sendStatus(500))
        })
        .catch(() => res.sendStatus(500))

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

app.get("/messages", (req, res) => {
    const { limit } = req.query
    db.collection("/messages").find().toArray()
        .then(msgs => {
            if (msgs.length > limit) {
                msgs.shift()
            }
            res.send(msgs)
        })
        .catch(() => res.sendStatus(500))
})

app.listen(5000, () => console.log("Servidor rodando"))