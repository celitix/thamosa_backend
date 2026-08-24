
# Thamosa Stays Backend
## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`DATABASE_URL = mysql://username:password@localhost:3306/db_name`

`DATABASE_USER=`
`DATABASE_PASSWORD=`
`DATABASE_NAME=`
`DATABASE_HOST=`
`DATABASE_PORT=`
`CORS=`
`PORT=`
`APP_ENV=`
`API_KEY=`
`WHATSAPP_NUMBER=`
`JWT_SECRET=`



## Run Locally

Clone the project

```bash
  git clone https://github.com/celitix/thamosa_backend
```

Go to the project directory

```bash
  cd thamosa_backend
```

Install dependencies

```bash
  pnpm install
```

Migrate Database

```bash
  pnpm prisma migrate dev
```

Generate custom Prisma Client artifacts for your database.

```bash
  pnpm prisma generate
```

Start the server

```bash
  pnpm start
```

## Deployment

Clone the project

```bash
  git clone https://github.com/celitix/thamosa_backend
```

Go to the project directory

```bash
  cd thamosa_backend
```

Install dependencies

```bash
  pnpm install
```

Migrate Database

```bash
  pnpm prisma migrate deploy
```

Generate custom Prisma Client artifacts for your database.

```bash
  pnpm prisma generate
```

Start the server

```bash
  pnpm serve
```