export interface QuickApplyMatch {score:number|null;matched:string[];missing:string[];analyzed:number}
export interface QuickApplyDraft {to:string;subject:string;body:string;match:QuickApplyMatch|null}
export interface QuickApplyInput {email:string;role:string;company?:string;jd?:string;resumeText?:string;sender?:string}
export function quickApplyDraft(input:QuickApplyInput):QuickApplyDraft;
export function gmailRawWithAttachment(input:{to:string;subject:string;body:string;file:File}):Promise<string>;
