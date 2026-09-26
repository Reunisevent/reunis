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
