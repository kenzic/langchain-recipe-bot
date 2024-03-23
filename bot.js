import "dotenv/config";

import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnablePassthrough,
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { pull } from "langchain/hub";

// get the env var COLLECTION_NAME from the .env file
const COLLECTION_NAME = process.env.COLLECTION_NAME;

/**
 * Represents the vector store containing recipes.
 * There are many options for implementing a retriever, including using a database or a vector store.
 * For this example, I'm using ChromaDB as the vector store.
 * See more: https://js.langchain.com/docs/modules/data_connection/retrievers/
 */
const vectorStore = await Chroma.fromExistingCollection(
  new OpenAIEmbeddings(),
  { collectionName: COLLECTION_NAME }
);

const retriever = vectorStore.asRetriever();

// const ANSWER_CHAIN_SYSTEM_TEMPLATE = `
// You are a world-class recipe bot equipped to handle queries related to recipes, ingredients, cooking methods, and dietary restrictions. If the provided context does not contain sufficient data to answer a question directly, guide the user towards what you can assist with or suggest how they might provide additional relevant information.

// <context>
// {context}
// </context>`;

// const answerGenerationChainPrompt = ChatPromptTemplate.fromMessages([
//   // give the system a prompt to generate an answer
//   ["system", ANSWER_CHAIN_SYSTEM_TEMPLATE],
//   // provide chat history, so the system can generate an answer based on the context
//   new MessagesPlaceholder("chat_history"),
//   // direct it to answer the user's question given the users input
//   [
//     "human",
//     "Using the given context and chat history, please address the following inquiry:\n{input}",
//   ],
// ]);

// const REPHRASE_QUESTION_SYSTEM_TEMPLATE = `
// Your task is to formulate a concise and effective query for a vector database search to find documents relevant to the user's recipe-related inquiry. Use the conversation details to align the query with the user's needs.

// Follow these steps:
// 1. Examine the provided 'chat_history', focusing on exchanges related to the user's recipe interest. Note any specific dish names, ingredients, or cooking methods mentioned.
// 2. Identify the main recipe or food type the user is inquiring about from the chat history.
// 3. Refine the user's follow-up question to improve clarity and search precision. Preserve the original intent but enhance the wording to align better with typical search terminologies.
// 4. Generate and output only the query that will be used for the search, detailing any assumptions made due to ambiguous or incomplete information in the chat.

// Here are a few examples to guide you:

// Example 1:
// Human: "I'm looking for a simple vegetarian pasta dish."
// Human: "Something quick for dinner?"
// AI: "Quick vegetarian pasta dinner recipes"

// Example 2:
// Human: "I want to bake a chocolate cake for my friend's birthday."
// Human: "How to make it more moist?"
// AI: "Moist chocolate cake recipe tips"

// Example 3:
// Human:  "I'm trying to find a low-carb breakfast option."
// Human: "Preferably something with eggs?"
// AI: "Low-carb egg breakfast recipes"

// chat_history:
// `;

// const rephraseQuestionChainPrompt = ChatPromptTemplate.fromMessages([
//   ["system", REPHRASE_QUESTION_SYSTEM_TEMPLATE],
//   new MessagesPlaceholder("chat_history"),
//   ["human", "Follow-Up Question: {input}"],
// ]);

// Pull the prompts from the hub
const answerGenerationChainPrompt = await pull(
  "kenzic/recipe-answer-generation-prompt"
);

// Pull the prompts from the hub
const rephraseQuestionChainPrompt = await pull(
  "kenzic/recipe-rephrase-user-prompt"
);

const rephraseQuestionChain = RunnableSequence.from([
  rephraseQuestionChainPrompt,
  new ChatOpenAI({ temperature: 0.1, modelName: "gpt-3.5-turbo" }),
  new StringOutputParser(),
]);

/**
 * Converts an array of documents to a string representation.
 * Note: I wrap the page content in a <doc> tag to make it easier for the LLM to understand the boundaries of each document.
 *
 * @param {Array} documents - The array of documents to convert.
 * @returns {string} The string representation of the documents.
 */
const convertDocsToString = (documents) => {
  return documents
    .map((document) => {
      return `<doc>\n${document.pageContent}\n</doc>`;
    })
    .join("\n");
};

/**
 * Represents a chain of functions used for document retrieval.
 *
 * @description The `documentRetrievalChain` variable is an instance of the `RunnableSequence` class.
 * It represents a chain of functions that are executed sequentially to retrieve documents.
 * Each function in the chain performs a specific task related to document retrieval.
 * In this case, the chain consists of three functions:
 * 1. A function that extracts the input from the previous step.
 * 2. A function that retrieves documents from a database based on the input.
 * 3. A function that converts the retrieved documents into a string format.
 *
 * For more on `RunnableSequence`, see https://js.langchain.com/docs/expression_language/how_to/routing
 *
 */
const documentRetrievalChain = RunnableSequence.from([
  (input) => input.question,
  retriever,
  convertDocsToString,
]);

/**
 * Represents a chain of operations for conversational retrieval.
 * This chain is responsible for:
 * 1. Rephrasing the user's question
 * 2. Retrieving relevant documents (ChromaDB in this instance)
 * 3. Generating an answer to the user's question
 * 4. Parsing the answer to string
 */
const conversationalRetrievalChain = RunnableSequence.from([
  RunnablePassthrough.assign({
    question: rephraseQuestionChain,
  }),
  RunnablePassthrough.assign({
    context: documentRetrievalChain,
  }),
  answerGenerationChainPrompt,
  new ChatOpenAI({ modelName: "gpt-3.5-turbo" }),
  new StringOutputParser(),
]);

// This is where you will store your chat history.
// For a production app you probably want to use a database.
// https://js.langchain.com/docs/integrations/chat_memory
const messageHistory = new ChatMessageHistory();

// Create your `RunnableWithMessageHistory` object, passing in the
// runnable created above.
export const withHistory = new RunnableWithMessageHistory({
  runnable: conversationalRetrievalChain,
  getMessageHistory: (_sessionId) => messageHistory,
  inputMessagesKey: "input",
  // This shows the runnable where to insert the history.
  // We set to "chat_history" here because of our MessagesPlaceholder.
  historyMessagesKey: "chat_history",
});
