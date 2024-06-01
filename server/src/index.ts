import dotenv from "dotenv";
import db from "./db";
import cors from "cors";
dotenv.config()
db.connect()
import express, { Request, Response } from 'express';
import chatbot from './chatbot/chatbot';
import Product from "./model/IkeaProduct";
const app = express();
app.use(cors());
app.use(express.json())

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Express!');
});

app.get("/locations", async (req: Request, res: Response) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch {
    res.status(500);
  }
})

app.post("/message", async (req: Request, res: Response) => {
  try {
    const { history, product } = req.body;
    if (!history || !history.length) {
      res.status(400).send("Message is missing")
    }
    const answer = await chatbot.getAnswer(history, product);
    const body: {message?: string, products?: any[], type?: string} = {};
    if (answer?.message) {
      body.message = answer?.message
    }
    if (answer?.products) {
      body.products = answer?.products;
    }
    if (answer?.type) {
      body.type = answer?.type;
    }
    res.status(200).json(body);
    
  } catch (err) {
    console.log(err)
    res.status(500).send("Internal Error");
  }
})

app.get("/products/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).send("Message is missing")
    }
    const product = await Product.findById(id);
    res.status(200).json(product);
  } catch {
    res.status(500).send("Internal Error");
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});