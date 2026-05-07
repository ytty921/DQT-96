import json
f=open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\expansion_p1.json',encoding='utf-8')
p1=json.load(f)
f2=open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\expansion_p2.json',encoding='utf-8')
p2=json.load(f2)
# Fix duplicate IDs in p1: J25-J30 already used in original
id_map_p1 = {"J25":"J31","J26":"J32","J27":"J33","J28":"J34","J29":"J35","J30":"J36"}
for q in p1:
    if q['id'] in id_map_p1:
        q['id'] = id_map_p1[q['id']]
# Fix duplicate IDs in p2: J31-J36 may conflict with fixed p1
# p2 has J31-J36, but p1 now also has J31-J36 (dim2 judge)
# p2 dim3 judge: J31-J36 -> J37-J42; p2 dim4 judge: J37-J42 -> J43-J48
id_map_p2 = {}
for q in p2:
    if q['dim']==3 and q['type']=='judge':
        old=q['id']
        new=old.replace('J3','J4').replace('J4','J5') if False else None
        # Manual mapping
id_map_p2_manual = {"J31":"J37","J32":"J38","J33":"J39","J34":"J40","J35":"J41","J36":"J42",
                     "J37":"J43","J38":"J44","J39":"J45","J40":"J46","J41":"J47","J42":"J48"}
for q in p2:
    if q['id'] in id_map_p2_manual:
        q['id'] = id_map_p2_manual[q['id']]

json.dump(p1, open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\expansion_p1.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(p2, open(r'C:\Users\hzlingbeibei\.openclaw\workspace\Strategy\DQT-96\expansion_p2.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print("Fixed")
