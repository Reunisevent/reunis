// Conversion d'une page Notion en article pour le site.
// Partagé par /api/catalogue et /api/article pour que la fiche article
// reçoive toujours les mêmes champs, quelle que soit la page d'où l'on vient.
// (Le préfixe « _ » empêche Vercel d'en faire une route.)

// Texte d'une propriété Notion quel que soit son type (sélection simple ou
// multiple, texte, formule, rollup…) : la recherche du site repose sur ces champs,
// ils ne doivent pas devenir vides si leur type change dans Notion.
function texte(prop) {
  if (!prop) return [];
  switch (prop.type) {
    case 'select':
    case 'status':
      return prop[prop.type] ? [prop[prop.type].name] : [];
    case 'multi_select':
      return prop.multi_select.map(o => o.name);
    case 'title':
    case 'rich_text': {
      const t = prop[prop.type].map(r => r.plain_text).join('').trim();
      return t ? [t] : [];
    }
    case 'formula':
      return prop.formula.string ? [prop.formula.string] : [];
    case 'rollup':
      return (prop.rollup.array || []).flatMap(texte);
    default:
      return [];
  }
}

// Texte complet d'un titre ou texte riche : Notion le découpe en plusieurs
// segments dès que la mise en forme change (gras, lien, collage…), il faut
// donc tous les assembler et pas seulement lire le premier.
function brut(prop) {
  return (prop?.[prop.type] ?? []).map(r => r.plain_text).join('');
}

function mapArticle(page, newIds) {
  const p = page.properties;
  const titleProp = Object.keys(p).find(k => p[k].type === 'title');
  const date_ajout = p['Date ajout']?.date?.start ?? null;
  return {
    id: page.id,
    nom: brut(p[titleProp]).trim(),
    reference: brut(p['Référence']),
    date_ajout,
    is_new: !!(newIds && newIds.has(page.id)),
    mots_cles: texte(p['Mots clés']).join(' '),
    categorie: p['Catégorie']?.select?.name ?? '',
    sous_categorie: p['Sous catégorie']?.select?.name ?? '',
    // Première valeur : sert aussi de filtre « tag » sur les pages catégories.
    sous_sous_categorie: texte(p['Sous-sous catégorie'])[0] ?? '',
    // Toutes les valeurs, pour la recherche (si la propriété est multiple).
    sous_sous_categories: texte(p['Sous-sous catégorie']),
    description: brut(p['Description']),
    dimensions: brut(p['Dimensions']),
    couleurs: p['Couleurs']?.multi_select?.map(c => c.name) ?? [],
    materiaux: p['Matière']?.multi_select?.map(m => m.name) ?? [],
    lies: p['Lié aux articles']?.relation?.map(r => r.id) ?? [],
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
}

module.exports = { mapArticle };
