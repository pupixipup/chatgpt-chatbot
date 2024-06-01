# GPT Chatbot Functionality
This is a TypeScript Express server that communicates with the OpenAI API. The server processes each user request as follows:

1. The `POST /message` method with an array of message history in the body is called from the frontend.
2. The intention of the user request is identified by passing the conversation history and a prompt to the OpenAI API.
3. If the intention is neither “help to find a product” nor “customer assistance” (e.g., a greeting), the chatbot responds immediately with a response from ChatGPT. In other cases, a database search query is constructed, and the bot responds with an answer, which may be a list of products or an answer to the user’s question.
