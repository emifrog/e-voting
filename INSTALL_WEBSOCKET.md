# Installation WebSocket - Instructions

## Installation des dépendances

Exécutez ces commandes dans le terminal:

```bash
# Backend - Socket.IO serveur
npm install socket.io

# Frontend - Socket.IO client
npm install socket.io-client

# Web Push (optionnel pour notifications push)
npm install web-push
```

## Vérification

Après installation, vérifiez dans `package.json`:

```json
{
  "dependencies": {
    "socket.io": "^4.7.0",        // Serveur
    "socket.io-client": "^4.7.0", // Client
    "web-push": "^3.6.0"          // Push notifications
  }
}
```

---

**Note**: Les fichiers suivants ont été créés et sont prêts à être utilisés après l'installation des dépendances.
