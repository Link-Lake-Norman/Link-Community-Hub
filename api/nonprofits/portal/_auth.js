import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const COOKIE='link_nonprofit_session';
const clean=(v,m=500)=>String(v??'').trim().slice(0,m);
const hash=t=>crypto.createHash('sha256').update(String(t||'')).digest('hex');
const random=(n=32)=>crypto.randomBytes(n).toString('base64url');

export function sql(){if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.'); return neon(process.env.DATABASE_URL);}
export function fail(res,status,error){res.status(status).json({ok:false,error});}
export function noStore(res){res.setHeader('Cache-Control','no-store, max-age=0');}
export function parse(req){return typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});}
export function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v,180));}
export function token(){return random(36);}
export function tokenHash(v){return hash(v);}
export function baseUrl(req){const proto=clean(req.headers['x-forwarded-proto'],20)||'https';const host=clean(req.headers['x-forwarded-host']||req.headers.host,300);if(process.env.VERCEL_ENV==='preview'&&host)return `${proto}://${host}`;return clean(process.env.LINK_PUBLIC_URL,500)|| (host?`${proto}://${host}`:'https://www.linkcommunityhub.com');}
function cookie(req){for(const p of String(req.headers.cookie||'').split(';')){const [k,...rest]=p.trim().split('=');if(k===COOKIE)return decodeURIComponent(rest.join('='));}return '';}
export function setCookie(res,value){res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);}
export function clearCookie(res){res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);}
export async function session(req,res){if(!process.env.DATABASE_URL){fail(res,503,'LINK nonprofit services are temporarily unavailable.');return null;}const raw=cookie(req);if(!raw){fail(res,401,'Please sign in to your nonprofit account.');return null;}const db=sql();const rows=await db`
SELECT s.organization_id,s.contact_id,o.display_name,o.slug,o.approval_status,o.claim_status,o.public_status,o.active,o.service_area_verified,c.full_name,c.email,c.phone
FROM hub_nonprofit_portal_sessions s
JOIN organizations o ON o.id=s.organization_id
JOIN organization_contacts c ON c.id=s.contact_id
WHERE s.token_hash=${hash(raw)} AND s.expires_at>now() AND o.active=true AND o.approval_status='approved' AND o.claim_status='approved' AND o.service_area_verified=true LIMIT 1`;
if(!rows.length){clearCookie(res);fail(res,401,'Your LINK nonprofit session has expired.');return null;}return {db,org:rows[0]};}
