"""Create a verified FP16 Laya mobile bundle from the upstream ONNX export.
Int8 was evaluated and rejected because it changed real-text decision probabilities.
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
import onnx
from onnxruntime.transformers.float16 import convert_float_to_float16
ROOT = Path(__file__).resolve().parent.parent
source, target = ROOT / '.model-build', ROOT / 'assets/models'
target.mkdir(parents=True, exist_ok=True)
if not (source / 'encoder.onnx').exists():
    raise SystemExit('First export the original checkpoint; see docs/LAYA.md.')
for name in ('encoder', 'head'):
    model = onnx.load(str(source / f'{name}.onnx'), load_external_data=True)
    onnx.external_data_helper.convert_model_from_external_data(model)
    model = convert_float_to_float16(model, keep_io_types=True, disable_shape_infer=True)
    model.ir_version = 10
    onnx.save(model, str(target / f'{name}.onnx'))
    del model
for original, bundled in [('tokenizer.json','tokenizer.layajson'),('rl_agent_config.json','config.layajson')]:
    shutil.copyfile(source / original, target / bundled)
files = {p.name: {'sha256': hashlib.file_digest(p.open('rb'), 'sha256').hexdigest(), 'bytes': p.stat().st_size}
         for p in target.iterdir() if p.suffix in {'.onnx', '.layajson'}}
manifest = {'model': 'convaiinnovations/laya', 'revision': '55cf4c4ebb4ebe31b2550e8bdf3bd21b99753851',
            'license':'Apache-2.0','representation':'FP16 encoder and head; FP32 tensor interface', 'files':files}
(target / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
subprocess.run([sys.executable, str(ROOT/'scripts/verify_laya.py')], check=True)
(ROOT/'src/services/modelAssets.ts').write_text('''// Native resource names. The config plugin embeds these files without passing weights through Metro.
export const modelAssets = {
 encoder: 'encoder.onnx', head: 'head.onnx',
 tokenizer: 'tokenizer.layajson', config: 'config.layajson',
} as const;
''')
print((target/'manifest.json').read_text())
