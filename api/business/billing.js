import { getBusinessSession } from "./_auth.js";
import { businessComplimentaryAccessOpen } from "./_plan-policy.js";

const LEVELS = [{"key": "community_ally", "name": "Community Ally", "price": "$39/mo \u00b7 $390/year", "url": "https://connect.intuit.com/pay/LinkLakeNorman/scs-v1-5b8062b459aa47488e57fe45b7778872fa8893bdc9d34d1a8553c04dce9ac58f5f631d75291142bd84a737e98ed602cc-1?locale=EN_US&cta=saveandcopylink"}, {"key": "impact_partner", "name": "Impact Partner", "price": "$99/mo \u00b7 $990/year", "url": "https://connect.intuit.com/pay/LinkLakeNorman/scs-v1-7b632518932f49b3af28f621af00a0e7f176ab6bfe7a4bd2b7174a5f7ec582289e927ebe866c46f38352f49eeef41f71-1?locale=EN_US&cta=saveandcopylink"}, {"key": "community_champion", "name": "Community Champion", "price": "$249/mo \u00b7 $2,490/year", "url": "https://connect.intuit.com/pay/LinkLakeNorman/scs-v1-576ef8ce788b43eab104e3662ebd98d8cfb141ee5d33497d8af270dcaea1697f1994c32bf856417f898e8bedca7bb8a9-0?locale=EN_US&cta=saveandcopylink"}];
const byKey=Object.fromEntries(LEVELS.map(x=>[x.key,x]));

function baseParticipationLabels(){
  const complimentary=businessComplimentaryAccessOpen();
  return {
    tierLabel: complimentary
      ? "Community Business — Complimentary through Oct. 15"
      : "Community Business — $150/year",
    statusLabel: complimentary
      ? "Complimentary Launch Access"
      : "Base Participation"
  };
}

function statusLabel(v){return ({free:"No Charge / Complimentary",pending:"Pending",active:"Active",past_due:"Past Due",cancelled:"Cancelled"})[v]||v||"Free"}
function frequencyLabel(v){return ({annual:"Annual",monthly:"Monthly installments",custom:"Custom",none:"None"})[v]||v||"None"}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false,error:"Method not allowed."})}
  const session=await getBusinessSession(req,res);
  if(!session)return;
  const {sql,business}=session;
  const baseLabels=baseParticipationLabels();
  const exists=await sql`SELECT to_regclass('public.hub_business_billing_accounts') AS t`;
  const trackingActive=Boolean(exists[0]?.t);
  if(!trackingActive){
    return res.status(200).json({
      ok:true,trackingActive:false,
      billing:{businessId:business.id,tier:"community_business",tierLabel:baseLabels.tierLabel,status:"free",statusLabel:baseLabels.statusLabel,frequency:"none",frequencyLabel:"None",amountDue:0,nextDueDate:null},
      activity:[],levels:LEVELS,
      feeDisclosure:{cardPaypal:"3.5% processing fee",ach:"No processing fee",monthly:"$2 per installment transaction"}
    });
  }
  const rows=await sql`SELECT * FROM hub_business_billing_accounts WHERE business_id=${business.id} LIMIT 1`;
  const row=rows[0]||null;
  const tier=row?.tier||"community_business";
  const activity=await sql`
    SELECT id,event_type,label,amount,status,reference,notes,occurred_at
    FROM hub_business_billing_activity
    WHERE business_id=${business.id}
    ORDER BY occurred_at DESC,created_at DESC
    LIMIT 100
  `;
  return res.status(200).json({
    ok:true,trackingActive:true,
    billing:{businessId:business.id,tier,tierLabel:byKey[tier]?.name||baseLabels.tierLabel,status:row?.status||"free",statusLabel:(!row?.status||row?.status==="free")?baseLabels.statusLabel:statusLabel(row?.status),frequency:row?.billing_frequency||"none",frequencyLabel:frequencyLabel(row?.billing_frequency||"none"),amountDue:Number(row?.amount_due||0),nextDueDate:row?.next_due_date||null,renewalDate:row?.renewal_date||null},
    activity,levels:LEVELS,
    feeDisclosure:{cardPaypal:"3.5% processing fee",ach:"No processing fee",monthly:"$2 per installment transaction"}
  });
}