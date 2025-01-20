import json
import os
import sys

dir = "src/NFLQuery/data_v4"

if not os.path.exists(dir):
    os.mkdir(dir)

for data in json.loads(sys.stdin.read()):
    with open(f"{dir}/{data['year']}.json", "w") as fh:
        fh.write(json.dumps(data))
