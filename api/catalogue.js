export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await fetch(
      'https://api.notion.com/v1/databases/6d80f8aeaa1e45bab692f84f0821737d/query',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page_size: 3 })
      }
    );

    const text = await response.text();
    res.status(200).json({ raw: text });

  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
}
