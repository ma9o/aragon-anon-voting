import time
from .uaosring import uaosring_randkeys
from .uaosring import uaosring_sign
from .altbn128 import hashtopoint
from py_ecc.bn128.bn128_field_elements import FQ

def genID():
    tmp = uaosring_randkeys(1)
    pub = str(tmp[0][0][0])
    priv = str(tmp[1][1])
    fake = str(tmp[0][0][1])
    res = '{"pub": "'+pub+'", "priv": "'+priv+'", "fake": "'+fake+'"}'
    return res

def sign(msg, pub, sec, fake, keys):
    msg = int(msg)
    pub = FQ(int(pub))
    sec = int(sec)
    fake = FQ(int(fake))
    
    res = []
    for k in keys:
        res.append((FQ(int(k[0])), FQ(int(k[1]))))
    keys = res

    t0 = time.time()
    proof = uaosring_sign(keys, ((pub, fake), sec), message=msg)
    print('Ring signature completed:', time.time() - t0)

    res = '{"tag": ["'+str(proof[1][0].n)+'", "'+str(proof[1][1].n)+'"], "tees": ['
    for t in proof[2]:
        res += '"' + str(t) + '",'
    res = res[:-1]
    res += '], "seed": "'+str(proof[3])+'"}'
    
    return res
