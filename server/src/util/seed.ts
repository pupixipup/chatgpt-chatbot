import Product from "../model/IkeaProduct";
import db from "../db";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

async function seed() {
 const products = JSON.parse(fs.readFileSync("./products.json").toString());
 await db.connect();
 products.forEach((product: any) => {
  const item = new Product(product);
  item.save();
 })
}

seed();