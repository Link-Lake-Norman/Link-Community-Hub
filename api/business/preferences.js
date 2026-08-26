import { getBusinessSession } from "./_auth.js";
import { clean, fail, noStore, parseJsonBody } from "./_util.js";

export default async function handler(req, res) {
  noStore(res);
  if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); fail(res,405,'Method not allowed.'); return; }
  const session = await getBusinessSession(req,res); if (!session) return;
  try {
    const {sql,business}=session;
    if (req.method==='GET') {
      const [all,selected]=await Promise.all([
        sql`SELECT code,label FROM hub_match_tags WHERE dimension='mission' AND active=true ORDER BY sort_order,label`,
        sql`SELECT mt.code,mt.label,bt.preference_strength FROM hub_business_tags bt JOIN hub_match_tags mt ON mt.id=bt.tag_id WHERE bt.business_id=${business.id} AND mt.dimension='mission' ORDER BY mt.sort_order,mt.label`
      ]);
      res.status(200).json({ok:true,tags:all,selected}); return;
    }
    const raw=Array.isArray(parseJsonBody(req).missionCodes)?parseJsonBody(req).missionCodes:[];
    const codes=Array.from(new Set(raw.map(v=>clean(v,100)).filter(Boolean))).slice(0,8);
    await sql`DELETE FROM hub_business_tags bt USING hub_match_tags mt WHERE bt.tag_id=mt.id AND bt.business_id=${business.id} AND mt.dimension='mission'`;
    for (const code of codes) {
      await sql`INSERT INTO hub_business_tags (business_id,tag_id,preference_strength) SELECT ${business.id},mt.id,3 FROM hub_match_tags mt WHERE mt.dimension='mission' AND mt.code=${code} AND mt.active=true ON CONFLICT (business_id,tag_id) DO UPDATE SET preference_strength=3`;
    }
    res.status(200).json({ok:true});
  } catch(error) { console.error('LINK business preference update error:',error); fail(res,500,'Giving interests could not be saved.'); }
}
