import { neon } from "@neondatabase/serverless";
import { sendResourceRequestEmails } from "../business/_email.js";
import { clean, fail, noStore, parseJsonBody, validEmail } from "../business/_util.js";
export default async function handler(req,res){
  noStore(res); if(req.method!=='POST'){res.setHeader('Allow','POST');fail(res,405,'Method not allowed.');return;} if(!process.env.DATABASE_URL){fail(res,503,'LINK resource requests are temporarily unavailable.');return;}
  try{
    const body=parseJsonBody(req),itemId=clean(body.itemId,80),nonprofitOrganizationId=clean(body.nonprofitOrganizationId,80),contactName=clean(body.contactName,140),contactEmail=clean(body.contactEmail,180).toLowerCase(),message=clean(body.message,2000)||null;
    if(!itemId||!nonprofitOrganizationId||!contactName||!validEmail(contactEmail)||body.disclaimerAccepted!==true){fail(res,400,'Complete the required resource request fields.');return;}
    const sql=neon(process.env.DATABASE_URL);
    const itemRows=await sql`SELECT i.id,i.business_id,i.title,i.status,i.expires_at,b.business_name,b.email,b.claim_window_months,b.status AS business_status FROM hub_resource_items i JOIN hub_business_accounts b ON b.id=i.business_id WHERE i.id=${itemId} LIMIT 1`;
    if(!itemRows.length){fail(res,404,'This resource is no longer available.');return;} const item=itemRows[0];
    if(item.status!=='available'||item.business_status!=='active'||(item.expires_at&&new Date(item.expires_at)<=new Date())){fail(res,409,'This resource is no longer available.');return;}
    const nonprofitRows=await sql`SELECT id,display_name,public_email,approval_status,public_status,active,service_area_verified FROM organizations WHERE id=${nonprofitOrganizationId} LIMIT 1`;
    if(!nonprofitRows.length){fail(res,404,'Approved nonprofit organization not found.');return;} const nonprofit=nonprofitRows[0];
    if(nonprofit.approval_status!=='approved'||nonprofit.public_status!=='public'||nonprofit.active!==true||nonprofit.service_area_verified!==true){fail(res,403,'This resource exchange is available to approved local nonprofits.');return;}
    const contactRows=await sql`SELECT id FROM organization_contacts WHERE organization_id=${nonprofit.id} AND lower(email)=${contactEmail} ORDER BY is_primary DESC,created_at LIMIT 1`;
    const matchesPublicEmail=nonprofit.public_email&&String(nonprofit.public_email).toLowerCase()===contactEmail;
    if(!contactRows.length&&!matchesPublicEmail){fail(res,403,'Please use an email address associated with this approved nonprofit.');return;}
    const duplicate=await sql`SELECT id FROM hub_resource_requests WHERE item_id=${item.id} AND nonprofit_organization_id=${nonprofit.id} AND status IN ('requested','connected') LIMIT 1`;
    if(duplicate.length){fail(res,409,'Your organization already has an open request for this resource.');return;}
    const cooldown=await sql`SELECT completed_at,completed_at+make_interval(months=>${Number(item.claim_window_months||12)}) AS next_eligible_at FROM hub_resource_requests WHERE business_id=${item.business_id} AND nonprofit_organization_id=${nonprofit.id} AND status='completed' AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1`;
    if(cooldown.length&&cooldown[0].next_eligible_at&&new Date(cooldown[0].next_eligible_at)>new Date()){res.status(409).json({ok:false,error:"Your organization is currently in this business's giving interval.",nextEligibleAt:cooldown[0].next_eligible_at});return;}
    const rows=await sql`INSERT INTO hub_resource_requests (item_id,business_id,nonprofit_organization_id,nonprofit_contact_id,nonprofit_contact_name,nonprofit_contact_email,message,status,disclaimer_accepted_at,requested_at,updated_at) VALUES (${item.id},${item.business_id},${nonprofit.id},${contactRows[0]?.id||null},${contactName},${contactEmail},${message},'requested',now(),now(),now()) RETURNING id`;
    try{await sendResourceRequestEmails({business:{business_name:item.business_name,email:item.email},nonprofit,contactName,contactEmail,item:{title:item.title},message});}catch(emailError){console.error('LINK resource request notification error:',emailError);}
    res.status(200).json({ok:true,requestId:rows[0].id,message:'Your request has been sent to the business. LINK makes the connection; the business controls availability and next steps.'});
  }catch(error){console.error('LINK public resource request error:',error);fail(res,500,'Your resource request could not be submitted.');}
}
