import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Worker, CompanyVehicle, LogEntry, User } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

interface DatabaseSchema {
  workers: Worker[];
  vehicles: CompanyVehicle[];
  logs: LogEntry[];
  users?: any[];
}

const DEFAULT_USERS = [
  { username: "kuperadmin", password: "Solcito3494", role: "administrador", displayName: "Súper Administrador" },
  { username: "admin", password: "admin123", role: "administrador", displayName: "Administrador Central" },
  { username: "control", password: "control2026", role: "administrador", displayName: "Encargado de Planta" },
  { username: "lucas", password: "lucas2026", role: "guardia", displayName: "Lucas (Guardia)" },
  { username: "martin", password: "martin2026", role: "guardia", displayName: "Martín (Guardia)" },
  { username: "guardia1", password: "guardia123", role: "guardia", displayName: "Guardia Turno Mañana" }
];

const DEFAULT_WORKERS: Worker[] = [
  { id: "w-1", name: "Carlos Mendoza", documentId: "20-34567890-9", phone: "+54 11 5555-1234", active: true },
  { id: "w-2", name: "Ana Rodríguez", documentId: "27-28945612-3", phone: "+54 11 5555-5678", active: true },
  { id: "w-3", name: "Juan Carlos López", documentId: "23-22446688-9", phone: "+54 11 5555-9012", active: true },
  { id: "w-4", name: "Sofía Gómez", documentId: "27-40123456-1", phone: "+54 11 5555-3456", active: true },
  { id: "w-5", name: "Miguel Ángel Torres", documentId: "20-31234567-5", phone: "+54 11 5555-7890", active: true },
  { id: "w-6", name: "Laura Fernández", documentId: "23-38901234-4", phone: "+54 11 5555-2345", active: true },
  { id: "w-7", name: "Pedro Sánchez", documentId: "20-25456789-2", phone: "+54 11 5555-6789", active: true }
];

const DEFAULT_VEHICLES: CompanyVehicle[] = [
  { id: "v-1", name: "Camión Scania R450", plate: "AB123CD", type: "camion", active: true },
  { id: "v-2", name: "Furgón Renault Kangoo", plate: "EF456GH", type: "furgon", active: true },
  { id: "v-3", name: "Moto Honda Tornado 250", plate: "789JKLM", type: "moto", active: true },
  { id: "v-4", name: "Camioneta Toyota Hilux", plate: "OP012QR", type: "furgon", active: true },
  { id: "v-5", name: "Furgón Peugeot Partner", plate: "ST345UV", type: "furgon", active: true },
  { id: "v-6", name: "Auto Chevrolet Onix", plate: "AD987WY", type: "auto", active: true }
];

// Helper to read database
function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData: DatabaseSchema = {
        workers: DEFAULT_WORKERS,
        vehicles: DEFAULT_VEHICLES,
        logs: [],
        users: DEFAULT_USERS
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
      return initialData;
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.users) {
      parsed.users = DEFAULT_USERS;
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
    } else {
      const hasKuper = parsed.users.some((u: any) => u.username.toLowerCase() === "kuperadmin");
      if (!hasKuper) {
        parsed.users.unshift({ username: "kuperadmin", password: "Solcito3494", role: "administrador", displayName: "Súper Administrador" });
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
      }
    }
    return parsed;
  } catch (err) {
    console.error("Error reading database file:", err);
    return { workers: DEFAULT_WORKERS, vehicles: DEFAULT_VEHICLES, logs: [], users: DEFAULT_USERS };
  }
}

// Helper to write database
function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API - Get Workers
  app.get("/api/workers", (req, res) => {
    const db = readDB();
    res.json(db.workers);
  });

  // API - Add Worker
  app.post("/api/workers", (req, res) => {
    const { name, documentId, phone } = req.body;
    if (!name || !documentId) {
      return res.status(400).json({ error: "Nombre y Documento son obligatorios" });
    }
    const db = readDB();
    const newWorker: Worker = {
      id: "w-" + Date.now(),
      name,
      documentId,
      phone: phone || "",
      active: true
    };
    db.workers.push(newWorker);
    writeDB(db);
    res.status(201).json(newWorker);
  });

  // API - Delete/Toggle Worker
  app.delete("/api/workers/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.workers.findIndex(w => w.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Trabajador no encontrado" });
    }
    // Hard delete if never logged, or soft delete/deactivate
    const hasLogs = db.logs.some(l => l.workerId === id);
    if (hasLogs) {
      db.workers[index].active = !db.workers[index].active;
    } else {
      db.workers.splice(index, 1);
    }
    writeDB(db);
    res.json({ success: true, workers: db.workers });
  });

  // API - Get Company Vehicles
  app.get("/api/company-vehicles", (req, res) => {
    const db = readDB();
    // Compute inUse flag
    const activeLogs = db.logs.filter(l => l.status === "adentro");
    const vehiclesWithInUse = db.vehicles.map(v => {
      const inUse = activeLogs.some(l => l.companyVehicleId === v.id);
      return { ...v, inUse };
    });
    res.json(vehiclesWithInUse);
  });

  // API - Add Company Vehicle
  app.post("/api/company-vehicles", (req, res) => {
    const { name, plate, type } = req.body;
    if (!name || !plate || !type) {
      return res.status(400).json({ error: "Nombre, Patente y Tipo son obligatorios" });
    }
    const db = readDB();
    const newVehicle: CompanyVehicle = {
      id: "v-" + Date.now(),
      name,
      plate: plate.toUpperCase().replace(/\s+/g, ""),
      type,
      active: true
    };
    db.vehicles.push(newVehicle);
    writeDB(db);
    res.status(201).json(newVehicle);
  });

  // API - Delete/Toggle Vehicle
  app.delete("/api/company-vehicles/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.vehicles.findIndex(v => v.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }
    const hasLogs = db.logs.some(l => l.companyVehicleId === id);
    if (hasLogs) {
      db.vehicles[index].active = !db.vehicles[index].active;
    } else {
      db.vehicles.splice(index, 1);
    }
    writeDB(db);
    res.json({ success: true, vehicles: db.vehicles });
  });

  // API - Get Logs
  app.get("/api/logs", (req, res) => {
    const db = readDB();
    res.json(db.logs);
  });

  // API - Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }
    const db = readDB();
    const users = db.users || DEFAULT_USERS;
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    });
  });

  // API - Get all users
  app.get("/api/users", (req, res) => {
    const db = readDB();
    const users = db.users || DEFAULT_USERS;
    res.json(users);
  });

  // API - Create User/Guard
  app.post("/api/users", (req, res) => {
    const { username, password, role, displayName } = req.body;
    if (!username || !password || !role || !displayName) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const db = readDB();
    const users = db.users || [...DEFAULT_USERS];
    
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (exists) {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }

    const newUser = {
      username: username.trim().toLowerCase(),
      password,
      role,
      displayName: displayName.trim()
    };

    users.push(newUser);
    db.users = users;
    writeDB(db);
    res.status(201).json(newUser);
  });

  // API - Update User/Guard
  app.put("/api/users/:username", (req, res) => {
    const { username } = req.params;
    const { password, role, displayName } = req.body;
    
    if (!password || !role || !displayName) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const db = readDB();
    const users = db.users || [...DEFAULT_USERS];
    
    const index = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (index === -1) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Safety checks for kuperadmin
    if (username.toLowerCase() === "kuperadmin" && role !== "administrador") {
      return res.status(400).json({ error: "No se puede cambiar el rol del super administrador" });
    }

    users[index] = {
      username: username.toLowerCase().trim(),
      password,
      role,
      displayName: displayName.trim()
    };

    db.users = users;
    writeDB(db);
    res.json(users[index]);
  });

  // API - Delete User/Guard
  app.delete("/api/users/:username", (req, res) => {
    const { username } = req.params;
    if (username.toLowerCase() === "kuperadmin") {
      return res.status(400).json({ error: "No se puede eliminar al super administrador kuperadmin" });
    }

    const db = readDB();
    const users = db.users || [...DEFAULT_USERS];
    
    const index = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (index === -1) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    users.splice(index, 1);
    db.users = users;
    writeDB(db);
    res.json({ success: true, message: "Usuario eliminado correctamente" });
  });

  // API - Register Worker Entry
  app.post("/api/logs/entry", (req, res) => {
    const { workerId, personalVehicleType, personalVehiclePlate, entryGuard, entryObservations } = req.body;
    if (!workerId) {
      return res.status(400).json({ error: "Trabajador es obligatorio" });
    }
    const db = readDB();
    const worker = db.workers.find(w => w.id === workerId);
    if (!worker) {
      return res.status(404).json({ error: "Trabajador no encontrado" });
    }

    // Check if already checked in and not checked out
    const alreadyIn = db.logs.find(l => l.workerId === workerId && l.status === "adentro");
    if (alreadyIn) {
      return res.status(400).json({ error: "El trabajador ya registra un ingreso activo" });
    }

    const newLog: LogEntry = {
      id: "log-" + Date.now(),
      workerId,
      workerName: worker.name,
      entryTime: new Date().toISOString(),
      personalVehicleType,
      personalVehiclePlate: personalVehiclePlate ? personalVehiclePlate.toUpperCase().replace(/\s+/g, "") : "",
      status: "adentro",
      entryGuard: entryGuard || "Sistema",
      entryObservations: entryObservations || ""
    };

    db.logs.push(newLog);
    writeDB(db);
    res.status(201).json(newLog);
  });

  // API - Register Worker Exit (Checkout + Business Vehicle exit for services)
  app.post("/api/logs/exit/:id", (req, res) => {
    const { id } = req.params; // Log ID
    const { companyVehicleId, exitGuard, exitObservations } = req.body; // Can be a vehicle id, or "ninguno"
    
    const db = readDB();
    const logIndex = db.logs.findIndex(l => l.id === id);
    if (logIndex === -1) {
      return res.status(404).json({ error: "Registro de ingreso no encontrado" });
    }

    const log = db.logs[logIndex];
    if (log.status === "salido") {
      return res.status(400).json({ error: "Este ingreso ya registra una salida" });
    }

    let companyVehicleName = undefined;
    let companyVehiclePlate = undefined;

    if (companyVehicleId && companyVehicleId !== "ninguno") {
      const vehicle = db.vehicles.find(v => v.id === companyVehicleId);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehículo de la empresa no encontrado" });
      }
      
      // Check if vehicle is already in use by another active log
      const vehicleInUse = db.logs.some(l => l.status === "adentro" && l.companyVehicleId === companyVehicleId && l.id !== id);
      if (vehicleInUse) {
        return res.status(400).json({ error: `El vehículo ${vehicle.name} ya está en servicio activo por otro trabajador` });
      }

      companyVehicleName = vehicle.name;
      companyVehiclePlate = vehicle.plate;
    }

    log.exitTime = new Date().toISOString();
    log.companyVehicleId = companyVehicleId === "ninguno" ? undefined : companyVehicleId;
    log.companyVehicleName = companyVehicleName;
    log.companyVehiclePlate = companyVehiclePlate;
    log.status = "salido";
    log.exitGuard = exitGuard || "Sistema";
    log.exitObservations = exitObservations || "";

    db.logs[logIndex] = log;
    writeDB(db);
    res.json(log);
  });

  // API - Reset/Seed default data (For debugging if requested, or testing)
  app.post("/api/system/reset", (req, res) => {
    const initialData: DatabaseSchema = {
      workers: DEFAULT_WORKERS,
      vehicles: DEFAULT_VEHICLES,
      logs: [],
      users: DEFAULT_USERS
    };
    writeDB(initialData);
    res.json({ success: true, message: "Base de datos restaurada de fábrica" });
  });

  // Vite development vs production serving
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
