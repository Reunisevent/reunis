export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { categorie, sous_categorie, sous_sous_categorie } = req.query;

  const filters = [];

  if (categorie) {
    filters.push({
      property: 'Catégorie',
      select: { equals: categorie }
    });
  }

  if (sous_categorie) {
    filters.push({
      property: 'Sous catégorie',
      select: { equals: sous_categorie }
    });
  }

  filters.push({
    property: 'Visible sur le site',
    checkbox: { equals: true }
  });

  const body = {
    filter: filters.length === 1 ? filters[0] : { and: filters },
    page_size: 100
  };

  const response = await fetch(
    `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();

  const articles = data.results.map(page => ({
    id: page.id,
    nom: page.properties['Nom']?.title?.[0]?.plain_text ?? '',
    reference: page.properties['Référence']?.rich_text?.[0]?.plain_text ?? '',
    categorie: page.properties['Catégorie']?.select?.name ?? '',
    sous_categorie: page.properties['Sous catégorie']?.select?.name ?? '',
    sous_sous_categorie: page.properties['Sous-sous ca...']?.select?.name ?? '',
    description: page.properties['Description']?.rich_text?.[0]?.plain_text ?? '',
    dimensions: page.properties['Dimensions']?.rich_text?.[0]?.plain_text ?? '',
    couleurs: page.properties['Couleurs']?.multi_select?.map(c => c.name) ?? [],
    statut_stock: page.properties['Statut stock']?.select?.name ?? '',
    qtite_en_ligne: page.properties['Qtité en ligne']?.number ?? 0,
    personnalisable: page.properties['Personnalisable']?.select?.name ?? '',
    prix_location: page.properties['Prix location']?.number ?? null,
    photo: page.properties['Photo']?.files?.[0]?.file?.url 
        ?? page.properties['Photo']?.files?.[0]?.external?.url 
        ?? null,
  }));

  res.status(200).json(articles);
}
