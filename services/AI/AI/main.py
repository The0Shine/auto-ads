import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# ==============================
# 1. LOAD DATA
# ==============================

print("Loading dataset...")
df = pd.read_csv("KAG_conversion_data.csv")

print("Rows:", len(df))


# ==============================
# 2. PREPROCESS
# ==============================

print("Preprocessing...")

# Encode gender
df['gender'] = df['gender'].map({'M':0,'F':1})

# Encode age
age_map = {
'30-34':0,
'35-39':1,
'40-44':2,
'45-49':3
}

df['age'] = df['age'].map(age_map)

# ==============================
# 3. FEATURE ENGINEERING
# ==============================

print("Creating features...")

df['CTR'] = df['Clicks']/(df['Impressions']+1)

df['CPC'] = df['Spent']/(df['Clicks']+1)

df['CPM'] = (df['Spent']/(df['Impressions']+1))*1000

df['CVR'] = df['Approved_Conversion']/(df['Clicks']+1)

df['log_impressions'] = np.log1p(df['Impressions'])

# ==============================
# 4. TARGET
# ==============================

# Predict conversion probability
df['converted'] = (df['Approved_Conversion']>0).astype(int)

# ==============================
# 5. FEATURES
# ==============================

features = [
'age',
'gender',
'interest',
'Impressions',
'Clicks',
'Spent',
'CTR',
'CPC',
'CPM',
'log_impressions'
]

X = df[features]
y = df['converted']


# ==============================
# 6. SPLIT DATA
# ==============================

print("Splitting dataset...")

X_train,X_test,y_train,y_test = train_test_split(
X,
y,
test_size=0.2,
random_state=42
)


# ==============================
# 7. TRAIN MODEL
# ==============================

print("Training AI model...")

ratio = len(y[y==0]) / max(1,len(y[y==1]))

model = XGBClassifier(
n_estimators=300,
max_depth=6,
learning_rate=0.05,
subsample=0.8,
colsample_bytree=0.8,
scale_pos_weight=ratio,
eval_metric='logloss'
)

model.fit(X_train,y_train)

print("Training complete")


# ==============================
# 8. EVALUATE MODEL
# ==============================

print("Evaluating model...")

y_pred = model.predict(X_test)

print(classification_report(y_test,y_pred))


# ==============================
# 9. SAVE MODEL
# ==============================

joblib.dump(model,"ads_conversion_ai.joblib")

print("Model saved to ads_conversion_ai.joblib")


# ==============================
# 10. AI DECISION ENGINE
# ==============================

def ai_decision(raw_data,model):

    df = pd.DataFrame([raw_data])

    df['CTR'] = df['Clicks']/(df['Impressions']+1)

    df['CPC'] = df['Spent']/(df['Clicks']+1)

    df['CPM'] = (df['Spent']/(df['Impressions']+1))*1000

    df['log_impressions'] = np.log1p(df['Impressions'])

    features = [
    'age',
    'gender',
    'interest',
    'Impressions',
    'Clicks',
    'Spent',
    'CTR',
    'CPC',
    'CPM',
    'log_impressions'
    ]

    prob = model.predict_proba(df[features])[0][1]

    # expected conversions
    expected_conv = prob * raw_data['Clicks']

    if expected_conv == 0:
        return "PAUSE",prob

    est_cpa = raw_data['Spent']/expected_conv

    if est_cpa < 15:
        return "SCALE",prob

    elif est_cpa < 30:
        return "KEEP",prob

    else:
        return "PAUSE",prob


# ==============================
# 11. TEST AI
# ==============================

print("\nTesting AI decision engine...")

test_ad = {

'age':0,
'gender':1,
'interest':15,
'Impressions':1200,
'Clicks':5,
'Spent':25.0

}

action,confidence = ai_decision(test_ad,model)

print("AI Decision:",action)
print("Confidence:",round(confidence*100,2),"%")