# Baileys Store

Minimal Baileys data storage for your favorite DBMS built with Prisma. This library is a simple handler for Baileys event emitter that will listen and update your data in the database.

## Requirements

- **Prisma** version **4.5.x** or higher
- **Baileys** version **5.x.x** or higher

## Installation

```bash
# Using npm
npm i @ookamiiixd/baileys-store

# Using yarn
yarn add @ookamiiixd/baileys-store
```

## Setup

Before you can actually use this library, you have to setup your database first.

1. Copy the `.env.example` file from this repository or from the `node_modules` directory (should be located at `node_modules/@ookamiiixd/baileys-store/.env.example`). Rename it into `.env` and then update your [connection url](https://www.prisma.io/docs/reference/database-reference/connection-urls) in the `DATABASE_URL` field.
1. Copy the `prisma` directory from this repository or from the `node_modules` directory (should be located at `node_modules/@ookamiiixd/baileys-store/prisma/`). Additionaly, you may want to update your `provider` in the `schema.prisma` file if you're not using MySQL database.
1. Run your [migration](https://www.prisma.io/docs/reference/api-reference/command-reference#prisma-migrate).

## Usage

```ts
import pino from 'pino';
import makeWASocket from '@adiwajshing/baileys';
import { PrismaClient } from '@prisma/client';
import { initStore, Store } from '@ookamiiixd/baileys-store';

const logger = pino();
const socket = makeWASocket();
const prisma = new PrismaClient();

// You only need to run this once
initStore({
  prisma, // Prisma client instance
  logger, // Pino logger (Optional)
});

// Create a store and start listening to the events
const store = new Store('unique-session-id-here', socket.ev);

// That's it, you can now query from the prisma client without having to worry about handling the events
const messages = prisma.message.findMany();
```

## Contributing

PRs, issues, suggestions, etc are welcome. Please kindly open a new issue to discuss it.
