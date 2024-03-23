# LangChain Recipe Bot

> This is a high-level README. For detailed guide on how to use this project, please refer to the [Medium Article](https://medium.com/@kenzic/talk-to-your-notion-database-with-langchain-js-d3b15900d79e)

## Setup
1. Clone the reop: `git clone git@github.com:kenzic/langchain-recipe-bot.git`
2. Install dependencies: `npm install`
3. Add recipe template to Notion, create custom connection that has permission to access Notion database. Follow this [guide](https://medium.com/@kenzic/talk-to-your-notion-database-with-langchain-js-d3b15900d79e) for help.
4. Create a `.env` file in the root of the project and add the following (replace brackets with your own values):
```
OPENAI_API_KEY=<OPEN_AI_KEY>
COLLECTION_NAME="recipes-4"
NOTION_DATABASE_ID=<NOTION_DATABASE_ID>
NOTION_AUTH_SECRET=<NOTION_AUTH_SECRET>
```
5. run ChromaDB
6. Load data into ChromaDB. `npm run load`

## Usage

1. Start the bot: `npm run chat`
2. Chat away
