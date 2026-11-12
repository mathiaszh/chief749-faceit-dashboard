import {ApiError} from './faceit.mjs';
const BASE='https://api-public.cs-prod.leetify.com';
export async function leetify(path,key,requestFetch=fetch){
 if(!key)throw new ApiError('LEETIFY_API_KEY mangler på serveren.',503);
 let response;
 try{response=await requestFetch(BASE+path,{headers:{Authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new ApiError('Leetify svarede ikke i tide.',504);}
 if(!response.ok){return {status:response.status,data:null};}
 if(path==='/api-key/validate')return {status:response.status,data:null};
 try{return {status:response.status,data:await response.json()};}catch{throw new ApiError('Leetify returnerede et ugyldigt svar.',502);}
}
export function availableFields(stats){return Object.entries(stats||{}).filter(([,value])=>typeof value==='number'&&Number.isFinite(value)).map(([key])=>key).sort();}
