import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('interpretation distinguishes predictor variance from test-score variability',()=>{
 assert.match(html,/Predictor variance across training sets/);
 assert.match(app,/Variability of test MSE/);
 assert.match(app,/More test observations improve evaluation precision, not the fitted predictor/);
});
test('decomposition assumptions and CV caveats are explicit',()=>{
 assert.match(html,/E\[ε \| X = x\] = 0/);
 assert.match(html,/independent of the training data/);
 assert.match(html,/not Gaussianity/);
 assert.match(html,/fold SD \/ √K is not generally a valid standard error/);
 assert.match(html,/not universal monotonic rules/);
});
