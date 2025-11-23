'use server';

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client'; // Importamos los tipos de Prisma
import { revalidatePath } from 'next/cache';

// --- 1. Inicializar Datos de Prueba (Seed) ---
export async function seedDatabase() {
  const count = await db.usuario.count();
  if (count === 0) {
    console.log("Sembrando base de datos...");
    await db.usuario.createMany({
      data: [
        { nombre: 'Jesus Jimenez', email: 'director@profact.com', rol: 'DIRECTOR', avatar: 'JJ' },
        { nombre: 'Sheiry Dahjer', email: 'gerente@profact.com', rol: 'GERENTE', avatar: 'SD' },
        { nombre: 'Pedro Pérez', email: 'interventor@profact.com', rol: 'INTERVENTOR', avatar: 'PP' },
        { nombre: 'Ana Contadora', email: 'contador@profact.com', rol: 'CONTADOR', avatar: 'AC' },
      ]
    });
  }
}

// --- 2. Obtener Usuarios (Login) ---
export async function getAllUsers() {
  return await db.usuario.findMany();
}

// --- 3. Obtener Estado de la App (Dashboard) ---
export async function getAppState(email: string) {
  const user = await db.usuario.findUnique({ where: { email } });
  if (!user) return null;

  let proyectos;
  
  if (user.rol === 'DIRECTOR') {
    proyectos = await db.proyecto.findMany({
      where: { directorId: user.id },
      include: { eventos: { orderBy: { fecha: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
  } else {
    proyectos = await db.proyecto.findMany({
      include: { eventos: { orderBy: { fecha: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  return { user, proyectos };
}

// --- 4. Crear Proyecto (CU-02) ---
export async function crearProyecto(formData: FormData, directorId: string) {
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
    return { success: false, error: 'Error al crear. Verifique que el Centro de Costo no esté duplicado.' };
  }
}

// --- 5. Registrar Evento (CU-01 y CU-03) ---
export async function registrarEvento(formData: FormData, proyectoId: string) {
  const tipo = formData.get('tipo') as string;
  const valor = Number(formData.get('valor') || 0);
  const fecha = new Date(formData.get('fecha') as string);
  const descripcion = formData.get('descripcion') as string;

  // Aquí tipamos explícitamente 'tx' para corregir el error de TypeScript
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Crear el evento
    await tx.evento.create({
      data: {
        tipo,
        fecha,
        descripcion,
        valor: valor > 0 ? valor : null,
        proyectoId
      }
    });

    // 2. Actualizar presupuesto si es facturación
    if (tipo === 'FACTURACION' && valor > 0) {
      await tx.proyecto.update({
        where: { id: proyectoId },
        data: { ejecutado: { increment: valor } }
      });
    }
  });

  revalidatePath('/');
}