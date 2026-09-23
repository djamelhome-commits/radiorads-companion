# RadioRADS Companion

SPA française statique pour les référentiels BI-RADS, PI-RADS, LI-RADS, Lung-RADS, TI-RADS, CAD-RADS et O-RADS. Le contenu est une synthèse originale à confronter aux documents officiels et au contexte clinique ; l’application ne fournit pas de diagnostic automatique.

## Utiliser et publier

Ouvrir `index.html` permet de consulter le guide. Pour la PWA et le fonctionnement hors ligne, servir ce dossier en HTTPS (ou via `localhost`), ouvrir l’application une fois en ligne, attendre le statut « Disponible hors ligne », puis utiliser l’installation proposée par le navigateur. Les chemins sont relatifs et le dossier peut être copié dans un sous-répertoire GitHub Pages.

## Rebuilder après modification

Avec Node.js et les dépendances de développement disponibles :

```text
npm install
npm run build
```

La construction minifie le CSS Tailwind et régénère l’empreinte du service worker. Les feuilles FontAwesome, la police et les icônes sont incluses dans `assets/` ; aucune requête CDN n’est nécessaire.

## Vérifications

```text
npm test
npm run test:browser
```

Les tests unitaires couvrent les sept modules, les dix parcours, les recherches, les favoris représentés par identifiants, le calcul de densité du PSA et les conclusions sans champs inventés. Le parcours Chromium couvre les thèmes, les breakpoints mobiles, le presse-papiers, l’export, l’installation, le service worker, la mise à jour protégée par un brouillon et le rechargement hors ligne lorsqu’un exécutable Chromium est disponible.

## Persistance et confidentialité

Seuls le thème et les favoris sont conservés dans `localStorage`. Le PSA, le volume et la conclusion sont limités à l’onglet courant et ne sont envoyés à aucun serveur. Effacer une conclusion est une action volontaire ; une mise à jour de la PWA demande d’abord de préserver un brouillon.

## Référentiel et limites

Les fiches indiquent leur version et leurs liens : BI-RADS v2025, PI-RADS v2.1 (2019), LI-RADS diagnostic v2018 et TRA v2024, Lung-RADS v2022, ACR TI-RADS 2017, CAD-RADS 2.0 (2022), O-RADS US v2022 et MRI 2024. Les seuils, catégories et conduites restent à valider par le responsable médical du service avant emploi clinique.
