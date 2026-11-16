"""Temporary transport files are verified and published as normal Release assets."""
from pathlib import Path
import hashlib,json,re,os
root=Path('staging').resolve();manifest=json.loads((root/'manifest.json').read_text())
assert re.fullmatch(r'v\d+\.\d+\.\d+',manifest['tag'])
out=root/'output';out.mkdir(exist_ok=True)
for entry in manifest['assets']:
    assert re.fullmatch(r'[A-Za-z0-9_.-]+',entry['name'])
    assert 0<entry['bytes']<=2147483647
    sha=hashlib.sha256();length=0
    with (out/entry['name']).open('wb') as target:
        for part in entry['parts']:
            source=(root/part).resolve();assert source.is_relative_to(root/'parts')
            with source.open('rb') as stream:
                while data:=stream.read(65536):
                    sha.update(data);length+=len(data);assert length<=entry['bytes'];target.write(data)
    assert length==entry['bytes'] and sha.hexdigest()==entry['sha256'],entry['name']
    print('Verified',entry['name'],length,'bytes')
if os.environ.get('GITHUB_OUTPUT'):
    with open(os.environ['GITHUB_OUTPUT'],'a') as result:result.write('tag='+manifest['tag']+'\n')
