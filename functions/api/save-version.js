export async function onRequestPost({ request, env }) {
  try{
    const body = await request.json();
    const { label, html } = body || {};
    if(!label || !html) return j({success:false,error:"Missing fields"},400);

    const user = await getUserFromAuthHeader(request, env);
    if(!user) return j({success:false,error:"Unauthorized"},401);

    // Save version without strict project binding for MVP (attach later)
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/project_versions`, {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ user_id: user.id, label, html })
    });

    if(!resp.ok){ return j({success:false,error:"DB insert failed",details:await resp.text()},500); }
    const data = await resp.json();
    return j({success:true, version: data?.[0] || null});
  }catch(e){ return j({success:false,error:e.message||"Server error"},500); }
}
async function getUserFromAuthHeader(request, env){
  const auth = request.headers.get("Authorization")||""; const token = auth.startsWith("Bearer ")?auth.slice(7):null;
  if(!token) return null;
  const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{ headers:{ "authorization":`Bearer ${token}`, "apikey": env.SUPABASE_SERVICE_ROLE_KEY } });
  if(!u.ok) return null; return await u.json();
}
function j(o,s=200){ return new Response(JSON.stringify(o),{status:s,headers:{ "content-type":"application/json; charset=utf-8","cache-control":"no-store"}}); }
