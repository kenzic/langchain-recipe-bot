import "dotenv/config";

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { NotionAPILoader } from "langchain/document_loaders/web/notionapi";

const { COLLECTION_NAME, NOTION_DATABASE_ID, NOTION_AUTH_SECRET } = process.env;

/**
 * In loadData, we're going to do just that. To accomplish this:
 * - First, we need to load the data as documents from a data source.
 * - Then, we need to load the documents into the vector store.
 */

/**
 * Document Loader
 *
 * Document loaders are a significant topic, and there are many options for implementing one.
 * I highly recommend checking out the document loaders documentation for more information.
 * https://js.langchain.com/docs/modules/data_connection/document_loaders/
 *
 * For this example I'm using the Notion API Loader.
 * https://js.langchain.com/docs/integrations/document_loaders/web_loaders/notionapi
 *
 */
const dbLoader = new NotionAPILoader({
  clientOptions: {
    auth: NOTION_AUTH_SECRET,
  },
  id: NOTION_DATABASE_ID,
  type: "database",
  onDocumentLoaded: (current, total, currentTitle) => {
    console.log(`Loaded Page: ${currentTitle} (${current}/${total})`);
  },
  callerOptions: {
    maxConcurrency: 64, // Default value
  },
  propertiesAsHeader: true, // Prepends a front matter header of the page properties to the page contents
});

// A database row's contents are likely to be less than 1000 characters, so it's not split into multiple documents.
// If you have a large document, you can split it into multiple documents using a splitting strategy.
// https://js.langchain.com/docs/modules/data_connection/document_transformers/
const docs = await dbLoader.load();

/**
 * Load the docs into the vector store
 *
 * Note that we passed `new OpenAIEmbeddings()` as the second argument to `Chroma.fromDocuments`.
 * This is crucial. It dictates how Chroma generates embeddings for the documents.
 * You are not limited to using OpenAIEmbeddings; you can use any embeddings provided by Langchain.
 */
await Chroma.fromDocuments(docs, new OpenAIEmbeddings(), {
  collectionName: COLLECTION_NAME,
  url: "http://localhost:8000", // Optional, will default to this value
  collectionMetadata: {
    "hnsw:space": "cosine",
  }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
});

console.log("Success");
