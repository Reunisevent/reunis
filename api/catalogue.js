import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      page_size: 3
    });

    res.status(200).json({ results: response.results.length, raw: response.results[0] });

  } catch (err) {
    res.status(500).json({ erreur: err.message, code: err.code });
  }
}
