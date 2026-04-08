const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { categorie, sous_categorie } = req.query;

    const filters = [
      {
        property: 'Visible sur le site',
        checkbox: { equals: true }
      }
    ];

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

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      filter: { and: filters },
      page_size: 100
    });

    const articles = response.results.map(page => {
      const p = page.properties;
      const titleProp = Object.keys(p).find(k => p[k].type === 'title');
      return {
        id: page.id,
        nom: p[titleProp]?.title?.[0]?.plain_text ?? '',
        reference: p['Référence']?.rich_text?.[0]?.plain_text ?? '',
        categorie: p['Catégorie']?.select?.name ?? '',
        sous_categorie: p['Sous catégorie']?.select?.name ?? '',
        sous_sous_categorie: p['Sous-sous catégorie']?.select?.name ?? '',
        description: p['Description']?.rich_text?.[0]?.plain_text ?? '',
        dimensions: p['Dimensions']?.rich_text?.[0]?.plain_text ?? '',
        couleurs: p['Couleurs']?.multi_select?.map(c => c.name) ?? [],
        statut_stock: p['Statut stock']?.select?.name ?? '',
        qtite_en_ligne: p['Qtité en ligne']?.number ?? 0,
        personnalisable: p['Personnalisable']?.select?.name ?? '',
        prix_location: p['Prix location']?.number ?? null,
        photo: p['Photo principale']?.files?.[0]?.file?.url
            ?? p['Photo principale']?.files?.[0]?.external?.url
            ?? null,
        photos_ambiance: (p['Photos d\'ambiance']?.files ?? []).map(f =>
            f?.file?.url ?? f?.external?.url ?? null
        ).filter(Boolean),
      };
    });

    res.status(200).json(articles);

  } catch (err) {
    res.status(500).json({ erreur: err.message, code: err.code });
  }
};
