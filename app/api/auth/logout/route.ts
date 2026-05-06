export async function POST() {
  const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie}`,
    },
  });
}
