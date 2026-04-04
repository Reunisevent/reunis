export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const response = await fetch(
    `https://api.notion.com/v1/databases/6d80f8aeaa1e45bab692f84f0821737d/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 10 })
    }
  );

  const data = await response.json();

  if (!data.results) {
    return res.status(500).json({ erreur: data });
  }

  const articles = data.results.map(page => ({
    id: page.id,
    nom: page.properties['Nom']?.title?.[0]?.plain_text ?? '',
    categorie: page.properties['Catégorie']?.select?.name ?? '',
    prix_location: page.properties['Prix location']?.number ?? null,
  }));

  res.status(200).json(articles);
}
