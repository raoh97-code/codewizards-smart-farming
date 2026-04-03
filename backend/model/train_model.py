import pandas as pd
import pickle

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import RandomForestClassifier

# Load dataset
df = pd.read_csv("../data/crop_data.csv")

# Features & labels
X = df[['N','P','K','temperature','humidity','ph','rainfall']]
y = df['label']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=1)

# Scaling
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train model
model = RandomForestClassifier(max_depth=4, n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

# Accuracy
print("Accuracy:", model.score(X_test_scaled, y_test))

# Save model
pickle.dump(model, open("model.pkl", "wb"))
pickle.dump(scaler, open("scaler.pkl", "wb"))

print("Model & Scaler saved!")