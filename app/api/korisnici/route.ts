import { hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

const ROLE_LABELS = new Set(["admin", "martina", "poslovoda"]);

export async function GET(req: Request) {
  const admin = await requireAdmin(req);

  if (!admin) {
    return new Response("Nemate ovlasti za korisnike.", { status: 403 });
  }

  const korisnici = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      ime: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(korisnici);
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);

  if (!admin) {
    return new Response("Nemate ovlasti za dodavanje korisnika.", { status: 403 });
  }

  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const ime = String(body?.ime ?? "").trim();
  const lozinka = String(body?.lozinka ?? body?.password ?? "").trim();
  const role = String(body?.role ?? "poslovoda").trim();

  if (!email || !ime || !lozinka) {
    return new Response("Ime, email i lozinka su obavezni.", { status: 400 });
  }

  if (!ROLE_LABELS.has(role)) {
    return new Response("Uloga korisnika nije ispravna.", { status: 400 });
  }

  if (lozinka.length < 6) {
    return new Response("Lozinka mora imati barem 6 znakova.", { status: 400 });
  }

  const postojeci = await prisma.user.findUnique({ where: { email } });
  if (postojeci) {
    return new Response("Korisnik s tim emailom vec postoji.", { status: 409 });
  }

  const korisnik = await prisma.user.create({
    data: {
      email,
      ime,
      lozinkaHash: hashPassword(lozinka),
      role,
    },
    select: {
      id: true,
      email: true,
      ime: true,
      role: true,
      createdAt: true,
    },
  });

  await recordAuditLog({
    user: admin,
    action: "create",
    entityType: "korisnik",
    entityId: korisnik.id,
    entityLabel: korisnik.email,
    newData: korisnik,
  });

  return Response.json(korisnik, { status: 201 });
}
