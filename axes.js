export const initialSummaryAxes=()=>({training:{xmin:0,xmax:12,ymin:0,ymax:1},testing:{xmin:0,xmax:.25,ymin:0,ymax:40}});
export function resolveAxes(current,candidate,autoFit){return {...(autoFit?candidate:current)};}
export function histogram(values,bounds,count=18){
 const bins=Array(count).fill(0);let outside=0;
 for(const x of values){if(x<bounds.xmin||x>bounds.xmax){outside++;continue;}bins[Math.min(count-1,Math.floor((x-bounds.xmin)/(bounds.xmax-bounds.xmin)*count))]++;}
 return {bins,outside};
}
export function fittedSummaryAxes(mode,result){
 if(mode==='training'){const max=Math.max(...result.curves.flatMap(r=>['train','test','bias2','variance','noise'].map(k=>r[k])));return {xmin:0,xmax:12,ymin:0,ymax:Math.max(.01,max*1.08)};}
 const values=result.testing.scores.map(s=>s.mse),lo=Math.min(...values,result.testing.risk),hi=Math.max(...values,result.testing.risk),pad=Math.max(1e-8,hi-lo)*.06;
 const bounds={xmin:Math.max(0,lo-pad),xmax:hi+pad,ymin:0,ymax:1};
 bounds.ymax=Math.max(4,Math.ceil(Math.max(...histogram(values,bounds).bins)*1.1/4)*4);return bounds;
}
