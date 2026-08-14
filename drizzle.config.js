import 'dotenv/config'

/** Single schema definition for the whole project: src/db/schema.js */
export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
  verbose: true,
  strict: true,
}
