import { Resend } from "resend";

const clean=(value,max=500)=>String(value??"").trim().slice(0,max);
const escapeHtml=value=>clean(value,1000).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");
const allowed=new Set(["Business","Nonprofit","Current Nonprofit / Foundation","Give Back","Volunteer","Support","Advocate","Other"]);

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store, max-age=0");

  if(req.method!=="POST"){
    res.setHeader("Allow","POST");
    res.status(405).json({ok:false,error:"Method not allowed."});
    return;
  }

  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};

    if(clean(body.website,200)){
      res.status(200).json({ok:true});
      return;
    }

    const name=clean(body.name,100);
    const email=clean(body.email,180);
    const zip=clean(body.zip,10);
    const organization=clean(body.organization,160);
    const other=clean(body.other,300);
    const source=clean(body.source,300);
    const interests=Array.isArray(body.interests)?body.interests.map(x=>clean(x,60)).filter(x=>allowed.has(x)):[];

    if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{5}(?:-\d{4})?$/.test(zip)||!interests.length||body.consent!==true){
      res.status(400).json({ok:false,error:"Please complete your name, email, ZIP code, interest and consent."});
      return;
    }

    if(!process.env.RESEND_API_KEY||!process.env.LINK_FROM_EMAIL){
      res.status(503).json({ok:false,error:"LINK contact notifications are temporarily unavailable."});
      return;
    }

    const resend=new Resend(process.env.RESEND_API_KEY);
    const adminEmail=process.env.LINK_ADMIN_EMAIL||"jaime@linklakenorman.com";

    await resend.emails.send({
      from:process.env.LINK_FROM_EMAIL,
      to:adminEmail,
      replyTo:email,
      subject:`New LINK Community Interest — ${name}`,
      html:`<h2>New LINK Community Connection</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>ZIP:</strong> ${escapeHtml(zip)}</p><p><strong>Organization / Company:</strong> ${escapeHtml(organization)||"—"}</p><p><strong>Interests:</strong> ${escapeHtml(interests.join(", "))}</p><p><strong>Other:</strong> ${escapeHtml(other)||"—"}</p><p><strong>Source page:</strong> ${escapeHtml(source)||"—"}</p><p>Contact consent confirmed: Yes</p>`
    });

    res.status(200).json({ok:true,message:"Thank you. You are connected with LINK."});
  }catch(error){
    console.error("LINK community interest error:",error);
    res.status(500).json({ok:false,error:"Your information could not be sent. Please try again."});
  }
}
