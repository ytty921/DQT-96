import json
qs = json.load(open("questions.json", encoding="utf-8"))
m22 = [q for q in qs if q["id"] == "M22"][0]
print("Q:", m22["q"])
print()
for i, o in enumerate(m22["opts"]):
    mark = " [ANS]" if i in m22["ans"] else ""
    print(f"  [{i}]{mark} {o}")
