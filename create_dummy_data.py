import pandas as pd
import os

base_dir = "/Users/hirokiemueshi/Desktop/卒業年照合/ZAI_VOL4"

# List 1: Master list with Name and Year
data1 = {
    '名前': ['佐藤 太郎', '鈴木 花子', '高橋 次郎', '田中 三郎'],
    '卒業年': [2020, 2021, 2019, 2022]
}
df1 = pd.DataFrame(data1)
df1.to_excel(os.path.join(base_dir, "list1.xlsx"), index=False)

# List 2: Target list with only Name, maybe some missing or extra
data2 = {
    '名前': ['鈴木 花子', '佐藤 太郎', '山田 太郎', '田中 三郎']
}
df2 = pd.DataFrame(data2)
df2.to_excel(os.path.join(base_dir, "list2.xlsx"), index=False)

print("Created list1.xlsx and list2.xlsx")
