import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSummaryAxes,resolveAxes,histogram,fittedSummaryAxes} from '../axes.js';
test('summary axes remain locked when new results change their extent',()=>{const initial=initialSummaryAxes().training,candidate={...initial,ymax:100};assert.deepEqual(resolveAxes(initial,candidate,false),initial);assert.deepEqual(resolveAxes(initial,candidate,true),candidate);});
test('turning auto-fit off freezes the last fitted limits',()=>{const initial=initialSummaryAxes().training,fitted=resolveAxes(initial,{...initial,ymax:5},true);assert.equal(resolveAxes(fitted,{...initial,ymax:20},false).ymax,5);});
test('each experiment has independent limits and defaults are fresh objects',()=>{const a=initialSummaryAxes();a.training.ymax=25;assert.equal(a.testing.ymax,40);assert.equal(initialSummaryAxes().training.ymax,1);});
test('histogram excludes out-of-view samples instead of folding them into end bins',()=>{const h=histogram([-1,0,.1,1,2],{xmin:0,xmax:1},10);assert.equal(h.outside,2);assert.equal(h.bins.reduce((a,b)=>a+b),3);assert.equal(h.bins[9],1);});
test('fit histogram includes all samples and population risk with integer count ceiling',()=>{const result={testing:{scores:[{mse:2},{mse:2},{mse:5}],risk:8}};const b=fittedSummaryAxes('testing',result);assert.ok(b.xmin<2&&b.xmax>8);assert.equal(b.ymax%4,0);assert.equal(histogram(result.testing.scores.map(s=>s.mse),b).outside,0);});
