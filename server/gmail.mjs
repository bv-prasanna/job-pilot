import {randomBytes,createHash} from 'node:crypto';
export function makeAuthorization({clientId,redirectUri,state=randomBytes(24).toString('hex'),verifier=randomBytes(48).toString('base64url')}={}){
 if(!clientId||!redirectUri||!redirectUri.startsWith('http'))throw Error('Google OAuth configuration missing');
 const challenge=createHash('sha256').update(verifier).digest('base64url');
 const q=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:'https://www.googleapis.com/auth/gmail.send',access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'});
 return {url:'https://accounts.google.com/o/oauth2/v2/auth?'+q,verifier,state};
}
export async function tokenExchange({clientId,clientSecret,redirectUri,code,verifier,refreshToken,fetcher=fetch}={}){
 if(!clientId||!clientSecret||!redirectUri||(!code&&!refreshToken))throw Error('Missing OAuth configuration');
 const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,...(code?{grant_type:'authorization_code',code,redirect_uri:redirectUri,code_verifier:verifier}:{grant_type:'refresh_token',refresh_token:refreshToken})});
 const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('OAuth token request failed');
 const result=await r.json();if(!result.access_token)throw Error('OAuth did not return an access token');return result;
}
const cleanHeader=value=>String(value||'').replace(/[\r\n\0]/g,' ').trim();
export function encodeMessage({to,subject,body}){
 const address=cleanHeader(to);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||address.length>254)throw Error('Invalid recipient');
 if(!subject||!String(body||'').trim())throw Error('Subject and body required');
 const s=cleanHeader(subject);if(s.length>300||String(body).length>10000)throw Error('Message exceeds limits');
 const encodedSubject='=?UTF-8?B?'+Buffer.from(s).toString('base64')+'?=';
 const normalizedBody=String(body).replace(/\r?\n/g,'\r\n');
 const mail=`To: ${address}\r\nSubject: ${encodedSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(normalizedBody).toString('base64')}\r\n`;
 return Buffer.from(mail).toString('base64url');
}
export async function sendApproved({accessToken,message,approved=false,fetcher=fetch}={}){
 if(!approved)throw Error('Explicit approval is required');
 if(!accessToken)throw Error('Gmail token missing');
 const raw=encodeMessage(message);
 const result=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(10000)});
 if(!result.ok)throw Error('Gmail send failed');
 const data=await result.json();if(!data.id)throw Error('Gmail response missing message ID');return {id:data.id,threadId:data.threadId};
}