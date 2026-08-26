import { getBusinessSession } from "./_auth.js";
import { fail, noStore } from "./_util.js";

function groupImages(images) {
  const map = new Map();
  images.forEach(image => {
    const key = String(image.item_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(image);
  });
  return map;
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); fail(res,405,"Method not allowed."); return; }
  const session = await getBusinessSession(req,res); if (!session) return;
  try {
    const {sql,business}=session;
    const [impactRows,items,images,requests,selectedTags,missionTags,matches]=await Promise.all([
      sql`SELECT resources_posted,requests_received,completed_connections,nonprofits_supported,estimated_value_cents FROM hub_business_impact_metrics WHERE business_id=${business.id} LIMIT 1`,
      sql`SELECT id,title,category,description,image_url,quantity_text,estimated_value_cents,availability_notes,pickup_instructions,expires_at,status,created_at,updated_at,removed_at FROM hub_resource_items WHERE business_id=${business.id} ORDER BY created_at DESC`,
      sql`SELECT id,item_id,image_url,blob_pathname,content_type,file_size_bytes,alt_text,sort_order,created_at FROM hub_resource_item_images WHERE business_id=${business.id} ORDER BY item_id,sort_order,created_at`,
      sql`SELECT r.id,r.item_id,r.nonprofit_organization_id,r.nonprofit_contact_name,r.nonprofit_contact_email,r.message,r.status,r.business_note,r.requested_at,r.responded_at,r.connected_at,r.completed_at,i.title AS item_title,o.display_name AS nonprofit_name,o.website_url AS nonprofit_website FROM hub_resource_requests r JOIN hub_resource_items i ON i.id=r.item_id JOIN organizations o ON o.id=r.nonprofit_organization_id WHERE r.business_id=${business.id} ORDER BY r.requested_at DESC`,
      sql`SELECT mt.code,mt.label,bt.preference_strength FROM hub_business_tags bt JOIN hub_match_tags mt ON mt.id=bt.tag_id WHERE bt.business_id=${business.id} AND mt.dimension='mission' ORDER BY mt.sort_order,mt.label`,
      sql`SELECT code,label FROM hub_match_tags WHERE dimension='mission' AND active=true ORDER BY sort_order,label`,
      sql`SELECT m.organization_id,m.match_score,m.matched_tag_count,m.match_reasons,o.display_name,o.slug,o.mission,o.category,o.website_url FROM hub_business_nonprofit_match_scores m JOIN organizations o ON o.id=m.organization_id WHERE m.business_id=${business.id} ORDER BY m.match_score DESC,lower(o.display_name) LIMIT 6`
    ]);
    const imageMap=groupImages(images);
    const resources=items.map(item=>({...item,images:imageMap.get(String(item.id))||[]}));
    const impact=impactRows[0]||{resources_posted:0,requests_received:0,completed_connections:0,nonprofits_supported:0,estimated_value_cents:0};
    res.status(200).json({ok:true,business,impact,resources,requests,selectedMissionTags:selectedTags,missionTags,nonprofitMatches:matches,payments:{communityPartnerUrl:process.env.LINK_QUICKBOOKS_COMMUNITY_PARTNER_URL||null,impactPartnerUrl:process.env.LINK_QUICKBOOKS_IMPACT_PARTNER_URL||null}});
  } catch(error) { console.error('LINK business dashboard error:',error); fail(res,500,'Your LINK Business Portal could not be loaded.'); }
}
