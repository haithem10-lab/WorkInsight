# WorkInsight

Plateforme web d'extraction intelligente d'informations à partir d'offres de stage/emploi.

## Architecture
- **Frontend** : Angular 17
- **Backend** : Spring Boot 3 (Java 17)
- **Base de données** : MongoDB

## Prérequis
- Node.js 18+ et npm
- Java 17 (JDK)
- Maven 3.9+
- Accès à une instance MongoDB (locale ou hébergée)

## Lancer le frontend (Angular)
```bash
cd frontend
npm install
npm start
```
L'application est disponible sur [http://localhost:4200](http://localhost:4200).

## Lancer le backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```
Le serveur démarre sur [http://localhost:8080](http://localhost:8080).

Définir la variable d'environnement `MONGODB_URI` si vous souhaitez utiliser une connexion différente de `mongodb://localhost:27017/workinsight`.

## Lancer les tests

### Frontend Angular
```bash
cd frontend
npm install
npm test
```

### Backend Spring Boot
```bash
cd backend
mvn test
```

## Publier le code sur votre dépôt GitHub

1. **Initialiser le dépôt local (si nécessaire)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Créer un dépôt vide sur GitHub** via l'interface web (sans README ni fichiers initiaux) et récupérer l'URL SSH ou HTTPS du dépôt. Pour un dépôt nommé `WorkInsight` dans votre compte personnel :
   ```bash
   git@github.com:<votre-compte>/WorkInsight.git
   # ou en HTTPS
   https://github.com/<votre-compte>/WorkInsight.git
   ```

3. **Configurer la branche principale locale** (ici `work`) pour suivre la branche distante :
   ```bash
   git branch -M main  # ou conserver le nom actuel de la branche
   git remote add origin <URL_DU_DEPOT>
   ```

4. **Pousser l'historique local vers GitHub** :
   ```bash
   git push -u origin main  # ou `git push -u origin work` selon le nom de la branche locale
   ```

5. **Vérifier la configuration distante** (optionnel mais recommandé) :
   ```bash
   git remote -v
   ```
   La sortie doit afficher l'URL de votre dépôt `WorkInsight` pour `origin`.

6. **Mettre à jour le dépôt à l'avenir** : après chaque modification, exécuter :
   ```bash
   git status
   git add <fichiers_modifiés>
   git commit -m "Description de la modification"
   git push
   ```


## Points suivants
- Intégrer les modules d'extraction (OCR, parsing PDF, scraping) dans `ExtractionService`.
- Sécuriser l'API (JWT, Keycloak, etc.) selon les besoins.
- Ajouter des tests unitaires et d'intégration.
