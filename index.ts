import 'dotenv/config';
import chalk from 'chalk';

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

import recipes from './recipes.json';
type Recipe = (typeof recipes)[number];

const { PINECONE_API_KEY, OPEN_AI_API_KEY } = process.env;

if (!PINECONE_API_KEY) throw new Error('Pinecone API key is required');
if (!OPEN_AI_API_KEY) throw new Error('OpenAI API key is required');

export class VectorDatabase {
  private pinecone: Pinecone;
  private openai: OpenAI;

  private readonly indexName = 'recipes';
  private readonly dimension = 1536; // OpenAI's ada-002 embedding dimension
  private readonly metric = 'cosine'; // OpenAI's ada-002 embedding metric

  constructor() {
    /** Instantiate an instance of the Pinecone SDK.  */
    this.pinecone = new Pinecone({ apiKey: PINECONE_API_KEY! });
    /** Instantiate an instance of the OpenAI SDK.  */
    this.openai = new OpenAI({ apiKey: OPEN_AI_API_KEY! });
  }

  /**
   * Verify if the index exists in Pinecone.
   */
  get #indexExists() {
    return this.pinecone.listIndexes().then(({ indexes }) => {
      if (!indexes) return false;
      return indexes.some((index) => index.name === this.indexName);
    });
  }

  /**
   * A reference to the index in Pinecone. If the index does not exist, it will be created.
   */
  async getIndex() {
    if (await this.#indexExists) return this.pinecone.Index(this.indexName);

    await this.pinecone.createIndex({
      name: this.indexName,
      dimension: this.dimension,
      metric: this.metric,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });

    return this.pinecone.Index(this.indexName);
  }

  /**
   * Generate embeddings using OpenAI's API.
   * @returns A vector representation of the text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }

  async indexDocument(document: Recipe) {
    const index = await this.getIndex();
    const embedding = await this.generateEmbedding(document.content);

    await index.upsert([
      {
        id: document.id,
        values: embedding,
        metadata: {
          title: document.title,
          content: document.content,
        },
      },
    ]);
  }

  /**
   * Search the vector database for content that matches the query.
   */
  async semanticSearch(
    /**
     * A string that will be turned into an embedding and used to query the
     * vector database.
     */
    query: string,
    /** The number of results to return. Maximum: 10,000. */
    topK: number = 3,
  ) {
    // Generate embedding for the search query.
    const vector = await this.generateEmbedding(query);
    const index = await this.getIndex();

    // Search for similar vectors
    const searchResults = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    return searchResults.matches.map((match) => ({
      id: match.id,
      title: match.metadata?.title,
      content: match.metadata?.content.toString().slice(0, 50) + '…',
      score: match.score,
    }));
  }
}

const database = new VectorDatabase();

// Comment this out if you've already stored the recipes in the database.
for (const recipe of recipes) {
  console.log(chalk.blue('Indexing recipe:'), recipe.title);
  await database.indexDocument(recipe);
}

const searchResults = await database.semanticSearch('recipes with ice cream');

console.table(searchResults);
