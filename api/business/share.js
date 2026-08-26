import { getBusinessSession } from "./_auth.js";
import { clean, fail, noStore, parseJsonBody } from "./_util.js";
const CHANNELS=new Set(['copy-link','email','sms','native-share','qr','social','other']);
const AUDIENCES=new Set(['business','nonprofit','school','organization','student','volunteer','community','other']);
export default async function handler(req,res){
  noStore(res); if(req.method!=='POST'){res.setHeader('Allow','POST');fail(res,405,'Method not allowed.');return;}
  const session=await getBusinessSession(req,res); if(!session)return;
  try{const body=parseJsonBody(req),{sql,business}=session,channel=clean(body.channel,50),audienceType=clean(body.audienceType,50)||'community'; if(!CHANNELS.has(channel)||!AUDIENCES.has(audienceType)){fail(res,400,'Invalid share option.');return;} await sql`INSERT INTO hub_share_events (referrer_type,referrer_id,audience_type,channel,source_context) VALUES ('business',${business.id},${audienceType},${channel},'business-portal')`;res.status(200).json({ok:true});}catch(error){console.error('LINK business share event error:',error);fail(res,500,'Share activity could not be recorded.');}
}
