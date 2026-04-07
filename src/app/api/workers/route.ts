import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const workers = await db.worker.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { specialty: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: {
            laborCosts: true,
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(workers);
  } catch (error) {
    console.error("Error fetching workers:", error);
    return NextResponse.json(
      { error: "Error al obtener los trabajadores" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const worker = await db.worker.create({
      data: {
        name: body.name,
        phone: body.phone || null,
        specialty: body.specialty || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error) {
    console.error("Error creating worker:", error);
    return NextResponse.json(
      { error: "Error al crear el trabajador" },
      { status: 500 }
    );
  }
}
