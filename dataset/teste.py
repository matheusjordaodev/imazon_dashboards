# converter a coluna a coluna area de string para float
import pandas as pd
df = pd.read_csv('floreser-9-1-22-ages-sf.csv',encoding='utf-8')
#df['area'] = df['area'].str.replace(',', '.').astype(float)

df.info()
print(df.head())
df.to_csv('floreser-9-1-22-ages-sf.csv', index=False)