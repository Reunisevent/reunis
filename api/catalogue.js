const { Client } = require('@notionhq/client');
const { mapArticle } = require('./_article');
const { queryAll } = require('./_notion');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Badge « Nouveauté » : au plus NEW_BADGE_COUNT articles, et seulement ceux
// ajoutés depuis moins de NEW_BADGE_DAYS jours. On renvoie la liste exacte des
// identifiants (et non une date seuil) : plusieurs articles ajoutés le même jour
// ne font donc plus déborder le badge sur tout le catalogue.
const NEW_BADGE_COUNT = 8;
const NEW_BADGE_DAYS = 30;

async function getNewIds() {
  const depuis = new Date(Date.now() - NEW_BADGE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DB_ID,
    filter: {
      and: [
        { property: 'Visible sur le site', checkbox: { equals: true } },
        { property: 'Date ajout', date: { on_or_after: depuis } }
      ]
    },
    sorts: [
      { property: 'Date ajout', direction: 'descending' },
      { timestamp: 'created_time', direction: 'descending' }
    ],
    page_size: NEW_BADGE_COUNT
  });
  return new Set(response.results.map(page => page.id));
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
  const nouveaux = getNewIds().catch(() => new Set());
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
  const newIds = await nouveaux;
  return {
    articles: response.results.map(page => mapArticle(page, newIds)),
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

    const [pages, newIds] = await Promise.all([
      queryAll(notion, {
        database_id: process.env.NOTION_DB_ID,
        filter: { and: filters }
      }),
      getNewIds().catch(() => new Set())
    ]);

    const articles = pages.map(page => mapArticle(page, newIds));

    res.status(200).json(articles);

  } catch (err) {
    res.status(500).json({ erreur: err.message, code: err.code });
  }
};
