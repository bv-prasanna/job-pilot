export type IndiaEligibility={status:'eligible'|'excluded'|'unknown';reason:string};
export function indiaEligibility(location?:string,description?:string,title?:string):IndiaEligibility;
