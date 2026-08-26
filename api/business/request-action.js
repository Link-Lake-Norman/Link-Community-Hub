import { getBusinessSession } from "./_auth.js";
import { sendRequestStatusEmail } from "./_email.js";
import { clean, fail, noStore, parseJsonBody } from "./_util.js";
const ACTIONS=new Set(['connected','declined','completed']);
export default async function handler(req,res){
  noStore(res); if(req.method!=='POST'){res.setHeader('Allow','POST');fail(res,405,'Method not allowed.');return;}
  const session=await getBusinessSession(req,res); if(!session)return;
  try{
    const body=parseJsonBody(req),{sql,business}=session,requestId=clean(body.requestId,80),action=clean(body.action,30),note=clean(body.note,1000)||null;
    if(!requestId||!ACTIONS.has(action)){fail(res,400,'Choose a valid request action.');return;}
    const rows=await sql`SELECT r.id,r.item_id,r.status,r.nonprofit_contact_email,i.title AS item_title FROM hub_resource_requests r JOIN hub_resource_items i ON i.id=r.item_id WHERE r.id=${requestId} AND r.business_id=${business.id} LIMIT 1`;
    if(!rows.length){fail(res,404,'Resource request not found.');return;} const request=rows[0];
    if(action==='completed'){
      const completed=await sql`SELECT id FROM hub_resource_requests WHERE item_id=${request.item_id} AND status='completed' AND id<>${requestId} LIMIT 1`;
      if(completed.length){fail(res,409,'This resource has already been completed with another nonprofit.');return;}
      await sql`UPDATE hub_resource_requests SET status='completed',business_note=${note},responded_at=COALESCE(responded_at,now()),connected_at=COALESCE(connected_at,now()),completed_at=now(),updated_at=now() WHERE id=${requestId} AND business_id=${business.id}`;
      await sql`UPDATE hub_resource_items SET status='removed',removed_at=now(),updated_at=now() WHERE id=${request.item_id} AND business_id=${business.id}`;
      await sql`UPDATE hub_resource_requests SET status='declined',business_note=COALESCE(business_note,'This resource was completed with another organization.'),responded_at=COALESCE(responded_at,now()),updated_at=now() WHERE item_id=${request.item_id} AND id<>${requestId} AND status IN ('requested','connected')`;
    } else if(action==='connected') {
      await sql`UPDATE hub_resource_requests SET status='connected',business_note=${note},responded_at=COALESCE(responded_at,now()),connected_at=COALESCE(connected_at,now()),updated_at=now() WHERE id=${requestId} AND business_id=${business.id}`;
    } else {
      await sql`UPDATE hub_resource_requests SET status='declined',business_note=${note},responded_at=COALESCE(responded_at,now()),updated_at=now() WHERE id=${requestId} AND business_id=${business.id}`;
    }
    await sendRequestStatusEmail({to:request.nonprofit_contact_email,businessName:business.business_name,itemTitle:request.item_title,status:action});
    res.status(200).json({ok:true});
  }catch(error){console.error('LINK business request action error:',error);fail(res,500,'The resource request could not be updated.');}
}
