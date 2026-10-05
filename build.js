import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('dist',{recursive:true});
for(const file of ['index.html','styles.css','app.js','model.js','axes.js','worker.js','qr-evaluation-interactive.png'])copyFileSync(file,'dist/'+file);
const html=readFileSync('dist/index.html','utf8').replace('Local development version','Version: '+new Date().toISOString().replace('T',' ').slice(0,19)+' UTC');
writeFileSync('dist/index.html',html);writeFileSync('dist/.nojekyll','');
