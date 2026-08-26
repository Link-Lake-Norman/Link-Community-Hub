import { del, put } from "@vercel/blob";
import { getBusinessSession } from "./_auth.js";
import { clean, fail, noStore, parseJsonBody } from "./_util.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Unsupported image format.");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("Unsupported image format.");
  return { contentType, buffer };
}
function extension(contentType){return contentType==='image/png'?'png':contentType==='image/webp'?'webp':'jpg';}
async function bestEffortDelete(url){if(!url)return;try{await del(url);}catch(error){console.warn('LINK Blob cleanup warning:',error?.message||error);}}

export default async function handler(req,res){
  noStore(res); if(req.method!=='POST'){res.setHeader('Allow','POST');fail(res,405,'Method not allowed.');return;}
  if(!process.env.BLOB_READ_WRITE_TOKEN){fail(res,503,'Image storage is not configured yet. Your other portal features are still available.');return;}
  const session=await getBusinessSession(req,res); if(!session)return;
  try{
    const body=parseJsonBody(req),{sql,business}=session,action=clean(body.action,50)||'upload';
    if(action==='delete-image'){
      const imageId=clean(body.imageId,80); const rows=await sql`SELECT id,item_id,image_url FROM hub_resource_item_images WHERE id=${imageId} AND business_id=${business.id} LIMIT 1`;
      if(!rows.length){fail(res,404,'Resource image not found.');return;} const image=rows[0]; await bestEffortDelete(image.image_url);
      await sql`DELETE FROM hub_resource_item_images WHERE id=${image.id} AND business_id=${business.id}`;
      const remaining=await sql`SELECT image_url FROM hub_resource_item_images WHERE item_id=${image.item_id} ORDER BY sort_order,created_at LIMIT 1`;
      await sql`UPDATE hub_resource_items SET image_url=${remaining[0]?.image_url||null},updated_at=now() WHERE id=${image.item_id} AND business_id=${business.id}`;
      res.status(200).json({ok:true}); return;
    }
    const kind=clean(body.kind,30),altText=clean(body.altText,200)||null,{contentType,buffer}=decodeDataUrl(body.dataUrl),maxBytes=kind==='logo'?2000000:3000000;
    if(buffer.length>maxBytes){fail(res,413,kind==='logo'?'Logo is too large. Please use an image under 2 MB.':'Resource image is too large. Please use an image under 3 MB.');return;}
    if(kind==='logo'){
      const pathname=`business-logos/${business.id}/${Date.now()}-${Math.random().toString(36).slice(2,10)}.${extension(contentType)}`;
      const blob=await put(pathname,buffer,{access:'public',contentType}); const oldUrl=business.logo_url;
      await sql`UPDATE hub_business_accounts SET logo_url=${blob.url},updated_at=now() WHERE id=${business.id}`; await bestEffortDelete(oldUrl);
      res.status(200).json({ok:true,url:blob.url}); return;
    }
    if(kind==='resource'){
      const itemId=clean(body.itemId,80); const itemRows=await sql`SELECT id,title FROM hub_resource_items WHERE id=${itemId} AND business_id=${business.id} LIMIT 1`;
      if(!itemRows.length){fail(res,404,'Resource item not found.');return;}
      const countRows=await sql`SELECT count(*)::int AS count FROM hub_resource_item_images WHERE item_id=${itemId} AND business_id=${business.id}`; const count=Number(countRows[0]?.count||0),limit=business.plan_tier==='community_free'?1:5;
      if(count>=limit){fail(res,409,`Your current LINK participation level allows ${limit} resource image${limit===1?'':'s'} per item.`);return;}
      const pathname=`resource-images/${business.id}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2,10)}.${extension(contentType)}`; const blob=await put(pathname,buffer,{access:'public',contentType});
      const inserted=await sql`INSERT INTO hub_resource_item_images (item_id,business_id,image_url,blob_pathname,content_type,file_size_bytes,alt_text,sort_order) VALUES (${itemId},${business.id},${blob.url},${blob.pathname||pathname},${contentType},${buffer.length},${altText||itemRows[0].title},${count}) RETURNING id,image_url`;
      if(count===0)await sql`UPDATE hub_resource_items SET image_url=${blob.url},updated_at=now() WHERE id=${itemId} AND business_id=${business.id}`;
      res.status(200).json({ok:true,image:inserted[0]}); return;
    }
    fail(res,400,'Choose a valid image upload type.');
  }catch(error){console.error('LINK business image upload error:',error);fail(res,500,error?.message||'Image could not be uploaded.');}
}
