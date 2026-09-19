import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth, Auth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK if service account is present
let firebaseAdminInitialized = false;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

try {
  const saPath = path.join(__dirname, "firebase-service-account.json");
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf-8"));
    const existingApps = getAdminApps();
    const adminApp = existingApps.length === 0 ? initAdminApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    }) : existingApps[0];

    const configPath = path.join(__dirname, "firebase-applet-config.json");
    let firestoreDatabaseId = "(default)";
    if (fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (cfg.firestoreDatabaseId) firestoreDatabaseId = cfg.firestoreDatabaseId;
      } catch (e) {}
    }

    adminDb = getAdminFirestore(adminApp, firestoreDatabaseId);
    adminAuth = getAdminAuth(adminApp);
    firebaseAdminInitialized = true;
    console.log(`[PlanWise AI] Firebase Admin SDK active for project: ${serviceAccount.project_id} (db: ${firestoreDatabaseId})`);
  }
} catch (err: any) {
  console.warn("[PlanWise AI] Firebase Admin SDK warning:", err?.message || err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper to execute the core Python scheduling algorithm
  function runPythonScheduler(action: string, payload: any) {
    try {
      const payloadStr = JSON.stringify(payload);
      const pythonProcess = spawnSync("python3", [
        path.join(__dirname, "scheduler.py"),
        "--action", action,
        "--payload", payloadStr
      ], {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 15000
      });

      if (pythonProcess.error) {
        console.error("Python process execution error:", pythonProcess.error);
        return { error: pythonProcess.error.message, success: false };
      }

      if (pythonProcess.status !== 0) {
        console.error("Python scheduler exited with error:", pythonProcess.stderr);
        return { error: pythonProcess.stderr || "Python script failed", success: false };
      }

      const output = pythonProcess.stdout.trim();
      const lastLine = output.split("\n").filter(l => l.trim().startsWith("{")).pop() || output;
      return JSON.parse(lastLine);
    } catch (err: any) {
      console.error("Error executing Python scheduler:", err);
      return { error: err.message, success: false };
    }
  }

  // 1. Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      appName: "PlanWise AI",
      engine: "Python 3.10 Antigravity Scheduler",
      timestamp: new Date().toISOString()
    });
  });

  // Helper to persist tasks to Firestore
  const syncTasksToFirestore = async (tasks: any[]) => {
    if (!adminDb || !tasks || tasks.length === 0) return;
    try {
      const batch = adminDb.batch();
      for (const t of tasks) {
        if (!t.id) continue;
        const ref = adminDb.collection("tasks").doc(t.id);
        batch.set(ref, {
          ...t,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      await batch.commit();
      console.log(`[Firestore Admin] Synced ${tasks.length} task documents to collection 'tasks'`);
    } catch (err: any) {
      console.warn("[Firestore Admin] Task batch write note:", err?.message || err);
    }
  };

  // 2. Requirement 4: /adjust-schedule endpoint
  const handleAdjustSchedule = async (req: express.Request, res: express.Response) => {
    const { missedTaskId, tasks, user } = req.body;
    if (!missedTaskId) {
      return res.status(400).json({ error: "missedTaskId is required" });
    }

    console.log(`[Python Engine] Executing dynamic adjustment for missed task: ${missedTaskId}`);
    const result = runPythonScheduler("adjust", {
      missedTaskId,
      tasks: tasks || [],
      user: user || { studyHoursPerDay: 5, peakEnergyTime: "Morning" }
    });

    if (result.error) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Persist adjusted tasks to Firestore tasks collection
    if (result.updatedTasks) {
      syncTasksToFirestore(result.updatedTasks);
    }

    return res.json(result);
  };

  app.post("/adjust-schedule", handleAdjustSchedule);
  app.post("/api/adjust-schedule", handleAdjustSchedule);

  // 3. Requirement 3: Generate schedule endpoint
  const handleGenerateSchedule = async (req: express.Request, res: express.Response) => {
    const { user, subjects } = req.body;
    console.log(`[Python Engine] Generating schedule for ${subjects?.length || 0} subjects`);

    const result = runPythonScheduler("generate", {
      user: user || { studyHoursPerDay: 5, peakEnergyTime: "Morning" },
      subjects: subjects || []
    });

    if (result.error) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Persist newly generated study blocks to Firestore tasks collection
    if (result.tasks) {
      syncTasksToFirestore(result.tasks);
    }

    return res.json(result);
  };

  app.post("/api/schedule/generate", handleGenerateSchedule);

  // 4. Test run & Terminal verification endpoint
  app.get("/api/engine/test", (req, res) => {
    try {
      const pythonProcess = spawnSync("python3", [
        path.join(__dirname, "scheduler.py"),
        "--action", "test"
      ], { encoding: "utf-8", timeout: 10000 });

      res.json({
        success: pythonProcess.status === 0,
        stdout: pythonProcess.stdout,
        stderr: pythonProcess.stderr,
        exitCode: pythonProcess.status
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Firestore Blueprint Schema endpoint
  app.get("/api/schema", (req, res) => {
    try {
      const schemaPath = path.join(__dirname, "firebase-blueprint.json");
      if (fs.existsSync(schemaPath)) {
        const data = fs.readFileSync(schemaPath, "utf-8");
        return res.json(JSON.parse(data));
      }
      return res.status(404).json({ error: "Blueprint not found" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Firebase Admin Status & Verification endpoint
  app.get("/api/firebase/status", (req, res) => {
    res.json({
      connected: firebaseAdminInitialized,
      projectId: "planwise-ai-d8803",
      serviceAccountConfigured: fs.existsSync(path.join(__dirname, "firebase-service-account.json")),
      authDomain: "planwise-ai-d8803.firebaseapp.com",
      adminDbReady: !!adminDb,
      adminAuthReady: !!adminAuth
    });
  });

  // 7. Sync user or task data into Firestore via Admin SDK
  app.post("/api/firebase/sync-user", async (req, res) => {
    if (!firebaseAdminInitialized || !adminDb) {
      return res.json({ success: true, synced: false, note: "Admin SDK initialized in offline mode" });
    }
    try {
      const { user } = req.body;
      if (user && user.uid) {
        await adminDb.collection("users").doc(user.uid).set(user, { merge: true });
        return res.json({ success: true, synced: true, uid: user.uid });
      }
      return res.status(400).json({ error: "User payload missing uid" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PlanWise AI Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
