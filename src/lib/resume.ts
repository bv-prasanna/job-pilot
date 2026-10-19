/** Extract resume text entirely in the user's browser. No upload to a server. */
export async function extractResumeText(file:File):Promise<string>{
 if(!file||file.size===0||file.size>8*1024*1024)throw Error('Choose a resume smaller than 8 MB.');
 const name=file.name.toLowerCase();
 if(/\.(txt|md)$/i.test(name))return (await file.text()).slice(0,60000);
 if(name.endsWith('.docx')){
  const mammoth=await import('mammoth/mammoth.browser');
  const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
  if(!result.value?.trim())throw Error('No readable text in this DOCX. Paste the resume text manually.');
  return result.value.slice(0,60000);
 }
 if(name.endsWith('.pdf')){
  const pdfjs=await import('pdfjs-dist');
  const workerUrl=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc=workerUrl.default;
  const document=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
  try{
   const lines:string[]=[];
   for(let n=1;n<=Math.min(document.numPages,25);n++){
    const page=await document.getPage(n);
    const text=await page.getTextContent();
    lines.push(text.items.map(item=>'str' in item?String(item.str):'').join(' '));
   }
   const result=lines.join('\n').trim();
   if(!result)throw Error('This PDF may be scanned. Paste OCR text to search.');
   return result.slice(0,60000);
  }finally{await document.destroy();}
 }
 if(name.endsWith('.doc'))throw Error('Legacy .doc is not supported for text extraction; save it as .docx or PDF.');
 throw Error('Select a PDF, DOCX, TXT or MD resume.');
}
