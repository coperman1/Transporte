import { useState, useEffect, useMemo, FormEvent } from "react";
import { 
  ShieldCheck, 
  TrendingUp, 
  UserPlus, 
  LogIn, 
  LogOut, 
  Car, 
  FileSpreadsheet, 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Plus, 
  X, 
  Smartphone, 
  Briefcase, 
  HelpCircle, 
  AlertCircle,
  Truck,
  RotateCcw,
  Bike
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Worker, CompanyVehicle, LogEntry, User } from "./types.js";

export default function App() {
  // Global States
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Authentication States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("logicontrol_user");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Layout States
  const [role, setRole] = useState<'guardia' | 'propietario'>(() => {
    const stored = localStorage.getItem("logicontrol_user");
    try {
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.role === 'administrador' ? 'propietario' : 'guardia';
      }
    } catch {}
    return 'guardia';
  });
  const [guardTab, setGuardTab] = useState<'ingreso' | 'salida' | 'planta'>('ingreso');
  const [ownerTab, setOwnerTab] = useState<'dashboard' | 'reportes' | 'trabajadores' | 'vehiculos'>('dashboard');

  // Form States - Entry
  const [entryWorkerId, setEntryWorkerId] = useState("");
  const [entryVehicleType, setEntryVehicleType] = useState<'moto' | 'auto' | 'ninguno'>('ninguno');
  const [entryPlate, setEntryPlate] = useState("");

  // Form States - Exit Modal
  const [selectedLogForExit, setSelectedLogForExit] = useState<LogEntry | null>(null);
  const [exitCompanyVehicleId, setExitCompanyVehicleId] = useState("ninguno");

  // Form States - Manage Workers
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerDoc, setNewWorkerDoc] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");

  // Form States - Manage Vehicles
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleType, setNewVehicleType] = useState<'camion' | 'furgon' | 'moto' | 'auto' | 'otros'>('furgon');

  // Filters - Report/History Tab
  const [filterMonth, setFilterMonth] = useState<string>(""); // YYYY-MM
  const [filterWorker, setFilterWorker] = useState<string>("todos");
  const [filterPlateQuery, setFilterPlateQuery] = useState("");

  // User Management States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [newUserRole, setNewUserRole] = useState<'guardia' | 'administrador'>('guardia');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Observations States
  const [entryObservations, setEntryObservations] = useState("");
  const [exitObservations, setExitObservations] = useState("");

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Set up live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all database information
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [workersRes, vehiclesRes, logsRes] = await Promise.all([
        fetch("/api/workers"),
        fetch("/api/company-vehicles"),
        fetch("/api/logs")
      ]);

      if (!workersRes.ok || !vehiclesRes.ok || !logsRes.ok) {
        throw new Error("Error al obtener datos del servidor");
      }

      const workersData = await workersRes.json();
      const vehiclesData = await vehiclesRes.json();
      const logsData = await logsRes.json();

      setWorkers(workersData);
      setVehicles(vehiclesData);
      // Sort logs by entry time descending
      setLogs(logsData.sort((a: LogEntry, b: LogEntry) => 
        new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
      ));

      // Fetch users list dynamically for administrators
      const stored = localStorage.getItem("logicontrol_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'administrador') {
          const usersRes = await fetch("/api/users");
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsersList(usersData);
          }
        }
      }

      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage("No se pudo conectar con el servidor central. Reintentando...");
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'administrador') {
      fetchData(true);
    }
  }, [currentUser]);

  // Poll database for real-time updates (every 5 seconds)
  useEffect(() => {
    fetchData();
    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // Helper for notifications
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Auth Handlers
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      triggerError("Por favor ingrese usuario y contraseña.");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }
      setCurrentUser(data.user);
      localStorage.setItem("logicontrol_user", JSON.stringify(data.user));
      if (data.user.role === 'administrador') {
        setRole('propietario');
        setOwnerTab('dashboard');
      } else {
        setRole('guardia');
        setGuardTab('ingreso');
      }
      triggerSuccess(`¡Bienvenido, ${data.user.displayName}!`);
      setUsername("");
      setPassword("");
    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("logicontrol_user");
    triggerSuccess("Sesión cerrada correctamente.");
  };

  // Register Entry
  const handleRegisterEntry = async (e: FormEvent) => {
    e.preventDefault();
    if (!entryWorkerId) {
      triggerError("Por favor, seleccione un trabajador.");
      return;
    }

    if (entryVehicleType !== "ninguno" && !entryPlate.trim()) {
      triggerError("Debe ingresar la patente del vehículo personal.");
      return;
    }

    try {
      const res = await fetch("/api/logs/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: entryWorkerId,
          personalVehicleType: entryVehicleType,
          personalVehiclePlate: entryPlate,
          entryGuard: currentUser ? (currentUser.displayName || currentUser.username) : "Sistema",
          entryObservations: entryObservations
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar ingreso");

      triggerSuccess(`Ingreso registrado con éxito para ${data.workerName}`);
      // Reset entry form
      setEntryWorkerId("");
      setEntryVehicleType("ninguno");
      setEntryPlate("");
      setEntryObservations("");
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Register Exit
  const handleRegisterExit = async () => {
    if (!selectedLogForExit) return;

    try {
      const res = await fetch(`/api/logs/exit/${selectedLogForExit.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyVehicleId: exitCompanyVehicleId,
          exitGuard: currentUser ? (currentUser.displayName || currentUser.username) : "Sistema",
          exitObservations: exitObservations
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar salida");

      triggerSuccess(`Salida registrada para ${data.workerName}.`);
      setSelectedLogForExit(null);
      setExitCompanyVehicleId("ninguno");
      setExitObservations("");
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Save/Create User account
  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword.trim() || !newUserDisplayName.trim()) {
      triggerError("Por favor, complete todos los campos.");
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.username}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newUserPassword,
          role: newUserRole,
          displayName: newUserDisplayName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar el usuario");

      triggerSuccess(editingUser ? `Usuario ${data.displayName} modificado correctamente.` : `Usuario ${data.displayName} creado con éxito.`);
      
      // Reset form & close modal
      setNewUsername("");
      setNewUserPassword("");
      setNewUserDisplayName("");
      setNewUserRole("guardia");
      setEditingUser(null);
      setShowUserModal(false);
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Delete User Account
  const handleDeleteUser = async (usernameToDelete: string) => {
    if (usernameToDelete.toLowerCase() === "kuperadmin") {
      triggerError("No se puede eliminar al super administrador kuperadmin.");
      return;
    }
    if (!confirm(`¿Está seguro de eliminar al usuario ${usernameToDelete}?`)) return;

    try {
      const res = await fetch(`/api/users/${usernameToDelete}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar el usuario");

      triggerSuccess("Usuario eliminado correctamente.");
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Add Worker
  const handleAddWorker = async (e: FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerDoc.trim()) {
      triggerError("El nombre y documento de identidad son requeridos.");
      return;
    }

    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWorkerName.trim(),
          documentId: newWorkerDoc.trim(),
          phone: newWorkerPhone.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar trabajador");

      triggerSuccess(`Trabajador ${data.name} registrado correctamente.`);
      setNewWorkerName("");
      setNewWorkerDoc("");
      setNewWorkerPhone("");
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Deactivate or Delete Worker
  const handleDeleteWorker = async (id: string) => {
    if (!confirm("¿Está seguro de dehabilitar o eliminar este trabajador?")) return;
    try {
      const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al modificar trabajador");
      
      triggerSuccess("Estado del trabajador modificado correctamente.");
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Add Company Vehicle
  const handleAddVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!newVehicleName.trim() || !newVehiclePlate.trim()) {
      triggerError("El nombre y la patente son requeridos.");
      return;
    }

    try {
      const res = await fetch("/api/company-vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVehicleName.trim(),
          plate: newVehiclePlate.trim(),
          type: newVehicleType
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar vehículo");

      triggerSuccess(`Vehículo corporativo ${data.name} guardado con éxito.`);
      setNewVehicleName("");
      setNewVehiclePlate("");
      setNewVehicleType("furgon");
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Deactivate or Delete Vehicle
  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("¿Está seguro de deshabilitar o eliminar este vehículo?")) return;
    try {
      const res = await fetch(`/api/company-vehicles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al modificar vehículo");
      
      triggerSuccess("Estado del vehículo modificado correctamente.");
      fetchData(true);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Database hard reset
  const handleResetDatabase = async () => {
    if (!confirm("⚠️ ¡ADVERTENCIA! Esto borrará todos los registros históricos de entrada/salida y restaurará la lista de trabajadores y vehículos de prueba. ¿Desea continuar?")) return;
    try {
      const res = await fetch("/api/system/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al restaurar");
      triggerSuccess("Sistema restaurado a valores iniciales de fábrica.");
      fetchData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Filter lists for quick selection
  const activeWorkers = useMemo(() => workers.filter(w => w.active), [workers]);
  const activeVehicles = useMemo(() => vehicles.filter(v => v.active), [vehicles]);

  // Workers currently inside
  const logsInside = useMemo(() => logs.filter(l => l.status === "adentro"), [logs]);
  const workersInsideIds = useMemo(() => new Set(logsInside.map(l => l.workerId)), [logsInside]);

  // Workers outside (available for check-in)
  const workersOutside = useMemo(() => {
    return activeWorkers.filter(w => !workersInsideIds.has(w.id));
  }, [activeWorkers, workersInsideIds]);

  // Stats computed
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.entryTime.startsWith(today));
    const entriesToday = todayLogs.length;
    const exitsToday = todayLogs.filter(l => l.status === "salido").length;
    const activeVehiclesInServiceCount = vehicles.filter(v => v.inUse).length;

    return {
      insideCount: logsInside.length,
      vehiclesInUseCount: activeVehiclesInServiceCount,
      entriesToday,
      exitsToday,
      totalWorkersCount: workers.length,
      totalVehiclesCount: vehicles.length
    };
  }, [logs, logsInside, vehicles, workers]);

  // Filtering logs for reports
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Month Filter (Format from ISO is YYYY-MM-DDTHH:mm:ss...)
      if (filterMonth) {
        const entryMonth = log.entryTime.substring(0, 7); // YYYY-MM
        if (entryMonth !== filterMonth) return false;
      }
      // Worker Filter
      if (filterWorker !== "todos" && log.workerId !== filterWorker) {
        return false;
      }
      // Plate text search (matches personal vehicle plate or company vehicle plate)
      if (filterPlateQuery.trim()) {
        const q = filterPlateQuery.toUpperCase().trim();
        const personalPlate = log.personalVehiclePlate?.toUpperCase() || "";
        const companyPlate = log.companyVehiclePlate?.toUpperCase() || "";
        const workerName = log.workerName.toUpperCase();
        if (!personalPlate.includes(q) && !companyPlate.includes(q) && !workerName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [logs, filterMonth, filterWorker, filterPlateQuery]);

  // Exporter to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      triggerError("No hay datos en la lista actual para exportar.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    // Header
    csvContent += "Fecha,Hora Entrada,Trabajador,Vehiculo Personal,Patente Personal,Guardia Entrada,Observacion Entrada,Hora Salida,Servicio Empresa (Coche),Patente Empresa,Guardia Salida,Observacion Salida,Estado,Horas en Planta\n";

    filteredLogs.forEach(l => {
      const entryDate = new Date(l.entryTime);
      const dateStr = entryDate.toLocaleDateString('es-AR');
      const entryTimeStr = entryDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      
      let exitTimeStr = "-";
      let durationStr = "-";
      if (l.exitTime) {
         const exitDate = new Date(l.exitTime);
         exitTimeStr = exitDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
         
         const diffMs = exitDate.getTime() - entryDate.getTime();
         const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
         const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
         durationStr = `${diffHrs}h ${diffMins}m`;
      } else {
         durationStr = "Activo";
      }

      const personalVeh = l.personalVehicleType === "ninguno" ? "A pie" : l.personalVehicleType === "moto" ? "Moto" : "Auto";
      const personalPlate = l.personalVehiclePlate || "-";
      const companyCar = l.companyVehicleName || "-";
      const companyPlate = l.companyVehiclePlate || "-";
      const statusLabel = l.status === "adentro" ? "En planta" : "Salido";

      // Clean commas and quotes to avoid breaking CSV format
      const cleanName = l.workerName.replace(/,/g, " ");
      const cleanCompanyCar = companyCar.replace(/,/g, " ");
      const cleanEntryObservations = (l.entryObservations || "").replace(/,/g, " ").replace(/"/g, '""');
      const cleanExitObservations = (l.exitObservations || "").replace(/,/g, " ").replace(/"/g, '""');
      const cleanEntryGuard = (l.entryGuard || "Sistema").replace(/,/g, " ");
      const cleanExitGuard = (l.exitGuard || "-").replace(/,/g, " ");

      const row = [
        dateStr,
        entryTimeStr,
        cleanName,
        personalVeh,
        personalPlate,
        cleanEntryGuard,
        `"${cleanEntryObservations}"`,
        exitTimeStr,
        cleanCompanyCar,
        companyPlate,
        cleanExitGuard,
        `"${cleanExitObservations}"`,
        statusLabel,
        durationStr
      ].join(",");

      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = `Reporte_Control_Asistencia_${filterMonth || "Completo"}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerSuccess(`Reporte de ${filteredLogs.length} registros exportado con éxito.`);
  };

  // Quick helper to calculate hours inside
  const calculateDuration = (start: string, end?: string) => {
    if (!end) return "En planta";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  };

  const formattedDateString = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 antialiased font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-8 max-w-md w-full"
        >
          {/* Logo */}
          <div className="flex flex-col items-center text-center gap-3 mb-8">
            <div className="bg-zinc-900 text-white p-3 rounded-2xl border border-zinc-800 shadow-md">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 flex items-center justify-center gap-1.5">
                Logi<span className="text-zinc-600 font-bold">Control</span>
              </h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold font-mono mt-1">
                Acceso Centralizado de Personal
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5 font-mono">
                Nombre de Usuario
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: lucas o admin"
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5 font-mono">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
              />
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              id="login-btn-submit"
              type="submit"
              disabled={authLoading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/80 text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      
      {/* Top Professional Header Bar */}
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur sticky top-0 z-30 shadow-xs px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Clock */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-zinc-100 text-zinc-800 p-2.5 rounded-xl border border-zinc-200">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-1.5">
                Logi<span className="text-zinc-600">Control</span>
                <span className="text-[10px] bg-zinc-100 text-zinc-600 border border-zinc-200 py-0.5 px-2 rounded-full font-mono uppercase tracking-wider">
                  Transporte
                </span>
              </h1>
              <p className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}, {currentTime.toLocaleTimeString('es-AR')}
              </p>
            </div>
          </div>

          {/* Centralized Notification & Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2 rounded-xl flex items-center gap-2 max-w-sm shadow-xs"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2 rounded-xl flex items-center gap-2 max-w-sm shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active User info, switcher (admins only) and Logout */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
            
            {/* User welcome badge */}
            <div className="text-center sm:text-right">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Usuario activo</p>
              <div className="flex items-center gap-1.5 justify-center sm:justify-end mt-0.5">
                <span className="text-xs font-bold text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                  {currentUser?.displayName}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/50">
                  {currentUser?.role === 'administrador' ? 'Admin' : 'Guardia'}
                </span>
              </div>
            </div>

            {/* Navigation Control Switcher (Admins only) */}
            {currentUser?.role === 'administrador' && (
              <div className="flex items-center bg-zinc-100 border border-zinc-200 p-1 rounded-xl">
                <button
                  id="role-guard"
                  onClick={() => setRole('guardia')}
                  className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
                    role === 'guardia' 
                      ? 'bg-white text-zinc-900 shadow-xs' 
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Guardia
                </button>
                <button
                  id="role-owner"
                  onClick={() => setRole('propietario')}
                  className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
                    role === 'propietario' 
                      ? 'bg-white text-zinc-900 shadow-xs' 
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Dueño
                </button>
              </div>
            )}

            {/* Logout Button */}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/50 hover:border-rose-200 active:bg-rose-100 bg-white px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-mono shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-8 pb-20">

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500 gap-3">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin"></div>
            <p className="text-sm font-mono">Cargando base de datos centralizada...</p>
          </div>
        ) : (
          <div>
            
            {/* 📱 PORTAL GUARDIA */}
            {role === 'guardia' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto"
              >
                {/* Header context for Guardia */}
                <div className="bg-white border border-zinc-200/85 p-6 rounded-2xl shadow-xs mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-zinc-700" />
                      Portal de Control Guardias
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Registra de manera ágil los ingresos y egresos de transporte.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-zinc-900">{stats.insideCount}</span>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Trabajadores adentro</p>
                  </div>
                </div>

                {/* Subnavigation Guard Tab */}
                <div className="grid grid-cols-3 bg-zinc-100 border border-zinc-200 p-1 rounded-xl mb-6">
                  <button
                    id="guard-tab-entry"
                    onClick={() => setGuardTab('ingreso')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 rounded-lg font-medium text-xs transition-all duration-200 cursor-pointer ${
                      guardTab === 'ingreso' 
                        ? 'bg-white text-zinc-900 border border-zinc-200 shadow-xs' 
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    Registrar Ingreso
                  </button>
                  <button
                    id="guard-tab-exit"
                    onClick={() => setGuardTab('salida')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 rounded-lg font-medium text-xs transition-all duration-200 cursor-pointer ${
                      guardTab === 'salida' 
                        ? 'bg-white text-zinc-900 border border-zinc-200 shadow-xs' 
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    Registrar Salida ({stats.insideCount})
                  </button>
                  <button
                    id="guard-tab-status"
                    onClick={() => setGuardTab('planta')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 rounded-lg font-medium text-xs transition-all duration-200 cursor-pointer ${
                      guardTab === 'planta' 
                        ? 'bg-white text-zinc-900 border border-zinc-200 shadow-xs' 
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Live en Planta
                  </button>
                </div>

                {/* GUARD TAB CONTENTS */}
                <div className="min-h-[400px]">

                  {/* 1. INGRESO FORM */}
                  {guardTab === 'ingreso' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs"
                    >
                      <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                        Paso 1: Datos de Ingreso de Trabajador
                      </h3>
                      
                      <form onSubmit={handleRegisterEntry} className="space-y-6">
                        
                        {/* Selector de Trabajador */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">
                            Seleccionar Trabajador
                          </label>
                          {workersOutside.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-xs flex gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                              <p>Todos los trabajadores cargados en el sistema ya registran ingreso. Carga más personal en la sección "Dueño (Dashboard)" o marca salida de los activos.</p>
                            </div>
                          ) : (
                            <div className="relative">
                              <select
                                id="entry-worker-select"
                                value={entryWorkerId}
                                onChange={(e) => setEntryWorkerId(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all cursor-pointer appearance-none"
                              >
                                <option value="">-- Seleccione un trabajador en entrada --</option>
                                {workersOutside.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.name} (DNI: {w.documentId})
                                  </option>
                                ))}
                              </select>
                              <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-zinc-400">
                                ▼
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Medio de transporte de ingreso (Personal vehicle) */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-3">
                            Vehículo en el que ingresa (Propio)
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            
                            {/* Ninguno */}
                            <button
                              type="button"
                              onClick={() => {
                                setEntryVehicleType('ninguno');
                                setEntryPlate('');
                              }}
                              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer ${
                                entryVehicleType === 'ninguno'
                                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-800'
                              }`}
                            >
                              <Clock className="w-5 h-5" />
                              <span>A pie / Colectivo</span>
                            </button>

                            {/* Moto */}
                            <button
                              type="button"
                              onClick={() => setEntryVehicleType('moto')}
                              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer ${
                                entryVehicleType === 'moto'
                                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-800'
                              }`}
                            >
                              <Bike className="w-5 h-5" />
                              <span>Moto Personal</span>
                            </button>

                            {/* Auto */}
                            <button
                              type="button"
                              onClick={() => setEntryVehicleType('auto')}
                              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer ${
                                entryVehicleType === 'auto'
                                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-800'
                              }`}
                            >
                              <Car className="w-5 h-5" />
                              <span>Auto Personal</span>
                            </button>

                          </div>
                        </div>

                        {/* Patente input */}
                        {entryVehicleType !== 'ninguno' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="overflow-hidden"
                          >
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">
                              Patente del Vehículo Personal
                            </label>
                            <input
                              id="entry-plate-input"
                              type="text"
                              maxLength={10}
                              value={entryPlate}
                              onChange={(e) => setEntryPlate(e.target.value.toUpperCase().replace(/\s/g, ""))}
                              placeholder="Ej: AB123CD o JKL123"
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 font-mono placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 uppercase transition-all"
                            />
                            <p className="text-[10px] text-zinc-500 mt-1.5 font-mono">
                              La patente se guardará en mayúsculas y sin espacios.
                            </p>
                          </motion.div>
                        )}

                        <div className="mt-4">
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">
                            Observaciones / Notas de Ingreso
                          </label>
                          <textarea
                            id="entry-observations-input"
                            value={entryObservations}
                            onChange={(e) => setEntryObservations(e.target.value)}
                            placeholder="Ej: Ingresa con herramientas de mano, casco y chaleco, etc."
                            rows={2}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
                          />
                        </div>

                        <div className="pt-4">
                          <button
                            id="btn-register-entry"
                            type="submit"
                            disabled={workersOutside.length === 0}
                            className="w-full bg-zinc-900 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-zinc-800 active:bg-zinc-950 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            CONFIRMAR INGRESO EN PLANTA
                          </button>
                        </div>

                      </form>
                    </motion.div>
                  )}

                  {/* 2. SALIDA / EGRESOS LIST */}
                  {guardTab === 'salida' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                        Seleccione el trabajador que se retira:
                      </h3>

                      {logsInside.length === 0 ? (
                        <div className="bg-white border border-zinc-200/80 p-10 rounded-2xl text-center text-zinc-500 shadow-xs">
                          <CheckCircle2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                          <p className="text-sm font-medium">No hay trabajadores dentro de la planta en este momento.</p>
                          <p className="text-xs text-zinc-400 mt-1">Todos los ingresos han sido egresados correctamente.</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {logsInside.map((log) => {
                            const entryD = new Date(log.entryTime);
                            const hoursStr = entryD.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div 
                                key={log.id}
                                className="bg-white border border-zinc-200/80 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-zinc-300 transition-all shadow-xs group"
                              >
                                <div className="min-w-0">
                                  <h4 className="font-bold text-zinc-900 truncate text-sm">{log.workerName}</h4>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500 font-mono">
                                    <span className="flex items-center gap-1 text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-zinc-200/40">
                                      ENTRADA: {hoursStr}
                                    </span>
                                    {log.personalVehicleType !== "ninguno" ? (
                                      <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border border-indigo-100/50">
                                        Vehículo: {log.personalVehicleType === "moto" ? "Moto" : "Auto"} ({log.personalVehiclePlate})
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400 text-[10px]">Llegó a pie</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedLogForExit(log)}
                                  className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1 transition-all flex-shrink-0 cursor-pointer"
                                >
                                  Marcar Salida
                                  <LogOut className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* 3. PLANT STATUS */}
                  {guardTab === 'planta' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs"
                    >
                      <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                        Lista de Personal en Planta (Tiempo Real)
                      </h3>

                      {logsInside.length === 0 ? (
                        <p className="text-zinc-500 text-xs font-mono text-center py-6">
                          Planta vacía. Ningún trabajador adentro actualmente.
                        </p>
                      ) : (
                        <div className="divide-y divide-zinc-100">
                          {logsInside.map((log, index) => (
                            <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                              <div>
                                <p className="font-bold text-zinc-900">{index + 1}. {log.workerName}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                                  Ingresó hace: {calculateDuration(log.entryTime, new Date().toISOString())}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/40 rounded font-mono text-[10px] font-semibold">
                                ADENTRO
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                </div>

              </motion.div>
            )}


            {/* 💼 PORTAL PROPIETARIOS / DUEÑOS */}
            {role === 'propietario' && currentUser?.role === 'administrador' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                
                {/* Bento Statistics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Bento 1: Inside Count */}
                  <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 text-zinc-700 rounded-xl border border-zinc-200/45">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black font-mono text-zinc-900 leading-none">
                        {stats.insideCount}
                      </span>
                      <span className="text-xs text-zinc-500 mt-1 block">En Planta Ahora</span>
                    </div>
                  </div>

                  {/* Bento 2: Today Entries */}
                  <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 text-zinc-700 rounded-xl border border-zinc-200/45">
                      <LogIn className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black font-mono text-zinc-900 leading-none">
                        {stats.entriesToday}
                      </span>
                      <span className="text-xs text-zinc-500 mt-1 block">Ingresos de Hoy</span>
                    </div>
                  </div>

                  {/* Bento 3: Vehicles in service */}
                  <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 text-zinc-700 rounded-xl border border-zinc-200/45">
                      <Car className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black font-mono text-zinc-900 leading-none">
                        {stats.vehiclesInUseCount}
                      </span>
                      <span className="text-xs text-zinc-500 mt-1 block">Coches en Servicio</span>
                    </div>
                  </div>

                  {/* Bento 4: Total active fleet */}
                  <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 text-zinc-700 rounded-xl border border-zinc-200/45">
                      <Truck className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black font-mono text-zinc-900 leading-none">
                        {stats.totalVehiclesCount}
                      </span>
                      <span className="text-xs text-zinc-500 mt-1 block">Flota Registrada</span>
                    </div>
                  </div>

                </div>

                {/* Subnavigation Owner Dashboard */}
                <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    <button
                      id="owner-tab-dash"
                      onClick={() => setOwnerTab('dashboard')}
                      className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        ownerTab === 'dashboard' 
                          ? 'border-zinc-900 text-zinc-900 bg-zinc-100/60' 
                          : 'border-transparent text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
                      Resumen Diario (Real-Time)
                    </button>
                    <button
                      id="owner-tab-reports"
                      onClick={() => setOwnerTab('reportes')}
                      className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        ownerTab === 'reportes' 
                          ? 'border-zinc-900 text-zinc-900 bg-zinc-100/60' 
                          : 'border-transparent text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
                      Reportes Mensuales y Descargas
                    </button>
                    <button
                      id="owner-tab-workers"
                      onClick={() => setOwnerTab('trabajadores')}
                      className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        ownerTab === 'trabajadores' 
                          ? 'border-zinc-900 text-zinc-900 bg-zinc-100/60' 
                          : 'border-transparent text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <UserPlus className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
                      Personal Pre-cargado ({stats.totalWorkersCount})
                    </button>
                    <button
                      id="owner-tab-fleet"
                      onClick={() => setOwnerTab('vehiculos')}
                      className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        ownerTab === 'vehiculos' 
                          ? 'border-zinc-900 text-zinc-900 bg-zinc-100/60' 
                          : 'border-transparent text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <Car className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
                      Flota de la Empresa ({stats.totalVehiclesCount})
                    </button>
                    <button
                      id="owner-tab-guards"
                      onClick={() => setOwnerTab('usuarios')}
                      className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        ownerTab === 'usuarios' 
                          ? 'border-zinc-900 text-zinc-900 bg-zinc-100/60' 
                          : 'border-transparent text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <Users className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
                      Gestión de Guardias y Usuarios
                    </button>
                  </div>

                  {/* Reset DB Button */}
                  <button 
                    onClick={handleResetDatabase}
                    className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-all cursor-pointer mb-2 sm:mb-0 font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Base de Datos
                  </button>
                </div>


                {/* OWNER TABS CONTENT */}
                <div className="min-h-[400px]">
                  
                  {/* TAB A: REAL TIME DASHBOARD */}
                  {ownerTab === 'dashboard' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      {/* Left: Vehicles in Service */}
                      <div className="lg:col-span-1 bg-white border border-zinc-200/80 p-6 rounded-2xl flex flex-col shadow-xs">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          Coches de Empresa en Servicio Activo
                        </h3>

                        {activeVehicles.filter(v => v.inUse).length === 0 ? (
                          <div className="text-center py-10 my-auto text-zinc-400">
                            <Car className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">Toda la flota de la empresa se encuentra resguardada en el depósito.</p>
                          </div>
                        ) : (
                          <div className="space-y-3 overflow-y-auto max-h-[300px] flex-1">
                            {activeVehicles.filter(v => v.inUse).map((v) => {
                              // Find who is using it
                              const activeLog = logsInside.find(l => l.companyVehicleId === v.id);
                              return (
                                <div key={v.id} className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl text-xs flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-900 text-sm">{v.name}</span>
                                    <span className="bg-zinc-900 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                                      {v.plate}
                                    </span>
                                  </div>
                                  <div className="text-zinc-600">
                                    Conductor: <span className="font-semibold text-zinc-900">{activeLog?.workerName || "Sin registro"}</span>
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-400">
                                    Salió en servicio: {activeLog ? formattedDateString(activeLog.exitTime || activeLog.entryTime) : "-"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right: Daily Activity Timeline */}
                      <div className="lg:col-span-2 bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          Actividad de Hoy (Tiempo Real)
                        </h3>

                        {logs.slice(0, 7).length === 0 ? (
                          <div className="text-center py-16 text-zinc-400">
                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No se registran movimientos el día de hoy.</p>
                          </div>
                        ) : (
                          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-200">
                            {logs.slice(0, 7).map((l) => {
                              const entryD = new Date(l.entryTime);
                              const entryTimeStr = entryD.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                              
                              return (
                                <div key={l.id} className="relative pl-8 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 group">
                                  {/* Bullet point indicator */}
                                  <div className={`absolute left-1.5 -translate-x-[1px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                                    l.status === 'adentro' 
                                      ? 'bg-emerald-500 border-white ring-4 ring-emerald-100' 
                                      : 'bg-zinc-300 border-white'
                                  }`} />

                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-zinc-900 text-sm">{l.workerName}</span>
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center mt-1 text-[10px] text-zinc-500 font-mono">
                                      <span className="text-zinc-700 font-semibold">Ingreso: {entryTimeStr}</span>
                                      {l.entryGuard && <span className="text-zinc-400 font-semibold">({l.entryGuard})</span>}
                                      <span>|</span>
                                      <span>Vehículo Propio: {l.personalVehicleType === 'ninguno' ? 'A pie' : `${l.personalVehicleType.toUpperCase()} (${l.personalVehiclePlate})`}</span>
                                    </div>
                                    {l.entryObservations && (
                                      <div className="text-[10px] text-amber-900 font-medium bg-amber-50/50 border border-amber-200/40 rounded-lg px-2 py-1 mt-1.5 max-w-md italic">
                                        Obs Ingreso: {l.entryObservations}
                                      </div>
                                    )}
                                    {l.exitObservations && (
                                      <div className="text-[10px] text-zinc-700 font-medium bg-zinc-50 border border-zinc-200/40 rounded-lg px-2 py-1 mt-1 max-w-md italic">
                                        Obs Salida: {l.exitObservations}
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-right sm:self-center flex-shrink-0">
                                    {l.status === 'adentro' ? (
                                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 py-1 px-2.5 rounded-full text-[10px] font-bold">
                                        EN PLANTA (Activo)
                                      </span>
                                    ) : (
                                      <div className="flex flex-col items-end">
                                        <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 py-1 px-2.5 rounded-full text-[10px] font-semibold">
                                          EGRESADO ({calculateDuration(l.entryTime, l.exitTime)})
                                        </span>
                                        {l.companyVehiclePlate && (
                                          <span className="text-[10px] text-indigo-700 mt-1 font-mono font-medium">
                                            Lleva coche: {l.companyVehicleName} ({l.companyVehiclePlate})
                                          </span>
                                        )}
                                        {l.exitGuard && (
                                          <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
                                            Egreso registrado por: {l.exitGuard}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </motion.div>
                  )}

                  {/* TAB B: HISTORY & MONTHLY REPORT */}
                  {ownerTab === 'reportes' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white border border-zinc-200/80 p-6 rounded-2xl space-y-6 shadow-xs"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest font-mono">
                            Historial General y Generador de Reporte Mensual
                          </h3>
                          <p className="text-xs text-zinc-500 mt-1">
                            Filtre la información por mes de servicio, conductor o patente y descargue planillas CSV homologadas.
                          </p>
                        </div>
                        <button
                          id="btn-export-csv"
                          onClick={handleExportCSV}
                          className="w-full md:w-auto bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          EXPORTAR REPORTE MENSUAL (CSV)
                        </button>
                      </div>

                      {/* Filters bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                        {/* Month selection */}
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                            Mes del Reporte
                          </label>
                          <input
                            id="filter-month-input"
                            type="month"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-500 font-mono"
                          />
                        </div>

                        {/* Worker selection */}
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                            Trabajador
                          </label>
                          <select
                            id="filter-worker-select"
                            value={filterWorker}
                            onChange={(e) => setFilterWorker(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-500"
                          >
                            <option value="todos">Todos los trabajadores</option>
                            {workers.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Text Search plate/driver */}
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">
                            Búsqueda Rápida (Nombre / Patente)
                          </label>
                          <div className="relative">
                            <input
                              id="filter-search-input"
                              type="text"
                              value={filterPlateQuery}
                              onChange={(e) => setFilterPlateQuery(e.target.value)}
                              placeholder="Ej: AB123CD o Carlos..."
                              className="w-full bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-500 font-mono"
                            />
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                      </div>

                      {/* Filter Reset Indicator */}
                      {(filterMonth || filterWorker !== "todos" || filterPlateQuery) && (
                        <div className="flex items-center justify-between text-xs text-zinc-600 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-200">
                          <span>
                            Filtrado activo: <b>{filteredLogs.length}</b> registros de {logs.length} totales.
                          </span>
                          <button
                            onClick={() => {
                              setFilterMonth("");
                              setFilterWorker("todos");
                              setFilterPlateQuery("");
                            }}
                            className="text-zinc-900 font-semibold hover:underline cursor-pointer"
                          >
                            Limpiar Filtros
                          </button>
                        </div>
                      )}

                      {/* Log table */}
                      <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                              <th className="p-4 font-mono">Fecha</th>
                              <th className="p-4">Trabajador</th>
                              <th className="p-4 font-mono">Ingreso</th>
                              <th className="p-4">Vehículo Personal</th>
                              <th className="p-4 font-mono">Egreso</th>
                              <th className="p-4">Servicio Asignado</th>
                              <th className="p-4">Horas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 bg-white">
                            {filteredLogs.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-zinc-400">
                                  No se encontraron registros de asistencia que coincidan con los filtros aplicados.
                                </td>
                              </tr>
                            ) : (
                              filteredLogs.map(l => {
                                const entryD = new Date(l.entryTime);
                                return (
                                  <tr key={l.id} className="hover:bg-zinc-50/40 text-zinc-700 transition-colors">
                                    <td className="p-4 font-mono font-medium text-zinc-500">
                                      {entryD.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </td>
                                    <td className="p-4 font-bold text-zinc-950">{l.workerName}</td>
                                    <td className="p-4 font-mono text-zinc-900 font-semibold">
                                      <div>{entryD.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                                      {l.entryGuard && (
                                        <div className="text-[9px] text-zinc-400 font-sans font-normal mt-0.5">
                                          por: {l.entryGuard}
                                        </div>
                                      )}
                                      {l.entryObservations && (
                                        <div className="text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-200/50 p-1 rounded-md mt-1 font-sans font-medium max-w-[180px] break-words italic">
                                          Obs: {l.entryObservations}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      {l.personalVehicleType === 'ninguno' ? (
                                        <span className="text-zinc-400">A pie</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 uppercase font-mono text-[11px] text-zinc-800">
                                          {l.personalVehicleType === 'moto' ? '🛵 Moto' : '🚗 Auto'}
                                          <span className="bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded text-[10px] border border-zinc-200/50">
                                            {l.personalVehiclePlate}
                                          </span>
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-4 font-mono text-zinc-900">
                                      {l.exitTime ? (
                                        <>
                                          <div>{new Date(l.exitTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                                          {l.exitGuard && (
                                            <div className="text-[9px] text-zinc-400 font-sans font-normal mt-0.5">
                                              por: {l.exitGuard}
                                            </div>
                                          )}
                                          {l.exitObservations && (
                                            <div className="text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-200/50 p-1 rounded-md mt-1 font-sans font-medium max-w-[180px] break-words italic">
                                              Obs: {l.exitObservations}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <span className="bg-emerald-50 text-emerald-800 text-[10px] py-0.5 px-2 rounded-full font-bold border border-emerald-200/40">
                                          En planta
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      {l.companyVehiclePlate ? (
                                        <span className="inline-flex flex-col">
                                          <span className="font-bold text-zinc-800">{l.companyVehicleName}</span>
                                          <span className="font-mono text-[10px] text-zinc-400">{l.companyVehiclePlate}</span>
                                        </span>
                                      ) : l.exitTime ? (
                                        <span className="text-zinc-400">Ninguno (A pie)</span>
                                      ) : (
                                        <span className="text-zinc-300">-</span>
                                      )}
                                    </td>
                                    <td className="p-4 font-mono font-medium text-zinc-600">
                                      {calculateDuration(l.entryTime, l.exitTime)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                    </motion.div>
                  )}

                  {/* TAB C: PRELOAD WORKERS MANAGEMENT */}
                  {ownerTab === 'trabajadores' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      {/* Worker Registration Form */}
                      <div className="lg:col-span-1 bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs h-fit">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          Dar de Alta Nuevo Trabajador
                        </h3>
                        <form onSubmit={handleAddWorker} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Nombre Completo *
                            </label>
                            <input
                              id="new-worker-name"
                              type="text"
                              value={newWorkerName}
                              onChange={(e) => setNewWorkerName(e.target.value)}
                              placeholder="Ej: Carlos Mendoza"
                              required
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Documento de Identidad (DNI/CUIT) *
                            </label>
                            <input
                              id="new-worker-doc"
                              type="text"
                              value={newWorkerDoc}
                              onChange={(e) => setNewWorkerDoc(e.target.value)}
                              placeholder="Ej: 20-34567890-9"
                              required
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Teléfono de Contacto (Opcional)
                            </label>
                            <input
                              id="new-worker-phone"
                              type="tel"
                              value={newWorkerPhone}
                              onChange={(e) => setNewWorkerPhone(e.target.value)}
                              placeholder="Ej: +54 11 5555-1234"
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                            />
                          </div>

                          <button
                            id="btn-add-worker"
                            type="submit"
                            className="w-full bg-zinc-900 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-zinc-800 active:bg-zinc-950 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar Trabajador
                          </button>
                        </form>
                      </div>

                      {/* Workers Preloaded List */}
                      <div className="lg:col-span-2 bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          Personal Pre-cargado en Base de Datos
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-2">
                          {workers.map((w) => (
                            <div 
                              key={w.id} 
                              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                                w.active 
                                  ? 'bg-zinc-50 border-zinc-200 shadow-2xs' 
                                  : 'bg-white border-zinc-100 opacity-55'
                              }`}
                            >
                              <div className="min-w-0">
                                <h4 className="font-bold text-zinc-950 text-sm truncate flex items-center gap-1.5">
                                  {w.name}
                                  {!w.active && (
                                    <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200/30 px-1.5 py-0.2 rounded font-semibold">
                                      INACTIVO
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-zinc-500 mt-1 font-mono">DNI: {w.documentId}</p>
                                {w.phone && (
                                  <p className="text-[10px] text-zinc-400 mt-0.5">Tel: {w.phone}</p>
                                )}
                              </div>

                              <button
                                onClick={() => handleDeleteWorker(w.id)}
                                className={`p-2 rounded-lg transition-all cursor-pointer border ${
                                  w.active 
                                    ? 'bg-rose-50 hover:bg-rose-100/80 text-rose-600 border-rose-200/40' 
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300/40'
                                }`}
                                title={w.active ? "Deshabilitar trabajador" : "Habilitar trabajador"}
                              >
                                {w.active ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {/* TAB D: PRELOAD COMPANY FLEET MANAGEMENT */}
                  {ownerTab === 'vehiculos' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      {/* Vehicle Registration Form */}
                      <div className="lg:col-span-1 bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs h-fit">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          Registrar Vehículo en Flota de la Empresa
                        </h3>
                        <form onSubmit={handleAddVehicle} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Nombre / Modelo del Coche *
                            </label>
                            <input
                              id="new-vehicle-name"
                              type="text"
                              value={newVehicleName}
                              onChange={(e) => setNewVehicleName(e.target.value)}
                              placeholder="Ej: Camión Scania R450"
                              required
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Patente / Matrícula *
                            </label>
                            <input
                              id="new-vehicle-plate"
                              type="text"
                              value={newVehiclePlate}
                              onChange={(e) => setNewVehiclePlate(e.target.value.toUpperCase().replace(/\s/g, ""))}
                              placeholder="Ej: AB123CD"
                              required
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono uppercase"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Categoría de Vehículo *
                            </label>
                            <select
                              id="new-vehicle-type"
                              value={newVehicleType}
                              onChange={(e) => setNewVehicleType(e.target.value as any)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 transition-all cursor-pointer"
                            >
                              <option value="camion">🚚 Camión</option>
                              <option value="furgon">🚙 Furgón / Utilitario</option>
                              <option value="moto">🛵 Moto de Servicio</option>
                              <option value="auto">🚗 Auto de Empresa</option>
                              <option value="otros">📦 Otros</option>
                            </select>
                          </div>

                          <button
                            id="btn-add-vehicle"
                            type="submit"
                            className="w-full bg-zinc-900 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-zinc-800 active:bg-zinc-950 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar Vehículo
                          </button>
                        </form>
                      </div>

                      {/* Company Vehicles Fleet list */}
                      <div className="lg:col-span-2 bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          Flota de Vehículos Corporativos
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-2">
                          {vehicles.map((v) => (
                            <div 
                              key={v.id} 
                              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                                v.active 
                                  ? 'bg-zinc-50 border-zinc-200 shadow-2xs' 
                                  : 'bg-white border-zinc-100 opacity-55'
                              }`}
                            >
                              <div className="min-w-0">
                                <h4 className="font-bold text-zinc-950 text-sm truncate flex items-center gap-1.5">
                                  {v.name}
                                  {!v.active && (
                                    <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200/30 px-1.5 py-0.2 rounded font-semibold">
                                      INACTIVO
                                    </span>
                                  )}
                                  {v.inUse && (
                                    <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200/30 px-1.5 py-0.2 rounded font-semibold animate-pulse">
                                      EN SERVICIO
                                    </span>
                                  )}
                                </h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="bg-zinc-200 text-zinc-800 border border-zinc-300/40 font-mono text-[10px] uppercase font-bold py-0.5 px-1.5 rounded">
                                    {v.plate}
                                  </span>
                                  <span className="text-zinc-500 capitalize text-[10px]">
                                    Categoría: {v.type === 'furgon' ? 'Furgón' : v.type === 'camion' ? 'Camión' : v.type}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteVehicle(v.id)}
                                className={`p-2 rounded-lg transition-all cursor-pointer border ${
                                  v.active 
                                    ? 'bg-rose-50 hover:bg-rose-100/80 text-rose-600 border-rose-200/40' 
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300/40'
                                }`}
                                title={v.active ? "Deshabilitar vehículo" : "Habilitar vehículo"}
                              >
                                {v.active ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {/* TAB E: MANAGE GUARDS AND USERS */}
                  {ownerTab === 'usuarios' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      {/* User Registration Form */}
                      <div className="lg:col-span-1 bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs h-fit">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          {editingUser ? "Modificar Guardia / Usuario" : "Dar de Alta Nuevo Guardia"}
                        </h3>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Nombre Completo / Mostrar como *
                            </label>
                            <input
                              id="new-user-displayname"
                              type="text"
                              value={newUserDisplayName}
                              onChange={(e) => setNewUserDisplayName(e.target.value)}
                              placeholder="Ej: Guardia Roberto Gómez"
                              required
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Usuario de Acceso *
                            </label>
                            <input
                              id="new-user-username"
                              type="text"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                              placeholder="Ej: roberto"
                              required
                              disabled={editingUser !== null}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono disabled:opacity-50"
                            />
                            {editingUser && (
                              <p className="text-[9px] text-zinc-400 mt-1">El nombre de usuario no puede cambiarse una vez creado.</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Contraseña *
                            </label>
                            <input
                              id="new-user-password"
                              type="password"
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                              placeholder="Contraseña de acceso"
                              required
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Rol de Acceso *
                            </label>
                            <select
                              id="new-user-role"
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value as any)}
                              disabled={editingUser?.username === "kuperadmin"}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <option value="guardia">🛡️ Guardia de Seguridad</option>
                              <option value="administrador">💼 Administrador / Dueño</option>
                            </select>
                          </div>

                          <div className="pt-2 flex gap-2">
                            {editingUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(null);
                                  setNewUsername("");
                                  setNewUserPassword("");
                                  setNewUserDisplayName("");
                                  setNewUserRole("guardia");
                                }}
                                className="flex-1 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-850 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-zinc-200"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              id="btn-save-user"
                              type="submit"
                              className="flex-1 bg-zinc-900 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-zinc-800 active:bg-zinc-950 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <UserPlus className="w-4 h-4" />
                              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Users accounts list */}
                      <div className="lg:col-span-2 bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-xs">
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4 font-mono">
                          Usuarios y Guardias Activos en el Sistema
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                          {usersList.map((u) => {
                            const isSuper = u.username.toLowerCase() === "kuperadmin";
                            return (
                              <div 
                                key={u.username} 
                                className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 shadow-2xs flex items-start justify-between gap-3 text-xs transition-all"
                              >
                                <div className="min-w-0">
                                  <h4 className="font-bold text-zinc-950 text-sm truncate flex flex-wrap items-center gap-1.5">
                                    {u.displayName}
                                    {isSuper && (
                                      <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/30 px-1.5 py-0.2 rounded font-semibold">
                                        SUPERADMIN
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex flex-col gap-1 mt-2 text-zinc-500">
                                    <span>Usuario: <strong className="font-mono text-zinc-850 text-[11px]">{u.username}</strong></span>
                                    <span>Rol: <strong className="capitalize text-zinc-850">{u.role === 'administrador' ? 'Administrador/Dueño' : 'Guardia'}</strong></span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingUser(u);
                                      setNewUsername(u.username);
                                      setNewUserPassword(u.password);
                                      setNewUserDisplayName(u.displayName);
                                      setNewUserRole(u.role);
                                    }}
                                    className="p-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg transition-all cursor-pointer"
                                    title="Modificar usuario"
                                  >
                                    Editar
                                  </button>
                                  {!isSuper && (
                                    <button
                                      onClick={() => handleDeleteUser(u.username)}
                                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/40 rounded-lg transition-all cursor-pointer"
                                      title="Eliminar usuario"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </motion.div>
                  )}

                </div>

              </motion.div>
            )}

          </div>
        )}

      </main>


      {/* 🧾 MODAL: REGISTER COMPANY VEHICLE ON OUTGOING EXIT */}
      <AnimatePresence>
        {selectedLogForExit && (
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6 max-w-md w-full relative"
            >
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedLogForExit(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
                <LogOut className="text-zinc-800 w-5 h-5" />
                Registrar Salida de Personal
              </h3>
              
              <div className="bg-zinc-50 p-4 rounded-xl text-xs space-y-2 mb-4 border border-zinc-200/80">
                <p className="text-zinc-500">Trabajador saliente: <span className="font-bold text-zinc-900 text-sm">{selectedLogForExit.workerName}</span></p>
                <p className="text-zinc-500">Hora de Ingreso registrado: <span className="font-mono text-zinc-800 font-semibold">{formattedDateString(selectedLogForExit.entryTime)}</span></p>
                {selectedLogForExit.personalVehicleType !== "ninguno" && (
                  <p className="text-zinc-500">Llegó en vehíc. propio: <span className="uppercase text-zinc-800 font-mono font-bold bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200/30 text-[10px] ml-1">{selectedLogForExit.personalVehicleType} ({selectedLogForExit.personalVehiclePlate})</span></p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-2">
                    ¿Se retira manejando un Coche de la Empresa? (Realiza servicio)
                  </label>
                  <div className="relative">
                    <select
                      id="exit-vehicle-select"
                      value={exitCompanyVehicleId}
                      onChange={(e) => setExitCompanyVehicleId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer appearance-none"
                    >
                      <option value="ninguno">Ninguno - Se retira a pie / en su propio vehículo</option>
                      
                      <optgroup label="Flota Disponible de la Empresa">
                        {activeVehicles.map(v => {
                          const isOccupiedByAnother = logsInside.some(l => l.companyVehicleId === v.id);
                          return (
                            <option 
                              key={v.id} 
                              value={v.id}
                              disabled={isOccupiedByAnother}
                            >
                              {v.name} (Patente: {v.plate}) {isOccupiedByAnother ? "[EN SERVICIO]" : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    </select>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-zinc-400">
                      ▼
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-2">
                    Observaciones / Notas de Salida
                  </label>
                  <textarea
                    id="exit-observations-input"
                    value={exitObservations}
                    onChange={(e) => setExitObservations(e.target.value)}
                    placeholder="Ej: Se retira con remito nro 4310, entrega muestras, coche lavado, etc."
                    rows={2}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setSelectedLogForExit(null)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer border border-zinc-300/40"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirm-exit"
                    onClick={handleRegisterExit}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    Confirmar Salida
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Branding info */}
      <footer className="border-t border-zinc-200 bg-zinc-50 py-5 text-center text-zinc-500 text-xs font-mono mt-auto">
        <p>LogiControl Centralizado © 2026 • Diseñado para dispositivos móviles Android y monitores de administración.</p>
        <p className="text-[10px] text-zinc-400 mt-1">Sincronización en tiempo real habilitada con base de datos local y exportaciones.</p>
      </footer>

    </div>
  );
}
