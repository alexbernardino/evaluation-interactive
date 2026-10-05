export const defaults = {signal:'sine',amplitude:1,frequency:1,phase:0,offset:0,xmin:-1,xmax:1,noise:0.09,ntrain:60,ntest:100,repeats:100,degree:3,trainSeed:1729,testSeed:8251};
export const MAX_DEGREE=12;
export function rng(seed) { let a=seed>>>0; return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; }
export const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
export const variance=(a,ddof=1)=>{const m=mean(a);return a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-ddof);};
export function truth(x,c){const t=2*(x-c.xmin)/(c.xmax-c.xmin)-1;return c.offset+c.amplitude*(c.signal==='sine'?Math.sin(Math.PI*c.frequency*t+c.phase):c.signal==='quadratic'?t*t:t);}
export function sample(c,n,seed){const r=rng(seed);return Array.from({length:n},()=>{const x=c.xmin+(c.xmax-c.xmin)*r();const z=Math.sqrt(-2*Math.log(Math.max(1e-15,r())))*Math.cos(2*Math.PI*r());return {x,y:truth(x,c)+Math.sqrt(c.noise)*z};});}
export function basis(x,degree,lo,hi){const z=2*(x-lo)/(hi-lo)-1,v=[1];if(degree) v.push(z);for(let k=2;k<=degree;k++)v.push(((2*k-1)*z*v[k-1]-(k-1)*v[k-2])/k);return v;}
// Householder QR on a Legendre basis: same unregularized polynomial space,
// without forming X'X. Scaling uses the known simulation domain, not test data.
export function fit(data,degree,lo,hi){
 const n=data.length,p=degree+1;if(n<p)throw Error('Not enough training points for a unique polynomial fit.');
 const A=data.map(q=>basis(q.x,degree,lo,hi)),y=data.map(q=>q.y);
 for(let k=0;k<p;k++){
  let norm=0;for(let i=k;i<n;i++)norm=Math.hypot(norm,A[i][k]);
  if(norm<1e-11)throw Error('Numerically rank-deficient training set. Resample or reduce the degree.');
  const alpha=A[k][k]>=0?-norm:norm,v=Array.from({length:n-k},(_,i)=>A[k+i][k]);v[0]-=alpha;
  const scale=Math.sqrt(v.reduce((s,z)=>s+z*z,0));for(let i=0;i<v.length;i++)v[i]/=scale;
  for(let j=k;j<p;j++){let dot=0;for(let i=k;i<n;i++)dot+=v[i-k]*A[i][j];for(let i=k;i<n;i++)A[i][j]-=2*v[i-k]*dot;}
  let dot=0;for(let i=k;i<n;i++)dot+=v[i-k]*y[i];for(let i=k;i<n;i++)y[i]-=2*v[i-k]*dot;
 }
 const coef=Array(p).fill(0);for(let i=p-1;i>=0;i--){let s=y[i];for(let j=i+1;j<p;j++)s-=A[i][j]*coef[j];coef[i]=s/A[i][i];}
 return {coef,lo,hi};
}
export function predict(model,x){return basis(x,model.coef.length-1,model.lo,model.hi).reduce((s,v,i)=>s+v*model.coef[i],0);}
export function evaluate(model,data){const losses=data.map(p=>(p.y-predict(model,p.x))**2);return {mse:mean(losses),se:Math.sqrt(variance(losses)/losses.length),losses};}
export function decompose(predictions,target,noise){
 const average=target.map((_,j)=>mean(predictions.map(p=>p[j])));
 const pointVariance=target.map((_,j)=>mean(predictions.map(p=>(p[j]-average[j])**2)));
 const bias2=mean(target.map((v,j)=>(v-average[j])**2)),v=mean(pointVariance);
 return {average,pointVariance,bias2,variance:v,noise,total:bias2+v+noise};
}
export function validate(c){
 for(const key of Object.keys(defaults).filter(k=>k!=='signal'))if(!Number.isFinite(c[key]))throw Error('All numeric settings must be finite.');
 if(!['sine','linear','quadratic'].includes(c.signal))throw Error('Unknown signal.');
 if(c.xmax-c.xmin<0.01||Math.abs(c.xmin)>100||Math.abs(c.xmax)>100)throw Error('Use an x interval at least 0.01 wide, within −100 to 100.');
 for(const [k,lo,hi] of [['amplitude',0,5],['frequency',0.25,3],['phase',-6.3,6.3],['offset',-5,5],['noise',0,2],['ntrain',16,300],['ntest',10,1000],['repeats',20,200],['degree',0,12]]){
  if(c[k]<lo||c[k]>hi)throw Error(`${k} must be between ${lo} and ${hi}.`);
 }
 for(const k of ['ntrain','ntest','repeats','degree'])if(!Number.isInteger(c[k]))throw Error(`${k} must be an integer.`);
}
export function trainingExperiment(c){
 validate(c);
 const train=Array.from({length:c.repeats},(_,i)=>sample(c,c.ntrain,c.trainSeed+i*104729));
 const test=sample(c,c.ntest,c.testSeed),xs=Array.from({length:181},(_,i)=>c.xmin+(c.xmax-c.xmin)*i/180);
 const target=test.map(p=>truth(p.x,c)),curves=[],models=[];
 for(let d=0;d<=MAX_DEGREE;d++){
  const fits=train.map(t=>fit(t,d,c.xmin,c.xmax));models.push(fits);
  const pred=fits.map(f=>test.map(p=>predict(f,p.x)));
  const testScores=pred.map(p=>mean(p.map((v,j)=>(v-test[j].y)**2)));
  curves.push({degree:d,...decompose(pred,target,c.noise),train:mean(fits.map((f,i)=>evaluate(f,train[i]).mse)),test:mean(testScores),testVariance:variance(testScores)});
 }
 return {train,test,xs,curves,models};
}
export function selectedTraining(c,experiment){
 const models=experiment.models[c.degree],predictions=models.map(f=>experiment.xs.map(x=>predict(f,x)));
 return {predictions,...decompose(predictions,experiment.xs.map(x=>truth(x,c)),c.noise)};
}
export function testingExperiment(c,model){
 const sets=Array.from({length:c.repeats},(_,i)=>sample(c,c.ntest,c.testSeed+i*130363)),scores=sets.map(t=>evaluate(model,t));
 // Midpoint integration over the known uniform population; Gaussian observation
 // noise moments give the expected loss and its variance without extra noise draws.
 const n=4096;let e2=0,e4=0;
 for(let i=0;i<n;i++){const x=c.xmin+(c.xmax-c.xmin)*(i+.5)/n,d=truth(x,c)-predict(model,x);e2+=d*d/n;e4+=d**4/n;}
 const risk=e2+c.noise,lossVariance=Math.max(0,e4+6*c.noise*e2+3*c.noise*c.noise-risk*risk);
 return {sets,scores,mean:mean(scores.map(s=>s.mse)),variance:variance(scores.map(s=>s.mse)),risk,expectedSE:Math.sqrt(lossVariance/c.ntest)};
}
