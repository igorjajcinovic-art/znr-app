export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}