import json, random
f=open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json',encoding='utf-8')
d=json.load(f)

# Shuffle Dim3 single-choice answers to A3/B3/C3/D3
targets3 = [0,0,0,1,1,1,2,2,2,3,3,3]
random.seed(99)
random.shuffle(targets3)
idx = 0
for q in d:
    if q['dim']==3 and q['type']=='single':
        old_ans = q['ans']
        new_ans = targets3[idx]
        if old_ans != new_ans:
            q['opts'][old_ans], q['opts'][new_ans] = q['opts'][new_ans], q['opts'][old_ans]
            q['ans'] = new_ans
        idx += 1

from collections import Counter
for dim in [1,2,3,4]:
    sc = [q for q in d if q['dim']==dim and q['type']=='single']
    c = Counter(q['ans'] for q in sc)
    print(f"Dim{dim}: A={c.get(0,0)} B={c.get(1,0)} C={c.get(2,0)} D={c.get(3,0)}")

with open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json','w',encoding='utf-8') as out:
    json.dump(d, out, ensure_ascii=False, indent=2)
print("Done")
