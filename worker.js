import {trainingExperiment,selectedTraining,testingExperiment} from './model.js';
let cache,key;
self.onmessage=({data:{id,config:c}})=>{try{
 const k=JSON.stringify({...c,degree:0});
 if(k!==key){cache=trainingExperiment(c);key=k;}
 self.postMessage({id,result:{...cache,selected:selectedTraining(c,cache),testing:testingExperiment(c,cache.models[c.degree][0])}});
}catch(e){self.postMessage({id,error:e.message});}};
