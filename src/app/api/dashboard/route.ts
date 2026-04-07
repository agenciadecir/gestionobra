import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Total active projects (EN_CURSO, PRESUPUESTO)
    const activeProjects = await db.project.count({
      where: {
        status: { in: ["EN_CURSO", "PRESUPUESTO"] },
      },
    });

    // Total clients
    const totalClients = await db.client.count();

    // Total workers
    const totalWorkers = await db.worker.count();

    // Invoices data for pending and collected
    const invoices = await db.invoice.findMany({
      where: {
        status: { not: "ANULADA" },
      },
      include: {
        payments: true,
      },
    });

    const totalPendingAmount = invoices
      .filter(
        (inv) =>
          inv.status === "PENDIENTE" || inv.status === "PAGADA_PARCIALMENTE"
      )
      .reduce((sum, inv) => {
        const totalPaid = inv.payments.reduce(
          (s, p) => s + p.amount,
          0
        );
        return sum + (inv.amount - totalPaid);
      }, 0);

    const totalCollected = invoices.reduce((sum, inv) => {
      return sum + inv.payments.reduce((s, p) => s + p.amount, 0);
    }, 0);

    // Total revenue from paid invoices
    const totalRevenue = invoices
      .filter((inv) => inv.status === "PAGADA")
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Recent projects (last 5)
    const recentProjects = await db.project.findMany({
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Pending tasks count
    const pendingTasks = await db.task.count({
      where: {
        status: { in: ["PENDIENTE", "EN_CURSO"] },
      },
    });

    // Total pending labor costs to pay workers
    const pendingLaborCosts = await db.laborCost.aggregate({
      where: { paidToWorker: false },
      _sum: { workerPrice: true },
    });

    const totalPendingLaborCosts = pendingLaborCosts._sum.workerPrice || 0;

    return NextResponse.json({
      activeProjects,
      totalClients,
      totalWorkers,
      totalPendingAmount,
      totalCollected,
      totalRevenue,
      recentProjects,
      pendingTasks,
      totalPendingLaborCosts,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Error al obtener las estadísticas del panel" },
      { status: 500 }
    );
  }
}
