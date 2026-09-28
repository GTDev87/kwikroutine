"""Real-text ONNX parity and tokenizer fixtures; not an exercise-safety validation."""
from pathlib import Path
import json
import time
import numpy as np
import onnxruntime as ort
from transformers import PreTrainedTokenizerFast
from laya.common import build_sequence
root = Path(__file__).resolve().parent.parent
out = root / 'assets/models'
source = root / '.model-build'
tok = PreTrainedTokenizerFast(tokenizer_file=str(source / 'tokenizer.json'), cls_token='[CLS]', sep_token='[SEP]', pad_token='[PAD]', mask_token='[MASK]', unk_token='[UNK]')
question = {'t': 'choice', 'ins': 'Which exercise best fits the user next?', 'crit': {
 'body-squat': 'Bodyweight squat; squat; quads, glutes', 'wall-pushup': 'Wall push-up; push; chest',
 'standing-hinge': 'Standing hip hinge; hinge; hamstrings, glutes', 'prone-w': 'Prone W raise; pull; back',
 'dead-bug': 'Dead bug; core; core', 'calf-raise': 'Standing calf raise; accessory; calves'}}
states = [
 'The user is a beginner who wants an enjoyable full body workout. All options fit their equipment and soreness restrictions. They have not exercised today. Choose a comfortable starting movement.',
 'The user is a beginner exercising in their bedroom. They just completed bodyweight squats and standing calf raises. Favor a different movement pattern for variety and balance.',
 'The user has already done wall push-ups and prone W raises today. They would enjoy training their legs next. All candidates are eligible.',
 'A familiar move or something new? The user prefers simple, controlled movements. Their last session included dead bugs, calf raises, and squats. They are looking for a little variety today.',
]
options = ort.SessionOptions(); options.intra_op_num_threads = 2
enc_ref = ort.InferenceSession(str(source / 'encoder.onnx'), options)
enc = ort.InferenceSession(str(out / 'encoder.onnx'), options)
head = ort.InferenceSession(str(out / 'head.onnx'), options)
config = json.loads((out / 'config.layajson').read_text())
temperature = config['temperature_by_options']['choice:6-10']
def softmax(z):
 z = z / temperature; p = np.exp(z-z.max()); return p/p.sum()
fixtures = []
for state in states:
 ids, markers = build_sequence(tok, state, question)
 inputs = {'input_ids': np.array([ids], dtype=np.int64), 'attention_mask': np.ones((1,len(ids)), dtype=np.int64)}
 tail = {'marker_pos': np.array([markers], dtype=np.int64), 'marker_mask': np.ones((1,len(markers)), dtype=bool), 'qtype': np.array([[0]],dtype=np.int64), 'attention_mask': inputs['attention_mask']}
 ref = head.run(None, {**tail, 'hidden_states': enc_ref.run(None, inputs)[0]})[0][0]
 start = time.perf_counter()
 prediction = head.run(None, {**tail, 'hidden_states': enc.run(None, inputs)[0]})[0][0]
 duration = time.perf_counter() - start
 p_ref, p = softmax(ref), softmax(prediction)
 drift = float(np.max(np.abs(p_ref-p)))
 if not np.isfinite(p).all() or drift > .01: raise SystemExit(f'Probability drift exceeds 0.01: {drift}')
 fixtures.append({'state':state, 'question':question, 'ids':ids, 'markers':markers,
                  'probabilities': dict(zip(question['crit'],map(float,p))), 'maxProbabilityDrift':drift,
                  'cpuSeconds':duration, 'sameTopChoice':bool(p.argmax()==p_ref.argmax())})
 print(f'{len(ids)} tokens; drift={drift:.5f}; CPU={duration:.2f}s; same top={p.argmax()==p_ref.argmax()}')
fixture_path = root / 'tests/fixtures/laya-parity.json'; fixture_path.parent.mkdir(exist_ok=True)
fixture_path.write_text(json.dumps(fixtures,indent=2)+'\n')
manifest_path = out / 'manifest.json'; manifest=json.loads(manifest_path.read_text())
manifest['textParity'] = {'cases':len(fixtures),'maxProbabilityDrift':max(f['maxProbabilityDrift'] for f in fixtures), 'topChoiceMatches':sum(f['sameTopChoice'] for f in fixtures), 'note':'CPU model fidelity only; not clinical or mobile performance validation.'}
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
