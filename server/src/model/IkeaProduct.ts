import mongoose from "mongoose";

export interface Product {
  title: string;
  price: number;
  description: string;
  image: string;
  details: string;
  tags: string[];
  url: string;
}



const schema = {
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  url: {
    type: String,
    required: true
  },
};

const productSchema = new mongoose.Schema<Product>(schema);


// Create the mongoose model
const Product = mongoose.model<Product>('IkeaProduct', productSchema);

export default Product;