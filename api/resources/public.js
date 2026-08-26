import { neon } from "@neondatabase/serverless";
function fail(res,status,message){res.status(status).json({ok:false,error:message});}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');fail(res,405,'Method not allowed.');return;}
  if(!process.env.DATABASE_URL){fail(res,503,'LINK resource listings are temporarily unavailable.');return;}
  try{
    const sql=neon(process.env.DATABASE_URL);
    const items=await sql`SELECT i.id,i.title,i.category,i.description,i.image_url,i.quantity_text,i.availability_notes,i.pickup_instructions,i.expires_at,i.created_at,b.business_name,CASE WHEN b.public_logo_enabled=true THEN b.logo_url ELSE NULL END AS business_logo_url,CASE WHEN b.public_link_enabled=true THEN b.website_url ELSE NULL END AS business_website_url FROM hub_resource_items i JOIN hub_business_accounts b ON b.id=i.business_id WHERE i.status='available' AND (i.expires_at IS NULL OR i.expires_at>now()) AND b.status='active' AND b.public_profile_enabled=true ORDER BY i.created_at DESC`;
    const ids=items.map(i=>i.id); let images=[]; if(ids.length)images=await sql`SELECT item_id,image_url,alt_text,sort_order FROM hub_resource_item_images WHERE item_id=ANY(${ids}::uuid[]) ORDER BY item_id,sort_order,created_at`;
    const imageMap=new Map(); images.forEach(image=>{const key=String(image.item_id);if(!imageMap.has(key))imageMap.set(key,[]);imageMap.get(key).push(image);});
    res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=120'); res.status(200).json({ok:true,items:items.map(item=>({...item,images:imageMap.get(String(item.id))||[]}))});
  }catch(error){console.error('LINK public resource API error:',error);fail(res,500,'LINK resource listings could not be loaded.');}
}
