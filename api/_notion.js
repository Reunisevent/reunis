// Notion renvoie au maximum 100 résultats par requête : on enchaîne les pages
// (curseur « next_cursor ») pour récupérer toute la base, quelle que soit sa taille.
// (Le préfixe « _ » empêche Vercel d'en faire une route.)
async function queryAll(notion, params) {
  const results = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      ...params,
      page_size: 100,
      start_cursor: cursor
    });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return results;
}

module.exports = { queryAll };
