export async function onRequestGet({ request, env }) {
  try{
    const user = await getUserFromAuthHeader(request, env);
    if(!user) return j({success:false,error:"Unauthorized"},401);

    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/projects?user_id=eq.${user.id}&order=created_at.desc`, {
      headers:{ "apikey": env.SUPABASE_SERVICE_ROLE_KEY, "authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
    });
    const data = await resp.json();
    return j({success:true, items:data||[]});
  }catch(e){ return j({success:false,error:e.message||"Server error"},500); }
}
async function getUserFromAuthHeader(request, env){
  const auth = request.headers.get("Authorization")||""; const token = auth.startsWith("Bearer ")?auth.slice(7):null;
  if(!token) return null;
  const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{ headers:{ "authorization":`Bearer ${token}`, "apikey": env.SUPABASE_SERVICE_ROLE_KEY } });
  if(!u.ok) return null; return await u.json();
}
function j(o,s=200){ return new Response(JSON.stringify(o),{status:s,headers:{ "content-type":"application/json; charset=utf-8","cache-control":"no-store"}}); }
