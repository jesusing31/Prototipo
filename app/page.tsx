// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FolderKanban, FileText, Plus, LogOut, 
  Briefcase, DollarSign, FileBarChart, ChevronRight, UserCircle, 
  Download, AlertCircle, Users, CalendarClock 
} from 'lucide-react';
// Importamos las Server Actions
import { seedDatabase, getAppState, getAllUsers, getInterventores, crearProyecto, registrarEvento } from './actions';

// --- COMPONENTE PRINCIPAL ---
export default function ProfactApp() {
  // Estados Globales
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [interventoresList, setInterventoresList] = useState<any[]>([]);
  const [data, setData] = useState<{user:any, proyectos:any[]} | null>(null);
  
  // Navegación y Selección
  const [view, setView] = useState<'DASHBOARD' | 'PROJECTS' | 'DETAIL'>('DASHBOARD');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // Control de Modales y Carga
  const [activeModal, setActiveModal] = useState<'NONE' | 'NEW_PROJECT' | 'NEW_EVENT'>('NONE');
  const [loading, setLoading] = useState(false);

  // 1. Ciclo de Vida: Carga Inicial
  useEffect(() => {
    const init = async () => {
      await seedDatabase(); // Asegura datos semilla
      const [allUsers, interventores] = await Promise.all([getAllUsers(), getInterventores()]);
      setUsersList(allUsers);
      setInterventoresList(interventores);
    };
    init();
  }, []);

  // 2. Manejador de Login
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

  // 3. Refresco de Datos Inteligente
  const refreshData = async () => {
    if (!currentUser) return;
    const appData = await getAppState(currentUser.email);
    setData(appData);
    // Si hay un proyecto seleccionado, actualizar su vista para ver el nuevo evento/saldo
    if (selectedProject) {
      const updated = appData?.proyectos.find((p:any) => p.id === selectedProject.id);
      setSelectedProject(updated);
    }
  };

  // Render condicional: Login
  if (!currentUser) return <LoginScreen users={usersList} onLogin={handleLogin} loading={loading} />;

  // Render Principal
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      
      {/* SIDEBAR DE NAVEGACIÓN */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <FolderKanban className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight block">PROFACT</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase">Gestión Integral</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavButton active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <NavButton active={view === 'PROJECTS' || view === 'DETAIL'} onClick={() => setView('PROJECTS')} icon={<Briefcase size={20}/>} label="Portafolio" />
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg text-sm border border-slate-700">
              {currentUser.avatar}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-white truncate">{currentUser.nombre}</div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{currentUser.rol.replace('_', ' ')}</div>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="flex w-full items-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 rounded transition-colors">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
        
        {/* VISTAS DINÁMICAS */}
        {view === 'DASHBOARD' && data && <RoleBasedDashboard user={currentUser} projects={data.proyectos} />}
        
        {view === 'PROJECTS' && data && (
          <ProjectsList 
            projects={data.proyectos} 
            user={currentUser}
            onSelect={(p:any) => { setSelectedProject(p); setView('DETAIL'); }}
            onNew={() => setActiveModal('NEW_PROJECT')}
          />
        )}

        {view === 'DETAIL' && selectedProject && (
          <ProjectDetail 
            project={selectedProject} 
            user={currentUser}
            onBack={() => setView('PROJECTS')}
            onNewEvent={() => setActiveModal('NEW_EVENT')}
          />
        )}
      </main>

      {/* --- MODALES Y FORMULARIOS --- */}
      
      {/* MODAL 1: CREAR PROYECTO (Solo Directores) */}
      {activeModal === 'NEW_PROJECT' && (
        <Modal title="Nuevo Proyecto de Interventoría" onClose={() => setActiveModal('NONE')}>
          <form action={async (formData) => {
            setLoading(true);
            await crearProyecto(formData, currentUser.id);
            await refreshData();
            setLoading(false);
            setActiveModal('NONE');
          }} className="space-y-5">
            
            <Input name="nombre" label="Nombre del Proyecto" placeholder="Ej: Interventoría Vía 40" required />
            
            <div className="grid grid-cols-2 gap-4">
              <Input name="cliente" label="Cliente / Entidad" placeholder="Gobernación..." required />
              <Input name="centroCosto" label="Centro de Costo" placeholder="CC-2025-X" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input name="presupuesto" label="Presupuesto Inicial ($)" type="number" required />
              <Input name="fechaInicio" label="Fecha de Firma" type="date" required />
            </div>
            
            {/* Asignación M-N de Interventores */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Asignar Equipo Interventor</label>
              <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto p-2 bg-slate-50">
                {interventoresList.length === 0 && <p className="text-xs text-slate-400 p-2">No hay interventores registrados.</p>}
                {interventoresList.map(int => (
                  <label key={int.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-slate-200 transition-all">
                    <input type="checkbox" name="interventores" value={int.id} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{int.avatar}</div>
                      <span className="text-sm text-slate-700">{int.nombre}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <SubmitButton label="Crear Proyecto" loading={loading} />
          </form>
        </Modal>
      )}

      {/* MODAL 2: REGISTRAR EVENTO O FACTURA (Adaptativo según Rol) */}
      {activeModal === 'NEW_EVENT' && selectedProject && (
        <Modal title={currentUser.rol === 'CONTADOR' ? "Radicación de Factura" : "Registro de Evento Técnico"} onClose={() => setActiveModal('NONE')}>
          <form action={async (formData) => {
            setLoading(true);
            await registrarEvento(formData, selectedProject.id, currentUser.rol);
            await refreshData();
            setLoading(false);
            setActiveModal('NONE');
          }} className="space-y-5">
            
            {/* --- LÓGICA DE FORMULARIO PARA CONTADOR --- */}
            {currentUser.rol === 'CONTADOR' ? (
              <div className="space-y-4">
                <input type="hidden" name="tipo" value="FACTURACION" />
                
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <DollarSign size={16}/> Detalles Financieros
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input name="numeroFactura" label="No. Factura" placeholder="FE-001" required />
                    <Input name="valor" label="Valor Facturado" type="number" required />
                  </div>
                </div>
              </div>
            ) : (
              /* --- LÓGICA DE FORMULARIO PARA INTERVENTOR --- */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Evento</label>
                  <select name="tipo" className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="INFORME_TECNICO">Informe Técnico Semanal</option>
                    <option value="ACTA_COMITE">Acta de Comité</option>
                    <option value="PRORROGA">Prórroga (Tiempo)</option>
                    <option value="ADICION">Adición Presupuestal</option>
                    <option value="SUSPENSION">Acta de Suspensión</option>
                    <option value="REINICIO">Acta de Reinicio</option>
                  </select>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 mb-2 font-medium">Opciones Adicionales</p>
                  <Input name="valor" label="Valor Adicional (Solo si aplica)" type="number" placeholder="0" />
                </div>
              </div>
            )}

            {/* CAMPOS COMUNES */}
            <Input name="fecha" label="Fecha del Documento" type="date" required />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción Detallada</label>
              <textarea name="descripcion" rows={3} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required placeholder="Describa el objeto del evento..."></textarea>
            </div>

            {/* CARGA DE ARCHIVO PDF */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">Soporte Digital (PDF)</label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Download className="w-6 h-6 mb-2 text-slate-400 group-hover:text-blue-500" />
                  <p className="text-xs text-slate-500">Click para seleccionar archivo PDF</p>
                </div>
                <input name="soporte" type="file" className="hidden" accept=".pdf" required />
              </label>
            </div>

            <SubmitButton label={currentUser.rol === 'CONTADOR' ? "Radicar Factura" : "Registrar Evento"} loading={loading} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES DE VISTA ---

function RoleBasedDashboard({ user, projects }: any) {
  const totalPresupuesto = projects.reduce((acc:number, p:any) => acc + p.presupuesto, 0);
  const totalEjecutado = projects.reduce((acc:number, p:any) => acc + p.ejecutado, 0);
  const activeProjects = projects.filter((p:any) => p.estado === 'ACTIVO').length;

  // VISTA GERENTE (KPIs Financieros)
  if (user.rol === 'GERENTE_GENERAL') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <h2 className="text-2xl font-bold text-slate-800">Inteligencia de Negocio</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Contratado" value={formatMoney(totalPresupuesto)} icon={<Briefcase className="text-blue-600"/>} color="blue" />
          <StatCard title="Facturación Acumulada" value={formatMoney(totalEjecutado)} icon={<DollarSign className="text-emerald-600"/>} color="emerald" />
          <StatCard title="Eficiencia de Cobro" value={`${((totalEjecutado/totalPresupuesto || 0)*100).toFixed(1)}%`} icon={<FileBarChart className="text-purple-600"/>} color="purple" />
        </div>
      </div>
    );
  }

  // VISTA TÉCNICA (KPIs Operativos)
  if (user.rol === 'GERENTE_TECNICA') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <h2 className="text-2xl font-bold text-slate-800">Supervisión Operativa</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Proyectos Activos" value={activeProjects} icon={<Briefcase className="text-blue-600"/>} color="blue" />
          <StatCard title="Suspendidos" value={projects.length - activeProjects} icon={<AlertCircle className="text-amber-600"/>} color="amber" />
          <StatCard title="Total Eventos" value={projects.reduce((acc:number, p:any) => acc + p.eventos.length, 0)} icon={<CalendarClock className="text-indigo-600"/>} color="indigo" />
          <StatCard title="Equipo" value="12" icon={<Users className="text-teal-600"/>} color="teal" />
        </div>
      </div>
    );
  }

  // VISTA ESTÁNDAR (Operativa)
  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Resumen de Gestión</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Mis Proyectos" value={projects.length} icon={<FolderKanban className="text-blue-600"/>} color="blue" />
        <StatCard title="Ejecución Promedio" value={`${(totalEjecutado > 0 ? (totalEjecutado/totalPresupuesto)*100 : 0).toFixed(1)}%`} icon={<FileBarChart className="text-purple-600"/>} color="purple" />
      </div>
    </div>
  );
}

function ProjectsList({ projects, user, onSelect, onNew }: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Proyectos Asignados</h2>
        {user.rol === 'DIRECTOR' && (
          <button onClick={onNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
            <Plus size={18} /> Nuevo Proyecto
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((p:any) => (
          <div key={p.id} onClick={() => onSelect(p)} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 rounded text-xs font-bold ${p.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {p.estado}
              </span>
              <span className="text-xs font-mono text-slate-400">{p.centroCosto}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 truncate">{p.nombre}</h3>
            <p className="text-sm text-slate-500 mb-4 truncate">{p.cliente}</p>
            
            {/* Barra de Progreso Financiero */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Avance Financiero</span>
                <span className="font-bold text-slate-700">{((p.ejecutado/p.presupuesto)*100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${p.ejecutado > p.presupuesto ? 'bg-red-500' : 'bg-blue-600'}`} style={{width: `${Math.min((p.ejecutado/p.presupuesto)*100, 100)}%`}}></div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
              <div className="flex -space-x-2">
                {/* Avatar Director */}
                <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600" title={`Director: ${p.director.nombre}`}>
                  {p.director.avatar}
                </div>
                {/* Avatares Interventores */}
                {p.interventores.slice(0,3).map((int:any) => (
                  <div key={int.id} className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-indigo-600" title={`Interventor: ${int.nombre}`}>
                    {int.avatar}
                  </div>
                ))}
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDetail({ project, user, onBack, onNewEvent }: any) {
  const canEdit = user.rol === 'CONTADOR' || user.rol === 'INTERVENTOR';

  return (
    <div className="space-y-8 animate-in zoom-in-95">
      {/* Header Detalle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={onBack} className="text-slate-500 hover:text-blue-600 text-sm flex items-center gap-1 mb-2 font-medium">
            ← Volver al listado
          </button>
          <h1 className="text-3xl font-bold text-slate-800">{project.nombre}</h1>
          <div className="flex gap-4 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1"><UserCircle size={16}/> {project.cliente}</span>
            <span className="px-2 py-0.5 bg-slate-200 rounded font-mono text-xs text-slate-700">{project.centroCosto}</span>
          </div>
        </div>
        {canEdit && (
          <button onClick={onNewEvent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all font-medium">
            <FileText size={18} /> 
            {user.rol === 'CONTADOR' ? 'Radicar Factura' : 'Nuevo Evento'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Historial */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Bitácora Contractual</h3>
              <span className="text-xs text-slate-400 font-mono">{project.eventos.length} eventos</span>
            </div>
            <div className="divide-y divide-slate-100">
              {project.eventos.map((evt:any) => (
                <div key={evt.id} className="p-6 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide 
                        ${evt.tipo === 'FACTURACION' ? 'bg-emerald-100 text-emerald-700' : 
                          evt.tipo === 'SUSPENSION' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'}`}>
                        {evt.tipo.replace('_', ' ')}
                      </span>
                      {evt.numeroFactura && <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1 rounded">#{evt.numeroFactura}</span>}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{new Date(evt.fecha).toLocaleDateString()}</span>
                  </div>
                  
                  <p className="text-slate-700 text-sm leading-relaxed mb-4">{evt.descripcion}</p>
                  
                  <div className="flex items-center gap-4">
                    {evt.valor && (
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                        <DollarSign size={14} className="text-emerald-500"/> {formatMoney(evt.valor)}
                      </span>
                    )}
                    {evt.soporteUrl ? (
                      <a href={evt.soporteUrl} target="_blank" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-3 py-1 rounded-full transition-colors">
                        <Download size={14}/> Ver Soporte PDF
                      </a>
                    ) : <span className="text-xs text-slate-300 italic flex items-center gap-1"><AlertCircle size={12}/> Sin soporte</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Resumen Financiero */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Ejecución Presupuestal</h3>
            
            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-1">Presupuesto Total</p>
              <p className="text-xl font-bold text-slate-800">{formatMoney(project.presupuesto)}</p>
            </div>

            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-1">Total Ejecutado</p>
              <div className="flex items-end gap-2">
                <p className={`text-xl font-bold ${project.ejecutado > project.presupuesto ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatMoney(project.ejecutado)}
                </p>
                <span className="text-xs text-slate-400 mb-1">
                  ({((project.ejecutado/project.presupuesto)*100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${project.ejecutado > project.presupuesto ? 'bg-red-500' : 'bg-blue-600'}`} 
                style={{width: `${Math.min((project.ejecutado/project.presupuesto)*100, 100)}%`}}
              ></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Equipo Asignado</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  {project.director.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{project.director.nombre}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Director</p>
                </div>
              </div>
              {project.interventores.map((int:any) => (
                <div key={int.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {int.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{int.nombre}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Interventor</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- UTILS & UI COMPONENTS ---

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
    {icon} <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
    <div className={`p-3 bg-${color}-50 text-${color}-600 rounded-lg`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
      </div>
      <div className="p-6 overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

const Input = ({ label, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input {...props} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-shadow" />
  </div>
);

const SubmitButton = ({ label, loading }: any) => (
  <button disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all flex justify-center gap-2 mt-4">
    {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
    {loading ? 'Procesando...' : label}
  </button>
);

const LoginScreen = ({ users, onLogin, loading }: any) => (
  <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
      <div className="text-center mb-8">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-blue-600/30 shadow-lg">
          <FolderKanban className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">PROFACT</h1>
        <p className="text-slate-500 text-sm mt-1">Sistema de Gestión de Interventoría</p>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-4">Selecciona un Rol para Ingresar:</p>
        {loading ? <p className="text-center text-blue-600 animate-pulse">Iniciando sistema...</p> : 
          users.map((user:any) => (
            <button key={user.id} onClick={() => onLogin(user.email)} className="w-full flex items-center p-3 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group bg-white text-left">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-200 group-hover:text-blue-700 text-xs mr-3 border border-slate-200">
                {user.avatar}
              </div>
              <div>
                <div className="font-semibold text-slate-700 group-hover:text-blue-700">{user.nombre}</div>
                <div className="text-xs text-slate-400 group-hover:text-blue-500">{user.rol.replace('_', ' ')}</div>
              </div>
              <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-500"/>
            </button>
          ))
        }
      </div>
    </div>
  </div>
);

const formatMoney = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);