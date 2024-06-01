import db from "../db";
import dotenv from "dotenv";
import fs from "fs";
import Answer from "../model/Answer";
dotenv.config();

async function seed() {
 const answers = JSON.parse(fs.readFileSync("./answers.json").toString());
 await db.connect();
 answers.forEach((answer: any) => {
  const item = new Answer(answer);
  item.save();
 })
}

seed();