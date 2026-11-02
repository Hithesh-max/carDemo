// Capture the actual generated Lighthouse reports for the academic template.
import {chromium} from 'playwright';
import {readdirSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
mkdirSync('docs/audits/screenshots',{recursive:true});
const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{const p=await b.newPage({viewport:{width:1280,height:1000}});for(const file of readdirSync('docs/audits').filter(f=>f.endsWith('.html'))){await p.goto(pathToFileURL(path.resolve('docs/audits',file)).href);await p.waitForSelector('.lh-root');await p.screenshot({path:`docs/audits/screenshots/${file.replace('.html','.png')}`});console.log(file);}}finally{await b.close();}
