# Publier WorkInsight sur GitHub

Ce guide reprend pas à pas les commandes à exécuter pour pousser ce projet sur un dépôt GitHub existant ou fraîchement créé.

## 1. Vérifier l'état du dépôt local

```bash
git status -sb
```

La branche active doit être `work` (ou `main`) et aucun fichier ne doit rester en attente d'indexation avant de pousser.

## 2. Configurer votre identité Git (si nécessaire)

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

## 3. Ajouter la télécommande GitHub

Remplacez `<votre-compte>` par votre identifiant GitHub :

```bash
git remote add origin git@github.com:<votre-compte>/WorkInsight.git
# ou
git remote add origin https://github.com/<votre-compte>/WorkInsight.git
```

Si `origin` existe déjà, mettez à jour son URL :

```bash
git remote set-url origin git@github.com:<votre-compte>/WorkInsight.git
```

## 4. Pousser la branche locale

```bash
git push -u origin work
```

Si vous souhaitez renommer la branche principale en `main` :

```bash
git branch -M main
git push -u origin main
```

## 5. Vérifier sur GitHub

Ouvrez `https://github.com/<votre-compte>/WorkInsight` dans votre navigateur et assurez-vous que les dossiers `frontend/` et `backend/` apparaissent bien, ainsi que le README.

## 6. Pousser de nouvelles modifications

```bash
./scripts/git-sync.sh "Description de la modification"
```

Ce script :
- ajoute automatiquement tous les fichiers modifiés ;
- crée un commit avec votre message ;
- pousse la branche courante vers `origin`.

Lancez-le depuis la racine du dépôt après avoir vérifié `git status`.


```bash
git status
git add <fichiers>
git commit -m "Description de la modification"
git push
```

## Dépannage

- **Erreur d'authentification SSH** : ajoutez votre clé publique à GitHub (Settings ▸ SSH and GPG keys).
- **Erreur HTTPS 403** : régénérez un token personnel GitHub et utilisez-le comme mot de passe lors du push.
- **Historique divergent** : récupérez d'abord `git pull --rebase origin work` puis poussez de nouveau.

