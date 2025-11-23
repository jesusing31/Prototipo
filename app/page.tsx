'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FolderKanban, FileText, Plus, LogOut, 
  Briefcase, DollarSign, FileBarChart, ChevronRight, UserCircle, AlertCircle 
} from 'lucide-react';
import { seedDatabase, getAppState, getAllUsers, crearProyecto, registrarEvento } from './actions';

// --- TIPOS DE DATOS ---
type AppData = {
  user: any;
  proyectos: any[];
};

// --- COMPONENTE PRINCIPAL ---
export default function ProfactApp() {
  // Estados de la aplicación
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [data, setData] = useState<AppData | null>(null);
  
  // Navegación
  const [view, setView] = useState<'DASHBOARD' | 'PROJECTS' | 'DETAIL'>('DASHBOARD');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // Modales
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Carga Inicial: Sembrar DB y traer usuarios
  useEffect(() => {
    const init = async () => {
      await seedDatabase(); 
      const users = await getAllUsers();
      setUsersList(users);
    };
    init();
  }, []);

  // 2. Manejar Login
  const handleLogin = async (email: string) => {
    setLoading(true);
    const appData = await getAppState(email);
    if (appData) {
      setCurrentUser(appData.user);
      setData(appData);
      setView('DASHBOARD');
    }
    setLoading(false);
  };

  // 3. Refrescar Datos después de una acción
  const refreshData = async () => {
    if (!currentUser) return;
    const appData = await getAppState(currentUser.email);
    setData(appData);
    // Si estamos viendo un proyecto, actualizarlo también para ver el nuevo evento
    if (selectedProject) {
      const updatedProject = appData?.proyectos.find((p: any) => p.id === selectedProject.id);
      setSelectedProject(updatedProject);
    }
  };

  // RENDER: PANTALLA DE LOGIN
  if (!currentUser) {
    return <LoginScreen users={usersList} onLogin={handleLogin} loading={loading} />;
  }

  // RENDER: APLICACIÓN PRINCIPAL
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <FolderKanban className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">PROFACT</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavButton active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <NavButton active={view === 'PROJECTS' || view === 'DETAIL'} onClick={() => setView('PROJECTS')} icon={<Briefcase size={20}/>} label="Proyectos" />
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg text-xs">
              {currentUser.avatar}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-white truncate">{currentUser.nombre}</div>
              <div className="text-xs text-slate-400 font-mono">{currentUser.rol}</div>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="flex w-full items-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 rounded transition-colors">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
        
        {/* VISTA 1: DASHBOARD */}
        {view === 'DASHBOARD' && data && <DashboardView projects={data.proyectos} user={currentUser} />}
        
        {/* VISTA 2: LISTA DE PROYECTOS */}
        {view === 'PROJECTS' && data && (
          <ProjectsListView 
            projects={data.proyectos} 
            user={currentUser} 
            onSelect={(p: any) => { setSelectedProject(p); setView('DETAIL'); }}
            onNew={() => setShowProjectModal(true)}
          />
        )}

        {/* VISTA 3: DETALLE DE PROYECTO */}
        {view === 'DETAIL' && selectedProject && (
          <ProjectDetailView 
            project={selectedProject} 
            user={currentUser} 
            onBack={() => setView('PROJECTS')}
            onNewEvent={() => setShowEventModal(true)}
          />
        )}
      </main>

      {/* --- MODALES (Ventanas Emergentes) --- */}

      {/* MODAL CREAR PROYECTO */}
      {showProjectModal && (
        <Modal title="Nuevo Proyecto" onClose={() => setShowProjectModal(false)}>
          <form action={async (formData) => {
            setLoading(true);
            await crearProyecto(formData, currentUser.id);
            await refreshData();
            setLoading(false);
            setShowProjectModal(false);
          }} className="space-y-4">
            <Input name="nombre" label="Nombre del Proyecto" placeholder="Ej: Interventoría Vía 40" required />
            <div className="grid grid-cols-2 gap-4">
              <Input name="cliente" label="Cliente" placeholder="Gobernación..." required />
              <Input name="centroCosto" label="Centro de Costo" placeholder="CC-2025-X" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="presupuesto" label="Presupuesto" type="number" required />
              <Input name="fechaInicio" label="Fecha Inicio" type="date" required />
            </div>
            <SubmitButton label="Crear Proyecto" loading={loading} />
          </form>
        </Modal>
      )}

      {/* MODAL REGISTRAR EVENTO */}
      {showEventModal && selectedProject && (
        <Modal title="Registrar Evento" onClose={() => setShowEventModal(false)}>
          <form action={async (formData) => {
            setLoading(true);
            await registrarEvento(formData, selectedProject.id);
            await refreshData();
            setLoading(false);
            setShowEventModal(false);
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Evento</label>
              <select name="tipo" className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                {currentUser.rol === 'CONTADOR' 
                  ? <option value="FACTURACION">Facturación / Acta Parcial</option>
                  : (
                    <>
                      <option value="INFORME_TECNICO">Informe Técnico</option>
                      <option value="PRORROGA">Prórroga</option>
                      <option value="SUSPENSION">Suspensión</option>
                      <option value="ADICION">Adición Presupuestal</option>
                    </>
                  )
                }
              </select>
            </div>
            <Input name="fecha" label="Fecha del Evento" type="date" required />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea name="descripcion" rows={3} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="Detalles del evento..."></textarea>
            </div>
            {currentUser.rol === 'CONTADOR' && (
               <Input name="valor" label="Valor Facturado (COP)" type="number" placeholder="0" />
            )}
            
            {/* Simulación de carga de archivos */}
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-center">
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <FileText size={16}/> Adjuntar Soporte (PDF)
              </p>
            </div>

            <SubmitButton label="Registrar Evento" loading={loading} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES (Para mantener el código limpio) ---

function LoginScreen({ users, onLogin, loading }: { users: any[], onLogin: (e: string) => void, loading: boolean }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <FolderKanban className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">PROFACT</h1>
          <p className="text-slate-500 mt-2 text-sm">Sistema de Gestión de Interventoría</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Selecciona un Rol para Ingresar:</p>
          {loading ? (
            <p className="text-center text-blue-600 animate-pulse">Cargando sistema...</p>
          ) : (
            users.map(user => (
              <button key={user.id} onClick={() => onLogin(user.email)} className="w-full flex items-center p-3 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group bg-white">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-200 group-hover:text-blue-700 transition-colors text-xs">
                  {user.avatar}
                </div>
                <div className="ml-4 text-left">
                  <div className="font-semibold text-slate-700 group-hover:text-blue-700">{user.nombre}</div>
                  <div className="text-xs text-slate-400 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded mt-1 group-hover:bg-blue-100">{user.rol}</div>
                </div>
                <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-500" />
              </button>
            ))
          )}
          {users.length === 0 && !loading && <p className="text-center text-sm text-slate-400 animate-pulse">Inicializando base de datos (recarga en 5s)...</p>}
        </div>
      </div>
    </div>
  );
}

function DashboardView({ projects, user }: { projects: any[], user: any }) {
  const totalPresupuesto = projects.reduce((acc, p) => acc + p.presupuesto, 0);
  const totalEjecutado = projects.reduce((acc, p) => acc + p.ejecutado, 0);
  const porcentaje = totalPresupuesto > 0 ? (totalEjecutado / totalPresupuesto) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Panel de Control</h2>
        <p className="text-slate-500 mt-1">Bienvenido, <span className="font-semibold">{user.nombre}</span>.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Proyectos Activos" value={projects.length} icon={<Briefcase className="text-blue-600" />} color="blue" />
        <StatCard title="Presupuesto Total" value={formatMoney(totalPresupuesto)} icon={<DollarSign className="text-emerald-600" />} color="emerald" />
        <StatCard title="Ejecución Global" value={`${porcentaje.toFixed(1)}%`} icon={<FileBarChart className="text-purple-600" />} color="purple" />
      </div>

      {/* Solo visible para Gerentes o Directores */}
      {(user.rol === 'GERENTE' || user.rol === 'DIRECTOR') && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 mt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Resumen Financiero Global</h3>
          <div className="w-full bg-slate-100 rounded-full h-6 mb-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/20" style={{ width: `${porcentaje}%` }}></div>
          </div>
          <div className="flex justify-between text-sm font-medium text-slate-500 mt-2">
            <span>Ejecutado: <span className="text-slate-800">{formatMoney(totalEjecutado)}</span></span>
            <span>Total: <span className="text-slate-800">{formatMoney(totalPresupuesto)}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectsListView({ projects, user, onSelect, onNew }: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Proyectos</h2>
          <p className="text-slate-500 text-sm">Gestión y seguimiento operativo.</p>
        </div>
        {user.rol === 'DIRECTOR' && (
          <button onClick={onNew} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95">
            <Plus size={18} /> Nuevo Proyecto
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 && (
          <div className="col-span-3 py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
            No hay proyectos asignados.
          </div>
        )}
        {projects.map((p: any) => (
          <div key={p.id} onClick={() => onSelect(p)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Briefcase size={60} className="text-slate-400" />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Briefcase size={24} />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {p.estado}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{p.nombre}</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">{p.cliente}</p>
            
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Avance</span>
                <span className="font-bold text-slate-700">{((p.ejecutado / p.presupuesto) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(p.ejecutado / p.presupuesto) * 100}%` }}></div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                <span>{p.centroCosto}</span>
                <span>{new Date(p.fechaInicio).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDetailView({ project, user, onBack, onNewEvent }: any) {
  const canAddEvent = user.rol === 'INTERVENTOR' || user.rol === 'CONTADOR';

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-300">
      <button onClick={onBack} className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium transition-colors">
        ← Volver a Proyectos
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{project.nombre}</h1>
          <div className="flex items-center gap-3 mt-2 text-slate-500">
            <span className="flex items-center gap-1"><UserCircle size={16}/> {project.cliente}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="font-mono bg-slate-100 px-2 rounded text-xs">{project.centroCosto}</span>
          </div>
        </div>
        {canAddEvent && (
          <button onClick={onNewEvent} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
            <FileText size={18} /> Registrar Evento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-slate-400" size={20}/> Bitácora del Proyecto
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {project.eventos.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No hay eventos registrados aún.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {project.eventos.map((evento: any) => (
                  <div key={evento.id} className="p-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-bold text-xs px-2.5 py-1 rounded-full ${evento.tipo === 'FACTURACION' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {evento.tipo.replace('_', ' ')}
                      </span>
                      <time className="text-xs text-slate-400 font-mono">{new Date(evento.fecha).toLocaleDateString()}</time>
                    </div>
                    <p className="text-slate-700 mt-2 leading-relaxed">{evento.descripcion}</p>
                    {evento.valor && <p className="text-emerald-600 font-bold text-sm mt-3 flex items-center gap-1"><DollarSign size={14}/> {formatMoney(evento.valor)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 tracking-wider">Estado Financiero</h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Presupuesto Total</p>
                <p className="text-2xl font-bold text-slate-800">{formatMoney(project.presupuesto)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Ejecutado a la fecha</p>
                <p className={`text-2xl font-bold ${project.ejecutado > project.presupuesto ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatMoney(project.ejecutado)}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progreso</span>
                  <span className="font-bold">{((project.ejecutado / project.presupuesto) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all duration-1000 ${project.ejecutado > project.presupuesto ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min((project.ejecutado / project.presupuesto) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTES DE UI (Estilos reutilizables) ---

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className={`p-4 bg-${color}-50 rounded-xl`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  </div>
);

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);

const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input {...props} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-slate-900" />
  </div>
);

const SubmitButton = ({ label, loading }: { label: string, loading: boolean }) => {
  return (
    <button disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 mt-4 disabled:opacity-50 flex items-center justify-center gap-2">
      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
      {loading ? 'Procesando...' : label}
    </button>
  );
}

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
};