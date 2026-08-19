import { db } from "../../../../packages/db/src"; 
import { users, jobs, companies } from "../../../../packages/db/src/schema";
import { sql, eq } from "drizzle-orm";
import { Request, Response } from 'express';

export const getPlatformStats = async (req: Request, res: Response) => {
  try { 
    // Contar usuarios totales
    const [usersData] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    
    // Contar empleos activos (isOpen = true)
    const [jobsData] = await db.select({ count: sql<number>`count(*)::int` }).from(jobs).where(eq(jobs.isOpen, true));
    
    // Contar empresas registradas
    const [companiesData] = await db.select({ count: sql<number>`count(*)::int` }).from(companies);

    return res.status(200).json({
      users: usersData?.count || 0,
      jobs: jobsData?.count || 0,
      companies: companiesData?.count || 0
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return res.status(500).json({ error: "Error interno " });
  }
};
