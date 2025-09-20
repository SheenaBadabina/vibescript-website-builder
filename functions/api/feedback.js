export async function onRequestPost({ request, env }) {
  try{
    const body = await request.json(); const { message, meta } = body||{};
    if(!message) return j({success:false,error:"Missing message"},400);

    let user = null;
    const auth = request.headers.get("Authorization")||"";
    if(auth.startsWith("Bearer ")){
      const token = auth.slice(7);
      const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{ headers:{ "authorization":`Bearer ${token}`, "apikey": env.SUPABASE_SERVICE_ROLE_KEY } });
      if(u.ok) user = await u.json();
    }

    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/feedback`, {
      method:"POST",
      headers:{ "content-type":"application/json","apikey": env.SUPABASE_SERVICE_ROLE_KEY,"authorization":`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ user_id: user?.id || null, message, meta: meta||{} })
    });
    if(!resp.ok) return j({success:false,error:"DB insert failed",details:await resp.text()},500);
    return j({success:true});
  }catch(e){ return j({success:false,error:e.message||"Server error"},500); }
}
function j(o,s=200){ return new Response(JSON.stringify(o),{status:s,headers:{ "content-type":"application/json; charset=utf-8","cache-control":"no-store"}}); }
