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

    db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })
        .then(() => res.sendStatus(201))
        .catch(() => res.sendStatus(500))

})

app.get("/participants", (req, res) => {
    db.collection("participants").find().toArray()
        .then(users => res.status(201).send(users))
        .catch(() => res.sendStatus(500))
})

app.listen(5000, () => console.log("Servidor rodando"))