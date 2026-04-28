import { prisma } from "@/lib/prisma";
import { createToken, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body?.email ?? "").trim().toLowerCase();
    const lozinka = String(body?.lozinka ?? body?.password ?? "").trim();

    if (!email || !lozinka) {
      return new Response("Email i lozinka su obavezni.", { status: 400 });
    }

    const brojKorisnika = await prisma.user.count();

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user && brojKorisnika === 0) {
      user = await prisma.user.create({
        data: {
          email,
          ime: "Admin",
          lozinkaHash: hashPassword(lozinka),
          role: "admin",
        },
      });
    }

    if (!user) {
      return new Response("Neispravan email ili lozinka.", { status: 401 });
    }

    const ok = verifyPassword(lozinka, user.lozinkaHash);

    if (!ok) {
      return new Response("Neispravan email ili lozinka.", { status: 401 });
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          ime: user.ime,
          role: user.role,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
        },
      }
    );
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return new Response("Greška kod prijave.", { status: 500 });
  }
}