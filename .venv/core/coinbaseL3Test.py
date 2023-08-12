import csv
import cbpro
import numpy as np
from scipy.stats import skew

# wsClient = cbpro.WebsocketClient(url="wss://ws-feed.pro.coinbase.com", products=["BTC-USD"], channels=["level3"])
public_client = cbpro.PublicClient()
# while True:
bk = public_client.get_product_order_book('BTC-USD', level=3)
print(type(bk))
for key in bk.keys():
    print(key)
print(type(bk['bids'])) #whoel thing, list
print(len(bk['bids']))
print(len(bk['asks']))
bids = bk['bids']
bidDist = []
for item in range(len(bids)):
    del bids[item][2]
    # print(bids[item][0], bids[item][1]) #each is a list, ['0.01', '100', 'adf6a4f3-aeac-4703-9eb5-6e342d5918b1']
    val = float(bids[item][0]) * float(bids[item][1])
    bidDist.append(val)
#bids is now a distribution of price x qty

#part two:
skewness = skew(bidDist)

if skewness > 1:
    print(f"The distribution {skewness} is highly skewed right.")
elif skewness < -1:
    print(f"The distribution {skewness} is highly skewed left.")
elif skewness > -1 and skewness < -0.5:
    print(f"The distribution {skewness} is moderately skewed left.")
elif skewness > -0.5 and skewness < -0.2:
    print(f"The distribution {skewness} is slightly skewed left.")
elif skewness > -0.2 and skewness < 0.2:
    print(f"The distribution {skewness} is approximately symmetric.")
elif skewness > 0.2 and skewness < 0.5:
    print(f"The distribution {skewness} is slightly skewed right.")
elif skewness > 0.5 and skewness <1:
    print(f"The distribution {skewness} is moderately skewed right.")
else:
    print("Invalid data")
