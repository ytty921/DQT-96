import json
f=open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json',encoding='utf-8')
d=json.load(f)
for q in d:
  if q['dim']==4 and q['type']=='single':
    print(f"{q['id']} diff{q['diff']} ans={q['ans']}")
    for i,o in enumerate(q['opts']):
      marker=' <-- ANS' if i==q['ans'] else ''
      print(f'  [{i}] {o[:70]}{marker}')
    print()
