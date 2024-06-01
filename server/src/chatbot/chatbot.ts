import { IProduct } from './../../../client/src/interfaces';
import OpenAI from "openai";
import prompts from "./prompts";
import Product, { Product as ProductInterface } from "../model/IkeaProduct";
import Answer, {Answer as IAnswer} from '../model/Answer';

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

class Chatbot {
  openai: OpenAI;
  model = "gpt-4-turbo-preview"
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY']
    });
  }

  async getQuery(history: Message[], type = "product") {
    const messages = [
      ...history,
      {role: "system" as Message["role"], content: type === "product" ? prompts.query() : prompts.service_help()},
    ]

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      response_format: {type: "json_object"},
      messages
    });
    const message = completion.choices[0].message;
    if (!message.content) return null;
  return JSON.parse(message.content);
  }

  private getStringifed(messages: Message[]) { 
    messages.forEach((msg) => {
      if (Array.isArray(msg.content)) {
        msg.content = "<list of products>"
      }
    if (typeof msg.content === "object" && msg.content !== null) {
      msg.content = JSON.stringify(msg.content)
    }
   })
   return messages;
  }

  async getAnswer(history: Message[], product?: IProduct) {
    try {
      history =history.map(({ role, content}) => {
          if (typeof content === "object") {
            return { role, content: (content as any).content }
          }
        return { role, content }
      }
    ) // remove products
      const intention = await this.getIntention(history);
      console.log("INTENTION ->", intention)
      let messages = [
        {role: "system" as Message["role"], content: prompts.personality},
        ...history,
      ]
      if (intention === "FAQ") {
        const query = await this.getQuery(history, "service");
        console.log("keywords:", query.keywords)
        const aggr = customerServiceAggr(query.keywords)
        const answers = await Answer
        .aggregate(aggr) as IAnswer[];
        if(answers && answers[0]) {
          const ans = answers[0];
          const serviceAnswer = await this.openai.chat.completions.create({
            temperature: 0.7,
            model: this.model,
            response_format: {type: "json_object"},
            messages: [
              {
                role: "system",
                content: prompts.service_md(toMd(ans.title, ans.content))
              }
            ]
          });
          if (!serviceAnswer.choices[0].message.content) return null;
          return { message: JSON.parse(serviceAnswer.choices[0].message.content).answer, type: "md"}
        } else {
          return null;
        }
      } else if (intention === "help to find a product") {
        messages = this.getStringifed(messages)
        const query = await this.getQuery(history);
        if (query) {
          console.log("keywords:", query.keywords)
          const products = await Product
          .aggregate(
            buildAggregationPipeline(query.keywords)
          )
          console.log(" products -->", products.length)

          messages.push({role: "system", content: "Write a friendly accompanying message for a user, saying that you found a product based on this tags: " + JSON.stringify(query.keywords) +  ". For example 'Here is the products...'. Note, this is the final message, it will not be edited and will appear to a user. Do not show the array of tags to the user "})
          const additionalMessage = await this.openai.chat.completions.create({
            temperature: 0.7,
            model: this.model,
            messages
          });
          return { message: additionalMessage.choices[0].message.content, products: sortByInter(query.keywords, products).slice(0,15)} 
        }
        return null;
      }
      messages = this.getStringifed(messages)
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages
      });
      const message = completion.choices[0].message;
      if (!message.content) return null;
      return { message: message.content, products: null}; 
    } catch (err) {
      console.log(err)
    }
  }

  async getIntention(his: Message[]) {
   const messageHistory = structuredClone(his)
    messageHistory.forEach((msg) => {
      if (Array.isArray(msg.content)) {
        msg.content = "<List of products>"
      }
    });
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      // temperature: 0.4,
      response_format: {type: "json_object"},
      messages: [
        {role: "system", content: prompts.intent(messageHistory)},
      ],
    });
  const message = completion.choices[0].message;
  if (!message.content) return null;
  return JSON.parse(message.content).intent;
}

async getProductInformation(product: ProductInterface, userMessage: string) {
  const completion = await this.openai.chat.completions.create({
    model: this.model,
    response_format: {type: "json_object"},
    messages: [
      {role: "system", content: prompts.productInfo(JSON.stringify(product))},
      { role: 'user', content: userMessage }
    ],
  });
const message = completion.choices[0].message;
if (!message.content) return null;
return JSON.parse(message.content).intent;
}
}

const chatbot = new Chatbot();
export default chatbot;

function buildAggregationPipeline(keywords: string[]) {

  const pipeline = [
    {
      "$match": {
        "tags": { "$in":  keywords.map(keyword => new RegExp(keyword, 'i')) }
      }
    },

  ];
  return pipeline;
}

function customerServiceAggr(keywords: string[]) {
  const regexPattern = keywords.join("|");
  return ([
    {
      $match: {
        title: {
          $regex: regexPattern,
          $options: "i" // Case-insensitive matching
        }
      }
    },
    {
      $addFields: {
        matchedKeywords: {
          $size: {
            $filter: {
              input: keywords,
              as: "keyword",
              cond: { $regexMatch: { input: "$title", regex: "$$keyword", options: "i" } }
            }
          }
        }
      }
    },
    {
      $sort: { matchedKeywords: -1 as const } // Sort by number of matched keywords in descending order
    }
  ])
}


function sortByInter(keywords: string[], objects: ProductInterface[]) {

  const matcher: {
    [key: string]: number
  } = {}

  
  const matches =  objects.sort((a, b) => {
    const countB = countMatches(keywords, b.tags);
    const countA = countMatches(keywords, a.tags);
    if (!matcher[a.title]) {
      matcher[a.title] = countA;
    }
    if (!matcher[b.title]) {
      matcher[b.title] = countB;
    }
    return countB - countA
  })
  
  // console.log(matcher)

 return matches;
}

function countMatches(keywords: string[], tags: string[]) {
  let counter = 0;
  keywords.forEach((keyword) => {
    counter += partiallyMatches(keyword, tags)
  })
  return counter;
}


function partiallyMatches(word: string, wordArray: string[]) {
  let counter = 0;
for (let i = 0; i < wordArray.length; i++) {
  if (wordArray[i].includes(word)) {
    counter += 1;
  }
}
return counter;
}

function toMd(title: string, content: string) {
  return `# ${title} \n ${content}`;
}