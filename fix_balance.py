import json, random
from collections import Counter

f=open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json',encoding='utf-8')
d=json.load(f)

# Check Dim2 judge count
d2j = [q for q in d if q['dim']==2 and q['type']=='judge']
print(f"Dim2 judge: {len(d2j)}")
for q in d2j:
    print(f"  {q['id']} diff{q['diff']}")

# Need to add 6 Dim2 judge: J25(diff1), J26(diff1), J27(diff2), J28(diff2), J29(diff3), J30(diff3)
# These IDs were previously in expansion but got ID-collision. Add them back.
new_j2 = [
    {"id":"J25","type":"judge","dim":2,"diff":1,"pts":1,
     "q":"只要把所有消费都记下来，就一定能准确评估自己的财务状况。","ans":False},
    {"id":"J26","type":"judge","dim":2,"diff":1,"pts":1,
     "q":"\u201c年化收益率8%\u201d就等于每年稳赚8%。","ans":False},
    {"id":"J27","type":"judge","dim":2,"diff":2,"pts":1,
     "q":"在做选择时，列一张详细对比表格在任何情况下都比凭直觉更好。","ans":False},
    {"id":"J28","type":"judge","dim":2,"diff":2,"pts":1,
     "q":"用\u201c中位数房价\u201d描述小区房价，会完全忽略豪宅对整体的影响。","ans":False},
    {"id":"J29","type":"judge","dim":2,"diff":3,"pts":1,
     "q":"在没有明确目标价的情况下做投资，根据市场变化逐步调整预期收益率，比一开始就锁定一个目标更灵活。","ans":True},
    {"id":"J30","type":"judge","dim":2,"diff":3,"pts":1,
     "q":"当你无法直接判断一个投资产品是否靠谱时，通过观察它多年在不同市场环境下的表现记录来建立判断，比只看近期收益更可靠。","ans":True}
]
d.extend(new_j2)
print(f"\nAfter adding: {len(d)}")

# Now fix Dim4: it has 18 judge (6 extra from expansion p2 that were meant for dim3 originally)
# Check dim4 judge
d4j = [q for q in d if q['dim']==4 and q['type']=='judge']
print(f"Dim4 judge: {len(d4j)}")
for q in d4j:
    print(f"  {q['id']} diff{q['diff']}")

# Remove the 6 extra dim4 judge that were originally dim3 (J37-J42 with dim3 content but tagged dim4)
# Actually let me check: the extra 6 are J43-J48 which were remapped from p2's J37-J42
# These are actually dim4 judge questions from the expansion, so they're correct
# The issue is dim4 has 18 judge total instead of 12
# I need to remove 6 dim4 judge to balance

# Let's check overall balance
for dim in [1,2,3,4]:
    sc = [q for q in d if q['dim']==dim and q['type']=='single']
    mc = [q for q in d if q['dim']==dim and q['type']=='multiple']
    jc = [q for q in d if q['dim']==dim and q['type']=='judge']
    dl = [q for q in d if q['dim']==dim and q['diff']==1]
    dm = [q for q in d if q['dim']==dim and q['diff']==2]
    dh = [q for q in d if q['dim']==dim and q['diff']==3]
    print(f"Dim{dim}: single={len(sc)} multiple={len(mc)} judge={len(jc)} | low={len(dl)} mid={len(dm)} high={len(dh)} total={len(sc)+len(mc)+len(jc)}")

# Remove last 6 dim4 judge (J43-J48) to balance to 12 each
ids_to_remove = {"J43","J44","J45","J46","J47","J48"}
d = [q for q in d if q['id'] not in ids_to_remove]
print(f"\nAfter removing 6 dim4 judge: {len(d)}")

# Final balance check
for dim in [1,2,3,4]:
    sc = [q for q in d if q['dim']==dim and q['type']=='single']
    mc = [q for q in d if q['dim']==dim and q['type']=='multiple']
    jc = [q for q in d if q['dim']==dim and q['type']=='judge']
    dl = [q for q in d if q['dim']==dim and q['diff']==1]
    dm = [q for q in d if q['dim']==dim and q['diff']==2]
    dh = [q for q in d if q['dim']==dim and q['diff']==3]
    c = Counter(q['ans'] for q in sc)
    print(f"Dim{dim}: S={len(sc)} M={len(mc)} J={len(jc)} | L={len(dl)} M={len(dm)} H={len(dh)} T={len(sc)+len(mc)+len(jc)} | Ans: A{c.get(0,0)}B{c.get(1,0)}C{c.get(2,0)}D{c.get(3,0)}")

with open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\questions.json','w',encoding='utf-8') as out:
    json.dump(d, out, ensure_ascii=False, indent=2)
print("Done")
