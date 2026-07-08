import { getCurrentUser } from "@/lib/server-auth";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return new Response("Neautorizirano.", { status: 401 });
  }

  return Response.json({ user });
}
