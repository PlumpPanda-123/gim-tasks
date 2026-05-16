# GIM Tasks

A RuneLite plugin that gives your Group Ironman team a real-time shared task board.  
Group members can create tasks, claim them, track progress, and receive in-game toast notifications — all synced via a Node.js backend and Firebase Firestore.

---

## Repository layout

```
gim-tasks/
├── setup/          # Firestore one-time init scripts
├── backend/        # Node.js / Express API
└── plugin/         # RuneLite plugin (Java / Maven)
```

---

## 1 — Firebase & Firestore setup

### 1.1 Create a Firebase project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Name it (e.g. `gim-tasks`) and complete the wizard.
3. In the left sidebar choose **Firestore Database → Create database → Start in production mode**.
4. Choose your nearest region and click **Enable**.

### 1.2 Generate a service account key

1. In Firebase Console → **Project settings (gear icon) → Service accounts**.
2. Click **Generate new private key** → download the JSON file.
3. Save it as `setup/serviceAccountKey.json` (it is git-ignored).

### 1.3 Install dependencies and run the init script

```bash
cd setup
npm install
node initFirestore.js
```

The script will:
- Create a group document with 4 placeholder members (`Player1`–`Player4`).
- Create an example seed task.
- Print your `GROUP_ID` and `API_KEY` — **save these, you will need them**.

> Replace `Player1`–`Player4` with real RuneScape usernames in `initFirestore.js` and re-run before going live.

### 1.4 Deploy Firestore security rules

Install the Firebase CLI if you haven't:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, accept defaults
```

Then deploy:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Rules are in `setup/firestore.rules`; indexes are in `setup/firestore.indexes.json`.

---

## 2 — Backend (Node.js / Express)

### 2.1 Configure environment variables

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to find it |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase console → Project settings → General |
| `FIREBASE_CLIENT_EMAIL` | Service account JSON field `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account JSON field `private_key` (keep the `\n` escapes, wrap in double-quotes) |
| `API_KEY` | Printed by `initFirestore.js` |
| `PORT` | Default `3000` |

### 2.2 Run locally

```bash
cd backend
npm install
npm run dev        # uses nodemon for auto-reload
# or
npm start
```

Test the health endpoint:

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

Test a protected endpoint:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
     -H "x-group-id: YOUR_GROUP_ID" \
     http://localhost:3000/group
```

### 2.3 Deploy to Railway (free tier)

1. Push this repo to GitHub.
2. Go to <https://railway.app> → **New Project → Deploy from GitHub repo** → select `gim-tasks`.
3. Set the **root directory** to `backend`.
4. Add all four environment variables in the Railway dashboard under **Variables**.
5. Railway will detect `package.json` and run `npm start` automatically.
6. Copy the generated public URL (e.g. `https://gim-tasks-production.up.railway.app`) — this is your **Backend URL** for the plugin config.

### 2.4 Deploy to Render (alternative free tier)

1. Go to <https://render.com> → **New → Web Service**.
2. Connect your GitHub repo, set root directory to `backend`.
3. Build command: `npm install`  Start command: `node server.js`.
4. Add environment variables.
5. Copy the `.onrender.com` URL.

---

## 3 — RuneLite plugin

### 3.1 Prerequisites

- Java 11 JDK
- Maven 3.6+
- IntelliJ IDEA (Community or Ultimate)
- RuneLite source checked out locally (see [RuneLite wiki](https://github.com/runelite/runelite/wiki/Building-with-IntelliJ-IDEA))

### 3.2 Run in developer mode (IntelliJ)

1. Open `plugin/` as a Maven project in IntelliJ.
2. In `pom.xml` make sure the `runelite.version` matches your local RuneLite client version.
3. Add a **Run Configuration**:
   - Main class: `net.runelite.client.RuneLite`
   - VM options: `--add-opens=java.desktop/sun.awt=ALL-UNNAMED`
   - Classpath: module `gim-tasks`
4. Run the configuration. The RuneLite client will launch with your plugin loaded.
5. Open **RuneLite settings → GIM Tasks** and fill in:
   - **Backend URL** — `http://localhost:3000` (or your deployed URL)
   - **API Key** — from the init script output
   - **Group ID** — from the init script output
   - **Your Username** — your exact RuneScape username

The GIM Tasks icon will appear in the side-panel toolbar.

### 3.3 Build a JAR

```bash
cd plugin
mvn clean package -DskipTests
```

The shaded JAR is in `target/gim-tasks-1.0-SNAPSHOT-shaded.jar`.

### 3.4 Publish to the RuneLite Plugin Hub

1. Fork <https://github.com/runelite/plugin-hub>.
2. Add your plugin entry following the Plugin Hub [submission guide](https://github.com/runelite/plugin-hub#adding-a-plugin).
3. Open a pull request — the RuneLite team reviews and merges.
4. Once merged, group members can find **GIM Tasks** in the Plugin Hub and install it directly from the RuneLite client without building from source.

---

## 4 — How to onboard team members

Once the backend is deployed and the plugin is on the Plugin Hub:

1. Each player installs **GIM Tasks** from the Plugin Hub (Plugin Manager → search "GIM Tasks").
2. Open **RuneLite settings → GIM Tasks** and enter:
   - The shared **Backend URL**
   - The shared **API Key**
   - The shared **Group ID**
   - Their own **RuneScape username** (must match the allowlist exactly, case-insensitive)
3. The task board will appear in the side panel and auto-sync every 10 seconds.

---

## 5 — API reference

All requests require headers:

```
x-api-key:  <shared API key>
x-group-id: <group UUID>
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| GET | `/group` | Return group name and members |
| GET | `/tasks` | Return all tasks for the group |
| POST | `/tasks` | Create a new task |
| PATCH | `/tasks/:id/assign` | Assign task to a member |
| PATCH | `/tasks/:id/status` | Update task status |
| PATCH | `/tasks/:id/progress` | Update quantityCompleted |
| DELETE | `/tasks/:id` | Delete a task |

### POST /tasks body

```json
{
  "name": "Mine 500 Iron Ore",
  "skill": "MINING",
  "quantity": 500,
  "assignee": "Player1",
  "createdBy": "Player1",
  "priority": "NORMAL"
}
```

Valid skills: `ATTACK STRENGTH DEFENCE RANGED PRAYER MAGIC RUNECRAFTING HITPOINTS CRAFTING MINING SMITHING FISHING COOKING FIREMAKING WOODCUTTING AGILITY HERBLORE THIEVING FLETCHING SLAYER FARMING CONSTRUCTION HUNTER OTHER`

Valid statuses: `UNASSIGNED CLAIMED IN_PROGRESS COMPLETED`

Valid priorities: `NORMAL URGENT`

---

## 6 — Task status flow

```
UNASSIGNED → CLAIMED → IN_PROGRESS → COMPLETED
```

- A task is `UNASSIGNED` if created without an assignee.
- Claiming or assigning sets it to `CLAIMED`.
- The player can move it to `IN_PROGRESS` and then `COMPLETED`.

---

## Security notes

- The `API_KEY` is a shared secret — distribute it to teammates privately (Discord, password manager), never via the repo.
- The `serviceAccountKey.json` is git-ignored and must **never** be committed.
- The `backend/.env` is git-ignored — each person running the backend creates their own from `.env.example`.
- The plugin source contains **no hardcoded secrets** — API key, group ID, and backend URL are entered by each user in the RuneLite settings panel and stored locally on their machine.
- Firestore rules block all direct client writes; all mutations go through your backend.
- The backend validates that `createdBy` and `assignee` are in the group members allowlist before persisting any write.
