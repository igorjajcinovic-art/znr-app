import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

const ROLE_LABELS = new Set(["admin", "martina", "poslovoda"]);

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req);

  if (!admin) {
    return new Response("Nemate ovlasti za izmjenu korisnika.", { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const ime = String(body?.ime ?? "").trim();
  const lozinka = String(body?.lozinka ?? body?.password ?? "").trim();
  const role = String(body?.role ?? "").trim();

  if (!email || !ime || !role) {
    return new Response("Ime, email i uloga su obavezni.", { status: 400 });
  }

  if (!ROLE_LABELS.has(role)) {
    return new Response("Uloga korisnika nije ispravna.", { status: 400 });
  }

  if (lozinka && lozinka.length < 6) {
    return new Response("Nova lozinka mora imati barem 6 znakova.", {
      status: 400,
    });
  }

  const postojeci = await prisma.user.findUnique({ where: { id } });

  if (!postojeci) {
    return new Response("Korisnik nije pronaden.", { status: 404 });
  }

  const istiEmail = await prisma.user.findUnique({ where: { email } });

  if (istiEmail && istiEmail.id !== id) {
    return new Response("Korisnik s tim emailom vec postoji.", {
      status: 409,
    });
  }

  const korisnik = await prisma.user.update({
    where: { id },
    data: {
      email,
      ime,
      role,
      ...(lozinka ? { lozinkaHash: hashPassword(lozinka) } : {}),
    },
    select: {
      id: true,
      email: true,
      ime: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(korisnik);
}
