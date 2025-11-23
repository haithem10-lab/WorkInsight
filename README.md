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
## Points suivants
- Intégrer les modules d'extraction (OCR, parsing PDF, scraping) dans `ExtractionService`.
- Sécuriser l'API (JWT, Keycloak, etc.) selon les besoins.
- Ajouter des tests unitaires et d'intégration.
