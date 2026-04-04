export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await fetch(
      'https://api.notion.com/v1/databases/270688b6-f396-4b7b-b4a0-44d6072c7612/query',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
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
