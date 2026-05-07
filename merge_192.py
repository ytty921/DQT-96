# -*- coding: utf-8 -*-
"""Merge original 96 + expansion 96 = 192, shuffle single-choice answers"""
import json, random
from collections import Counter

base = json.load(open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json', encoding='utf-8'))
p1 = json.load(open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\expansion_p1.json', encoding='utf-8'))
p2 = json.load(open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\expansion_p2.json', encoding='utf-8'))

all_q = base + p1 + p2
print(f"Total before dedup: {len(all_q)}")

# Dedup by id
seen = set()
deduped = []
for q in all_q:
    if q['id'] not in seen:
        deduped.append(q)
        seen.add(q['id'])
all_q = deduped
print(f"After dedup: {len(all_q)}")

# Shuffle single-choice answer positions for each dim
# Each dim has 24 single-choice questions (12 original + 12 expansion)
# Target: A=6, B=6, C=6, D=6 per dim
random.seed(2024)
for dim in [1,2,3,4]:
    sc = [q for q in all_q if q['dim']==dim and q['type']=='single']
    n = len(sc)
    per = n // 4
    targets = []
    for i in range(4):
        targets.extend([i]*per)
    # Fill remainder
    for i in range(n - len(targets)):
        targets.append(i % 4)
    random.shuffle(targets)
    for idx, q in enumerate(sc):
        old_ans = q['ans']
        new_ans = targets[idx]
        if old_ans != new_ans:
            q['opts'][old_ans], q['opts'][new_ans] = q['opts'][new_ans], q['opts'][old_ans]
            q['ans'] = new_ans

# Verify
for dim in [1,2,3,4]:
    sc = [q for q in all_q if q['dim']==dim and q['type']=='single']
    c = Counter(q['ans'] for q in sc)
    print(f"Dim{dim} single({len(sc)}): A={c.get(0,0)} B={c.get(1,0)} C={c.get(2,0)} D={c.get(3,0)}")
    mc = [q for q in all_q if q['dim']==dim and q['type']=='multiple']
    jc = [q for q in all_q if q['dim']==dim and q['type']=='judge']
    dl = [q for q in all_q if q['dim']==dim and q['diff']==1]
    dm = [q for q in all_q if q['dim']==dim and q['diff']==2]
    dh = [q for q in all_q if q['dim']==dim and q['diff']==3]
    print(f"  Types: single={len(sc)} multiple={len(mc)} judge={len(jc)}")
    print(f"  Diff: low={len(dl)} mid={len(dm)} high={len(dh)}")

# Update app.js TOTAL_Q to 36
print(f"\nGrand total: {len(all_q)} questions")

with open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json', 'w', encoding='utf-8') as f:
    json.dump(all_q, f, ensure_ascii=False, indent=2)
print("Written to questions.json")
