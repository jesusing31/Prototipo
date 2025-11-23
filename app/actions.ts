// app/actions.ts
'use server';

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// --- UTILIDAD: Guardar PDF en Disco ---
async function savePdfFile(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  
  // Convertir el archivo a buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Crear nombre único (Timestamp + nombre sanitizado)
  const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const fileName = `${Date.now()}-${safeName}`;
  
  // Ruta física en el servidor
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  
  // Asegurar que la carpeta exista
  await mkdir(uploadDir, { recursive: true });
  
  // Escribir archivo
  await writeFile(join(uploadDir, fileName), buffer);
  
  // Retornar la URL pública (accesible desde el navegador)
  return `/uploads/${fileName}`;
}

// --- 1. Inicialización de Datos (Seed) ---
export async function seedDatabase() {
  const count = await db.usuario.count();
  if (count === 0) {
    console.log("Inicializando usuarios base...");
    await db.usuario.createMany({
      data: [
        { nombre: 'Carlos Gerente', email: 'gerente.g@profact.com', rol: 'GERENTE_GENERAL', avatar: 'CG' },
        { nombre: 'Maria Técnica', email: 'gerente.t@profact.com', rol: 'GERENTE_TECNICA', avatar: 'MT' },
        { nombre: 'Jesus Jimenez', email: 'director@profact.com', rol: 'DIRECTOR', avatar: 'JJ' },
        { nombre: 'Pedro Pérez', email: 'interventor@profact.com', rol: 'INTERVENTOR', avatar: 'PP' },
        { nombre: 'Ana Contadora', email: 'contador@profact.com', rol: 'CONTADOR', avatar: 'AC' },
        { nombre: 'Admin Sistema', email: 'admin@profact.com', rol: 'ADMIN', avatar: 'AD' },
      ]
    });
  }
}

// --- 2. Getters de Datos ---
export async function getAllUsers() {
  return await db.usuario.findMany();
}

export async function getInterventores() {
  return await db.usuario.findMany({ where: { rol: 'INTERVENTOR' } });
}

// Lógica Principal de Dashboard: Filtra qué ve cada usuario
export async function getAppState(email: string) {
  const user = await db.usuario.findUnique({ 
    where: { email }
  });
  
  if (!user) return null;

  let whereClause: Prisma.ProyectoWhereInput = {};

  // REGLAS DE NEGOCIO DE VISIBILIDAD (Según PDF)
  switch (user.rol) {
    case 'DIRECTOR':
      // Ve solo lo que dirige
      whereClause = { directorId: user.id };
      break;
    case 'INTERVENTOR':
      // Ve donde ha sido asignado (Relación M-N)
      whereClause = { interventores: { some: { id: user.id } } };
      break;
    case 'GERENTE_GENERAL':
    case 'GERENTE_TECNICA':
    case 'CONTADOR':
    case 'ADMIN':
      // Ven todo el portafolio
      whereClause = {}; 
      break;
    default:
      whereClause = { id: 'none' }; // Seguridad por defecto
  }

  const proyectos = await db.proyecto.findMany({
    where: whereClause,
    include: { 
      eventos: { orderBy: { fecha: 'desc' } },
      director: true,
      interventores: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return { user, proyectos };
}

// --- 3. Crear Proyecto (CU-02) ---
export async function crearProyecto(formData: FormData, directorId: string) {
  // Obtenemos múltiples interventores del formulario
  const interventoresIds = formData.getAll('interventores') as string[];
  
  const rawData = {
    nombre: formData.get('nombre') as string,
    cliente: formData.get('cliente') as string,
    centroCosto: formData.get('centroCosto') as string,
    presupuesto: Number(formData.get('presupuesto')),
    fechaInicio: new Date(formData.get('fechaInicio') as string),
  };

  try {
    await db.proyecto.create({
      data: {
        ...rawData,
        directorId: directorId,
        // Conexión M-N
        interventores: {
          connect: interventoresIds.map(id => ({ id }))
        },
        // Evento automático de inicio
        eventos: {
          create: {
            tipo: 'ACTA_INICIO',
            fecha: rawData.fechaInicio,
            descripcion: 'Inicio automático del contrato al crear proyecto.',
          }
        }
      }
    });
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear proyecto.' };
  }
}

// --- 4. Registrar Evento Completo (CU-01 y CU-03) ---
export async function registrarEvento(formData: FormData, proyectoId: string, userRol: string) {
  const tipo = formData.get('tipo') as string;
  const fecha = new Date(formData.get('fecha') as string);
  const descripcion = formData.get('descripcion') as string;
  const file = formData.get('soporte') as File | null;
  
  // Datos financieros
  const valor = Number(formData.get('valor') || 0);
  const numeroFactura = formData.get('numeroFactura') as string | null;

  // Validación de Seguridad (Backend Guard)
  if (tipo === 'FACTURACION' && userRol !== 'CONTADOR') {
    throw new Error("Acceso Denegado: Solo los contadores pueden registrar facturas.");
  }

  // Procesar Archivo PDF
  let soporteUrl = null;
  if (file && file.size > 0) {
    soporteUrl = await savePdfFile(file);
  }

  // Transacción ACID: O se guarda todo o no se guarda nada
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    
    // 1. Crear el registro del evento
    await tx.evento.create({
      data: {
        tipo,
        fecha,
        descripcion,
        valor: (tipo === 'FACTURACION' || tipo === 'ADICION') ? valor : null,
        numeroFactura: tipo === 'FACTURACION' ? numeroFactura : null,
        soporteUrl, // URL del PDF
        proyectoId
      }
    });

    // 2. Ejecutar Lógica de Negocio Colateral
    if (tipo === 'FACTURACION') {
      // Aumentar el ejecutado
      await tx.proyecto.update({
        where: { id: proyectoId },
        data: { ejecutado: { increment: valor } }
      });
    } else if (tipo === 'ADICION') {
      // Aumentar el presupuesto
      await tx.proyecto.update({
        where: { id: proyectoId },
        data: { presupuesto: { increment: valor } }
      });
    } else if (tipo === 'SUSPENSION') {
      // Cambiar estado
      await tx.proyecto.update({
        where: { id: proyectoId },
        data: { estado: 'SUSPENDIDO' }
      });
    } else if (tipo === 'REINICIO') {
      // Reactivar
      await tx.proyecto.update({
        where: { id: proyectoId },
        data: { estado: 'ACTIVO' }
      });
    }
  });

  revalidatePath('/');
  return { success: true };
}