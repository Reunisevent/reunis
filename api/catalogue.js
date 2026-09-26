const { Client } = require('@notionhq/client');
const { mapArticle } = require('./_article');
const { queryAll } = require('./_notion');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const NEW_BADGE_COUNT = 20;

async function getNewCutoff() {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DB_ID,
    filter: {
      and: [
        { property: 'Visible sur le site', checkbox: { equals: true } },
        { property: 'Date ajout', date: { is_not_empty: true } }
      ]
    },
    sorts: [{ property: 'Date ajout', direction: 'descending' }],
    page_size: NEW_BADGE_COUNT
  });
  const dates = response.results
    .map(page => page.properties['Date ajout']?.date?.start)
    .filter(Boolean);
  return dates.length ? dates[dates.length - 1] : null;
}

const TRIS = {
  nouveautes: {
    filtre: { property: 'Date ajout', date: { is_not_empty: true } },
    sorts: [{ property: 'Date ajout', direction: 'descending' }]
  },
  best: {
    sorts: [
      { property: 'Nbre de location', direction: 'descending' },
      { property: 'Date ajout', direction: 'descending' }
    ]
  }
};

async function chargerPage({ tri, limite, curseur }, filters) {
  const t = TRIS[tri] || TRIS.best;
  const params = {
    database_id: process.env.NOTION_DB_ID,
    filter: { and: t.filtre ? filters.concat([t.filtre]) : filters },
    sorts: t.sorts,
    page_size: Math.min(Math.max(parseInt(limite, 10) || 10, 1), 100),
    start_cursor: curseur || undefined
  };
  const cutoff = getNewCutoff().catch(() => null);
  let response;
  try {
    response = await notion.databases.query(params);
  } catch (err) {
    // Propriété de tri absente ou renommée dans Notion : on affiche quand même
    // les articles (les plus récents d'abord) plutôt qu'une section vide.
    if (err.code !== 'validation_error' || t !== TRIS.best) throw err;
    console.error('Tri best-sellers impossible, repli sur la date :', err.message);
    response = await notion.databases.query({
      ...params,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }]
    });
  }
  const newCutoff = await cutoff;
  return {
    articles: response.results.map(page => mapArticle(page, newCutoff)),
    suivant: response.has_more ? response.next_cursor : null
  };
}

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

    // Mode « page par page » (?limite=10&tri=nouveautes|best&curseur=…) :
    // renvoie { articles, suivant } au lieu du catalogue complet.
    if (req.query.limite) {
      return res.status(200).json(await chargerPage(req.query, filters));
    }

    const [pages, newCutoff] = await Promise.all([
      queryAll(notion, {
        database_id: process.env.NOTION_DB_ID,
        filter: { and: filters }
      }),
      getNewCutoff()
    ]);

    const articles = pages.map(page => mapArticle(page, newCutoff));

    res.status(200).json(articles);

  } catch (err) {
    res.status(500).json({ erreur: err.message, code: err.code });
  }
};
