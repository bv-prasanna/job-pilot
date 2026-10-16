import {createApp} from './app.mjs';
const port=Number(process.env.PORT||8787);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
createApp({file:process.env.JOBPILOT_DATA_FILE||'./data/jobpilot.json'}).listen(port,process.env.HOST||'127.0.0.1');
console.log('JobPilot API listening on '+port);
