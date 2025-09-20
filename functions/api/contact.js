// Store contact submissions (optional to wire from generated HTML)
export async function onRequestPost({ request, env }) {
  try{
    const { project_id, name, email, message } = await request.json();
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/contacts`,{
      method:"POST",
      headers:{ "content-type":"application/json","apikey":env.SUPABASE_SERVICE_ROLE_KEY,"authorization":`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ project_id, name, email, message })
    });
    if(!resp.ok) return j({success:false,error:"DB insert failed",details:await resp.text()},500);
    return j({success:true});
  }catch(e){ return j({success:false,error:e.message||"Server error"},500); }
}
function j(o,s=200){ return new Response(JSON.stringify(o),{status:s,headers:{ "content-type":"application/json; charset=utf-8","cache-control":"no-store"}}); }
