# Using a Vector Database: A Quick Example

This little example uses Pinecone as a vector database and Open AI to generate embeddings of content. It uses [Bun](https://bun.sh) as the run time.

## Getting Started

- Download and install [Bun](https://bun.sh) if you're not already using it.
- Get a Pinecone API key.
- Get an Open AI API key.
- Install the dependencies using `bun install`.

### Configuration

Create a `.env` file with the following keys:

```bash
OPEN_AI_API_KEY="your-api-key-here"
PINECONE_API_KEY="your-api-key-here"
```

### Run the Example

To run:

```bash
bun run index.ts
```
