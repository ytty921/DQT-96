import json, random

f=open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json',encoding='utf-8')
d=json.load(f)

# Shuffle dim4 single-choice answer positions
# Target distribution: 3xA, 3xB, 3xC, 3xD across S37-S48
targets = [0,0,0,1,1,1,2,2,2,3,3,3]
random.shuffle(targets)

idx = 0
for q in d:
    if q['dim']==4 and q['type']=='single':
        old_ans = q['ans']
        new_ans = targets[idx]
        if old_ans != new_ans:
            # swap the correct option to the target position
            opts = q['opts']
            opts[old_ans], opts[new_ans] = opts[new_ans], opts[old_ans]
            q['ans'] = new_ans
            q['opts'] = opts
        idx += 1

with open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json','w',encoding='utf-8') as out:
    json.dump(d, out, ensure_ascii=False, indent=2)

# Verify
print("Dim4 single-choice answer distribution:")
for q in d:
    if q['dim']==4 and q['type']=='single':
        print(f"  {q['id']}: ans={q['ans']} ({'ABCD'[q['ans']]})")

# Count
from collections import Counter
c = Counter(q['ans'] for q in d if q['dim']==4 and q['type']=='single')
print(f"\nDistribution: A={c.get(0,0)} B={c.get(1,0)} C={c.get(2,0)} D={c.get(3,0)}")
