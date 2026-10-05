import {defaults,truth,predict,evaluate,validate} from './model.js';
import {initialSummaryAxes,resolveAxes,histogram,fittedSummaryAxes} from './axes.js';
const $=id=>document.getElementById(id),colors={truth:'#172033',fit:'#2854c5',average:'#cb5346',variance:'#8758ab',bias:'#ab790e',train:'#14846c',test:'#cb5346',noise:'#88929f'};
let config={...defaults},result=null,mode='training',sampleIndex=0,probeX=0,requestId=0,timer,domain={xmin:-1,xmax:1,ymin:-2,ymax:2},plotView,summaryView;
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
let summaryAxes=initialSummaryAxes();
const summaryAuto={training:false,testing:false};
// Keep secondary reading and display settings in the independently scrolling pane.
const reading=document.createElement('section');reading.className='reading';reading.innerHTML='<h3>Display &amp; interpretation</h3>';
for(const element of [document.querySelector('.plot-options'),$('degree-buttons'),$('probe'),$('protocol'),$('summary-note'),document.querySelector('.explanation'),document.querySelector('.methodology')])reading.append(element);
document.querySelector('.controls').append(reading);
const fmt=v=>!Number.isFinite(v)?'—':v===0?'0':Math.abs(v)>=1e4||Math.abs(v)<.001?v.toExponential(2):Number(v.toPrecision(4)).toString();
const sliders=[['amplitude','Amplitude A',0,5,.1,'signal-controls'],['frequency','Cycles ν',.25,3,.05,'signal-controls'],['phase','Phase φ (radians)',-6.3,6.3,.1,'signal-controls'],['offset','Offset c',-5,5,.1,'signal-controls'],['degree','Polynomial degree d',0,12,1,'data-controls'],['noise','Noise variance σ²',0,2,.01,'data-controls'],['ntrain','Training size n',16,300,1,'data-controls'],['ntest','Test size m',10,1000,1,'data-controls'],['repeats','Repetitions B',20,200,1,'repeat-controls']];
for(const [id,label,min,max,step,parent] of sliders){
 const div=document.createElement('div');div.className='slider-control';div.innerHTML=`<label for="${id}">${label}<input id="${id}" type="number" min="${min}" max="${max}" step="${step}" value="${config[id]}"></label><input id="${id}-range" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${config[id]}">`;
 $(parent).append(div);
 for(const suffix of ['', '-range'])$(id+suffix).addEventListener('input',e=>{$(id+(suffix?'':'-range')).value=e.target.value;config[id]=e.target.value===''?NaN:Number(e.target.value);schedule();});
}
for(const id of ['signal','xmin','xmax'])$(id).addEventListener('input',()=>{config[id]=id==='signal'?$(id).value:$(id).value===''?NaN:Number($(id).value);schedule();});
for(let d=0;d<=12;d++){const b=document.createElement('button');b.textContent=d;b.setAttribute('aria-label',`Select polynomial degree ${d}`);b.onclick=()=>setDegree(d);$('degree-buttons').append(b);}
function setDegree(d){config.degree=Math.min(12,Math.max(0,d));$('degree').value=$('degree-range').value=config.degree;schedule();}
function schedule(){clearTimeout(timer);requestId++;$('error').hidden=true;$('status').textContent='Updating experiments…';document.body.classList.add('busy');timer=setTimeout(compute,140);}
function compute(){try{validate(config);worker.postMessage({id:requestId,config:{...config}});}catch(e){fail(e.message);}}
function fail(message){result=null;$('error').textContent=message;$('error').hidden=false;$('status').textContent='Correct the settings to continue.';$('metrics').replaceChildren();$('detail').textContent='';$('probe').textContent='';document.body.classList.remove('busy');for(const id of ['data-plot','summary-plot']){const c=$(id);c.getContext('2d').clearRect(0,0,c.width,c.height);}}
worker.onmessage=({data})=>{if(data.id!==requestId)return;if(data.error){fail(data.error);return;}result=data.result;sampleIndex=Math.min(sampleIndex,config.repeats-1);$('sample').max=config.repeats;$('sample').value=sampleIndex+1;document.body.classList.remove('busy');$('status').textContent=`${config.repeats} independent fits per degree · training seed ${config.trainSeed} · test seed ${config.testSeed}`;if($('autofit').checked)fitAxes();render();};
worker.onerror=()=>fail('The simulation worker could not run. Open the demo through a local web server, not as a file.');
function switchMode(next){mode=next;sampleIndex=0;$('sample').value=1;$('summary-autofit').checked=summaryAuto[mode];if($('autofit').checked)fitAxes();render();}
$('training-tab').onclick=()=>switchMode('training');$('testing-tab').onclick=()=>switchMode('testing');
$('resample-train').onclick=()=>{config.trainSeed+=1000003;schedule();};$('resample-test').onclick=()=>{config.testSeed+=1000033;schedule();};$('resample-all').onclick=()=>{config.trainSeed+=1000003;config.testSeed+=1000033;schedule();};
$('defaults').onclick=()=>{config={...defaults};for(const [id] of sliders)$(id).value=$(id+'-range').value=config[id];for(const id of ['signal','xmin','xmax'])$(id).value=config[id];sampleIndex=0;probeX=0;domain={xmin:-1,xmax:1,ymin:-2,ymax:2};summaryAxes=initialSummaryAxes();summaryAuto.training=summaryAuto.testing=false;$('summary-autofit').checked=false;$('autofit').checked=false;schedule();};
$('sample').oninput=()=>{sampleIndex=Number($('sample').value)-1;if($('autofit').checked)fitAxes();render();};for(const id of ['show-ensemble','show-points','log'])$(id).onchange=()=>render();
$('fit').onclick=()=>{fitAxes();render();};$('autofit').onchange=()=>{if($('autofit').checked)fitAxes();render();};
$('summary-fit').onclick=()=>{if(!result||document.body.classList.contains('busy'))return;summaryAxes[mode]=fittedSummaryAxes(mode,result);render();};
$('summary-autofit').onchange=()=>{summaryAuto[mode]=$('summary-autofit').checked;render();};
function fitAxes(){if(!result||document.body.classList.contains('busy'))return;const training=mode==='training';const ys=[...(training?result.test:result.testing.sets[sampleIndex]).map(p=>p.y),...result.train[training?sampleIndex:0].map(p=>p.y),...result.xs.map(x=>truth(x,config)),...(training?result.selected.predictions.flat():result.selected.predictions[0])];let min=Infinity,max=-Infinity;for(const y of ys){min=Math.min(min,y);max=Math.max(max,y);}const pad=Math.max(.2,(max-min)*.08);domain={xmin:config.xmin,xmax:config.xmax,ymin:min-pad,ymax:max+pad};}
function metric(label,value,color,extra=''){return `<div class="metric" style="--metric:${color}"><span>${label}</span><b>${fmt(value)}</b><small>${extra}</small></div>`;}
function legend(id,items){$(id).innerHTML=items.map(([label,c])=>`<span style="--color:${c}">${label}</span>`).join('');}
function render(){
 const training=mode==='training';$('training-tab').setAttribute('aria-pressed',training);$('testing-tab').setAttribute('aria-pressed',!training);
 $('formula').textContent=config.signal==='sine'?'f(x) = c + A sin(πνt + φ)':config.signal==='quadratic'?'f(x) = c + A t²':'f(x) = c + A t';for(const id of ['frequency','phase'])$(id).closest('.slider-control').hidden=config.signal!=='sine';
 $('protocol').textContent=training?'Vary the training set; keep the same test inputs and labels for every fitted model.':'Freeze predictor #1; vary only the independent test samples used to evaluate it. Changing training settings or degree creates a new fixed predictor.';
 $('ensemble-control').hidden=!training;$('log-control').hidden=!training;$('degree-buttons').hidden=!training;$('sample-value').textContent=sampleIndex+1;
 $('plot-kicker').textContent=training?'Predictor variance':'A fixed fitted predictor';$('plot-title').textContent=training?'Data & fitted models':'Data & fixed predictor';
 $('secondary-kicker').textContent=training?'Model complexity':'Variability of test MSE';$('secondary-title').textContent=training?'Error vs. degree':'Test MSE distribution';
 $('summary-plot').setAttribute('aria-label',training?'Error versus polynomial degree. Click a degree or use arrow keys to select it.':'Histogram of MSE across independent test sets for the same fixed predictor.');
 if(!result||document.body.classList.contains('busy'))return;
 const s=result.curves[config.degree],t=result.testing,score=t.scores[sampleIndex];
 if(training){
  $('metrics').innerHTML=metric('Bias²',s.bias2,colors.bias,'Fixed test inputs')+metric('Predictor variance',s.variance,colors.variance)+metric('Noise σ²',s.noise,colors.noise,'Irreducible noise')+metric('Expected MSE',s.total,colors.test,'Bias² + variance + noise');
  legend('data-legend',[['True signal (dashed)',colors.truth],['Individual fits',colors.fit],['Average predictor',colors.average],['±1 predictor SD',colors.variance],['Training: filled',colors.train],['Fixed test: hollow',colors.test]]);
  legend('summary-legend',[['Mean training MSE',colors.train],['Mean fixed-test MSE',colors.test],['Bias²',colors.bias],['Predictor variance',colors.variance],['Noise σ²',colors.noise]]);
  $('summary-note').textContent='Click a degree to select it. All degrees use the same sampled datasets. The noisy fixed-test MSE need not equal bias² + variance + σ² on a finite sample. Bias and variance need not change monotonically with degree.';
  $('detail-title').textContent='Bias is a displacement. Variance is a spread.';
  $('detail').innerHTML=`<p>At degree <b>${config.degree}</b>: average training MSE <b>${fmt(s.train)}</b>; average MSE on the fixed test set <b>${fmt(s.test)}</b>. Across fitted models, that fixed-test MSE has variance <b>${fmt(s.testVariance)}</b> (SD ${fmt(Math.sqrt(s.testVariance))}). This is different from the pointwise predictor variance above. The displayed training sample is #${sampleIndex+1}; the highlighted blue curve is its fit.</p><p>The red average and purple spread come from all ${config.repeats} fits. The cards average over the ${config.ntest} fixed test inputs. Increasing B improves the Monte Carlo estimate; it does not give each model more training data. Increasing test size changes the evaluation inputs, not the fitted models or their underlying predictor variance.</p>`;
 }else{
  $('metrics').innerHTML=metric('Displayed test MSE',score.mse,colors.test,`Test sample #${sampleIndex+1}, m = ${config.ntest}`)+metric('Estimated SE · this set',score.se,colors.bias,'Sample loss SD / √m')+metric('MSE variance · across sets',t.variance,colors.variance,`SD = ${fmt(Math.sqrt(t.variance))}`)+metric('Expected SE · known population',t.expectedSE,colors.fit,'Numerical integration reference');
  legend('data-legend',[['True signal (dashed)',colors.truth],['Fixed predictor #1',colors.fit],['Training #1: filled',colors.train],['Current test: hollow',colors.test]]);
  legend('summary-legend',[['Test MSE counts',colors.fit],['Reference population risk',colors.truth],['Displayed test MSE',colors.test]]);
  $('summary-note').textContent=`Across ${config.repeats} independent test sets: mean MSE ${fmt(t.mean)}; SD ${fmt(Math.sqrt(t.variance))}. Population risk ≈ ${fmt(t.risk)}. The predictor is never refitted in this histogram.`;
  $('detail-title').textContent='Uncertainty of a score is not uncertainty of a predictor.';
  $('detail').innerHTML=`<p>For test sample #${sampleIndex+1}: MSE <b>${fmt(score.mse)}</b> ± <b>${fmt(1.96*score.se)}</b>, giving an approximate 95% interval <b>[${fmt(Math.max(0,score.mse-1.96*score.se))}, ${fmt(score.mse+1.96*score.se)}]</b> for this fixed predictor’s population risk. This is a large-sample approximation, not a guaranteed interval.</p><p>The expected variance of test MSE is <b>${fmt(t.expectedSE**2)}</b>. Doubling test size halves that variance; quadrupling test size halves its standard error. More test observations improve evaluation precision, not the fitted predictor or its stability across training samples. More repetitions B estimate the distribution better, but do not improve a single test set.</p>`;
 }
 [...$('degree-buttons').children].forEach((b,d)=>b.setAttribute('aria-pressed',d===config.degree));drawData();training?drawComplexity():drawHistogram();
}
function setup(id,bounds,xlabel,ylabel,log=false){
 const canvas=$(id),w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
 const compact=w<350||h<220;
 const left=compact?40:55,right=w-9,top=12,bottom=h-(compact?27:37),X=x=>left+(x-bounds.xmin)/(bounds.xmax-bounds.xmin)*(right-left),Y=y=>bottom-(y-bounds.ymin)/(bounds.ymax-bounds.ymin)*(bottom-top);
 ctx.font=`${compact?8:10}px system-ui`;ctx.lineWidth=1;ctx.fillStyle='#667085';
 canvas.dataset.axes=JSON.stringify(bounds);
 const tick=value=>!compact?fmt(value):value===0?'0':Math.abs(value)>=1000||Math.abs(value)<.01?value.toExponential(0):String(Number(value.toPrecision(2)));
 for(let i=0;i<=4;i++){const v=bounds.ymin+(bounds.ymax-bounds.ymin)*i/4,y=Y(v);ctx.strokeStyle='#e4e0d8';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.textAlign='right';ctx.fillText(tick(log?10**v-1:v),left-6,y+3);}
 const xTicks=w<220?2:4;
 for(let i=0;i<=xTicks;i++){const x=bounds.xmin+(bounds.xmax-bounds.xmin)*i/xTicks;ctx.strokeStyle='#eeeae3';ctx.beginPath();ctx.moveTo(X(x),top);ctx.lineTo(X(x),bottom);ctx.stroke();ctx.textAlign='center';ctx.fillText(tick(x),X(x),bottom+17);}
 ctx.fillStyle='#45516a';ctx.textAlign='center';ctx.fillText(xlabel,(left+right)/2,h-3);ctx.save();ctx.translate(compact?8:12,(top+bottom)/2);ctx.rotate(-Math.PI/2);ctx.fillText(ylabel,0,0);ctx.restore();
 return {ctx,w,h,left,right,top,bottom,X,Y,bounds};
}
function line(v,xs,ys,color,width=2,dash=[]){const {ctx,X,Y}=v;ctx.save();ctx.beginPath();ctx.rect(v.left,v.top,v.right-v.left,v.bottom-v.top);ctx.clip();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();xs.forEach((x,i)=>{const yy=Math.max(-1e6,Math.min(1e6,Y(ys[i])));i?ctx.lineTo(X(x),yy):ctx.moveTo(X(x),yy);});ctx.stroke();ctx.restore();}
function points(v,data,color,filled){const {ctx,X,Y}=v;ctx.save();ctx.beginPath();ctx.rect(v.left,v.top,v.right-v.left,v.bottom-v.top);ctx.clip();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.2;for(const p of data){ctx.beginPath();ctx.arc(X(p.x),Y(p.y),3,0,Math.PI*2);filled?ctx.fill():ctx.stroke();}ctx.restore();}
function drawData(){
 const v=setup('data-plot',domain,'Input x','Response y'),{ctx,X,Y}=v;plotView=v;const xs=result.xs,sel=result.selected;
 if(mode==='training'){
  ctx.save();ctx.beginPath();ctx.rect(v.left,v.top,v.right-v.left,v.bottom-v.top);ctx.clip();ctx.fillStyle='#8758ab22';ctx.beginPath();xs.forEach((x,i)=>{const y=Math.max(-1e6,Math.min(1e6,Y(sel.average[i]+Math.sqrt(sel.pointVariance[i]))));i?ctx.lineTo(X(x),y):ctx.moveTo(X(x),y);});for(let i=xs.length-1;i>=0;i--)ctx.lineTo(X(xs[i]),Math.max(-1e6,Math.min(1e6,Y(sel.average[i]-Math.sqrt(sel.pointVariance[i])))));ctx.closePath();ctx.fill();ctx.restore();
  if($('show-ensemble').checked)sel.predictions.forEach(p=>line(v,xs,p,'#2854c524',1));
  line(v,xs,sel.predictions[sampleIndex],colors.fit,2);line(v,xs,sel.average,colors.average,2.8);
 }else line(v,xs,xs.map(x=>predict(result.models[config.degree][0],x)),colors.fit,2.8);
 line(v,xs,xs.map(x=>truth(x,config)),colors.truth,2,[5,4]);
 if($('show-points').checked){points(v,mode==='training'?result.train[sampleIndex]:result.train[0],colors.train,true);points(v,mode==='training'?result.test:result.testing.sets[sampleIndex],colors.test,false);}
 probeX=Math.min(config.xmax,Math.max(config.xmin,probeX));const j=Math.round((probeX-config.xmin)/(config.xmax-config.xmin)*(xs.length-1));
 line(v,[probeX,probeX],[domain.ymin,domain.ymax],'#667085',1,[2,4]);
 $('probe').textContent=mode==='training'?`At x ≈ ${fmt(xs[j])}: bias = ${fmt(sel.average[j]-truth(xs[j],config))} · variance = ${fmt(sel.pointVariance[j])} · predictor SD = ${fmt(Math.sqrt(sel.pointVariance[j]))}`:`At x = ${fmt(probeX)}: f(x) = ${fmt(truth(probeX,config))} · prediction = ${fmt(predict(result.models[config.degree][0],probeX))}`;
 const current=mode==='training'?sel.predictions.flat():sel.predictions[0];const clipped=current.some(y=>y<domain.ymin||y>domain.ymax)||config.xmin<domain.xmin||config.xmax>domain.xmax;
 if(clipped){ctx.fillStyle='#963421';ctx.textAlign='left';ctx.font='10px system-ui';ctx.fillText('Outside view · use Fit axes',v.left+6,v.top+13);}
}
function summaryBounds(){summaryAxes[mode]=resolveAxes(summaryAxes[mode],fittedSummaryAxes(mode,result),summaryAuto[mode]);return summaryAxes[mode];}
function outsideNotice(v,visible){if(!visible)return;v.ctx.fillStyle='#963421';v.ctx.textAlign='left';v.ctx.font='9px system-ui';v.ctx.fillText('Outside view · Fit axes',v.left+4,v.top+11);}
function drawComplexity(){const log=$('log').checked,transform=x=>log?Math.log10(1+x):x,items=[['train',colors.train],['test',colors.test],['bias2',colors.bias],['variance',colors.variance],['noise',colors.noise]],raw=summaryBounds();const v=setup('summary-plot',{...raw,ymin:transform(raw.ymin),ymax:transform(raw.ymax)},'Degree d',log?'MSE (log scale)':'MSE',log);summaryView=v;const xs=result.curves.map(p=>p.degree);for(const [key,c] of items)line(v,xs,result.curves.map(p=>transform(p[key])),c,2,key==='noise'?[4,3]:[]);line(v,[config.degree,config.degree],[0,v.bounds.ymax],'#172033',1,[3,4]);for(const [key,c] of items)points(v,[{x:config.degree,y:transform(result.curves[config.degree][key])}],c,true);outsideNotice(v,result.curves.some(r=>items.some(([k])=>r[k]>raw.ymax)));}
function drawHistogram(){const t=result.testing,values=t.scores.map(s=>s.mse),bounds=summaryBounds(),{bins,outside}=histogram(values,bounds),{xmin,xmax}=bounds;const v=setup('summary-plot',bounds,'Test-set MSE','Test sets');summaryView=v;const {ctx,X,Y}=v;ctx.save();ctx.beginPath();ctx.rect(v.left,v.top,v.right-v.left,v.bottom-v.top);ctx.clip();ctx.fillStyle='#2854c580';bins.forEach((n,i)=>{const x=xmin+i*(xmax-xmin)/18;ctx.fillRect(X(x)+1,Y(n),(v.right-v.left)/18-2,v.bottom-Y(n));});ctx.restore();line(v,[t.risk,t.risk],[0,v.bounds.ymax],colors.truth,2,[4,3]);const val=values[sampleIndex];line(v,[val,val],[0,v.bounds.ymax],colors.test,2);outsideNotice(v,outside>0||bins.some(n=>n>bounds.ymax)||t.risk<bounds.xmin||t.risk>bounds.xmax);}
$('data-plot').onclick=e=>{if(!result||!plotView)return;const rect=e.currentTarget.getBoundingClientRect(),v=plotView;probeX=v.bounds.xmin+(e.clientX-rect.left-v.left)/(v.right-v.left)*(v.bounds.xmax-v.bounds.xmin);drawData();};
$('data-plot').onkeydown=e=>{if(!result||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();probeX+=(e.key==='ArrowLeft'?-1:1)*(config.xmax-config.xmin)/180;drawData();};
$('summary-plot').onclick=e=>{if(!result||mode!=='training')return;const v=summaryView,rect=e.currentTarget.getBoundingClientRect();setDegree(Math.round(12*(e.clientX-rect.left-v.left)/(v.right-v.left)));};
$('summary-plot').onkeydown=e=>{if(mode!=='training'||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();setDegree(config.degree+(e.key==='ArrowLeft'?-1:1));};
const resizeObserver=new ResizeObserver(()=>{if(result)render();});
for(const el of document.querySelectorAll('.plot-card'))resizeObserver.observe(el);
render();compute();
