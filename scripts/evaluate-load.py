"""Run synthetic packed contexts on the shipped ONNX weights. Not a coaching validation."""
from pathlib import Path
import json, time
import numpy as np
import onnxruntime as ort
root=Path(__file__).resolve().parent.parent
cases=json.loads((root/'.expo/load-scenarios.json').read_text())
options=ort.SessionOptions(); options.intra_op_num_threads=2
encoder=ort.InferenceSession(str(root/'assets/models/encoder.onnx'),options)
head=ort.InferenceSession(str(root/'assets/models/head.onnx'),options)
config=json.loads((root/'assets/models/config.layajson').read_text())
scale=max(.5,min(5,config['temperature_by_options']['choice:2']))
results=[]
for case in cases:
 start=time.perf_counter();ids=np.array([case['ids']],dtype=np.int64);mask=np.ones_like(ids)
 hidden=encoder.run(None,{'input_ids':ids,'attention_mask':mask})[0]
 logits=head.run(None,{'hidden_states':hidden,'marker_pos':np.array([case['markers']],dtype=np.int64),'marker_mask':np.ones((1,len(case['markers'])),dtype=bool),'qtype':np.array([[0]],dtype=np.int64),'attention_mask':mask})[0][0][:len(case['candidates'])]
 probs=np.exp((logits-logits.max())/scale);probs/=probs.sum()
 assert np.isfinite(probs).all() and abs(float(probs.sum())-1)<1e-5
 result={'name':case['name'],'tokens':len(case['ids']),'seconds':round(time.perf_counter()-start,3),'probabilities':dict(zip(case['candidates'],map(float,probs)))}
 results.append(result);print(json.dumps(result),flush=True)
(root/'.expo/load-evaluation.json').write_text(json.dumps(results,indent=2)+'\n')
