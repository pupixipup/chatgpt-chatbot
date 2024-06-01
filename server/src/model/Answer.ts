import mongoose from "mongoose";

export interface Answer {
  title: string;
  content: string;
}



const schema = {
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
};

const answerSchema = new mongoose.Schema<Answer>(schema);


// Create the mongoose model
const Answer = mongoose.model<Answer>('Answer', answerSchema);

export default Answer;